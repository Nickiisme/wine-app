import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Node's built-in type stripping needs explicit extensions for source imports.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith("./") && context.parentURL?.endsWith(".ts") ? `${specifier}.ts` : specifier, context);
} });

const { getProfileBadges, getNewBadgeAward } = await import("../src/lib/badges.ts");
const { calculateTasteProfile } = await import("../src/lib/tasteProfile.ts");
const { recommendedGrapes } = await import("../src/lib/exploration.ts");
const { getFeedbackEvidence } = await import("../src/lib/tastingRecords.ts");

const field = (source = "user_selected", confirmed = true) => ({ source, confirmed });
const record = (id, overrides = {}) => ({ id, grape: "", grapes: [], wine: "酒款", region: "", date: "1月1日", note: "", tastedOn: `2026-01-${id.padStart(2, "0")}`, ...overrides });
const badge = (badges, name) => badges.find((item) => item.name === name);

test("badges use active records and confirmed grape provenance", () => {
  const unconfirmed = record("1", { grapes: ["赤霞珠", "梅洛", "黑皮诺"], fieldMetadata: { grapes: field("label_scan", false) } });
  assert.equal(badge(getProfileBadges([unconfirmed]), "初次举杯").state, "earned");
  assert.equal(badge(getProfileBadges([unconfirmed]), "品种探索").state, "locked");
  const confirmed = record("2", { grapes: ["赤霞珠", "梅洛", "黑皮诺"], fieldMetadata: { grapes: field() } });
  assert.equal(badge(getProfileBadges([confirmed]), "品种探索").state, "earned");
  assert.equal(badge(getProfileBadges([{ ...confirmed, deletedAt: "2026-01-03" }]), "初次举杯").state, "locked");
  assert.equal(getNewBadgeAward([], confirmed, 0)?.name, "初次举杯");
});

test("taste profile excludes inferred, unconfirmed, and deleted feedback", () => {
  const trusted = record("1", { grape: "黑皮诺", grapes: ["黑皮诺"], region: "法国·勃艮第", preference: "喜欢", bodyLevel: 38, flavors: ["玫瑰"], fieldMetadata: { grapes: field(), region: field(), preference: field(), bodyLevel: field(), flavors: field() } });
  const inferred = record("2", { grape: "梅洛", grapes: ["梅洛"], region: "法国·波尔多", preference: "喜欢", bodyLevel: 88, flavors: ["烟熏"], fieldMetadata: { grapes: field("label_scan", false), region: field("label_scan", false), preference: field("inferred"), bodyLevel: field("inferred"), flavors: field("inferred") } });
  assert.equal(getFeedbackEvidence(inferred).mode, "quick_save");
  const profile = calculateTasteProfile([trusted, inferred, { ...trusted, id: "3", deletedAt: "2026-01-04" }]);
  assert.equal(profile.headline, "偏爱清爽轻盈的风格");
  assert.equal(profile.confirmedRecordCount, 1);
  assert.deepEqual(profile.flavorTags, [{ name: "玫瑰", strength: 1 }]);
  assert.equal(profile.favoriteGrapes, "黑皮诺");
  assert.equal(profile.favoriteRegions, "勃艮第");
});

test("exploration recommendations are deterministic without browser APIs", () => {
  assert.equal(recommendedGrapes([]).length, 6);
  const next = recommendedGrapes([record("1", { grapes: ["黑皮诺"], grape: "黑皮诺", fieldMetadata: { grapes: field() } })]);
  assert.equal(next[0].chinese_name, "佳美");
  assert.ok(next.every((grape) => grape.chinese_name !== "黑皮诺"));
});
