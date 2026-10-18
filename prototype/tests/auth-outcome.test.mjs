import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const source = readFileSync(new URL("../src/lib/cloudbase.ts", import.meta.url), "utf8");
let fixtureId = 0;
async function loadAuth(options = {}) {
  const fixture = `
    const options = ${JSON.stringify(options)};
    const platform = { delay: (fn) => globalThis.setTimeout(fn, 5), cancelDelay: globalThis.clearTimeout, currentUrl: () => "https://wine.example.test/" };
    const user = { id: "signed-in-user", email: "wine@example.test", is_anonymous: false };
    const verified = async () => ({ data: { user }, error: null });
    const cloudbase = { init: () => ({
      auth: () => ({
        signInWithPassword: async () => options.authError ? { data: {}, error: { message: "密码错误" } } : verified(),
        getSession: async () => ({ data: { session: { user } } }),
        signInWithOtp: async () => ({ data: { verifyOtp: verified } }),
        signUp: async () => ({ data: { verifyOtp: verified } }),
      }),
      rdb: () => ({ from: () => ({ upsert: async () => {
        if (options.profilePending) return new Promise(() => {});
        if (options.profileThrows) throw new Error("profile network error");
        return { error: options.profileError ? { message: "profile RLS denied" } : null };
      } }) }),
    }) };
  `;
  const code = stripTypeScriptTypes(source.replace('import { platform } from "../platform/web";', "").replace('import cloudbase from "@cloudbase/js-sdk";', fixture).replace("import.meta.env.VITE_CLOUDBASE_ENV_ID", "undefined"));
  return import(`data:text/javascript,${encodeURIComponent(code)}#${fixtureId++}`);
}

test("successful password login survives profile permission and network errors", async () => {
  for (const options of [{ profileError: true }, { profileThrows: true }, { profilePending: true }]) {
    const api = await loadAuth(options);
    const account = await api.signInWithEmail("wine@example.test", "fake-password");
    assert.equal(account.id, "signed-in-user");
    assert.equal(account.isAnonymous, false);
    assert.match(account.syncWarning, /已登录/);
    assert.equal(await api.ensureCloudbaseUser(), "signed-in-user");
  }
});
test("OTP login and registration verification also preserve successful authentication", async () => {
  const api = await loadAuth({ profileError: true });
  const login = await api.beginEmailOtpLogin("wine@example.test");
  assert.equal((await login("123456")).id, "signed-in-user");
  const register = await api.beginEmailRegistration("wine@example.test", "fake-password", "葡萄探索者");
  const account = await register("123456");
  assert.equal(account.name, "葡萄探索者");
  assert.match(account.syncWarning, /个人资料/);
});
test("actual authentication errors still reject and successful sync has no warning", async () => {
  const failed = await loadAuth({ authError: true });
  await assert.rejects(() => failed.signInWithEmail("wine@example.test", "fake-password"), /密码错误/);
  const api = await loadAuth();
  const account = await api.signInWithEmail("wine@example.test", "fake-password");
  assert.equal(account.syncWarning, undefined);
});
