import type { TastingRecord } from "./tastingRecords";
import { getCountryArea, getCountryRegions, resolveCatalogArea, type WineMapArea } from "./wineMapCatalog";
export { WINE_MAP_AREAS, type WineMapArea } from "./wineMapCatalog";

export const MAP_ZOOM = { countries: 1.6, moreCountries: 2.2, regions: 2.6, records: 4, max: 6 };
// Coordinates are anchors on the existing illustrated world map, not vineyard GPS positions.
export const WORLD_COUNTRIES = [
  { country: "法国", x: "48%", y: "181px" }, { country: "意大利", x: "54%", y: "215px" },
  { country: "中国", x: "73%", y: "205px" }, { country: "美国", x: "19%", y: "194px" },
  { country: "澳大利亚", x: "74%", y: "270px" }, { country: "新西兰", x: "83%", y: "306px" },
];
export const EXTRA_COUNTRIES = [
  { country: "西班牙", x: 45, y: 207, zoom: 1.6 }, { country: "德国", x: 52, y: 170, zoom: 1.6 },
  { country: "葡萄牙", x: 42, y: 211, zoom: 2.2 }, { country: "智利", x: 28, y: 290, zoom: 1.6 },
  { country: "阿根廷", x: 32, y: 297, zoom: 1.6 }, { country: "南非", x: 52, y: 292, zoom: 1.6 },
  { country: "奥地利", x: 55, y: 183, zoom: 2.2 }, { country: "匈牙利", x: 58, y: 190, zoom: 2.2 },
  { country: "希腊", x: 58, y: 218, zoom: 2.2 }, { country: "加拿大", x: 20, y: 164, zoom: 2.2 },
  { country: "格鲁吉亚", x: 63, y: 202, zoom: 2.2 }, { country: "日本", x: 85, y: 208, zoom: 2.2 },
  { country: "乌拉圭", x: 34, y: 285, zoom: 2.2 },
];
export const OTHER_REGION_ID = (countryCode: string) => `region-${countryCode.toLowerCase()}-other`;
export function getCountryAreas(country: string) { return getCountryRegions(country); }
export function resolveMapArea(country: string, value: string): WineMapArea {
  const normalized = value.trim();
  const parent = getCountryArea(country);
  const area = resolveCatalogArea(country, normalized);
  return area ?? { id: OTHER_REGION_ID(parent?.countryCode ?? "unknown"), nameZh: "其他产区", aliases: [normalized], type: "region", parentId: parent?.id, countryCode: parent?.countryCode ?? "", minimumZoom: MAP_ZOOM.regions, priority: 0, status: "unresolved", source: `unmatched record value: ${normalized}` };
}

export function mapRecordLocation(record: TastingRecord) {
  const parts = record.region.split("·").map((part) => part.trim()).filter(Boolean);
  const country = record.country?.trim() || (parts.length > 1 ? parts[0] : "国家未确定");
  return { country, region: parts.length > 1 ? parts.slice(1).join(" · ") : parts[0] === record.country ? "" : parts[0] || "" };
}

export function aggregateMapRecords(records: TastingRecord[]) {
  const countries = new Map<string, { count: number; regions: Map<string, TastingRecord[]>; unresolved: Map<string, TastingRecord[]>; records: TastingRecord[] }>();
  for (const record of records) {
    const { country, region } = mapRecordLocation(record);
    const displayCountry = country === "不确定" ? "国家未确定" : country;
    const group = countries.get(displayCountry) ?? { count: 0, regions: new Map<string, TastingRecord[]>(), unresolved: new Map<string, TastingRecord[]>(), records: [] as TastingRecord[] };
    group.count++; group.records.push(record);
    if (region && region !== "不确定") {
      const resolved = resolveMapArea(displayCountry, region);
      const display = resolved.status === "unresolved" ? "其他产区" : resolved.nameZh;
      group.regions.set(display, [...group.regions.get(display) ?? [], record]);
      if (resolved.status === "unresolved") group.unresolved.set(region, [...group.unresolved.get(region) ?? [], record]);
    }
    countries.set(displayCountry, group);
  }
  return countries;
}

export type MapLabel = { id: string; name: string; x: number; y: number; count: number; priority: number };
export type PlacedLabel = MapLabel & { width: number; height: number };
export function placeMapLabels(candidates: MapLabel[], width: number, height: number, reserved: PlacedLabel[] = []) {
  const occupied = [...reserved];
  const visible: PlacedLabel[] = [];
  const hidden: MapLabel[] = [];
  const offsets = [[0, 0], [0, -36], [0, 36], [-40, 0], [40, 0], [0, -72], [0, 72]];
  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority || b.count - a.count || a.id.localeCompare(b.id))) {
    const w = Math.max(70, candidate.name.length * 12 + 36);
    let placed: PlacedLabel | undefined;
    for (const [dx, dy] of offsets) {
      const x = candidate.x + dx, y = candidate.y + dy;
      if (x - w / 2 < 8 || x + w / 2 > width - 8 || y < 65 || y + 32 > height - 90) continue;
      const box = { ...candidate, x, y, width: w, height: 30 };
      if (occupied.some((other) => Math.abs(x - other.x) < (w + other.width) / 2 + 6 && Math.abs(y - other.y) < (30 + other.height) / 2 + 6)) continue;
      placed = box; break;
    }
    if (placed) { visible.push(placed); occupied.push(placed); } else hidden.push(candidate);
  }
  return { visible, hidden };
}
