import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Prevent re-initialization during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const firebaseDb = getFirestore(app);

export {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
};
export type { User };

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserExists(result.user);
  return result.user;
}

export async function signInWithGithub() {
  const result = await signInWithPopup(auth, githubProvider);
  await ensureUserExists(result.user);
  return result.user;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

async function ensureUserExists(user: User) {
  try {
    const userRef = doc(firebaseDb, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("[firebase] Could not sync user to Firestore:", (err as Error).message);
  }
}

export function logOut() {
  return signOut(auth);
}

// ─── Same-origin Authorization header repair ────────────────────────────────
//
// A large number of call sites across the app build `Authorization: Bearer
// <uid>` headers using the raw Firebase UID directly (e.g. `Bearer ${user.uid}`
// or a `uid` read from localStorage), as a shortcut to avoid awaiting
// `user.getIdToken()`. The server (src/lib/auth.ts `verifyFirebaseToken`)
// only accepts a raw UID through a fallback that is explicitly disabled
// when `NODE_ENV === "production"` — so in a production build, every one of
// those requests gets a 401 and the corresponding feature silently breaks.
//
// Rather than hand-edit ~100 call sites (and risk missing some, or a future
// one reintroducing the same shortcut), this patches `window.fetch` once, at
// module load, to swap in a real, fresh ID token before any such request
// leaves the browser. A real Firebase ID token is a JWT (two dots); a raw
// UID never contains a dot — so detection is unambiguous, and this only
// ever touches headers that were already broken. `getIdToken()` resolves
// from Firebase's in-memory cache (no network) unless the token is actually
// near expiry, so this adds no perceptible latency.
if (typeof window !== "undefined") {
  const w = window as unknown as { fetch: typeof fetch & { __nexcartAuthPatched?: boolean } };

  if (!w.fetch.__nexcartAuthPatched) {
    const originalFetch = w.fetch.bind(window);

    const patchedFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const rawUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Resolve against the current page before comparing — `startsWith`
      // string-prefix checks are bypassable (protocol-relative "//evil.com",
      // or origin-prefix tricks like "https://this-app.example.com.evil.com").
      // Only same-origin `/api/...` requests are ever legitimate targets for
      // the header rewrite below; everything else (including same-origin
      // non-API paths) passes through untouched.
      let isApiSameOrigin = false;
      try {
        const parsed = new URL(rawUrl, window.location.href);
        isApiSameOrigin = parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
      } catch {
        isApiSameOrigin = false;
      }
      if (!isApiSameOrigin) return originalFetch(input, init);

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      const authHeader = headers.get("Authorization");

      if (authHeader?.startsWith("Bearer ")) {
        const raw = authHeader.slice(7);
        const looksLikeRawUid = raw && raw !== "null" && raw !== "undefined" && !raw.includes(".");
        if (looksLikeRawUid) {
          const user = auth.currentUser;
          if (user) {
            try {
              headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
            } catch {
              // Leave the original header — request 401s same as before, no regression.
            }
          }
        }
      }

      if (input instanceof Request) {
        // `init`, when present, can override more than headers (method, body,
        // credentials, signal, ...) per the Request constructor's merge
        // semantics — carry it through rather than only the rewritten headers,
        // or a caller-supplied override would be silently dropped.
        return originalFetch(new Request(input, init ? { ...init, headers } : { headers }));
      }
      return originalFetch(input, { ...init, headers });
    };

    w.fetch = Object.assign(patchedFetch, { __nexcartAuthPatched: true });
  }
}
