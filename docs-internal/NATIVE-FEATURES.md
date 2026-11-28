# Native features

The iOS and Android apps are thin Capacitor shells: their WebView loads https://cwa.codingforchange.com.
Apple's App Review guideline 4.2 rejects apps that are "just a website in a wrapper", so this file lists
everything the native shell adds on top of the website. Whoever submits a build copies the review notes
from the end of this file into App Store Connect ("Notes for review") and the Play Console. The rules for
writing native code are in [AGENTS.md](../AGENTS.md) §7.

**When you add, remove or change a native capability, update this list in the same PR.**

## What the app adds

| Feature | What the user gets | Platforms | Where it lives | How a reviewer can see it |
| --- | --- | --- | --- | --- |
| Offline screen | When the app starts without internet, or the server is unreachable, returns a gateway error (502–599) or doesn't answer within 20 seconds, the app shows a branded screen bundled inside the app, in the device language (en/da/de, light and dark), with a Try again button. It reconnects by itself when the connection is back. | iOS, Android | [native/offline-page/](../native/offline-page/) (built by [build-native-offline-page.mjs](../scripts/build-native-offline-page.mjs)), `server.errorPath` in [capacitor.config.ts](../capacitor.config.ts), [OfflinePageWebViewClient.java](../android/app/src/main/java/com/codingforchange/cwa/OfflinePageWebViewClient.java), [OfflinePageNavigationDelegate.swift](../ios/App/App/OfflinePageNavigationDelegate.swift) | On a fresh install, turn on Airplane Mode and open the app. Turn Airplane Mode off: the app loads by itself. |
| Launch screen | A branded launch screen in the brand mint stays up until the first page is ready, instead of a blank page. | iOS, Android | `SplashScreen` in [capacitor.config.ts](../capacitor.config.ts), [native-bootstrap.tsx](../src/lib/native/native-bootstrap.tsx), [LaunchScreen.storyboard](../ios/App/App/Base.lproj/LaunchScreen.storyboard) | Open the app. |
| Push notifications | Ride and chat news on the lock screen (Firebase Cloud Messaging). Tapping a notification opens the matching screen. While the app is open, the news also shows as a banner inside the app and the screen refreshes. On iOS the app icon badge shows unseen notifications plus unread chats. | iOS, Android | [push.ts](../src/lib/native/push.ts), [native-push-registrar.tsx](../src/components/native-push-registrar.tsx), server side [src/lib/push.ts](../src/lib/push.ts) | Tap the avatar (top bar) → Notifications → Push → allow. Or Home → "Get set up" → "Turn on notifications". Then send the demo account a chat message from a second account. |
| Sign in with Apple | "Continue with Apple" above Google on the sign-in screen, using Apple's own sign-in sheet. Deleting the account revokes the Apple token. | iOS | [apple-sign-in.ts](../src/lib/native/apple-sign-in.ts), [AppleSignInPlugin.swift](../ios/App/App/AppleSignInPlugin.swift), [sign-in-with-apple.ts](../src/app/(flow)/sign-in/_components/sign-in-with-apple.ts) | Sign-in screen → "Continue with Apple". |
| Passkeys | Sign in with Face ID, Touch ID, fingerprint or device PIN. The WebView has no WebAuthn, so the app runs the passkey ceremony natively. | iOS, Android | [passkey.ts](../src/lib/native/passkey.ts), [passkey-client.ts](../src/lib/passkey-client.ts), [App.entitlements](../ios/App/App/App.entitlements), `asset_statements` in [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) | Avatar → Passkeys → "Add a passkey". Sign out, then sign-in screen → "Use a passkey". |
| Camera | The photo button opens the device camera directly for damage reports, new trishaws and new storage locations. | iOS, Android | [camera.ts](../src/lib/native/camera.ts), [photo-gallery.tsx](../src/components/photo-gallery/photo-gallery.tsx) | As an admin: Trishaws → open a trishaw → "Report damage" → Photo. As a pilot: after a ride, "Finish your ride" → "Report damage". |
| Haptics | A short vibration when an action succeeds or fails, on a send, and on a tab switch. At most one per action. | iOS, Android | [haptics.ts](../src/lib/native/haptics.ts) | Enter a wrong sign-in code (error), then the right one (success). Send a chat message (tap). |
| Native tab bar | The real iOS tab bar with SF Symbols (Home, My rides, Calendar, Chat) and an unread badge on Chat. | iOS (iPhone) | [navigation.ts](../src/lib/native/navigation.ts), [native-tab-bar.tsx](../src/app/(member)/_components/native-tab-bar.tsx), `MEMBER_NAV` in [nav.ts](../src/app/(member)/nav.ts) | Sign in as a pilot or passenger on an iPhone. |
| Swipe back | Swipe from the left edge to go back from a detail screen, like any iOS app. Off between tabs. | iOS | [swipe-back.ts](../src/lib/native/swipe-back.ts), [SwipeBackPlugin.swift](../ios/App/App/SwipeBackPlugin.swift), [native-swipe-back.tsx](../src/app/(member)/_components/native-swipe-back.tsx) | Chat → open a conversation → swipe from the left edge. |
| Theme-matched shell | The area behind the page, the bounce when you pull past the top, and the system light/dark style follow the app's own theme. | iOS | [shell-background.ts](../src/lib/native/shell-background.ts), [ShellBackgroundPlugin.swift](../ios/App/App/ShellBackgroundPlugin.swift), [AppViewController.swift](../ios/App/App/AppViewController.swift) | Avatar → Appearance → Dark, then pull any page down past the top. |
| Back button | The Android back button closes an open sheet first, then goes back. With no history left, a tab returns to Home, and Home puts the app in the background instead of quitting. | Android | [back-policy.ts](../src/lib/native/back-policy.ts), [native-back-handler.tsx](../src/lib/native/native-back-handler.tsx), [app.ts](../src/lib/native/app.ts) | Open the avatar sheet, press back. Press back on Home. |
| Keyboard | On iOS the bar above the keyboard is hidden, and in a chat the header stays put while the message box sits on the keyboard. On both platforms bottom bars step aside while typing. | iOS, Android | [keyboard.ts](../src/lib/native/keyboard.ts) | Chat → open a conversation → tap the message box. |
| Location | The OS asks for location "while using the app" and the chapter list is sorted by distance. The same feature exists on the website; the app uses the OS permission prompt. | iOS, Android | [geolocation.ts](../src/lib/native/geolocation.ts), [location-screen.tsx](../src/app/(flow)/location/_components/location-screen.tsx) | During sign-up, "Where would you like to ride?" → allow location → "Chapters closest to you". |

