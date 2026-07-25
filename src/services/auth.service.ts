import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { apiClient } from "@/lib/axios";
import { upsertFirestoreUser } from "@/firebase/firestore.service";

// ── Internal: sync Firebase user → MongoDB backend → Firestore ───────────────

async function syncWithBackend(
  firebaseUser: {
    uid:         string;
    email:       string | null;
    displayName: string | null;
    photoURL:    string | null;
  },
  /** Only pass a role when registering a brand-new user from the signup form. */
  roleHint?: string
) {
  const response = await apiClient.post("/auth/firebase-login", {
    uid:      firebaseUser.uid,
    email:    firebaseUser.email,
    fullName: firebaseUser.displayName || "User",
    photoURL: firebaseUser.photoURL    || "",
    // Only sent when we know the intended role (new registration via Google).
    // Backend will ignore this for existing users.
    ...(roleHint ? { role: roleHint } : {}),
  });

  const data = response.data; // { success, token, refreshToken, user }

  // Mirror the user to Firestore so details are always persisted.
  // Fire-and-forget — MongoDB is the source of truth, so login/register
  // must never wait on (or fail because of) this secondary cache write.
  if (data.user) {
    upsertFirestoreUser(firebaseUser.uid, {
      mongoId:  data.user.id || data.user._id,
      fullName: data.user.fullName,
      email:    data.user.email,
      role:     data.user.role,
      avatar:   data.user.avatar || firebaseUser.photoURL || "",
      provider: data.user.provider || "firebase",
      verified: true,
    }).catch(() => {});
  }

  return data;
}

// ── Register (email + password) ───────────────────────────────────────────────

export const registerUser = async ({
  fullName,
  email,
  password,
  role,
  location,
}: {
  fullName: string;
  email:    string;
  password: string;
  role:     string;
  location?: string;
}) => {
  // Primary: register directly against the native MongoDB/bcrypt/JWT backend.
  // This is the same order Login already uses (native first, Firebase second),
  // so an ordinary email/password account's credential check always lives in
  // MongoDB and never depends on Firebase being reachable/configured.
  try {
    const response = await apiClient.post("/auth/register", {
      fullName,
      email,
      password,
      role,
      location: location || "",
    });
    return response.data;
  } catch (backendError: any) {
    // A duplicate-email rejection is final — MongoDB is the single source of
    // truth for account existence, so this must never fall through to the
    // Firebase branch below (that would silently create an orphaned Firebase
    // Auth user with no matching Mongo record once firebase-register also
    // rejects the same duplicate email).
    if (backendError.response?.data?.message === "Email already registered.") {
      throw new Error(backendError.response.data.message);
    }

    // Native registration failed for some other reason (e.g. backend
    // unreachable) — fall back to Firebase so the user isn't blocked.
    console.warn("Native register failed, falling back to Firebase:", backendError.message);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: fullName });

      const response = await apiClient.post("/auth/firebase-register", {
        uid:      credential.user.uid,
        email:    credential.user.email,
        fullName,
        role,
        location: location || "",
      });

      const data = response.data;

      // Fire-and-forget — a broken/misconfigured Firestore project must never
      // block account creation, since MongoDB is already the source of truth.
      if (data.user) {
        upsertFirestoreUser(credential.user.uid, {
          mongoId:  data.user.id || data.user._id,
          fullName,
          email:    credential.user.email || email,
          role,
          avatar:   "",
          provider: "firebase",
          verified: true,
        }).catch(() => {});
      }

      return data;
    } catch (firebaseError: any) {
      throw new Error(
        backendError.response?.data?.message ||
          firebaseError.message ||
          "Registration failed."
      );
    }
  }
};

// ── Email verification (post-registration OTP gate) ───────────────────────────

export const verifyEmailCode = async (email: string, code: string) => {
  const response = await apiClient.post("/auth/verify-email", { email, code });
  return response.data; // { success, token, refreshToken, user }
};

export const resendVerificationCode = async (email: string) => {
  const response = await apiClient.post("/auth/resend-code", { email });
  return response.data; // { success, message }
};

// ── Login (email + password) ──────────────────────────────────────────────────

export const loginUser = async ({
  email,
  password,
}: {
  email:    string;
  password: string;
}) => {
  // Strategy: try native backend first (preserves role exactly as stored in MongoDB).
  // The native endpoint returns the *same* 400 for "wrong password on a local
  // account" and "this account was registered via Firebase and has no local
  // password" — those two cases are indistinguishable from the status code
  // alone, so a 400 must always fall through to the Firebase-login attempt.
  // Only a confirmed 403 (unverified local account) is a hard, final failure.
  try {
    const response = await apiClient.post("/auth/login", { email, password });
    const data = response.data; // { success, token, refreshToken, user }

    // Keep Firestore in sync if the user has a Firebase UID
    if (data.user?.firebaseUid) {
      upsertFirestoreUser(data.user.firebaseUid, {
        mongoId:  data.user.id || data.user._id,
        fullName: data.user.fullName,
        email:    data.user.email,
        role:     data.user.role,       // ← preserve stored role
        avatar:   data.user.avatar || "",
        provider: data.user.provider || "local",
        verified: true,
      }).catch(() => {}); // non-blocking
    }

    return data;
  } catch (nativeError: any) {
    const status = nativeError.response?.status;
    if (status === 403) {
      throw new Error(
        nativeError.response?.data?.message || "Invalid email or password."
      );
    }

    // 400 (credential or provider mismatch) / network error — try Firebase path as fallback
    console.warn("Native login failed, trying Firebase fallback:", nativeError.message);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const response   = await apiClient.post("/auth/firebase-login", {
        uid:   credential.user.uid,
        email: credential.user.email,
        // Do NOT pass a role — backend must use the existing stored role
      });
      return response.data;
    } catch (fallbackError: any) {
      throw new Error(
        nativeError.response?.data?.message ||
          fallbackError.response?.data?.message ||
          fallbackError.message ||
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
  // No roleHint — backend preserves role for existing users,
  // and new Google sign-ups default to freelancer unless changed in UI.
  return syncWithBackend(result.user);
};

// ── OAuth account linking (Settings → Connected Accounts) ────────────────────
// Unlike googleLogin() above, these only pop the provider's auth dialog to
// obtain a real account id — they do not sync/replace the current MongoDB
// session, since the caller is linking a second provider to an already
// logged-in account, not logging in as someone else.

export const connectGoogleAccount = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return { uid: result.user.uid, email: result.user.email };
};

export const connectGithubAccount = async () => {
  const provider = new GithubAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return { uid: result.user.uid, email: result.user.email };
};

