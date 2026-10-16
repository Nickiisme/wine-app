import type { TastingRecord } from "./tastingRecords";

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
export const COUNTRY_REGIONS: Record<string, string[]> = {
  法国: ["香槟", "卢瓦尔河谷", "勃艮第", "波尔多", "罗讷河谷"], 意大利: ["皮埃蒙特", "威尼托", "托斯卡纳", "西西里"],
  中国: ["宁夏贺兰山东麓", "新疆", "山东蓬莱", "云南香格里拉"], 美国: ["纳帕谷", "索诺玛", "威拉米特谷"],
  澳大利亚: ["巴罗萨谷", "雅拉谷", "玛格丽特河"], 新西兰: ["马尔堡", "中奥塔哥", "霍克斯湾"],
  西班牙: ["里奥哈", "杜埃罗河岸", "普里奥拉托", "下海湾"], 德国: ["摩泽尔", "莱茵高", "法尔兹"],
  葡萄牙: ["杜罗河谷", "绿酒产区", "阿连特茹"], 智利: ["迈坡谷", "空加瓜谷", "卡萨布兰卡谷"],
  阿根廷: ["门多萨", "优克谷", "萨尔塔"], 南非: ["斯泰伦博斯", "斯沃特兰", "帕尔"],
  奥地利: ["瓦豪", "坎普谷", "克雷姆斯谷"], 匈牙利: ["托卡伊", "埃格尔", "维拉尼"],
  希腊: ["圣托里尼", "尼米亚", "纳乌萨"], 加拿大: ["奥肯那根谷", "尼亚加拉半岛"],
  格鲁吉亚: ["卡赫季", "卡尔特利", "伊梅列季"], 日本: ["山梨", "长野", "北海道"], 乌拉圭: ["卡内洛内斯", "马尔多纳多"],
};

export function mapRecordLocation(record: TastingRecord) {
  const parts = record.region.split("·").map((part) => part.trim()).filter(Boolean);
  return { country: record.country?.trim() || (parts.length > 1 ? parts[0] : ""), region: parts.length > 1 ? parts.slice(1).join(" · ") : parts[0] === record.country ? "" : parts[0] || "" };
}

export function aggregateMapRecords(records: TastingRecord[]) {
  const countries = new Map<string, { count: number; regions: Map<string, TastingRecord[]>; records: TastingRecord[] }>();
  for (const record of records) {
    const { country, region } = mapRecordLocation(record);
    if (!country || country === "不确定") continue;
    const group = countries.get(country) ?? { count: 0, regions: new Map<string, TastingRecord[]>(), records: [] as TastingRecord[] };
    group.count++; group.records.push(record);
    if (region && region !== "不确定") group.regions.set(region, [...group.regions.get(region) ?? [], record]);
    countries.set(country, group);
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
