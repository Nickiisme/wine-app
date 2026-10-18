import { getFeedbackEvidence, type TastingRecord } from "./tastingRecords";
import { recordGrapeNames, SPECIAL_GRAPES } from "./grapeCatalog";
import { tastingDate, tastingTime } from "./tastingDates";

export type BadgeDefinition = { name: string; description: string; image: string; progress: number; target: number; earnedAt?: string; state?: "earned" | "in-progress" | "locked" };

export function getProfileBadges(records: TastingRecord[], cellarCount = 0, cellarEarnedAt?: string): BadgeDefinition[] {
  records = records.filter(record => !record.deletedAt);
  const chronological = records.filter(record => !record.deletedAt).sort((a, b) => tastingTime(a) - tastingTime(b) || a.id.localeCompare(b.id));
  const confirmedGrapes = new Set<string>();
  const confirmedCountries = new Set<string>();
  const confirmedRegions = new Set<string>();
  const confirmedFlavors = new Set<string>();
  const qualification = (test: (record: TastingRecord) => boolean) => { const matched = chronological.find(test); return matched ? tastingDate(matched) || undefined : undefined; };
  for (const record of chronological) {
    if (record.fieldMetadata?.grapes?.confirmed && record.fieldMetadata.grapes.source !== "default") recordGrapeNames(record).forEach((grape) => confirmedGrapes.add(grape));
    if (record.fieldMetadata?.country?.confirmed && record.fieldMetadata.country.source !== "default" && record.country) confirmedCountries.add(record.country);
    if (record.fieldMetadata?.region?.confirmed && record.fieldMetadata.region.source !== "default" && record.region) confirmedRegions.add(record.region);
    if (record.fieldMetadata?.flavors?.confirmed && record.fieldMetadata.flavors.source === "user_selected") (record.flavors ?? []).forEach((flavor) => confirmedFlavors.add(flavor));
  }
  const firstTaste = qualification((record) => getFeedbackEvidence(record).mode === "tasting");
  const countAt = (target: number, values: (record: TastingRecord) => string[]) => { const seen = new Set<string>(); return qualification((record) => { values(record).forEach((value) => seen.add(value)); return seen.size >= target; }); };
  const progress = (target: number, values: Set<string>) => Math.min(values.size, target);
  const text = (record: TastingRecord) => `${record.wine} ${record.grape} ${(record.grapes ?? []).join(" ")} ${record.note}`.toLowerCase();
  const hasText = (record: TastingRecord, words: string[]) => words.some((word) => text(record).includes(word));
  const special = (test: (record: TastingRecord) => boolean) => qualification(test);
  const blendAt = special((record) => (record.grapes ?? []).length > 1 || hasText(record, ["混酿", "blend"]));
  const sparklingAt = special((record) => hasText(record, ["起泡", "香槟", "sparkling", "champagne", "prosecco"]));
  const sweetAt = special((record) => hasText(record, ["甜酒", "甜型", "贵腐", "冰酒", "晚收", "sweet", "icewine"]));
  const fortifiedAt = special((record) => hasText(record, ["波特", "雪莉", "加强", "port", "sherry"]));
  const heritageAt = special((record) => recordGrapeNames(record).some((name) => SPECIAL_GRAPES.some((grape) => grape.chinese_name === name)));
  const oldWorld = new Set(["法国", "意大利", "西班牙", "德国", "葡萄牙", "奥地利", "希腊", "匈牙利", "格鲁吉亚"]);
  const newWorld = new Set(["美国", "智利", "阿根廷", "澳大利亚", "新西兰", "南非", "中国", "加拿大", "乌拉圭"]);
  const oldNewAt = qualification((record) => { const grapes = recordGrapeNames(record); return grapes.some((grape) => chronological.some((other) => other !== record && tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && oldWorld.has(record.country ?? "") && newWorld.has(other.country ?? ""))) || grapes.some((grape) => chronological.some((other) => other !== record && tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && newWorld.has(record.country ?? "") && oldWorld.has(other.country ?? ""))); });
  const terroirAt = qualification((record) => recordGrapeNames(record).some((grape) => new Set(chronological.filter((other) => tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && other.region).map((other) => other.region)).size >= 3));
  const chinaAt = qualification((record) => new Set(chronological.filter((item) => tastingDate(item) && tastingDate(record) && (tastingDate(item) <= tastingDate(record)) && item.country === "中国" && item.region).map((item) => item.region)).size >= 3);
  const definitions: BadgeDefinition[] = [
    { name: "初次举杯", description: "保存第一杯", image: "first-glass.png", progress: Math.min(records.length, 1), target: 1, earnedAt: chronological[0] ? tastingDate(chronological[0]) : undefined },
    { name: "品鉴初识", description: "写下首次真实感受", image: "first-review.png", progress: firstTaste ? 1 : 0, target: 1, earnedAt: firstTaste },
    { name: "品种探索", description: "记录 3 种已确认葡萄", image: "three-grapes.png", progress: progress(3, confirmedGrapes), target: 3, earnedAt: countAt(3, (record) => recordGrapeNames(record)) },
    { name: "产地旅人", description: "记录 3 个已确认国家", image: "three-countries.png", progress: progress(3, confirmedCountries), target: 3, earnedAt: countAt(3, (record) => record.fieldMetadata?.country?.confirmed && record.country ? [record.country] : []) },
    { name: "记录达人", description: "完成 10 条品鉴记录", image: "first-tasting-v2.png", progress: Math.min(records.length, 10), target: 10, earnedAt: chronological[9] ? tastingDate(chronological[9]) : undefined },
    { name: "品种收藏家", description: "探索 12 种核心葡萄", image: "variety-explorer.png", progress: progress(12, confirmedGrapes), target: 12, earnedAt: countAt(12, (record) => recordGrapeNames(record)) },
    { name: "产区漫游者", description: "探索 8 个葡萄酒产区", image: "region-explorer.png", progress: progress(8, confirmedRegions), target: 8, earnedAt: countAt(8, (record) => record.fieldMetadata?.region?.confirmed && record.region ? [record.region] : []) },
    { name: "风味入门", description: "记录 3 类真实风味", image: "flavor-notes.png", progress: progress(3, confirmedFlavors), target: 3, earnedAt: countAt(3, (record) => record.fieldMetadata?.flavors?.confirmed && record.flavors ? record.flavors : []) },
    { name: "我的酒窖", description: "收藏第一瓶藏酒", image: "cellar-keeper.png", progress: Math.min(cellarCount, 1), target: 1, earnedAt: cellarCount ? cellarEarnedAt : undefined },
    { name: "混酿初体验", description: "首次记录混酿葡萄酒", image: "discovery-blend.png", progress: blendAt ? 1 : 0, target: 1, earnedAt: blendAt },
    { name: "气泡时刻", description: "首次记录起泡酒", image: "discovery-sparkling.png", progress: sparklingAt ? 1 : 0, target: 1, earnedAt: sparklingAt },
    { name: "甜蜜发现", description: "首次记录甜酒", image: "discovery-sweet.png", progress: sweetAt ? 1 : 0, target: 1, earnedAt: sweetAt },
    { name: "加强之味", description: "首次记录波特、雪莉等加强酒", image: "discovery-fortified.png", progress: fortifiedAt ? 1 : 0, target: 1, earnedAt: fortifiedAt },
    { name: "古老品种", description: "记录一个特别品种", image: "discovery-heritage-grape.png", progress: heritageAt ? 1 : 0, target: 1, earnedAt: heritageAt },
    { name: "新旧世界", description: "同一品种探索新旧世界", image: "discovery-old-new-world.png", progress: oldNewAt ? 1 : 0, target: 1, earnedAt: oldNewAt },
    { name: "同品种不同风土", description: "同一品种探索 3 个产区", image: "discovery-terroir.png", progress: terroirAt ? 1 : 0, target: 1, earnedAt: terroirAt },
    { name: "中国风土", description: "探索 3 个中国葡萄酒产区", image: "discovery-china-terroir.png", progress: chinaAt ? 1 : 0, target: 1, earnedAt: chinaAt },
  ];
  return definitions.map((badge) => ({ ...badge, state: badge.earnedAt ? "earned" : badge.progress > 0 ? "in-progress" : "locked" }));
}

export function getNewBadgeAward(records: TastingRecord[], saved: TastingRecord, cellarCount: number) {
  const before = new Set(getProfileBadges(records, cellarCount).filter((badge) => badge.state === "earned").map((badge) => badge.name));
  return getProfileBadges([...records, saved], cellarCount).find((badge) => badge.state === "earned" && !before.has(badge.name)) ?? null;
}

