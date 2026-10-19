import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCellarRequestRunner } from '../src/lib/cellarRequests.ts';
const receipt={movement_id:'movement-1',quantity_remaining:2};
function setup() {
 const state=new Map(); const storage={get:k=>state.get(k)??null,set:(k,v)=>state.set(k,v)};
 const base={userId:'A',entryId:'E',intentId:'R1',fingerprint:'same',rpcName:'consume_cellar_entry_v2',prepare:async()=>({p_request_id:'R1'})};
 return {storage,base};
}
test('lost response and reload resend the exact envelope and key',async()=>{
 const {storage,base}=setup();let first;
 await assert.rejects(createCellarRequestRunner(storage)({...base,rpc:async(name,args)=>{first=args;throw new Error('lost response');}}));
 let prepared=false;
 const recovered=await createCellarRequestRunner(storage)({...base,intentId:'new-ui-id',prepare:async()=>{prepared=true;return {};},rpc:async(name,args)=>{assert.deepEqual(args,first);return {data:receipt,error:null};}});
 assert.equal(prepared,false);assert.deepEqual(recovered.result,receipt);
});
test('double click shares one network call, completed same intent never deducts again',async()=>{
 const {storage,base}=setup(); const run=createCellarRequestRunner(storage);let calls=0;
 const options={...base,rpc:async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {data:receipt,error:null};}};
 await Promise.all([run(options),run(options)]);await run(options);assert.equal(calls,1);
});
test('uncertain pending operation rejects changed contents and separates accounts',async()=>{
 const {storage,base}=setup();const run=createCellarRequestRunner(storage);
 await assert.rejects(run({...base,rpc:async()=>{throw new Error('timeout');}}));
 await assert.rejects(run({...base,fingerprint:'changed',rpc:async()=>assert.fail('must not send')}),/原内容/);
 await run({...base,userId:'B',fingerprint:'changed',rpc:async()=>({data:receipt,error:null})});
});
test('confirmed SQL rollback permits corrected retry; storage failure sends nothing',async()=>{
 const {storage,base}=setup();const run=createCellarRequestRunner(storage);
 await assert.rejects(run({...base,rpc:async()=>({error:{code:'DATABASE_23514'},data:null})}));
 await run({...base,fingerprint:'fixed',rpc:async()=>({data:receipt,error:null})});
 await assert.rejects(createCellarRequestRunner({get:()=>null,set:()=>{throw new Error('disk full');}})({...base,rpc:async()=>assert.fail('must not send')}),/disk full/);
});
test('a new completed intent may consume again using a new key',async()=>{
 const {storage,base}=setup();const run=createCellarRequestRunner(storage);let keys=[];
 const rpc=async(_,args)=>{keys.push(args.p_request_id);return {data:receipt,error:null};};
 await run({...base,rpc});await run({...base,intentId:'R2',prepare:async()=>({p_request_id:'R2'}),rpc});
 assert.deepEqual(keys,['R1','R2']);
});
