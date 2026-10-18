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
// Geographic country centers used only after zooming. Level 1 keeps its legacy
// illustrated-map anchors above unchanged.
export const WORLD_COUNTRY_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  法国: { latitude: 46.23, longitude: 2.21 }, 意大利: { latitude: 41.87, longitude: 12.57 },
  中国: { latitude: 35.86, longitude: 104.2 }, 美国: { latitude: 39.83, longitude: -98.58 },
  澳大利亚: { latitude: -25.27, longitude: 133.78 }, 新西兰: { latitude: -40.9, longitude: 174.89 },
  西班牙: { latitude: 40.46, longitude: -3.75 }, 德国: { latitude: 51.17, longitude: 10.45 },
  葡萄牙: { latitude: 39.4, longitude: -8.22 }, 智利: { latitude: -35.68, longitude: -71.54 },
  阿根廷: { latitude: -38.42, longitude: -63.62 }, 南非: { latitude: -30.56, longitude: 22.94 },
  奥地利: { latitude: 47.52, longitude: 14.55 }, 匈牙利: { latitude: 47.16, longitude: 19.5 },
  希腊: { latitude: 39.07, longitude: 21.82 }, 加拿大: { latitude: 56.13, longitude: -106.35 },
  格鲁吉亚: { latitude: 42.32, longitude: 43.36 }, 日本: { latitude: 36.2, longitude: 138.25 },
  乌拉圭: { latitude: -32.52, longitude: -55.77 },
};
export type WorldMapView = { scale: number; x: number; y: number };
export function getWorldMapLayout(surface: { width: number; height: number }) {
  const left = 10;
  const top = 116;
  const width = Math.max(0, surface.width - left * 2);
  const height = width / 2;
  return { left, top, width, height, originX: surface.width / 2, originY: top + height / 2 };
}
export function projectWorldCountryCenter(
  center: { latitude: number; longitude: number },
  surface: { width: number; height: number },
  view: WorldMapView,
) {
  // Keep these values in sync with `.world-map-art`. The artwork uses a 2:1
  // equirectangular canvas, so country centers and the bitmap share one frame.
  const image = getWorldMapLayout(surface);
  const imageX = image.left + ((center.longitude + 180) / 360) * image.width;
  const imageY = image.top + ((90 - center.latitude) / 180) * image.height;
  return {
    x: image.originX + (imageX - image.originX) * view.scale + view.x,
    y: image.originY + (imageY - image.originY) * view.scale + view.y,
  };
}
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
  // A label may move by one bubble width to avoid a collision, but it must not
  // drift into another country. Labels that still collide remain discoverable
  // in the country picker instead of being shown at a misleading location.
  const offsets = [[0, 0], [0, -34], [0, 34], [-40, 0], [40, 0]];
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
