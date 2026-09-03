# Notices

The software in this repository is licensed under [PolyForm Noncommercial 1.0.0](LICENSE.md).

PolyForm grants copyright and patent rights only. It grants no trademark rights, and it
cannot grant rights in material Coding for Change does not own. The lines below are the
`Required Notice:` lines the license mechanism refers to: anyone who receives a copy of
any part of this software must receive them too.

```
Required Notice: Copyright Coding for Change e.V. (https://codingforchange.com)

Required Notice: The Cycling Without Age name and logo are trademarks of Cycling Without Age and are not licensed under these terms. Deployments by anyone other than Cycling Without Age must replace all branding.

Required Notice: The branding artwork in `assets/` and the app icons and splash screens generated from it under `ios/` and `android/` are copyright Cycling Without Age, used with permission, and are excluded from these terms. See NOTICE.md.
```

## Branding artwork is not covered by the license

The Cycling Without Age logo artwork is copyright Cycling Without Age. Coding for Change
uses it with permission and has no right to sublicense it, so it is carved out of the
PolyForm license entirely. This covers:

- `assets/` — the source logo used to generate native app assets, see [assets/README.md](assets/README.md)
- `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/` — the app icons and
  splash screens `capacitor-assets generate` derives from it
- the brand colours, typography, and logo usage rules documented in [docs/BRAND.md](docs/BRAND.md)

If you run this software under the noncommercial license, replace all of it with your own
branding. The code is yours to use; the identity is not.

## Third-party dependencies

Dependencies keep their own licenses (predominantly MIT and Apache 2.0); see
`package-lock.json` and each package's own license file.
