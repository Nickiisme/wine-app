# CloudBase compatibility spike

This is an isolated native miniapp diagnostic, not the migrated product UI. Its first stage only checks the actual AppID, `wx.cloud` availability, and whether the official CloudBase JS SDK miniapp distribution loads. It deliberately does not initialize a cloud app, log in, request a UID, call OCR, upload photos, or execute SQL/RPC. The page's request count describes its own business calls, not developer-tool network activity.

## Run locally

1. Install the existing prototype dependencies with its locked package manager if absent.
2. From the repository root run `python3 miniapp-spike/scripts/prepare-sdk.py`. It requires the existing official SDK version 3.10.2 and copies its complete `miniprogram_dist` with available license files into ignored `miniprogram/vendor/cloudbase`. No download or cloud operation occurs.
3. Import this directory into WeChat Developer Tools with AppID `wx5c33b5cc2b34a20a`.
4. Read the diagnostic page. `sdkLoaded: true` only proves local module loading; it does not prove UID/RLS/storage compatibility.

The displayed environment is the candidate original backend `wine-app-d6grgbodge1334980`; the diagnostic does not connect to it. Domain checks stay enabled. Do not upload or release this experimental project.

## Next integration stage (blocked)

Requires an independent nonproduction PostgreSQL environment with matching schema/RLS/RPC, private photo bucket, OCR function, and two distinct test users. These resources must be prepared separately because this task forbids deployment and production changes. Then add explicit test actions and record sanitized results for identity persistence/binding, owner CRUD/forged-owner denial, cross-user photo denial and signed URL expiry, OCR, concurrent/retried stock operations. No admin keys belong in this client.

Evidence and the authoritative compatibility matrix: `../docs/miniapp-backend-compatibility.md`.

## Explicit email login diagnostic

`pages/index/index.js:testEmailLogin(email,password)` is an opt-in runtime method, never called on startup. It authenticates an existing user against the original environment and, only after obtaining a UID, selects at most one own tasting record ID. It bypasses the Web profile upsert, has no writes and returns only sanitized outcome fields. Supply credentials transiently; never put them in source, project config, page data or evidence files. It tests email login, not WeChat login or identity linking. The startup diagnostic request count is not a cumulative network counter.

2026-10-18 simulator result: email login returned code `unknown`; no UID obtained, no database query executed. See report for evidence and limitations.

Latest 2026-10-18 evidence: after the user disabled local URL checking (`project.private.config.json`, `urlCheck:false`, base library 3.17.4), `testEmailLogin` returned `SUCCESS_WITH_UID`, `sessionMatchesLogin:true`, `ownRead:SUCCESS`, `returnedRows:0`. This verifies existing email login and an empty filtered query only. It does not verify WeChat identity binding, known-record visibility, cross-user RLS, real-device/domain compliance or release readiness. No business writes were made.

## Scoped production test authorization and results

The user explicitly authorized creating, modifying and cleaning only the two dedicated test accounts' test records/photos/inventory. Historical data, schema, policies and deployment remain out of scope. Second account registration is pending. The diagnostic login form accepts an existing account and never triggers writes; probe methods are only invoked explicitly.

`owner-record-probe.js` uses the preallocated ID and name in `evidence/owner-record-manifest.json`. It refuses an existing visible ID and has exact-ID/owner/name filters plus finally cleanup. Full payload failed because `field_metadata` was absent from the API schema cache. The legacy payload passed create/read/update/soft-delete. One soft-deleted test row remains in the database; this is NOT physical deletion. Do not rerun the record probe or remove its manifest until retention/purge is resolved.

`owner-photo-probe.js` checks nonexistence first, uploads only the generated PNG to the manifest path, and deletes in finally followed by exists verification. Local-path string input returned non-PNG content (HTTP200/65 bytes). ArrayBuffer input returned PNG (HTTP200/68 bytes) and passed. Signed response uses `fullSignedURL`; actual expiry and cross-user denial are untested. All uploaded probe files were deleted and verified.

Cellar testing is deferred: checked SQL grants no client delete for cellar entries/movements. A narrowly scoped operator cleanup procedure is needed before creating inventory fixtures; do not grant broad delete or change RLS to make tests pass.
