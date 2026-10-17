import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
const catalogSource = readFileSync(new URL("../src/lib/wineMapCatalog.ts", import.meta.url), "utf8");
const source = readFileSync(new URL("../src/lib/mapLayers.ts", import.meta.url), "utf8")
  .replace('import type { TastingRecord } from "./tastingRecords";', "")
  .replace(/import \{[^;]+\} from "\.\/wineMapCatalog";/, "")
  .replace('export { WINE_MAP_AREAS, type WineMapArea } from "./wineMapCatalog";', "");
const moduleSource = stripTypeScriptTypes(`${catalogSource}\n${source}`);
const { aggregateMapRecords, placeMapLabels, WORLD_COUNTRIES, WINE_MAP_AREAS, MAP_ZOOM } = await import(`data:text/javascript,${encodeURIComponent(moduleSource)}`);

test("world defaults retain the original six countries and coordinates", () => {
  assert.deepEqual(WORLD_COUNTRIES.map(({country,x,y}) => [country,x,y]), [["法国","48%","181px"],["意大利","54%","215px"],["中国","73%","205px"],["美国","19%","194px"],["澳大利亚","74%","270px"],["新西兰","83%","306px"]]);
  assert.ok(MAP_ZOOM.countries > 1 && MAP_ZOOM.records > MAP_ZOOM.regions);
});
test("non-major countries and custom recorded regions remain discoverable", () => {
  const groups = aggregateMapRecords([{id:"1",country:"格鲁吉亚",region:"格鲁吉亚 · 卡赫季"},{id:"2",country:"格鲁吉亚",region:"格鲁吉亚 · 自定义产区"},{id:"3",country:"克罗地亚",region:"克罗地亚 · 伊斯特拉"},{id:"4",country:"",region:"来源待核实"}]);
  assert.equal(groups.get("格鲁吉亚").count, 2);
  assert.equal(groups.get("格鲁吉亚").regions.get("其他产区")[0].id,"2");
  assert.deepEqual([...groups.get("格鲁吉亚").unresolved.keys()], ["自定义产区"]);
  assert.equal(groups.get("克罗地亚").count,1);
  assert.equal(groups.get("国家未确定").regions.get("其他产区")[0].id,"4");
  assert.ok(WINE_MAP_AREAS.some((area) => area.nameZh === "卡赫季" && area.parentId === "country-ge"));
});
test("catalog has stable ids and complete supported-country coverage", () => {
  const countries = WINE_MAP_AREAS.filter((area) => area.type === "country");
  const regions = WINE_MAP_AREAS.filter((area) => area.type === "region");
  assert.equal(countries.length, 19);
  assert.equal(regions.length, 131);
  assert.equal(new Set(WINE_MAP_AREAS.map((area) => area.id)).size, WINE_MAP_AREAS.length);
  assert.ok(regions.every((area) => area.parentId && area.nameEn && area.source));
  const prototype = readFileSync(new URL("../src/Prototype.tsx", import.meta.url), "utf8");
  const pickerBlock = prototype.match(/const regionOptionsByCountry:[\s\S]+?\n};/)?.[0] ?? "";
  const pickerRegions = [...pickerBlock.matchAll(/bilingual\("([^"]+)",/g)].map((match) => match[1]);
  assert.deepEqual(new Set(regions.map((area) => area.nameZh)), new Set(pickerRegions));
});
test("priority labels win collisions, every remaining label has an explicit fallback", () => {
  const labels = Array.from({length:20},(_,index)=>({id:String(index),name:`产区${index}`,count:index === 19 ? 5 : 0,priority:index === 19 ? 4 : 1,x:150,y:160}));
  const result = placeMapLabels(labels,320,380);
  assert.equal(result.visible[0].id,"19");
  assert.equal(result.visible.length+result.hidden.length,20);
  result.visible.forEach((a,index)=> result.visible.slice(index+1).forEach((b)=>assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2+6 || Math.abs(a.y-b.y)>=(a.height+b.height)/2+6)));
});
