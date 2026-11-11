/**
 * Firebase Admin SDK — server-side only
 * Used to verify Firebase ID tokens in API routes.
 * Never import this in client components.
 */
import * as admin from "firebase-admin";

// Prevent re-initialisation during hot reload in dev
if (!admin.apps.length) {
  const serviceAccount = (() => {
    // Option A: full service account JSON in one env var
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.private_key && parsed?.client_email) return parsed;
      }
    } catch (err) {
      console.warn("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", (err as Error).message);
    }

    // Option B: individual fields (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (projectId && clientEmail && privateKey) {
      return { projectId, clientEmail, privateKey };
    }

    return undefined;
  })();

  if (serviceAccount) {
    // Production: use service account JSON stored as env var
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else if (process.env.NODE_ENV === "production" || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Application Default Credentials only ever resolve outside a real GCP
    // environment (or without GOOGLE_APPLICATION_CREDENTIALS pointing at a
    // key file) by falling through to the GCP metadata server, which doesn't
    // exist on a local machine. That lookup fails via DNS (ENOTFOUND
    // metadata.google.internal), and DNS failures for a bogus host are slow
    // — multiple seconds per attempt, on every single token verification.
    // Restricting this path to production / an explicit credentials file
    // means local dev never pays that tax when the service account env var
    // is missing or malformed.
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } catch {
      // If no ADC configured, init with just projectId (limited functionality)
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    // Local dev, no usable credential: init with just projectId. Every
    // token verification falls back to the unverified JWT decode path
    // (see lib/auth.ts) instead of hanging on a doomed network call.
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore?.() ?? null;
export default admin;
