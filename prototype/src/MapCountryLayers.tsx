import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { MobileScroll } from "./mobile";
import { aggregateMapRecords, COUNTRY_REGIONS, mapRecordLocation, MAP_ZOOM } from "./lib/mapLayers";
import type { TastingRecord } from "./lib/tastingRecords";

type Props = {
  country: string; records: TastingRecord[]; selectedRegion: string | null;
  facts?: { area: string; output: string; grapes: string };
  onBack: () => void; onRegion: (region: string | null) => void;
  onRecords: (country: string, region: string) => void;
};

const COUNTRY_MAP_ART: Record<string, string> = {
  法国: "france-wine-map.webp",
  意大利: "italy-wine-map.webp",
  中国: "china-wine-map.webp",
  美国: "usa-wine-map.webp",
  澳大利亚: "australia-wine-map.webp",
  新西兰: "new-zealand-wine-map.webp",
};

export function MapCountryLayers({ country, records, selectedRegion, facts, onBack, onRegion, onRecords }: Props) {
  const [zoom, setZoom] = useState<number>(MAP_ZOOM.regions);
  const zoomRef = useRef(zoom);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const group = useMemo(() => aggregateMapRecords(records).get(country), [records, country]);
  const regions = useMemo(() => [...new Set([...(COUNTRY_REGIONS[country] ?? []), ...group?.regions.keys() ?? []])]
    .map((name, index) => ({ name, index, count: group?.regions.get(name)?.length ?? 0 })), [country, group]);
  const updateZoom = (value: number) => {
    if (value < MAP_ZOOM.regions - .15) { onRegion(null); onBack(); return; }
    zoomRef.current = Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.regions, value));
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; setZoom(zoomRef.current); });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Capture only a two-finger gesture so ordinary list taps and scrolling keep working.
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      updateZoom(pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.distance));
    }
  };
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => { pointers.current.delete(event.pointerId); pinch.current = null; };
  const details = zoom >= MAP_ZOOM.records;
  const entries = selectedRegion ? group?.regions.get(selectedRegion) ?? [] : group?.records ?? [];
  const mapArt = COUNTRY_MAP_ART[country];
  return <section className="region-map region-map-zoomed map-country-layers" aria-label={`${country}葡萄酒产区地图`}>
    <header className="region-zoom-header"><button onClick={() => { if (selectedRegion) onRegion(null); else onBack(); }} aria-label={selectedRegion ? "返回产区地图" : "返回世界地图"}><ArrowLeftIcon /></button><div><strong>{selectedRegion || `${country} · 产区地图`}</strong><small>{details ? "酒款记录" : "主要产区与我的足迹"}</small></div></header>
    <div className="map-country-body" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest("button")) updateZoom(details ? MAP_ZOOM.regions : MAP_ZOOM.records); }} onWheel={(event) => { if (event.ctrlKey) { event.preventDefault(); updateZoom(zoomRef.current - event.deltaY * .01); } }}>
      <MobileScroll className="map-country-scroll"><div className="map-country-content">
        {!selectedRegion && facts && <div className="map-country-facts"><span>葡萄园面积 {facts.area}</span><span>年产量 {facts.output}</span><p>主要品种：{facts.grapes}</p></div>}
        {!details && !selectedRegion && <div className={`map-region-visual ${mapArt ? "has-country-art" : ""}`} aria-label={`${country}主要葡萄酒产区`}>{mapArt && <img src={`${import.meta.env.BASE_URL}assets/maps/${mapArt}`} alt={`${country}葡萄酒产区插画地图`} draggable={false} />}{regions.map(({ name }, index) => <button key={name} style={{ left: `${[27, 61, 67, 26, 67, 48][index % 6]}%`, top: `${[35, 20, 43, 66, 70, 52][index % 6]}%` }} onClick={() => onRegion(name)}><strong>{name}</strong></button>)}</div>}
        {!details && selectedRegion && <div className="map-region-overview"><h3>{selectedRegion}</h3><p>{entries.length} 次品鉴</p>{facts && <p>常见品种：{facts.grapes}</p>}<button className="notes-link" onClick={() => onRecords(country, selectedRegion)}>查看 {entries.length} 条品酒笔记 ›</button><button className="text-action" onClick={() => updateZoom(MAP_ZOOM.records)}>放大查看酒款记录</button></div>}
        {details && <div className="map-wine-records">{entries.length ? entries.map((record) => <button key={record.id} onClick={() => onRecords(country, selectedRegion || mapRecordLocation(record).region)}>{record.photos?.[0] && <img src={record.photos[0]} alt="" draggable={false} loading="lazy" />}<span><strong>{record.wine}</strong><small>{record.date} · {record.year || "年份未填写"}</small></span><span aria-hidden="true">›</span></button>) : <p className="map-layer-empty">这里还没有酒款记录。</p>}</div>}
        {!details && !selectedRegion && regions.length === 0 && <p className="map-layer-empty">产区资料正在完善；记录过的产区会自动出现在这里。</p>}
      </div></MobileScroll>
    </div>
  </section>;
}
