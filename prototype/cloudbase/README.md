# CloudBase development setup

Environment: `wine-app-d6grgbodge1334980`

The web client never contains a Tencent Cloud `SecretId`, `SecretKey`, or server
API Key. It uses CloudBase authentication and PostgreSQL RLS instead.

## Required console setup (PostgreSQL)

1. Open the CloudBase console for the environment above.
2. Under **身份认证 / 登录方式**, enable **匿名登录** for development.
3. Create the PostgreSQL application tables in the SQL editor.
4. Run `postgresql-permissions.sql` to grant frontend access and enable RLS.

The client signs in anonymously and RLS compares each row's `user_id` with
`auth.uid()`. Never put a `service_role` API Key in H5 or App code.

## Runtime configuration

The development environment ID is the safe default in `src/lib/cloudbase.ts`.
Deployments can override it without changing source code:

```text
VITE_CLOUDBASE_ENV_ID=wine-app-d6grgbodge1334980
```

Use a different environment ID for production.
