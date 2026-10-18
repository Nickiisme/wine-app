const RUN_ID = '32b47abb-7a3d-471a-987b-837f5eae69b0';
module.exports = async function(app, expectedEmail, inputKind = 'arraybuffer') {
  const s = await app.auth().getSession();
  const user = s.data && s.data.session && s.data.session.user;
  if (s.error || !user || user.email !== expectedEmail) throw new Error('Expected test-account session required');
  const uid = user.id || user.uid;
  const path = uid + '/' + RUN_ID + '/miniapp-probe.png';
  const local = wx.env.USER_DATA_PATH + '/miniapp-probe-' + RUN_ID + '.png';
  const bucket = app.storage.from('tasting-photos');
  const out = {runId: RUN_ID, inputKind, steps: [], cleanup: 'NOT_NEEDED'};
  const check = r => { if (r.error) throw new Error(String(r.error.code || r.error.name || 'STORAGE_ERROR')); return r.data; };
  const fs = wx.getFileSystemManager();
  let attempted = false;
  try {
    const existing = check(await bucket.exists(path));
    if (existing !== false) throw new Error('Existing probe file; refuse overwrite');
    fs.writeFileSync(local, wx.base64ToArrayBuffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
    attempted = true;
    const uploaded = check(await bucket.upload(path, inputKind === 'localpath' ? local : fs.readFileSync(local), {contentType:'image/png',upsert:false}));
    out.steps.push({name:'uploadPhoto',status:'PASS'});
    out.savedPathMatches = uploaded && uploaded.path === path;
    const signed = check(await bucket.createSignedUrl(path,60));
    out.signedResponseKeys = signed && typeof signed === 'object' ? Object.keys(signed) : [];
    const signedUrl = signed && (signed.fullSignedURL || signed.signedUrl);
    if (typeof signedUrl !== 'string' || !/^https:\/\//.test(signedUrl)) throw new Error('Missing signed URL');
    out.steps.push({name:'signOwnPhoto',status:'PASS',requestedExpirySeconds:60});
    const response = await new Promise((resolve,reject) => wx.request({url:signedUrl,responseType:'arraybuffer',success:resolve,fail:()=>reject(new Error('DOWNLOAD_FAILED'))}));
    const bytes = new Uint8Array(response.data);
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    out.steps.push({name:'fetchSignedPhoto',status:response.statusCode === 200 && png ? 'PASS':'FAIL',httpStatus:response.statusCode,byteLength:bytes.length,pngSignature:png,firstBytes:Array.from(bytes.slice(0,8))});
  } catch(e) { out.error=String(e.message).slice(0,150); }
  finally {
    if(attempted) {
      try {
        check(await bucket.remove([path]));
        const remaining = check(await bucket.exists(path));
        out.cleanup = remaining === false ? 'DELETED_VERIFIED':'NEEDS_REVIEW';
      } catch(e) {out.cleanup='FAILED';out.cleanupError=String(e.message).slice(0,150);}
    }
    try {fs.unlinkSync(local);} catch (_) {}
  }
  return out;
};
