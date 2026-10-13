import cloudbase from "@cloudbase/js-sdk";

export const CLOUDBASE_ENV_ID =
  import.meta.env.VITE_CLOUDBASE_ENV_ID || "wine-app-d6grgbodge1334980";

export const cloudbaseApp = cloudbase.init({
  env: CLOUDBASE_ENV_ID,
});

type CloudbasePostgres = ReturnType<typeof cloudbaseApp.rdb>;

/** CloudBase exposes rdb as a factory at runtime; the current declaration is stale. */
export function getCloudbasePostgres(): CloudbasePostgres {
  return (cloudbaseApp.rdb as unknown as () => CloudbasePostgres)();
}

let authPromise: Promise<string> | null = null;

/** Ensures every browser has an authenticated CloudBase identity before data access. */
export function ensureCloudbaseUser(): Promise<string> {
  if (!authPromise) {
    authPromise = (async () => {
      const auth = cloudbaseApp.auth({ persistence: "local" });
      const currentUser = await auth.getCurrentUser();
      let uid = currentUser?.uid;

      if (!uid) {
        const result = await auth.signInAnonymously();
        if (result.error) throw result.error;
        uid = result.data?.user?.id;
      }

      if (!uid) throw new Error("CloudBase 登录成功，但未返回用户 UID");
      return uid;
    })().catch((error) => {
      authPromise = null;
      throw error;
    });
  }

  return authPromise;
}
