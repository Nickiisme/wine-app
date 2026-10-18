import { expect, test, type Page } from '@playwright/test';

async function openRecordDrawer(page: Page) {
  const row = page.locator('.record-swipe').first();
  const box = (await row.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(50, box.height / 2));
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  await expect(row).toHaveClass(/is-open/);
}

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
  await openRecordDrawer(page);
  await page.getByRole('button', { name: '编辑记录', exact: true }).click();
  await expect(page.getByText('确认酒款', { exact: true })).toBeVisible();
  await expect(page.getByLabel('酒款名称')).toHaveValue('测试酒');
  await page.getByRole('button', { name: '继续写品酒感受' }).click();
  await expect(page.getByText('你的感受', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /品鉴时间/ }).click();
  await page.getByLabel('品鉴日期', { exact: true }).fill('2025-08-01');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByText(/品鉴于 2025年8月1日/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).testRows[0].created_at)).toBe('2026-10-17T01:00:00Z');
  await openRecordDrawer(page);
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
  await openRecordDrawer(page);
  await page.getByRole('button', { name: '删除记录', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除记录', exact: true }).click();
  await expect(page.getByText(/删除失败，记录已恢复/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '测试酒', exact: true })).toBeVisible();
});

test('record actions reveal on left swipe and long press, not vertical drag', async ({ page }) => {
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '查看1条品鉴记录' }).click();
  await expect(page.getByRole('button', { name: '编辑记录', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /记录操作/ })).toHaveCount(0);
  const row = page.locator('.record-swipe');
  const box = (await row.boundingBox())!;
  const x = box.x + 100, y = box.y + 50;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 80, { steps: 10 }); await page.mouse.up();
  await expect(row).not.toHaveClass(/is-open/);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 90, y, { steps: 10 }); await page.mouse.up();
  await expect(row).toHaveClass(/is-open/);
  await expect(row.locator('.record-swipe-content')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -126, 0)');
  await page.getByTestId('device-screen').screenshot({ path: '../docs/evidence/record-action-drawer.png' });
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90, y, { steps: 10 }); await page.mouse.up();
  await expect(row).not.toHaveClass(/is-open/);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  await expect(row).toHaveClass(/is-open/);
});

test('embedded camera captures, allows retake, releases the stream on close', async ({ page }) => {
  await page.evaluate(() => {
    (window as any).cameraStreams = [];
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext('2d')!; context.fillStyle = '#eeddbb'; context.fillRect(0, 0, 640, 480);
      const stream = canvas.captureStream(10); (window as any).cameraStreams.push(stream); return stream;
    } });
  });
  await page.getByRole('button', { name: '记录一杯' }).click();
  await page.getByRole('button', { name: '开启相机', exact: true }).click();
  await expect(page.getByRole('button', { name: '拍照', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '拍照', exact: true }).click();
  await expect(page.getByAltText('刚拍摄的酒标')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).cameraStreams[0].getTracks()[0].readyState)).toBe('ended');
  await page.screenshot({ path: '../docs/evidence/inline-camera-capture.png' });
  await page.getByRole('button', { name: '重拍', exact: true }).click();
  await expect(page.getByRole('button', { name: '拍照', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).cameraStreams[1].getTracks()[0].readyState)).toBe('ended');
});

test('denied camera permission keeps system camera and gallery available', async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('denied', 'NotAllowedError'); } }));
  await page.getByRole('button', { name: '记录一杯' }).click();
  await page.getByRole('button', { name: '开启相机', exact: true }).click();
  await expect(page.getByText(/未获得相机权限/)).toBeVisible();
  await expect(page.getByRole('button', { name: '使用系统相机' })).toBeVisible();
  await expect(page.getByRole('button', { name: /从相册导入/ })).toBeVisible();
});

test('saving returns to the atlas, flips in a card, then shows a three-second knowledge toast', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.getByRole('button', { name: '记录一杯' }).click();
  await page.getByRole('button', { name: /手动记录/ }).click();
  await page.getByRole('button', { name: /葡萄品种，当前为未填写/ }).click();
  await page.getByRole('button', { name: /黑皮诺 · Pinot Noir/ }).click();
  await page.getByRole('button', { name: /完成（已选 1）/ }).click();
  await page.getByRole('button', { name: '继续写品酒感受' }).click();
  await page.getByRole('button', { name: '保存记录' }).click();

  await expect(page.getByRole('tab', { name: '品种图鉴' })).toHaveAttribute('aria-selected', 'true');
  const card = page.getByRole('dialog', { name: /黑皮诺.*已点亮/ });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('下次品尝时可以留意');
  await page.waitForTimeout(700);
  await page.getByTestId('device-screen').screenshot({ path: '../docs/evidence/save-celebration-card.png' });

  await card.getByRole('button', { name: '继续探索' }).click();
  await expect(page.getByRole('status').filter({ hasText: '下次品尝时可以留意' })).toBeVisible();
  await page.waitForTimeout(350);
  await page.getByTestId('device-screen').screenshot({ path: '../docs/evidence/save-knowledge-toast.png' });
  await expect(page.getByRole('status').filter({ hasText: '下次品尝时可以留意' })).toHaveCount(0, { timeout: 4000 });
  expect(runtimeErrors).toEqual([]);
});
