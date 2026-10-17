export type WineMapArea = {
  id: string;
  nameZh: string;
  nameEn?: string;
  aliases?: string[];
  type: "country" | "region" | "subregion";
  parentId?: string;
  countryCode: string;
  center?: { latitude: number; longitude: number };
  geometryId?: string;
  minimumZoom: number;
  maximumZoom?: number;
  priority: number;
  source?: string;
  status: "verified" | "approximate" | "unresolved";
};

type CountrySeed = { code: string; nameZh: string; nameEn: string; regions: Array<[string, string, string[]?]> };
const countries: CountrySeed[] = [
  { code:"FR", nameZh:"法国", nameEn:"France", regions:[["勃艮第","Burgundy"],["波尔多","Bordeaux"],["香槟","Champagne"],["卢瓦尔河谷","Loire Valley"],["罗讷河谷","Rhône Valley"],["阿尔萨斯","Alsace"],["普罗旺斯","Provence"],["朗格多克-鲁西永","Languedoc-Roussillon"],["博若莱","Beaujolais"],["汝拉","Jura"]] },
  { code:"IT", nameZh:"意大利", nameEn:"Italy", regions:[["托斯卡纳","Tuscany"],["皮埃蒙特","Piedmont"],["威尼托","Veneto"],["西西里","Sicily"],["弗留利","Friuli"],["特伦蒂诺-上阿迪杰","Trentino-Alto Adige"],["艾米利亚-罗马涅","Emilia-Romagna"],["普利亚","Puglia"],["坎帕尼亚","Campania"],["撒丁岛","Sardinia"]] },
  { code:"ES", nameZh:"西班牙", nameEn:"Spain", regions:[["里奥哈","Rioja"],["杜埃罗河岸","Ribera del Duero"],["普里奥拉托","Priorat"],["佩内德斯","Penedès"],["下海湾","Rías Baixas",["Rias Baixas"]],["卢埃达","Rueda"],["赫雷斯","Jerez"],["托罗","Toro"],["比埃尔索","Bierzo"],["拉曼恰","La Mancha"]] },
  { code:"DE", nameZh:"德国", nameEn:"Germany", regions:[["摩泽尔","Mosel"],["莱茵高","Rheingau"],["法尔兹","Pfalz"],["莱茵黑森","Rheinhessen"],["巴登","Baden"],["纳赫","Nahe"],["弗兰肯","Franken"],["阿尔","Ahr"]] },
  { code:"PT", nameZh:"葡萄牙", nameEn:"Portugal", regions:[["杜罗河谷","Douro"],["绿酒产区","Vinho Verde"],["阿连特茹","Alentejo"],["杜奥","Dão",["Dao"]],["百拉达","Bairrada"],["马德拉","Madeira"],["塞图巴尔","Setúbal",["Setubal"]]] },
  { code:"US", nameZh:"美国", nameEn:"United States", regions:[["纳帕谷","Napa Valley"],["索诺玛","Sonoma"],["威拉米特谷","Willamette Valley"],["圣巴巴拉","Santa Barbara"],["帕索罗布尔斯","Paso Robles"],["哥伦比亚谷","Columbia Valley"],["手指湖","Finger Lakes"],["门多西诺","Mendocino"]] },
  { code:"AU", nameZh:"澳大利亚", nameEn:"Australia", regions:[["巴罗萨谷","Barossa Valley"],["雅拉谷","Yarra Valley"],["玛格丽特河","Margaret River"],["猎人谷","Hunter Valley"],["麦克拉伦谷","McLaren Vale"],["库纳瓦拉","Coonawarra"],["阿德莱德山区","Adelaide Hills"],["克莱尔谷","Clare Valley"],["伊顿谷","Eden Valley"],["塔斯马尼亚","Tasmania"]] },
  { code:"NZ", nameZh:"新西兰", nameEn:"New Zealand", regions:[["马尔堡","Marlborough"],["中奥塔哥","Central Otago"],["霍克斯湾","Hawke's Bay"],["马丁堡","Martinborough"],["纳尔逊","Nelson"],["坎特伯雷","Canterbury"],["吉斯本","Gisborne"],["奥克兰","Auckland"]] },
  { code:"CL", nameZh:"智利", nameEn:"Chile", regions:[["迈坡谷","Maipo Valley"],["空加瓜谷","Colchagua Valley"],["卡萨布兰卡谷","Casablanca Valley"],["阿空加瓜谷","Aconcagua Valley"],["利马里谷","Limarí Valley",["Limari Valley"]],["库里科谷","Curicó Valley",["Curico Valley"]],["伊塔塔谷","Itata Valley"],["比奥比奥谷","Bío Bío Valley",["Bio Bio Valley"]]] },
  { code:"AR", nameZh:"阿根廷", nameEn:"Argentina", regions:[["门多萨","Mendoza"],["优克谷","Uco Valley"],["萨尔塔","Salta"],["卡法亚特","Cafayate"],["巴塔哥尼亚","Patagonia"],["圣胡安","San Juan"]] },
  { code:"ZA", nameZh:"南非", nameEn:"South Africa", regions:[["斯泰伦博斯","Stellenbosch"],["斯沃特兰","Swartland"],["帕尔","Paarl"],["康斯坦蒂亚","Constantia"],["沃克湾","Walker Bay"],["罗伯森","Robertson"],["黑地","Elgin"]] },
  { code:"CN", nameZh:"中国", nameEn:"China", regions:[["宁夏贺兰山东麓","Ningxia Helan Mountain East Foothills"],["新疆","Xinjiang"],["山东蓬莱","Penglai, Shandong"],["云南香格里拉","Shangri-La, Yunnan"],["河北怀来","Huailai, Hebei"],["甘肃河西走廊","Hexi Corridor, Gansu"],["北京房山","Fangshan, Beijing"]] },
  { code:"AT", nameZh:"奥地利", nameEn:"Austria", regions:[["瓦豪","Wachau"],["坎普谷","Kamptal"],["克雷姆斯谷","Kremstal"],["布尔根兰","Burgenland"],["葡萄酒区","Weinviertel"],["施蒂里亚","Styria"]] },
  { code:"HU", nameZh:"匈牙利", nameEn:"Hungary", regions:[["托卡伊","Tokaj"],["埃格尔","Eger"],["维拉尼","Villány",["Villany"]],["绍姆洛","Somló",["Somlo"]],["巴拉顿","Balaton"]] },
  { code:"GR", nameZh:"希腊", nameEn:"Greece", regions:[["圣托里尼","Santorini"],["尼米亚","Nemea"],["纳乌萨","Naoussa"],["克里特","Crete"],["曼蒂尼亚","Mantinia"]] },
  { code:"CA", nameZh:"加拿大", nameEn:"Canada", regions:[["奥肯那根谷","Okanagan Valley"],["尼亚加拉半岛","Niagara Peninsula"],["爱德华王子县","Prince Edward County"],["安纳波利斯谷","Annapolis Valley"]] },
  { code:"GE", nameZh:"格鲁吉亚", nameEn:"Georgia", regions:[["卡赫季","Kakheti"],["卡尔特利","Kartli"],["伊梅列季","Imereti"],["拉恰","Racha"]] },
  { code:"JP", nameZh:"日本", nameEn:"Japan", regions:[["山梨","Yamanashi"],["长野","Nagano"],["北海道","Hokkaido"],["山形","Yamagata"]] },
  { code:"UY", nameZh:"乌拉圭", nameEn:"Uruguay", regions:[["卡内洛内斯","Canelones"],["蒙得维的亚","Montevideo"],["马尔多纳多","Maldonado"],["科洛尼亚","Colonia"]] },
];

