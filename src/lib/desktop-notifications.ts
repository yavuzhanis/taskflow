import { useSyncExternalStore } from "react";

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.permission;
}

function subscribePermission(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("taskflow-permission-change", callback);
  return () => {
    window.removeEventListener("taskflow-permission-change", callback);
  };
}

export function useDesktopNotificationPermission(): NotificationPermission {
  return useSyncExternalStore(
    subscribePermission,
    () => getDesktopNotificationPermission(),
    () => "default"
  );
}

export function notifyPermissionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("taskflow-permission-change"));
  }
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  try {
    const permission = await Notification.requestPermission();
    notifyPermissionChanged();
    return permission;
  } catch {
    return "denied";
  }
}

export function showDesktopNotification({
  title,
  body,
  onClick,
}: {
  title: string;
  body?: string | null;
  onClick?: () => void;
}) {
  if (!isDesktopNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body: body ?? undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };
  } catch (err) {
    console.error("Desktop notification could not be shown:", err);
  }
}
