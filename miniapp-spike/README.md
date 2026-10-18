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
