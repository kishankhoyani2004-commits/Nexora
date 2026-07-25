/**
 * Firestore user persistence layer.
 *
 * Every login / register optionally writes the user's profile to Firestore.
 * Firestore is treated as a secondary cache — MongoDB is always the source of
 * truth.  If Firestore is unavailable (project not configured, offline,
 * database not provisioned) all calls fail silently so the rest of the app
 * is unaffected.
 */

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type PartialWithFieldValue,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

export interface FirestoreUser {
  uid: string;
  mongoId?: string;
  fullName: string;
  email: string;
  role: string;
  avatar: string;
  provider: string;
  verified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Returns true when the error is an unrecoverable Firestore config problem. */
function isFirestoreUnavailable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("database") ||
    msg.includes("not found") ||
    msg.includes("timed out") ||
    msg.includes("failed to get document because the client is offline") ||
    msg.includes("could not reach cloud firestore backend")
  );
}

/**
 * A misconfigured/missing Firestore database doesn't always reject quickly —
 * the SDK's underlying stream can retry with backoff for a long time before
 * a getDoc()/setDoc() call ever settles. Race every call against a hard
 * timeout so a Firestore outage can never hang auth (register/login).
 */
const FIRESTORE_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), ms)
    ),
  ]);
}

/**
 * Lightweight circuit-breaker: once we know Firestore is unavailable in this
 * session, skip all subsequent calls immediately instead of letting them hang
 * and produce console noise.
 */
let _firestoreDisabled = false;

function markDisabled(err: unknown) {
  if (isFirestoreUnavailable(err)) {
    _firestoreDisabled = true;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Upsert (create or update) a user document in Firestore.
 * Uses `merge: true` so existing fields not in the payload are preserved.
 * Silently no-ops if Firestore is unavailable.
 */
export async function upsertFirestoreUser(
  uid: string,
  data: Partial<Omit<FirestoreUser, "uid" | "createdAt">>
): Promise<void> {
  if (_firestoreDisabled) return;
  try {
    const ref = doc(db, "users", uid);
    const existing = await withTimeout(getDoc(ref));

    const payload: PartialWithFieldValue<FirestoreUser> = {
      ...data,
      uid,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    };

    await withTimeout(setDoc(ref, payload, { merge: true }));
  } catch (err) {
    markDisabled(err);
    // Non-fatal — MongoDB is still the source of truth for the API
  }
}

/**
 * Read a user document from Firestore by Firebase UID.
 * Returns null if the document doesn't exist or Firestore is unreachable.
 */
export async function getFirestoreUser(uid: string): Promise<FirestoreUser | null> {
  if (_firestoreDisabled) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await withTimeout(getDoc(ref));
    if (!snap.exists()) return null;
    return snap.data() as FirestoreUser;
  } catch (err) {
    markDisabled(err);
    return null;
  }
}