const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const WINE_MAP_AREAS: WineMapArea[] = countries.flatMap((country) => {
  const countryId = `country-${country.code.toLowerCase()}`;
  return [
    { id: countryId, nameZh: country.nameZh, nameEn: country.nameEn, type: "country", countryCode: country.code, geometryId: `country-${country.code.toLowerCase()}`, minimumZoom: 1, priority: 10, source: "project country directory; Natural Earth country outline", status: "verified" },
    ...country.regions.map(([nameZh, nameEn, aliases], index) => ({ id: `region-${country.code.toLowerCase()}-${slug(nameEn)}`, nameZh, nameEn, aliases, type: "region" as const, parentId: countryId, countryCode: country.code, minimumZoom: 2.6, priority: Math.max(1, 10 - index), source: "project region picker directory", status: "approximate" as const })),
  ];
});

export const COUNTRY_AREAS = WINE_MAP_AREAS.filter((area) => area.type === "country");
export const REGION_AREAS = WINE_MAP_AREAS.filter((area) => area.type === "region");
export const getCountryArea = (name: string) => COUNTRY_AREAS.find((area) => area.nameZh === name || area.nameEn === name || area.id === name);
export const getCountryRegions = (country: string) => {
  const parent = getCountryArea(country);
  return parent ? REGION_AREAS.filter((area) => area.parentId === parent.id) : [];
};
export const normalizeMapName = (value: string) => value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s·.'’_,\-]/g, "");
export function resolveCatalogArea(country: string, value: string) {
  const key = normalizeMapName(value);
  return getCountryRegions(country).find((area) => [area.id, area.nameZh, area.nameEn, ...(area.aliases ?? [])].some((name) => name && normalizeMapName(name) === key));
}

export const mapCountryOptions = COUNTRY_AREAS.map((area) => ({ value: area.nameZh, label: `${area.nameZh} · ${area.nameEn}` }));
export const mapRegionOptionsByCountry = Object.fromEntries(COUNTRY_AREAS.map((country) => [country.nameZh, getCountryRegions(country.id).map((area) => ({ value: area.nameZh, label: `${area.nameZh} · ${area.nameEn}` }))]));
