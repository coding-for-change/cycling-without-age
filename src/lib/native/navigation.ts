import type {
  NativeNavigationConfigureOptions,
  NativeNavigationTab,
} from "@capgo/capacitor-native-navigation";
import { brand } from "@/lib/brand";
import { NOOP, nativePlatform, subscribe, type Unsubscribe } from "./platform";

export type NativeTab = NativeNavigationTab;

export type NativeTabsState = {
  tabs: NativeTab[];
  selectedId: string | null;
  hidden: boolean;
};

const navigation = () => import("@capgo/capacitor-native-navigation");

const isIos = () => nativePlatform() === "ios";

export async function configureNativeNavigation(
  options: NativeNavigationConfigureOptions,
): Promise<void> {
  if (!isIos()) return;
  try {
    await (await navigation()).NativeNavigation.configure(options);
  } catch {}
}

export async function setNativeTabs({
  tabs,
  selectedId,
  hidden,
}: NativeTabsState): Promise<void> {
  if (!isIos()) return;
  try {
    await (
      await navigation()
    ).NativeNavigation.setTabbar({
      tabs,
      selectedId: selectedId ?? undefined,
      hidden,
      labelVisibilityMode: "labeled",
      colors: { tint: brand.mintDeep },
      animated: true,
    });
  } catch {}
}

export async function hideNativeTabs(): Promise<void> {
  if (!isIos()) return;
  try {
    await (
      await navigation()
    ).NativeNavigation.setTabbar({ hidden: true, animated: true });
  } catch {}
}

export function onTabSelect(handler: (id: string) => void): Unsubscribe {
  if (!isIos()) return NOOP;
  return subscribe(async () =>
    (await navigation()).NativeNavigation.addListener("tabSelect", ({ id }) =>
      handler(id),
    ),
  );
}
