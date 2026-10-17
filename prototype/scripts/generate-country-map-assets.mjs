import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const [, , inputPath, outputPath = "public/assets/maps"] = process.argv;
if (!inputPath) throw new Error("Usage: node scripts/generate-country-map-assets.mjs <countries.geojson> [output-dir]");

const targets = {
  ESP: "spain", DEU: "germany", PRT: "portugal", CHL: "chile", ARG: "argentina",
  ZAF: "south-africa", AUT: "austria", HUN: "hungary", GRC: "greece", CAN: "canada",
  GEO: "georgia", JPN: "japan", URY: "uruguay",
};
const source = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const outputDir = resolve(outputPath);
await mkdir(outputDir, { recursive: true });

const distanceToSegment = ([x, y], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  let max = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points.at(-1));
    if (distance > max) { max = distance; index = i; }
  }
  if (max <= tolerance) return [points[0], points.at(-1)];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}
const polygonsOf = (geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
for (const feature of source.features) {
  const iso = feature.properties["ISO3166-1-Alpha-3"];
  const slug = targets[iso];
  if (!slug) continue;
  const polygons = polygonsOf(feature.geometry);
  const points = polygons.flat(2);
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX || 1, height = maxY - minY || 1;
  const scale = Math.min(640 / width, 440 / height);
  const offsetX = (720 - width * scale) / 2, offsetY = (520 - height * scale) / 2;
  const tolerance = Math.max(width, height) / 900;
  const project = ([x, y]) => `${(offsetX + (x - minX) * scale).toFixed(1)},${(offsetY + (maxY - y) * scale).toFixed(1)}`;
  const paths = polygons.flatMap((polygon) => polygon.map((ring) => {
    const reduced = simplify(ring, tolerance);
    return `M${reduced.map(project).join("L")}Z`;
  })).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" role="img" aria-label="${feature.properties.name} map"><path d="${paths}" fill="#d9d8bd" stroke="#a9aa8d" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>\n`;
  await writeFile(resolve(outputDir, `${slug}-wine-map.svg`), svg);
}
console.log(`Generated ${Object.keys(targets).length} country maps from ${basename(inputPath)}.`);
