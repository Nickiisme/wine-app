import { getFeedbackEvidence, type TastingRecord } from "./tastingRecords";
import { canonicalGrapeName, recordGrapeNames } from "./grapeCatalog";
import { tastingTime } from "./tastingDates";
import { resolveMapArea } from "./mapLayers";

export type RecordFilter =
  | { kind: "grape"; grape: string }
  | { kind: "region"; country: string; region: string }
  | null;

export type GrapeSummary = {
  name: string;
  count: number;
  likedCount: number;
  recentDate: string;
  flavors: string[];
};

export type RegionSummary = {
  country: string;
  count: number;
  regions: {
    name: string;
    count: number;
    likedCount: number;
    recentDate: string;
    grapes: string[];
  }[];
};

export function getRecordGrapes(record: TastingRecord) {
  return recordGrapeNames(record);
}

export function getRecordLocation(record: TastingRecord) {
  const parts = record.region.split("·").map((part) => part.trim()).filter(Boolean);
  const country = record.country?.trim() || (parts.length > 1 ? parts[0] : "国家未确定");
  const region = parts.length > 1 ? parts.slice(1).join(" · ") : parts[0] === country ? "" : parts[0] || "";
  return { country, region };
}

function recordTime(record: TastingRecord) { return tastingTime(record); }

function recentDate(record: TastingRecord) {
  const timestamp = recordTime(record);
  return timestamp ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(timestamp) : record.date;
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value]) => value);
}

export function sortRecordsNewestFirst(records: TastingRecord[]) {
  return records.filter(record => !record.deletedAt).sort((a, b) => recordTime(b) - recordTime(a) || a.id.localeCompare(b.id));
}

export function filterTastingRecords(records: TastingRecord[], filter: RecordFilter) {
  const sorted = sortRecordsNewestFirst(records);
  if (!filter) return sorted;
  if (filter.kind === "grape") return sorted.filter((record) => getRecordGrapes(record).includes(canonicalGrapeName(filter.grape) ?? filter.grape));
  return sorted.filter((record) => {
    const location = getRecordLocation(record);
    if (location.country !== filter.country) return false;
    const recordArea = resolveMapArea(location.country, location.region);
    const filterArea = resolveMapArea(filter.country, filter.region);
    return recordArea.id === filterArea.id;
  });
}

export function summarizeGrapes(records: TastingRecord[]): GrapeSummary[] {
  const groups = new Map<string, TastingRecord[]>();
  sortRecordsNewestFirst(records).forEach((record) => {
    getRecordGrapes(record).forEach((grape) => groups.set(grape, [...(groups.get(grape) ?? []), record]));
  });
  return [...groups].map(([name, entries]) => ({
    name,
    count: entries.length,
    likedCount: entries.filter((record) => getFeedbackEvidence(record).confirmedPreference === "喜欢").length,
    recentDate: recentDate(entries[0]),
    flavors: topValues(entries.flatMap((record) => getFeedbackEvidence(record).confirmedFlavors), 3),
  }));
}

export function summarizeRegions(records: TastingRecord[]): RegionSummary[] {
  const countries = new Map<string, { records: TastingRecord[]; regions: Map<string, TastingRecord[]> }>();
  sortRecordsNewestFirst(records).forEach((record) => {
    const { country, region } = getRecordLocation(record);
    if (!country) return;
    const group = countries.get(country) ?? { records: [], regions: new Map<string, TastingRecord[]>() };
    group.records.push(record);
    group.regions.set(region, [...(group.regions.get(region) ?? []), record]);
    countries.set(country, group);
  });
  return [...countries].map(([country, group]) => ({
    country,
    count: group.records.length,
    regions: [...group.regions].map(([name, entries]) => ({
      name,
      count: entries.length,
      likedCount: entries.filter((record) => getFeedbackEvidence(record).confirmedPreference === "喜欢").length,
      recentDate: recentDate(entries[0]),
      grapes: topValues(entries.flatMap(getRecordGrapes), 3),
    })),
  }));
}
