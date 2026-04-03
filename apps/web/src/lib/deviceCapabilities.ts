const PUSH_TOKEN_STORAGE_KEY = "hotel-crm-push-token";

export type DeviceCapabilitySnapshot = {
  isOnline: boolean;
  isStandalone: boolean;
  notificationsSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  cameraSupported: boolean;
  fileSystemSupported: boolean;
  shareSupported: boolean;
  badgingSupported: boolean;
  shortcutsSupported: boolean;
  pushTokensSupported: boolean;
};

export type CapturedDeviceImage = {
  localUri: string;
  fileName: string;
  mimeType: string;
};

export function getDeviceCapabilitySnapshot(): DeviceCapabilitySnapshot {
  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
  return {
    isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    isStandalone:
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ??
        false),
    notificationsSupported,
    notificationPermission: notificationsSupported ? Notification.permission : "unsupported",
    cameraSupported:
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    fileSystemSupported:
      typeof window !== "undefined" &&
      ("showOpenFilePicker" in window || "FileReader" in window),
    shareSupported: typeof navigator !== "undefined" && typeof navigator.share === "function",
    badgingSupported:
      typeof navigator !== "undefined" && "setAppBadge" in navigator,
    shortcutsSupported: true,
    pushTokensSupported: typeof window !== "undefined" && "localStorage" in window
  };
}

export async function requestDeviceNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  return Notification.requestPermission();
}

export async function showDeviceNotification(input: {
  title: string;
  body: string;
  tag: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  new Notification(input.title, {
    body: input.body,
    tag: input.tag,
    badge: "/icon-192.svg",
    icon: "/icon-192.svg"
  });

  if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
    try {
      await navigator.setAppBadge();
    } catch {
      // Badge support is best-effort.
    }
  }

  return true;
}

export async function captureImageFromDevice(options?: {
  accept?: string;
  capture?: "environment" | "user";
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return new Promise<CapturedDeviceImage | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options?.accept ?? "image/*";
    input.setAttribute("capture", options?.capture ?? "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          cleanup();
          resolve({
            localUri: String(reader.result ?? ""),
            fileName: file.name || `photo-${Date.now()}.jpg`,
            mimeType: file.type || "image/jpeg"
          });
        };
        reader.onerror = () => {
          cleanup();
          resolve(null);
        };
        reader.readAsDataURL(file);
      },
      { once: true }
    );

    input.click();
  });
}

export function loadPushRegistrationToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) ?? "";
}

export function savePushRegistrationToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}
