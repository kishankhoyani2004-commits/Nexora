import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { apiClient } from "@/lib/axios";
import { upsertFirestoreUser } from "@/firebase/firestore.service";

// ── Internal: sync Firebase user → MongoDB backend → Firestore ───────────────

async function syncWithBackend(firebaseUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}) {
  const response = await apiClient.post("/auth/firebase-login", {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    fullName: firebaseUser.displayName || "User",
    photoURL: firebaseUser.photoURL || "",
  });

  const data = response.data; // { success, token, refreshToken, user }

  // Mirror the user to Firestore so details are always persisted
  if (data.user) {
    await upsertFirestoreUser(firebaseUser.uid, {
      mongoId: data.user.id || data.user._id,
      fullName: data.user.fullName,
      email: data.user.email,
      role: data.user.role,
      avatar: data.user.avatar || firebaseUser.photoURL || "",
      provider: data.user.provider || "firebase",
      verified: true,
    });
  }

  return data;
}

// ── Register (email + password) ───────────────────────────────────────────────

export const registerUser = async ({
  fullName,
  email,
  password,
  role,
}: {
  fullName: string;
  email: string;
  password: string;
  role: string;
}) => {
  try {
    // 1. Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // 2. Set displayName in Firebase so photoURL / displayName are available
    await updateProfile(credential.user, { displayName: fullName });

    // 3. Sync to MongoDB backend
    const response = await apiClient.post("/auth/firebase-register", {
      uid: credential.user.uid,
      email: credential.user.email,
      fullName,
      role,
    });

    const data = response.data;

    // 4. Persist to Firestore
    if (data.user) {
      await upsertFirestoreUser(credential.user.uid, {
        mongoId: data.user.id || data.user._id,
        fullName,
        email: credential.user.email || email,
        role,
        avatar: "",
        provider: "firebase",
        verified: true,
      });
    }

    return data;
  } catch (firebaseError: any) {
    // Firebase project not configured or email-already-in-use fallback
    console.warn("Firebase register failed, falling back to native backend:", firebaseError.code);
    try {
      const response = await apiClient.post("/auth/register", {
        fullName,
        email,
        password,
        role,
      });
      return response.data;
    } catch (backendError: any) {
      throw new Error(
        backendError.response?.data?.message ||
          backendError.message ||
          "Registration failed."
      );
    }
  }
};

// ── Login (email + password) ──────────────────────────────────────────────────

export const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    const response = await apiClient.post("/auth/firebase-login", {
      uid: credential.user.uid,
      email: credential.user.email,
    });

    const data = response.data;

    // Keep Firestore in sync on every login (role / avatar may have changed)
    if (data.user) {
      await upsertFirestoreUser(credential.user.uid, {
        mongoId: data.user.id || data.user._id,
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || "",
        provider: "firebase",
        verified: true,
      });
    }

    return data;
  } catch (firebaseError: any) {
    console.warn("Firebase login failed, falling back to native backend:", firebaseError.code);
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      return response.data;
    } catch (backendError: any) {
      throw new Error(
        backendError.response?.data?.message ||
          backendError.message ||
          "Invalid email or password."
      );
    }
  }
};

// ── Google (popup) ────────────────────────────────────────────────────────────

export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  return syncWithBackend(result.user);
};

// ── GitHub (popup — full error handling) ─────────────────────────────────────
//
// Why GitHub can fail:
//   1. auth/account-exists-with-different-credential
//      → same email already registered via Google; we link the accounts silently.
//   2. auth/popup-blocked
//      → browser blocked the popup; fall back to signInWithRedirect().
//   3. auth/popup-closed-by-user
//      → user dismissed; treat as a no-op (return null).
//
// NOTE: For GitHub OAuth to work you MUST:
//   1. Go to console.firebase.google.com → Authentication → Sign-in method → GitHub → Enable
//   2. Register a GitHub OAuth App at github.com/settings/developers
//      Homepage URL:      http://localhost:5173
//      Callback URL:      (copy from Firebase GitHub provider settings)
//   3. Paste the GitHub Client ID + Secret into the Firebase GitHub provider settings.

export const githubLogin = async (): Promise<any> => {
  const provider = new GithubAuthProvider();
  provider.addScope("user:email");

  try {
    const result = await signInWithPopup(auth, provider);
    return syncWithBackend(result.user);
  } catch (err: any) {
    // ── Case 1: email conflict ────────────────────────────────────────────────
    if (err.code === "auth/account-exists-with-different-credential") {
      const email = err.customData?.email as string;
      if (!email) {
        throw new Error("Could not retrieve email from GitHub. Please try again.");
      }

      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes("google.com")) {
        // Re-auth with Google then link GitHub credential to same account
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ login_hint: email });
        const googleResult = await signInWithPopup(auth, googleProvider);
        const githubCredential = GithubAuthProvider.credentialFromError(err);
        if (githubCredential) {
          await linkWithCredential(googleResult.user, githubCredential);
        }
        return syncWithBackend(googleResult.user);
      }

      throw new Error(
        `This email is already registered with ${methods[0] ?? "another provider"}. ` +
          `Please sign in with that method instead.`
      );
    }

    // ── Case 2: popup blocked ─────────────────────────────────────────────────
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/operation-not-supported-in-this-environment"
    ) {
      const redirectProvider = new GithubAuthProvider();
      redirectProvider.addScope("user:email");
      await signInWithRedirect(auth, redirectProvider);
      return null; // page navigates away; result handled by getGithubRedirectResult()
    }

    // ── Case 3: user closed popup ─────────────────────────────────────────────
    if (
      err.code === "auth/popup-closed-by-user" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      return null;
    }

    // ── Anything else ─────────────────────────────────────────────────────────
    throw new Error(err.message || "GitHub sign-in failed. Please try again.");
  }
};

// ── Redirect result handler (called once on app mount by AuthContext) ─────────

export const getGithubRedirectResult = async (): Promise<any | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return syncWithBackend(result.user);
  } catch (err: any) {
    if (err.code === "auth/account-exists-with-different-credential") {
      throw new Error(
        "This email is already registered with a different sign-in method. " +
          "Please use that method to log in."
      );
    }
    return null;
  }
};
