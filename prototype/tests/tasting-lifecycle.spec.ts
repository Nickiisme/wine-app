import { expect, test } from '@playwright/test';

// Mock only the CloudBase boundary. Production databases and photos are never touched.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wine-atlas:onboarding-seen', 'true'));
  await page.route('**/src/lib/cloudbase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    const rows = [{id:'sample',user_id:'test-user',wine_name:'测试酒',grape:'黑皮诺',grapes:['黑皮诺'],region:'法国 · 勃艮第',country:'法国',note:'测试感受',photo_ids:[],tasted_on:'2025-09-01',tasted_at:'2025-09-01T04:00:00Z',created_at:'2026-10-17T01:00:00Z',updated_at:'2026-10-17T01:00:00Z',deleted_at:null,field_metadata:{grapes:{source:'user_selected',confirmed:true}}}];
    window.testRows = rows;
    export const ensureCloudbaseUser = async () => 'test-user';
    export const getCurrentAccount = async () => ({id:'test-user',name:'测试用户',isAnonymous:false,email:'test@example.invalid'});
    export const cloudbaseApp = {storage:{from:()=>({createSignedUrls:async()=>({data:[],error:null})})}};
    export function getCloudbasePostgres(){return {from(table){let updates, insertion;const filters=[];const q={
      select(){return q},limit(){return q},order(){return q},range(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>r[k]===v);return q},
      update(value){updates=value;return q},insert(value){insertion=value;return q},upsert(){return q},
      then(resolve){if(window.failDelete && updates?.deleted_at)return Promise.resolve({data:null,error:new Error('测试网络失败')}).then(resolve);
        if(table!=='tasting_records')return Promise.resolve({data:[],error:null}).then(resolve);
        if(insertion)rows.push({...insertion,deleted_at:null});
        const found=rows.filter(r=>filters.every(f=>f(r)));if(updates)found.forEach(r=>Object.assign(r,updates,{updated_at:new Date().toISOString()}));
        return Promise.resolve({data:found.map(r=>({...r})),error:null}).then(resolve)}
    };return q}}}
  ` }));
  await page.goto('/');
  await page.getByRole('button', { name: '稍后再说' }).click();
});

test('edit actual date preserves creation time, delete recomputes profile', async ({ page }) => {
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '查看1条品鉴记录' }).click();
  await expect(page.getByText(/品鉴于 2025年9月1日/)).toBeVisible();
  await page.getByRole('button', { name: '编辑记录', exact: true }).click();
  await page.getByRole('button', { name: /品鉴时间/ }).click();
  await page.getByLabel('品鉴日期', { exact: true }).fill('2025-08-01');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByText(/品鉴于 2025年8月1日/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).testRows[0].created_at)).toBe('2026-10-17T01:00:00Z');
  await page.getByRole('button', { name: '删除记录', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除记录', exact: true }).click();
  await expect(page.getByText('这里还没有品鉴记录。')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as any).testRows[0].deleted_at))).toBe(true);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('button', { name: '查看0条品鉴记录' })).toBeVisible();
  await page.screenshot({ path: '../docs/evidence/tasting-record-deleted.png' });
});

test('delete failure restores the visible record', async ({ page }) => {
  await page.evaluate(() => { (window as any).failDelete = true; });
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '查看1条品鉴记录' }).click();
  await page.getByRole('button', { name: '删除记录', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除记录', exact: true }).click();
  await expect(page.getByText(/删除失败，记录已恢复/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '测试酒', exact: true })).toBeVisible();
});
