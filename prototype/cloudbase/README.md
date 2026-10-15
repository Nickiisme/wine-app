# CloudBase development setup

Environment: `wine-app-d6grgbodge1334980`

The web client never contains a Tencent Cloud `SecretId`, `SecretKey`, or server
API Key. It uses CloudBase authentication and PostgreSQL RLS instead.

## Required console setup (PostgreSQL)

1. Open the CloudBase console for the environment above.
2. Under **身份认证 / 登录方式**, enable **匿名登录**, **邮箱验证码** and **用户名密码登录（账号密码登录）**.
3. Under **身份认证 / 邮件配置**, configure the registration verification and password-reset email templates and an allowed redirect URL for the deployed site.
4. Create the PostgreSQL application tables in the SQL editor.
5. Run `postgresql-permissions.sql` to grant frontend access and enable RLS.
6. Run `postgresql-storage.sql` in the same SQL editor. It creates the private
   `tasting-photos` bucket and allows both registered and anonymous app users to
   access only files under their own `{uid}/...` path.
7. Run `postgresql-record-metadata.sql` to add multi-grape storage and the
   per-field `source` / `confirmed` metadata used by preference calculations.
8. Run `postgresql-cellar.sql` to create user-owned cellar entries and movement
   history, link cellar tastings, and install the two atomic inventory functions.
   This migration is required before “我的藏酒” can load or save cloud data.

Re-run the relevant SQL files after pulling schema or policy changes. Committing or
deploying the web client does not apply PostgreSQL RLS policies automatically.

The client signs in anonymously and RLS compares each row's `user_id` with
`auth.uid()`. Never put a `service_role` API Key in H5 or App code.

## Runtime configuration

The development environment ID is the safe default in `src/lib/cloudbase.ts`.
Deployments can override it without changing source code:

```text
VITE_CLOUDBASE_ENV_ID=wine-app-d6grgbodge1334980
```

Use a different environment ID for production.

The app upgrades the current anonymous session during email registration by
passing the anonymous access token to `auth.signUp`. This keeps the same user
identity so existing tasting records remain available after registration.
