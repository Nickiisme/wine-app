import { CORE_GRAPES, grapeCounts, recordGrapeNames, type GrapeVariety } from "./grapeCatalog";
import type { TastingRecord } from "./tastingRecords";

const STARTER = ["赤霞珠", "梅洛", "黑皮诺", "霞多丽", "长相思", "雷司令"];
export function recommendedGrapes(records: TastingRecord[]): GrapeVariety[] {
  const unlocked = new Set(Object.keys(grapeCounts(records)));
  if (unlocked.size === 0) return STARTER.map((name) => CORE_GRAPES.find((grape) => grape.chinese_name === name)!);
  const candidates: string[] = [];
  const add = (name: string) => { if (!unlocked.has(name) && !candidates.includes(name)) candidates.push(name); };
  for (const record of records) for (const name of recordGrapeNames(record)) {
    const grape = CORE_GRAPES.find((item) => item.chinese_name === name);
    grape?.comparison_grapes.forEach(add);
    if (grape?.color === "red" && ["饱满", "中等至饱满"].includes(grape.body)) add("佳美");
    if (grape?.color === "white" && grape.acidity.includes("高")) add("琼瑶浆");
  }
  [...STARTER, ...CORE_GRAPES.map((grape) => grape.chinese_name)].forEach(add);
  return candidates.slice(0, 8).map((name) => CORE_GRAPES.find((grape) => grape.chinese_name === name)!);
}
