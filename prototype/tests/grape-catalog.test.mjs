import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const source = readFileSync(new URL("../src/lib/grapeCatalog.ts", import.meta.url), "utf8");
const compiled = stripTypeScriptTypes(source);
const catalog = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const record = (grapes, fieldMetadata) => ({ grape: grapes.join("、"), grapes, fieldMetadata });

test("24 core varieties are unique and grouped", () => {
  assert.equal(catalog.CORE_GRAPES.length, 24);
  assert.equal(new Set(catalog.CORE_GRAPES.map((grape) => grape.id)).size, 24);
  assert.deepEqual(catalog.GRAPE_CHAPTERS.map(({ id }) => catalog.CORE_GRAPES.filter((grape) => grape.categories.includes(id)).length), [6, 7, 6, 5]);
});

test("aliases normalize and one variety counts once per record", () => {
  const counts = catalog.grapeCounts([record(["黑皮诺", "Pinot Noir", "马瑟兰", "Marselan"])]);
  assert.deepEqual(counts, { 黑皮诺: 1, 马瑟兰: 1 });
  assert.equal(catalog.canonicalGrapeName("Moscato"), "莫斯卡托");
});

test("unknown, uncertain and unconfirmed scan values never become discoveries", () => {
  assert.deepEqual(catalog.specialDiscoveries([record(["不确定", "混酿", "未知葡萄"])]), []);
  assert.deepEqual(catalog.specialDiscoveries([record(["马瑟兰"], { grapes: { source: "label_scan", confirmed: false } })]), []);
});

test("special discovery is announced only for its first record", () => {
  const marselan = record(["马瑟兰"]);
  assert.deepEqual(catalog.firstNewSpecialDiscovery(marselan, []), { name: "马瑟兰", first: true });
  assert.equal(catalog.firstNewSpecialDiscovery(marselan, [marselan]), null);
  assert.deepEqual(catalog.firstNewSpecialDiscovery(record(["巴贝拉"]), [marselan]), { name: "巴贝拉", first: false });
});

test("recommendations start with beginner grapes then follow comparison rules", () => {
  assert.deepEqual(catalog.recommendedGrapes([]).map((grape) => grape.chinese_name), ["赤霞珠", "梅洛", "黑皮诺", "霞多丽", "长相思", "雷司令"]);
  const next = catalog.recommendedGrapes([record(["黑皮诺"])]).map((grape) => grape.chinese_name);
  assert.equal(next[0], "佳美");
  assert.ok(next.length >= 6 && next.length <= 8);
  assert.ok(!next.includes("黑皮诺"));
});
