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

const auth = cloudbaseApp.auth({ persistence: "local" });

export type WineAccount = {
  id: string;
  email: string | null;
  name: string;
  isAnonymous: boolean;
  syncWarning?: string;
};

type VerifyEmailCode = (code: string) => Promise<WineAccount>;

function authError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    if (/SignUpRequest\.Name|name.+regex pattern|invalid.+name/i.test(message)) {
      return new Error("昵称需要为 2–48 个字符，请修改后重试");
    }
    if (/provider\s+email\s+not\s+found|email.+provider.+not.+found/i.test(message)) {
      return new Error("CloudBase 尚未开启“邮箱验证码”登录方式，请先在控制台完成启用与发件邮箱配置");
    }
    if (/provider.+not.+found|login.+disabled|not.+enabled/i.test(message)) {
      return new Error("CloudBase 尚未开启对应的登录方式，请前往“身份认证 → 登录方式”完成配置");
    }
    return new Error(message);
  }
  return new Error(fallback);
}

async function withAuthTimeout<T>(request: Promise<T>, message: string, timeoutMs = 15000): Promise<T> {
  let timer = 0;
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => { timer = window.setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

function accountFromUser(user: any): WineAccount {
  const id = String(user?.id ?? user?.uid ?? "");
  if (!id) throw new Error("CloudBase 未返回用户 UID");
  const email = user?.email ? String(user.email) : null;
  const name = String(user?.user_metadata?.name ?? user?.user_metadata?.nickName ?? user?.name ?? user?.displayName ?? (email ? email.split("@")[0] : "葡萄酒探索者"));
  return { id, email, name, isAnonymous: Boolean(user?.is_anonymous ?? !email) };
}

async function syncProfile(account: WineAccount, nickname = account.name) {
  const { error } = await getCloudbasePostgres().from("profiles").upsert(
    { id: account.id, nickname, login_type: account.isAnonymous ? "anonymous" : "email" },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function acceptAccount(user: any, nickname?: string): Promise<WineAccount> {
  const account = accountFromUser(user);
  authPromise = Promise.resolve(account.id);
  const accepted = { ...account, name: nickname || account.name };
  try {
    await withAuthTimeout(syncProfile(accepted), "个人资料同步超时", 3000);
    return accepted;
  } catch {
    // The authentication session is already valid. A profile/database error
    // must not turn a successful sign-in or email verification into a failure.
    return { ...accepted, syncWarning: "已登录，个人资料暂未同步，请稍后重试" };
  }
}

export async function getCurrentAccount(): Promise<WineAccount | null> {
  const result = await auth.getSession();
  if (result.error) throw authError(result.error, "读取登录状态失败");
  const user = result.data.session?.user;
  return user ? accountFromUser(user) : null;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await withAuthTimeout(auth.signInWithPassword({ email: email.trim(), password }), "登录请求超时，请检查网络后重试");
  if (result.error || !result.data.user) throw authError(result.error, "登录失败");
  return acceptAccount(result.data.user);
}

export async function beginEmailRegistration(email: string, password: string, nickname: string): Promise<VerifyEmailCode> {
  const session = await withAuthTimeout(auth.getSession(), "登录状态读取超时，请刷新页面后重试");
  const current = session.data.session;
  const result = await withAuthTimeout(auth.signUp({
    email: email.trim(),
    password,
    name: nickname.trim(),
    anonymous_token: current?.user?.is_anonymous ? current.access_token : undefined,
  }), "验证码发送超时，请检查网络或 CloudBase 邮件配置");
  if (result.error || !result.data.verifyOtp) throw authError(result.error, "验证码发送失败");
  return async (code: string) => {
    const verified = await result.data.verifyOtp!({ token: code.trim() });
    if (verified.error || !verified.data.user) throw authError(verified.error, "验证码不正确或已过期");
    return acceptAccount(verified.data.user, nickname.trim());
  };
}

export async function beginEmailOtpLogin(email: string): Promise<VerifyEmailCode> {
  const result = await withAuthTimeout(auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }), "验证码发送超时，请检查网络或 CloudBase 邮件配置");
  if (result.error || !result.data.verifyOtp) throw authError(result.error, "验证码发送失败");
  return async (code: string) => {
    const verified = await result.data.verifyOtp!({ token: code.trim() });
    if (verified.error || !verified.data.user) throw authError(verified.error, "验证码不正确或已过期");
    return acceptAccount(verified.data.user);
  };
}

export async function sendPasswordReset(email: string) {
  const result = await withAuthTimeout(auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href }), "重置邮件发送超时，请稍后重试");
  if (result.error) throw authError(result.error, "重置邮件发送失败");
}

export async function signOutToGuest() {
  await auth.signOut();
  authPromise = null;
  await ensureCloudbaseUser();
  const account = await getCurrentAccount();
  if (!account) throw new Error("游客身份初始化失败");
  await syncProfile(account);
  return account;
}

/** Ensures every browser has an authenticated CloudBase identity before data access. */
export function ensureCloudbaseUser(): Promise<string> {
  if (!authPromise) {
    authPromise = (async () => {
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
