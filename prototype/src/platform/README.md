# Platform boundary

App screens and business modules import platform capabilities from this directory. `web.ts`, `photos.ts`, `camera.ts`, and `FilePickerInput.tsx` are the current Web implementations. The `PlatformAdapter` type in `web.ts` records the callable surface.

For a WeChat mini program implementation, provide equivalents for:

| Web capability | Mini program boundary |
| --- | --- |
| `storage.get/set` | key-value storage |
| `id` | UUID generation |
| `FilePickerInput`, `requestCamera`, `captureCamera` | choose/take image and inline camera |
| `PhotoFile`, `preparePhotos`, `createPreview/revokePreview`, `readBase64` | image asset, compression, preview lifecycle, byte conversion |
| `share`, `currentUrl` | share payload and destination |
| viewport, editor, pointer, timer methods | page lifecycle, safe-area/keyboard inset, gestures, scheduling |
| `emitAnalytics` | platform event sink |

The Web `PhotoFile` currently aliases `File`; the mini program implementation should convert its local image asset to the upload input expected by the data layer. This boundary does not include a mini program SDK or change any business or database rules.
