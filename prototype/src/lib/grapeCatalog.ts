import type { TastingRecord } from "./tastingRecords";

export type GrapeCategory = "classic-red" | "warm-red" | "classic-white" | "aromatic-white";
export type GrapeVariety = {
  id: string;
  canonical_name: string;
  chinese_name: string;
  english_name: string;
  aliases: string[];
  color: "red" | "white";
  categories: GrapeCategory[];
  image?: string;
  beginner_summary: string;
  body: string;
  acidity: string;
  tannin?: string;
  aromas: string[];
  major_regions: string[];
  comparison_grapes: string[];
  is_core: true;
};

export const GRAPE_CHAPTERS: { id: GrapeCategory; title: string }[] = [
  { id: "classic-red", title: "经典红葡萄" },
  { id: "warm-red", title: "地中海与温暖产区红葡萄" },
  { id: "classic-white", title: "经典白葡萄" },
  { id: "aromatic-white", title: "芳香型与特色白葡萄" },
];

type GrapeRow = [string, string, string, GrapeVariety["color"], GrapeCategory, string, string, string, string, string, string, string, string?];
const rows: GrapeRow[] = [
  ["cabernet-sauvignon", "赤霞珠", "Cabernet Sauvignon", "red", "classic-red", "结构鲜明的经典红葡萄，常见于波尔多混酿。", "饱满", "中高", "中高", "黑加仑、黑樱桃、雪松", "波尔多、纳帕谷、智利迈坡谷", "西拉、品丽珠", "cabernet.webp"],
  ["merlot", "梅洛", "Merlot", "red", "classic-red", "果味圆润的红葡萄，也常与赤霞珠一起酿造。", "中等至饱满", "中等", "中等", "李子、黑樱桃、巧克力", "波尔多、华盛顿州、智利", "马尔贝克", "merlot.webp"],
  ["pinot-noir", "黑皮诺", "Pinot Noir", "red", "classic-red", "以细腻红色果香和轻盈口感受到喜爱。", "轻盈至中等", "中高", "较低", "草莓、红樱桃、花香", "勃艮第、俄勒冈、中奥塔哥", "佳美", "pinot-noir.webp"],
  ["syrah", "西拉", "Syrah", "red", "classic-red", "常呈现深色果味与胡椒香，风格随产地变化。", "中等至饱满", "中等", "中高", "黑莓、黑胡椒、紫罗兰", "北罗讷河谷、巴罗萨谷、南非", "赤霞珠、歌海娜", "syrah.webp"],
  ["cabernet-franc", "品丽珠", "Cabernet Franc", "red", "classic-red", "常带红果与草本气息，可单酿也可混酿。", "中等", "中高", "中等", "覆盆子、红醋栗、草本", "卢瓦尔河谷、波尔多、加拿大", "赤霞珠", "cabernet-franc.webp"],
  ["gamay", "佳美", "Gamay", "red", "classic-red", "博若莱的代表品种，常见轻快的红果风格。", "轻盈", "中高", "较低", "樱桃、覆盆子、紫罗兰", "法国博若莱、卢瓦尔河谷", "黑皮诺", "gamay.webp"],
  ["grenache", "歌海娜", "Grenache", "red", "warm-red", "适应温暖气候，常见成熟红果与香料气息。", "中等至饱满", "中等", "中等偏低", "草莓、覆盆子、香料", "南罗讷河谷、普里奥拉托、澳大利亚", "西拉", "grenache.webp"],
  ["sangiovese", "桑娇维塞", "Sangiovese", "red", "warm-red", "托斯卡纳的重要品种，常见明亮酸度与樱桃气息。", "中等", "较高", "中高", "酸樱桃、番茄叶、干草本", "托斯卡纳、意大利中部", "丹魄", "sangiovese.webp"],
  ["tempranillo", "丹魄", "Tempranillo", "red", "warm-red", "西班牙经典红葡萄，陈酿风格常带皮革与香料。", "中等至饱满", "中等", "中等", "红樱桃、李子、皮革", "里奥哈、杜埃罗河岸、托罗", "桑娇维塞", "tempranillo.webp"],
  ["malbec", "马尔贝克", "Malbec", "red", "warm-red", "常见浓郁深色果味，阿根廷门多萨尤具代表性。", "饱满", "中等", "中等", "黑李子、黑莓、紫罗兰", "门多萨、法国卡奥尔", "梅洛", "malbec.webp"],
  ["nebbiolo", "内比奥罗", "Nebbiolo", "red", "warm-red", "皮埃蒙特重要品种，以高酸高单宁和复杂香气著称。", "中等", "较高", "较高", "樱桃、玫瑰、焦油", "巴罗洛、巴巴莱斯科", "桑娇维塞", "nebbiolo.webp"],
  ["zinfandel", "仙粉黛", "Zinfandel", "red", "warm-red", "常有成熟莓果与香料风格，在美国加州常见。", "饱满", "中等", "中等", "黑莓、覆盆子、黑胡椒", "美国加州、普利亚", "歌海娜", "zinfandel.webp"],
  ["carmenere", "佳美娜", "Carménère", "red", "warm-red", "智利颇具代表性的红葡萄，常带深色果味与草本气息。", "中等至饱满", "中等", "中等", "黑李子、甜椒、香料", "智利空加瓜谷、迈坡谷", "梅洛", "carmenere.webp"],
  ["chardonnay", "霞多丽", "Chardonnay", "white", "classic-white", "风格多变的白葡萄，凉爽产地清新，橡木桶风格更丰润。", "轻盈至饱满", "中等至较高", "", "苹果、柠檬、桃子", "勃艮第、香槟、加州", "白诗南", "chardonnay.webp"],
  ["sauvignon-blanc", "长相思", "Sauvignon Blanc", "white", "classic-white", "以清爽酸度和鲜明草本、柑橘香气著称。", "轻盈至中等", "较高", "", "青柠、青草、百香果", "马尔堡、卢瓦尔河谷、波尔多", "阿尔巴利诺", "sauvignon-blanc.webp"],
  ["riesling", "雷司令", "Riesling", "white", "classic-white", "酸度明亮，可酿成干型或甜型等多种风格。", "轻盈至中等", "较高", "", "青苹果、柠檬、桃子", "摩泽尔、莱茵高、阿尔萨斯", "琼瑶浆", "riesling.webp"],
  ["chenin-blanc", "白诗南", "Chenin Blanc", "white", "classic-white", "酸度充足，既能酿清爽干白，也能酿甜酒与起泡酒。", "轻盈至中等", "较高", "", "苹果、梨、蜂蜜", "卢瓦尔河谷、南非", "霞多丽", "chenin-blanc.webp"],
  ["pinot-gris", "灰皮诺", "Pinot Gris", "white", "classic-white", "风格可从清爽轻盈到较丰润，名称也常写作 Pinot Grigio。", "轻盈至中等", "中等", "", "梨、苹果、柑橘", "阿尔萨斯、意大利东北部、俄勒冈", "霞多丽", "pinot-gris.webp"],
  ["viognier", "维欧尼", "Viognier", "white", "classic-white", "芳香明显，常带核果与花香，口感较丰润。", "饱满", "中等偏低", "", "杏、桃子、花香", "孔得里约、南罗讷河谷、澳大利亚", "霞多丽", "viognier.webp"],
  ["gewurztraminer", "琼瑶浆", "Gewürztraminer", "white", "aromatic-white", "香气奔放的白葡萄，常见荔枝与玫瑰气息。", "中等至饱满", "中等偏低", "", "荔枝、玫瑰、香料", "阿尔萨斯、德国、意大利上阿迪杰", "雷司令", "gewurztraminer.webp"],
  ["albarino", "阿尔巴利诺", "Albariño", "white", "aromatic-white", "常见清爽酸度与柑橘、核果气息。", "轻盈至中等", "较高", "", "柠檬、桃子、花香", "西班牙下海湾、葡萄牙绿酒产区", "长相思", "albarino.webp"],
  ["gruner-veltliner", "绿维特利纳", "Grüner Veltliner", "white", "aromatic-white", "奥地利代表性白葡萄，常有清新果味与白胡椒气息。", "轻盈至中等", "较高", "", "青苹果、柑橘、白胡椒", "瓦豪、坎普谷、奥地利葡萄酒区", "长相思", "gruner-veltliner.webp"],
  ["muscat", "莫斯卡托", "Muscat", "white", "aromatic-white", "芳香浓郁的葡萄家族，可酿干型、甜型或起泡酒。", "轻盈至中等", "中等", "", "葡萄、橙花、桃子", "意大利阿斯蒂、法国阿尔萨斯", "琼瑶浆", "muscat.webp"],
  ["glera", "歌蕾拉", "Glera", "white", "aromatic-white", "普罗塞克起泡酒的主要葡萄品种，常有清新的苹果与梨香。", "轻盈", "中高", "", "青苹果、梨、白花", "意大利威尼托、弗留利", "莫斯卡托", "glera.webp"],
];

