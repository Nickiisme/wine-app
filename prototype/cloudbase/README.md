# CloudBase development setup

Environment: `wine-app-d6grgbodge1334980`

The web client never contains a Tencent Cloud `SecretId` or `SecretKey`. It uses
CloudBase authentication and collection security rules instead.

## Required console setup

1. Open the CloudBase console for the environment above.
2. Under **身份认证 / 登录方式**, enable **匿名登录** for development.
3. Under **数据库**, create a collection named `tasting_records`.
4. Choose custom security rules and paste the contents of
   `database-rules/tasting_records.json`.
5. Add an ascending/descending index for `createdAt` if the console reports that
   the owner-filtered, date-sorted query needs one.

Do not set the collection to public read/write. The client query explicitly
filters `_openid` to the current CloudBase UID, and the rules enforce the same
ownership boundary.

## Runtime configuration

The development environment ID is the safe default in `src/lib/cloudbase.ts`.
Deployments can override it without changing source code:

```text
VITE_CLOUDBASE_ENV_ID=wine-app-d6grgbodge1334980
```

Use a different environment ID for production.
