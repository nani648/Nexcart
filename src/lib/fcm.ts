// Server-side FCM sender — sends real push notifications via Firebase Admin SDK
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { db } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fcmDb = db as any;

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}';
    // Handle escaped newlines in private key when stored as env var
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
  } catch (err) {
    console.error('[FCM] Failed to init admin app:', err);
    throw err;
  }
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
}

// Send push notification to one or more users by their DB userId
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length) return;

  try {
    const tokenRecords = await fcmDb.fcmToken.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, token: true },
    }) as { id: string; token: string }[];

    if (!tokenRecords.length) return;

    const app = getAdminApp();
    const messaging = getMessaging(app);

    const notification = {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    };

    const webpush = {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
      fcmOptions: { link: payload.url || '/notifications' },
    };

    const data: Record<string, string> = payload.url ? { url: payload.url } : {};

    const tokens = tokenRecords.map((r) => r.token);

    if (tokens.length === 1) {
      await messaging.send({ token: tokens[0], notification, webpush, data });
    } else {
      const result = await messaging.sendEachForMulticast({ tokens, notification, webpush, data });

      // Remove stale / invalid tokens to keep DB clean
      const staleIds: string[] = [];
      result.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code ?? '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleIds.push(tokenRecords[i].id);
          }
        }
      });

      if (staleIds.length) {
        await fcmDb.fcmToken.deleteMany({ where: { id: { in: staleIds } } });
      }
    }
  } catch (err) {
    // Never crash the calling API — FCM errors are non-fatal
    console.error('[FCM] sendPushToUsers error:', err);
  }
}
