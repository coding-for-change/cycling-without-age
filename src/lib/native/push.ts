import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";


export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { receive } = await PushNotifications.requestPermissions();
      return receive === "granted";
    }
    if (typeof Notification === "undefined") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}
