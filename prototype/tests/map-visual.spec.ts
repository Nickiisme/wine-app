import { expect, test } from "@playwright/test";

test("world, enlarged country layer, and country region layer render", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wine-atlas:onboarding-seen", "true"));
  await page.goto("/");
  await page.getByRole("tab", { name: "产区地图" }).click();

  const world = page.getByLabel("可缩放的世界葡萄酒产区地图");
  await expect(world.getByRole("button", { name: /法国/ })).toBeVisible();
  await expect(world.getByRole("button", { name: /西班牙/ })).toHaveCount(0);
  await page.screenshot({ path: "../docs/evidence/wine-map-level-1.png", fullPage: true });

  await world.dblclick({ position: { x: 170, y: 250 } });
  await expect(page.getByRole("button", { name: /更多国家/ })).toBeVisible();
  await expect(world.getByRole("button", { name: /西班牙/ })).toBeVisible();
  await page.screenshot({ path: "../docs/evidence/wine-map-level-2.png", fullPage: true });

  await page.getByRole("button", { name: /更多国家/ }).click();
  await page.getByRole("button", { name: /^西班牙/ }).last().click();
  await expect(page.getByRole("button", { name: /里奥哈/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /拉曼恰/ })).toBeVisible();
  await page.screenshot({ path: "../docs/evidence/wine-map-level-3-spain.png", fullPage: true });
});
