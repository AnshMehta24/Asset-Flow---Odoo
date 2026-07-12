import type { NotificationType, Role } from "../../generated/prisma/enums";
import prisma from "@/lib/prisma";

type NotificationPayload = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
};

export async function createNotification(payload: NotificationPayload) {
  return prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
    },
  });
}

export async function createNotifications(payloads: NotificationPayload[]) {
  if (payloads.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: payloads.map((payload) => ({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
    })),
  });
}

export async function notifyRoles(
  roles: Role[],
  notification: Omit<NotificationPayload, "userId">
) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const uniqueUserIds = [...new Set(users.map((user) => user.id))];

  await createNotifications(
    uniqueUserIds.map((userId) => ({
      ...notification,
      userId,
    }))
  );
}
