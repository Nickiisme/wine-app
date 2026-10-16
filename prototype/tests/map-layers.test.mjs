import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
const source = readFileSync(new URL("../src/lib/mapLayers.ts", import.meta.url), "utf8");
const { aggregateMapRecords, placeMapLabels, WORLD_COUNTRIES, COUNTRY_REGIONS, MAP_ZOOM } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);

test("world defaults retain the original six countries and coordinates", () => {
  assert.deepEqual(WORLD_COUNTRIES.map(({country,x,y}) => [country,x,y]), [["法国","48%","181px"],["意大利","54%","215px"],["中国","73%","205px"],["美国","19%","194px"],["澳大利亚","74%","270px"],["新西兰","83%","306px"]]);
  assert.ok(MAP_ZOOM.countries > 1 && MAP_ZOOM.records > MAP_ZOOM.regions);
});
test("non-major countries and custom recorded regions remain discoverable", () => {
  const groups = aggregateMapRecords([{id:"1",country:"格鲁吉亚",region:"格鲁吉亚 · 卡赫季"},{id:"2",country:"格鲁吉亚",region:"格鲁吉亚 · 自定义产区"},{id:"3",country:"克罗地亚",region:"克罗地亚 · 伊斯特拉"}]);
  assert.equal(groups.get("格鲁吉亚").count, 2);
  assert.equal(groups.get("格鲁吉亚").regions.get("自定义产区")[0].id,"2");
  assert.equal(groups.get("克罗地亚").count,1);
  assert.ok(COUNTRY_REGIONS["格鲁吉亚"].includes("卡赫季"));
});
test("priority labels win collisions, every remaining label has an explicit fallback", () => {
  const labels = Array.from({length:20},(_,index)=>({id:String(index),name:`产区${index}`,count:index === 19 ? 5 : 0,priority:index === 19 ? 4 : 1,x:150,y:160}));
  const result = placeMapLabels(labels,320,380);
  assert.equal(result.visible[0].id,"19");
  assert.equal(result.visible.length+result.hidden.length,20);
  result.visible.forEach((a,index)=> result.visible.slice(index+1).forEach((b)=>assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2+6 || Math.abs(a.y-b.y)>=(a.height+b.height)/2+6)));
});
