import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";


const fire = (fn: () => Promise<void>) => {
  if (Capacitor.isNativePlatform()) fn().catch(() => {});
};

/**
 * Semantic haptic feedback. Call from client components at the moment the user
 * learns an outcome — right next to the toast. At most one haptic per action.
 */
export const haptics = {
  /** Action completed successfully (form saved, message sent). Pair with toast.success. */
  success: () => fire(() => Haptics.notification({ type: NotificationType.Success })),
  /** Needs attention but didn't fail. */
  warning: () => fire(() => Haptics.notification({ type: NotificationType.Warning })),
  /** Action failed (validation/server error). Pair with toast.error. */
  error: () => fire(() => Haptics.notification({ type: NotificationType.Error })),
  /** Physical acknowledgement of a significant tap (send, toggle, destructive confirm). */
  tap: (style: "light" | "medium" | "heavy" = "light") =>
    fire(() =>
      Haptics.impact({
        style: {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        }[style],
      }),
    ),
  /** Selection trio for scrubbing UIs (pickers, sliders, segmented controls). */
  selectionStart: () => fire(() => Haptics.selectionStart()),
  selectionChanged: () => fire(() => Haptics.selectionChanged()),
  selectionEnd: () => fire(() => Haptics.selectionEnd()),
};