export const CORE_GRAPES: GrapeVariety[] = rows.map(([id, chinese_name, english_name, color, category, beginner_summary, body, acidity, tannin, aromas, regions, comparisons, image]) => ({
  id, canonical_name: english_name, chinese_name, english_name,
  aliases: [...(id === "syrah" ? ["Shiraz", "设拉子"] : []), ...(id === "pinot-gris" ? ["Pinot Grigio"] : []), ...(id === "zinfandel" ? ["Primitivo"] : []), ...(id === "muscat" ? ["Moscato", "麝香"] : [])],
  color, categories: [category], image: image ? `assets/grapes/${image}` : undefined,
  beginner_summary, body, acidity, ...(color === "red" ? { tannin } : {}),
  aromas: aromas.split("、"), major_regions: regions.split("、"), comparison_grapes: comparisons.split("、"), is_core: true,
}));

export const SPECIAL_GRAPES: { id: string; chinese_name: string; english_name: string; aliases: string[]; image?: string }[] = [
  ["marselan", "马瑟兰", "Marselan", "marselan.webp"], ["mourvedre", "慕合怀特", "Mourvèdre", "mourvedre.webp", "Monastrell"], ["barbera", "巴贝拉", "Barbera", "barbera.webp"], ["montepulciano", "蒙特普齐亚诺", "Montepulciano", "montepulciano.webp"],
  ["corvina", "科维纳", "Corvina", "corvina.webp"], ["semillon", "赛美蓉", "Sémillon", "semillon.webp"], ["pinot-meunier", "皮诺莫尼耶", "Pinot Meunier", "pinot-meunier.webp"], ["touriga-nacional", "国产多瑞加", "Touriga Nacional", "touriga-nacional.webp"],
  ["assyrtiko", "阿斯提可", "Assyrtiko", "assyrtiko.webp"], ["furmint", "富尔民特", "Furmint", "furmint.webp"], ["petit-verdot", "小维多", "Petit Verdot", "petit-verdot.webp"], ["tannat", "丹娜", "Tannat", "tannat.webp"],
].map(([id, chinese_name, english_name, image, ...aliases]) => ({ id, chinese_name, english_name, image: `assets/grapes/${image}`, aliases }));

