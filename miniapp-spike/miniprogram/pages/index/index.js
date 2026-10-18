Page({
  data: { result: '等待本地诊断', completed: false, loginBusy: false, formError: '', showLocal: false },
  onLoad() { this.runLocalDiagnostics(); },
  toggleLocal() { this.setData({ showLocal: !this.data.showLocal }); },
  async submitTestLogin(event) {
    if (this.data.loginBusy) return;
    let { email, password } = (event.detail && event.detail.value) || {};
    email = typeof email === 'string' ? email.trim() : '';
    if (!email || typeof password !== 'string' || !password) {
      this.setData({ formError: !email ? '请输入测试账号邮箱' : '请输入该账号的密码' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ formError: '请输入完整的邮箱地址' });
      return;
    }
    event.detail.value.password = '';
    this.setData({ loginBusy: true, formError: '', authResult: '' });
    try { await this.testEmailLogin(email.trim(), password); }
    finally { email = undefined; password = undefined; this.setData({ loginBusy: false }); }
  },
  async testOwnPhoto(expectedEmail) {
    const sdk = require('../../vendor/cloudbase/index.js');
    const result = await require('../../owner-photo-probe.js')(sdk.init({ env: 'wine-app-d6grgbodge1334980' }), expectedEmail);
    this.setData({ photoResult: JSON.stringify(result, null, 2) });
    return result;
  },
  async testOwnRecord(expectedEmail) {
    const sdk = require('../../vendor/cloudbase/index.js');
    const app = sdk.init({ env: 'wine-app-d6grgbodge1334980' });
    const result = await require('../../owner-record-probe.js')(app, expectedEmail);
    this.setData({ recordResult: JSON.stringify(result, null, 2) });
    return result;
  },
  async testEmailLogin(email, password) {
    // Credentials are supplied only for this invocation, never put in page data or logs.
    const result = { stage: 'EMAIL_LOGIN_READ_ONLY', login: 'NOT_RUN', ownRead: 'NOT_RUN' };
    const safeError = (error) => {
      let message = String(error && error.message || 'No message');
      for (const secret of [email, password]) if (secret) message = message.split(secret).join('[REDACTED]');
      message = message.replace(/Bearer\s+\S+|eyJ[\w.-]+/g, '[REDACTED]');
      return { code: String(error && (error.code || error.name) || 'UNKNOWN').slice(0, 100), message: message.slice(0, 500) };
    };
    try {
      const sdk = require('../../vendor/cloudbase/index.js');
      const app = sdk.init({ env: 'wine-app-d6grgbodge1334980' });
      const auth = app.auth();
      result.phase = 'signInWithPassword';
      const response = await auth.signInWithPassword({ email, password });
      if (response.error) { result.login = 'ERROR'; result.error = safeError(response.error); }
      else {
        const uid = response.data && response.data.user && (response.data.user.id || response.data.user.uid);
        result.login = uid ? 'SUCCESS_WITH_UID' : 'MISSING_UID';
        if (uid) {
          result.phase = 'getSession';
          const session = await auth.getSession();
          const user = session.data && session.data.session && session.data.session.user;
          result.sessionMatchesLogin = !!user && (user.id || user.uid) === uid;
          result.phase = 'selectOwnRecord';
          const query = await app.rdb().from('tasting_records').select('id').eq('user_id', uid).limit(1);
          result.ownRead = query.error ? 'ERROR' : 'SUCCESS';
          result.returnedRows = Array.isArray(query.data) ? query.data.length : null;
          if (query.error) result.error = safeError(query.error);
        }
      }
    } catch (error) { result.error = safeError(error); }
    finally { email = undefined; password = undefined; }
    // No UID, token, user object or raw SDK response leaves the method.
    this.setData({ authResult: JSON.stringify(result, null, 2) });
    return result;
  },
  runLocalDiagnostics() {
    const account = wx.getAccountInfoSync();
    const result = {
      stage: 'LOCAL_ONLY',
      appId: account.miniProgram.appId,
      expectedAppId: 'wx5c33b5cc2b34a20a',
      candidateEnvironment: 'wine-app-d6grgbodge1334980',
      environmentInitialized: false,
      sdkVersion: '3.10.2',
      cloudBaseUid: 'NOT_REQUESTED',
      loginStatus: 'NOT_REQUESTED',
      businessRequestsExecuted: 0,
      cloudInitialized: false,
      wxCloudAvailable: typeof wx.cloud !== 'undefined'
    };
    try {
      const sdk = require('../../vendor/cloudbase/index.js');
      result.sdkLoaded = true;
      result.sdkInitAvailable = typeof sdk.init === 'function';
      // Do not call init/auth/login here. Export availability is not compatibility proof.
    } catch (error) {
      result.sdkLoaded = false;
      result.error = String(error.message || error);
    }
    this.setData({ result: JSON.stringify(result, null, 2), completed: true });
  }
});
