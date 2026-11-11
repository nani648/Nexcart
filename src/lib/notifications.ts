import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: CreateNotificationParams): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link: link || null,
      },
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
  }
}
