// This probe only targets the single preallocated record in its manifest.
const RECORD_ID = "32b47abb-7a3d-471a-987b-837f5eae69b0";
const WINE_NAME = "[MINIAPP-SPIKE] 32b47abb-7a3d-471a-987b-837f5eae69b0";
module.exports = async function(app, expectedEmail) {
  const out = { runId: RECORD_ID, payloadVariant: 'legacy_without_grapes_and_field_metadata', steps: [], cleanup: 'NOT_NEEDED' };
  const session = await app.auth().getSession();
  const user = session.data && session.data.session && session.data.session.user;
  if (session.error || !user || user.email !== expectedEmail) throw new Error('Expected test-account session required');
  const uid = user.id || user.uid;
  const db = app.rdb();
  const own = () => db.from('tasting_records').select('id,note,deleted_at').eq('id', RECORD_ID).eq('user_id',uid).eq('wine_name',WINE_NAME);
  const check = (r) => { if (r.error) throw new Error(String(r.error.code || 'DB_ERROR') + ': ' + String(r.error.message || '').slice(0,300)); return r.data || []; };
  const before = check(await db.from('tasting_records').select('id').eq('id', RECORD_ID));
  if (before.length) throw new Error('Manifest record already exists; refuse to rerun');
  // Reject before writing if the lifecycle columns required for cleanup do not exist.
  check(await db.from('tasting_records').select('id,deleted_at,tasted_on').limit(0));
  let insertAttempted = false;
  try {
    insertAttempted = true;
    check(await db.from('tasting_records').insert({
      id: RECORD_ID, user_id: uid, wine_name: WINE_NAME, grape: '测试葡萄',
      region: '', photo_ids: [], note: 'compatibility probe', flavors: [],
      tasted_on: '2026-10-18', tasted_at: '2026-10-18T04:00:00.000Z'
    }));
    out.steps.push({name:'insertOwn',status:'PASS'});
    const read = check(await own());
    out.steps.push({name:'readKnownOwn',status:read.length === 1 && read[0].note === 'compatibility probe' ? 'PASS':'FAIL'});
    check(await db.from('tasting_records').update({note:'compatibility probe updated'}).eq('id',RECORD_ID).eq('user_id',uid).eq('wine_name',WINE_NAME));
    const updated = check(await own());
    out.steps.push({name:'updateOwn',status:updated.length === 1 && updated[0].note === 'compatibility probe updated' ? 'PASS':'FAIL'});
  } catch (e) { out.error = String(e.message).slice(0,150); }
  finally {
    if (insertAttempted) {
      try {
        check(await db.from('tasting_records').update({deleted_at:new Date().toISOString()}).eq('id',RECORD_ID).eq('user_id',uid).eq('wine_name',WINE_NAME));
        const rows = check(await own());
        const active = check(await db.from('tasting_records').select('id').eq('id',RECORD_ID).eq('user_id',uid).is('deleted_at',null));
        out.cleanup = rows.length === 1 && rows[0].deleted_at && active.length === 0 ? 'SOFT_DELETED_VERIFIED' : rows.length === 0 ? 'NO_VISIBLE_ROW' : 'NEEDS_REVIEW';
        out.steps.push({name:'softDeleteOwn',status:out.cleanup === 'SOFT_DELETED_VERIFIED' ? 'PASS':'NOT_VERIFIED'});
      } catch (e) { out.cleanup='FAILED'; out.cleanupError=String(e.message).slice(0,150); }
    }
  }
  return out;
};
