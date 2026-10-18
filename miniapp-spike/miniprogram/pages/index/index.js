Page({
  data: { result: '等待本地诊断', completed: false },
  onLoad() { this.runLocalDiagnostics(); },
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
