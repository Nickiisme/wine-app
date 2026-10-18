import { getFeedbackEvidence, type TastingRecord, type RecordFieldMetadata } from "./tastingRecords";

/** Values shown by the taste profile; only confirmed personal evidence contributes. */
export function calculateTasteProfile(records: TastingRecord[]) {
  const active = records.filter((record) => !record.deletedAt);
  const confirmed = (record: TastingRecord, key: keyof RecordFieldMetadata) => record.fieldMetadata?.[key]?.confirmed === true;
  const flavorCounts = active.flatMap((record) => getFeedbackEvidence(record).confirmedFlavors).reduce<Record<string, number>>((counts, flavor) => { counts[flavor] = (counts[flavor] ?? 0) + 1; return counts; }, {});
  const flavorTags = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, strength: Math.max(1, Math.min(5, count)) }));
  const bodyValues = active.map((record) => getFeedbackEvidence(record).confirmedBodyLevel).filter((value): value is number => typeof value === "number");
  const bodyAverage = bodyValues.length ? Math.round(bodyValues.reduce((sum, value) => sum + value, 0) / bodyValues.length) : 50;
  const preferences = [{ left: "清爽", right: "浓郁", value: bodyAverage }];
  const likedRecords = active.filter((record) => getFeedbackEvidence(record).confirmedPreference === "喜欢");
  const grapeCounts = likedRecords.filter((record) => confirmed(record, "grapes")).flatMap((record) => record.grapes ?? (record.grape ? record.grape.split("、") : [])).filter((grape) => grape && grape !== "不确定").reduce<Record<string, number>>((counts, grape) => { counts[grape] = (counts[grape] ?? 0) + 1; return counts; }, {});
  const favoriteGrapes = Object.entries(grapeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(" · ") || "继续记录后生成";
  const regionCounts = likedRecords.filter((record) => confirmed(record, "region")).reduce<Record<string, number>>((counts, record) => { if (record.region) counts[record.region] = (counts[record.region] ?? 0) + 1; return counts; }, {});
  const favoriteRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name.split("·").pop()?.trim() ?? name).join(" · ") || "继续记录后生成";
  const confirmedRecords = active.filter((record) => getFeedbackEvidence(record).mode === "tasting");
  const headline = confirmedRecords.length === 0 ? "还没有足够的已确认数据" : bodyValues.length === 0 ? "继续记录，慢慢看见你的偏好" : bodyAverage < 45 ? "偏爱清爽轻盈的风格" : bodyAverage > 65 ? "偏爱饱满浓郁的风格" : "偏爱平衡、适中的风格";
  return { flavorTags, bodyValues, preferences, favoriteGrapes, favoriteRegions, confirmedRecordCount: confirmedRecords.length, headline };
}