## Permissions we ask for

iOS, from [Info.plist](../ios/App/App/Info.plist):

- `NSCameraUsageDescription`: "Cycling Without Age uses the camera so you can photograph damage on a trishaw." For the camera row above.
- `NSPhotoLibraryUsageDescription`: "Cycling Without Age lets you pick a photo of a trishaw or its storage location."
- `NSLocationWhenInUseUsageDescription`: "Cycling Without Age uses your location to show the chapters closest to you." Only while the app is in use, never in the background.
- `NSLocalNetworkUsageDescription`: only for development builds that load a dev server on the local network. Store builds load only https://cwa.codingforchange.com.
- Notifications: asked at runtime when the user turns on Push. `UIBackgroundModes` → `remote-notification` lets a push arrive while the app is in the background.

iOS entitlements, from [App.entitlements](../ios/App/App/App.entitlements): push (`aps-environment`), Sign in with Apple, and the associated domain `webcredentials:cwa.codingforchange.com` for passkeys.

Android, from [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) and the plugins' own manifests:

- `INTERNET`: loads the app.
- `ACCESS_NETWORK_STATE`: lets the offline screen tell "no internet" from "server unreachable" and reload when the connection is back.
- `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`: the chapter list sorted by distance. Asked at runtime.
- `CAMERA`: photos for damage reports, trishaws and storage locations.
- `POST_NOTIFICATIONS` (added by `@capacitor-firebase/messaging`): push notifications on Android 13 and later.
- `VIBRATE` (added by `@capacitor/haptics`): haptics.

## Notes for review (copy-paste)

Fill in the demo account before you paste. Sign-in has no passwords: the user gets a one-time code by
email or text, so the reviewer needs a way to get that code. Delete any line whose feature changed.

```text
Cycling Without Age is the app for the volunteers, passengers and chapter admins of Cycling Without Age,
who organise trishaw rides for older people. Besides the content it shares with our website, the app
uses these native features:

- Push notifications for ride and chat updates (avatar > Notifications > Push). On iOS the app icon badge counts unseen notifications and unread chats.
- Sign in with Apple with Apple's own sheet (sign-in screen > "Continue with Apple"). Deleting the account (avatar > Sign out or delete > Delete account) revokes the Apple token.
- Passkeys with Face ID or Touch ID (avatar > Passkeys > "Add a passkey"; sign-in screen > "Use a passkey").
- The device camera for damage photos (admin: Trishaws > a trishaw > "Report damage" > Photo).
- The native iOS tab bar, edge swipe back on detail screens, and haptic feedback.
- Location only while the app is in use, to list the nearest chapters during sign-up.
- A branded offline screen bundled in the app: turn on Airplane Mode and open the app.

Demo account: <add before submitting>
Sign-in code: <how the reviewer gets the one-time code>
```

## Not built yet

Don't claim these in review notes.

- Share sheet: nothing in the app opens the system share sheet.
- Universal links / Android App Links: a cwa.codingforchange.com link does not open the app. The associated domain is only `webcredentials:` (passkeys).
- Resetting the app icon badge: nothing in the app clears it. The iOS number changes only with the next push, and Android pushes send no badge count.
- Native camera everywhere: only damage reports, new trishaws and new storage locations use it. Other uploads (profile photo, training files, photos on existing trishaws) use the system file picker.