const normalKey = (name: string) => name.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s·.\-]/g, "");
const byAlias = new Map<string, string>();
for (const grape of CORE_GRAPES) for (const name of [grape.chinese_name, grape.english_name, ...grape.aliases]) byAlias.set(normalKey(name), grape.chinese_name);
for (const grape of SPECIAL_GRAPES) for (const name of [grape.chinese_name, grape.english_name, ...grape.aliases]) byAlias.set(normalKey(name), grape.chinese_name);

export function canonicalGrapeName(name: string): string | null {
  return byAlias.get(normalKey(name)) ?? null;
}

export function recordGrapeNames(record: TastingRecord): string[] {
  if (record.fieldMetadata?.grapes?.confirmed === false) return [];
  const source = record.grapes?.length ? record.grapes : record.grape.split("、");
  return [...new Set(source.map(canonicalGrapeName).filter((name): name is string => Boolean(name)))];
}

export function grapeCounts(records: TastingRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) for (const name of recordGrapeNames(record)) counts[name] = (counts[name] ?? 0) + 1;
  return counts;
}

export function specialDiscoveries(records: TastingRecord[]): string[] {
  const counts = grapeCounts(records);
  return SPECIAL_GRAPES.map((grape) => grape.chinese_name).filter((name) => counts[name] > 0);
}

export function firstNewSpecialDiscovery(record: TastingRecord, earlier: TastingRecord[]) {
  const previous = grapeCounts(earlier);
  const discovered = recordGrapeNames(record).find((name) => SPECIAL_GRAPES.some((grape) => grape.chinese_name === name) && !previous[name]);
  return discovered ? { name: discovered, first: specialDiscoveries(earlier).length === 0 } : null;
}

export { recommendedGrapes } from "./exploration";
