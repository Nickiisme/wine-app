import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from "react";
import { ArrowLeftIcon, BookmarkFilledIcon, CameraIcon, CheckCircledIcon, CheckIcon, ChevronDownIcon, DrawingPinFilledIcon, GlobeIcon, ImageIcon, LayersIcon, Pencil2Icon, PersonIcon, PlusIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard } from "./mobile";
import { createTastingRecord, listTastingRecords, type TastingRecord } from "./lib/tastingRecords";
import "./locked-overrides.css";

type Screen = "explore" | "confirm" | "taste" | "success" | "profile" | "records" | "flavor";
type ExploreTab = "grapes" | "regions";
type GrapeNode = { name: string; english: string; image: string; side: "left" | "right"; recent?: boolean; locked?: boolean };
type GrapeDetail = { intro: string; taste: string; aromas: string[]; regions: string };
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const grapeDetails: Record<string, GrapeDetail> = {
  赤霞珠: { intro: "经典的深色葡萄品种，骨架感鲜明，也很适合陈年。", taste: "酒体饱满，单宁较高，酸度中高；年轻时有力量，陈年后更柔和。", aromas: ["黑加仑", "黑樱桃", "雪松", "烟草", "薄荷"], regions: "法国波尔多、美国纳帕谷、智利迈坡谷、中国宁夏" },
  梅洛: { intro: "亲切圆润的红葡萄品种，常被初学者认为很好入口。", taste: "酒体中等至饱满，单宁柔和，果味甜美，口感通常比赤霞珠更圆润。", aromas: ["李子", "黑樱桃", "可可", "香草"], regions: "法国波尔多、美国华盛顿州、智利中央谷" },
  黑皮诺: { intro: "以细腻和透明感著称，对气候与风土十分敏感。", taste: "酒体轻至中等，酸度明亮，单宁细致；风格轻盈，却很有层次。", aromas: ["草莓", "红樱桃", "玫瑰", "蘑菇", "湿润泥土"], regions: "法国勃艮第、新西兰中奥塔哥、美国俄勒冈、德国巴登" },
  霞多丽: { intro: "可塑性很强的白葡萄品种，会随气候与酿造方式呈现不同面貌。", taste: "凉爽产区通常清爽高酸；温暖产区更饱满，橡木桶版本会有奶油质感。", aromas: ["柠檬", "青苹果", "桃子", "黄油", "烤面包"], regions: "法国勃艮第与香槟、美国加州、澳大利亚、智利" },
  长相思: { intro: "辨识度很高的芳香型白葡萄，气息清新而直接。", taste: "酒体轻盈，酸度高，入口爽脆；多数风格适合年轻时饮用。", aromas: ["青柠", "百香果", "青草", "接骨木花"], regions: "新西兰马尔堡、法国卢瓦尔河谷与波尔多、智利" },
};

const grapeNodes: GrapeNode[] = [
  { name: "赤霞珠", english: "Cabernet Sauvignon", image: asset("assets/grapes/cabernet.webp"), side: "left" },
  { name: "梅洛", english: "Merlot", image: asset("assets/grapes/merlot.webp"), side: "right" },
  { name: "黑皮诺", english: "Pinot Noir", image: asset("assets/grapes/pinot-noir.webp"), side: "left", recent: true },
  { name: "霞多丽", english: "Chardonnay", image: asset("assets/grapes/chardonnay.webp"), side: "right" },
  { name: "长相思", english: "Sauvignon Blanc", image: asset("assets/grapes/sauvignon-blanc.webp"), side: "left" },
  { name: "雷司令", english: "Riesling", image: asset("assets/grapes/riesling.webp"), side: "right", locked: true },
  { name: "西拉", english: "Syrah", image: asset("assets/grapes/riesling.webp"), side: "left", locked: true },
  { name: "歌海娜", english: "Grenache", image: asset("assets/grapes/riesling.webp"), side: "right", locked: true },
  { name: "桑娇维塞", english: "Sangiovese", image: asset("assets/grapes/riesling.webp"), side: "left", locked: true },
];
const flavors = ["草莓", "樱桃", "花香", "香草", "香料", "烟熏"];

export default function Prototype() {
  const keyboard = useKeyboard();
  const [screen, setScreen] = useState<Screen>("explore");
  const [tab, setTab] = useState<ExploreTab>("grapes");
  const [recordSheet, setRecordSheet] = useState(false);
  const [recordFilter, setRecordFilter] = useState<string | null>(null);
  const [liked, setLiked] = useState("喜欢");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(["草莓", "花香"]);
  const [tastingNote, setTastingNote] = useState("");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [savingRecord, setSavingRecord] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [labelPhoto, setLabelPhoto] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const go = (next: Screen) => { keyboard.hide(); setScreen(next); };
  const startManualRecord = () => { setRecordSheet(false); setLabelPhoto(null); go("confirm"); };
  const openCamera = () => {
    setRecordSheet(true);
    cameraInput.current?.click();
  };
  const openGallery = () => galleryInput.current?.click();
  const useSelectedPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setLabelPhoto(reader.result);
      setRecordSheet(false);
      go("confirm");
    });
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let active = true;
    listTastingRecords()
      .then((cloudRecords) => {
        if (!active) return;
        setRecords(cloudRecords);
        setCloudMessage(null);
      })
      .catch(() => {
        if (active) setCloudMessage("云端记录加载失败，请稍后重试");
      });
    return () => { active = false; };
  }, []);

  const saveTasting = async () => {
    setSavingRecord(true);
    setCloudMessage(null);
    try {
      const saved = await createTastingRecord({
        grape: "黑皮诺",
        wine: "Domaine Belle Rivière",
        region: "法国 · 勃艮第",
        note: tastingNote,
        preference: liked,
        flavors: selectedFlavors,
        bodyLevel: 58,
      });
      setRecords((current) => [saved, ...current]);
      go("success");
    } catch (error) {
      console.error("CloudBase tasting record save failed", error);
      const detail = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "未知错误";
      setCloudMessage(`保存失败：${detail}`);
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="wine-app">
      {screen === "explore" && <ExploreScreen tab={tab} records={records} onTab={setTab} onRecord={openCamera} onProfile={() => go("profile")} onNotes={(grape) => { setRecordFilter(grape); go("records"); }} />}
      {screen === "confirm" && <ConfirmScreen photo={labelPhoto} onBack={() => go("explore")} onNext={() => go("taste")} />}
      {screen === "taste" && <TasteScreen liked={liked} setLiked={setLiked} selectedFlavors={selectedFlavors} toggleFlavor={(flavor) => setSelectedFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])} note={tastingNote} onNoteChange={setTastingNote} onBack={() => go("confirm")} onSave={saveTasting} saving={savingRecord} cloudMessage={cloudMessage} />}
      {screen === "success" && <SuccessScreen onDone={() => go("explore")} />}
      {screen === "profile" && <ProfileScreen records={records} onExplore={() => go("explore")} onRecord={openCamera} onRecords={() => { setRecordFilter(null); go("records"); }} onFlavor={() => go("flavor")} />}
      {screen === "records" && <TastingRecordsScreen grape={recordFilter} records={records} cloudMessage={cloudMessage} onBack={() => go(recordFilter ? "explore" : "profile")} />}
      {screen === "flavor" && <FlavorPreferenceScreen records={records} onBack={() => go("profile")} />}
      <BottomSheet open={recordSheet} onOpenChange={setRecordSheet} title="拍摄酒标" description="对准正面酒标，自动识别酒款信息" snap={0.64}>
        <div className="record-camera-flow">
          <button className="camera-preview" onClick={openCamera} aria-label="拍照并识别酒标"><span className="camera-frame"><CameraIcon /></span><strong>将酒标完整放入框内</strong><small>点击拍摄并开始识别</small><span className="camera-shutter"><CameraIcon /></span></button>
          <div className="record-alternatives"><p>也可以</p><RecordOption icon={<ImageIcon />} title="从相册导入" detail="选择已有的酒标照片" onClick={openGallery} /><RecordOption icon={<Pencil2Icon />} title="手动记录" detail="没有照片也可以继续" onClick={startManualRecord} /></div>
        </div>
      </BottomSheet>
      <input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={useSelectedPhoto} aria-label="调用后置摄像头拍摄酒标" />
      <input ref={galleryInput} hidden type="file" accept="image/*" onChange={useSelectedPhoto} aria-label="从相册选择酒标照片" />
    </div>
  );
}

function RecordOption({ icon, title, detail, primary, onClick }: { icon: ReactNode; title: string; detail: string; primary?: boolean; onClick: () => void }) {
  return <button className={`record-option ${primary ? "primary" : ""}`} onClick={onClick}>{icon}<span><strong>{title}</strong><small>{detail}</small></span></button>;
}

function ExploreScreen({ tab, records, onTab, onRecord, onProfile, onNotes }: { tab: ExploreTab; records: TastingRecord[]; onTab: (tab: ExploreTab) => void; onRecord: () => void; onProfile: () => void; onNotes: (grape: string) => void }) {
  const [selectedGrape, setSelectedGrape] = useState<GrapeNode | null>(null);
  const detail = selectedGrape ? grapeDetails[selectedGrape.name] : null;
  const stats = getRecordStats(records);
  const selectedCount = selectedGrape ? stats.grapeCounts[selectedGrape.name] ?? 0 : 0;
  const selectedLocked = selectedCount === 0;
  return <>
    <MobileScroll className={`app-scroll paper-screen ${tab === "regions" ? "region-page" : ""}`}>
      <main className={`explore-content ${tab === "regions" ? "region-explore-content" : ""}`}>
        <header className="welcome"><p className="eyebrow">晚上好，Nicki</p><h1>你的葡萄酒世界已点亮：</h1><p className="stats"><strong>{stats.grapeCount}</strong> 个品种 <i>·</i> <strong>{stats.regionCount}</strong> 个产区 <i>·</i> <strong>{stats.recordCount}</strong> 次品鉴</p></header>
        <div className="atlas-tabs" role="tablist" aria-label="图鉴视图"><button className={tab === "grapes" ? "active" : ""} onClick={() => onTab("grapes")}>品种图鉴</button><button className={tab === "regions" ? "active" : ""} onClick={() => onTab("regions")}>产区地图</button></div>
        {tab === "grapes" ? <GrapeAtlas records={records} onSelect={setSelectedGrape} /> : <RegionMap records={records} />}
      </main>
    </MobileScroll>
    <BottomNav active="explore" onExplore={() => onTab(tab)} onRecord={onRecord} onProfile={onProfile} />
    <BottomSheet open={!!selectedGrape} onOpenChange={(open) => { if (!open) setSelectedGrape(null); }} title={selectedGrape?.name ?? "品种介绍"} description={selectedGrape?.english} snap={0.7}>
      {selectedGrape && (selectedLocked ? <div className="grape-detail locked-detail"><span className="detail-question">?</span><h3>{selectedGrape.name}</h3><p>这是一个待探索品种。第一次记录它时，就会在图鉴中点亮。</p></div> : <div className="grape-detail"><div className="grape-detail-hero"><img src={selectedGrape.image} alt={`${selectedGrape.name}葡萄简笔画`} draggable={false} /><div><span className="detail-count">已品鉴 {formatCount(selectedCount)} 次</span><p>{detail?.intro}</p></div></div><section className="detail-section"><small>喝起来</small><p>{detail?.taste}</p></section><section className="detail-section"><small>常见香气</small><div className="aroma-tags">{detail?.aromas.map((aroma) => <span key={aroma}>{aroma}</span>)}</div></section><section className="detail-section"><small>主要产地</small><p>{detail?.regions}</p></section><button className="notes-link" onClick={() => onNotes(selectedGrape.name)}>查看 {selectedCount} 条品酒笔记 <span>›</span></button></div>)}
    </BottomSheet>
  </>;
}

function GrapeAtlas({ records, onSelect }: { records: TastingRecord[]; onSelect: (grape: GrapeNode) => void }) {
  const [pressed, setPressed] = useState<string | null>(null);
  const counts = getRecordStats(records).grapeCounts;
  const latestGrape = records[0]?.grape;
  const choose = (grape: GrapeNode) => { setPressed(grape.name); window.setTimeout(() => { setPressed(null); onSelect(grape); }, 190); };
  return <section className="grape-atlas" aria-label="葡萄品种探索路径"><svg className="path-line" viewBox="0 0 180 940" preserveAspectRatio="none" aria-hidden="true"><path d="M88 4 C158 72 154 150 86 220 S18 365 92 438 S156 580 82 650 S20 794 92 936" /></svg>{grapeNodes.map((grape, index) => { const count = counts[grape.name] ?? 0; const locked = count === 0; const recent = grape.name === latestGrape; return <button key={`${grape.name}-${index}`} onClick={() => choose(grape)} className={`grape-node ${grape.side} ${locked ? "locked" : ""} ${recent ? "recent" : ""} ${pressed === grape.name ? "pressed" : ""}`} aria-label={`${grape.name}${locked ? "，待探索" : `，品鉴过${count}次`}`}><span className="grape-art-wrap"><img src={grape.image} alt="" draggable={false} loading={index < 3 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 2 ? "high" : "auto"} />{!locked && <span className="taste-count">{formatCount(count)}</span>}{recent && <span className="recent-spark">✦</span>}{locked && <span className="locked-mark">?</span>}</span><strong>{grape.name}</strong><small>{locked ? `${grape.english} · 待探索` : grape.english}</small></button>; })}</section>;
}

function formatCount(count: number) { return count > 99 ? "100+" : String(count); }

function getRecordStats(records: TastingRecord[]) {
  const grapeCounts: Record<string, number> = {};
  const regions = new Set<string>();
  const countries = new Set<string>();
  records.forEach((record) => {
    if (record.grape) grapeCounts[record.grape] = (grapeCounts[record.grape] ?? 0) + 1;
    if (record.region) {
      regions.add(record.region);
      countries.add(record.region.split("·")[0].trim());
    }
  });
  return { recordCount: records.length, grapeCount: Object.keys(grapeCounts).length, regionCount: regions.size, grapeCounts, countries };
}

function RegionMap({ records }: { records: TastingRecord[] }) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [mapView, setMapView] = useState({ scale: 1, x: 0, y: 0 });
  const mapViewRef = useRef(mapView);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  useEffect(() => { mapViewRef.current = mapView; }, [mapView]);
  const clampView = (scale: number, x: number, y: number) => {
    const limitX = 150 * (scale - 1);
    const limitY = 190 * (scale - 1);
    return { scale, x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  };
  const zoomMap = (nextScale: number) => {
    const scale = Math.max(1, Math.min(3, nextScale));
    setMapView((current) => clampView(scale, scale === 1 ? 0 : current.x, scale === 1 ? 0 : current.y));
  };
  const handleMapDoubleClick = () => zoomMap(mapViewRef.current.scale > 1 ? 1 : 2);
  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerStart.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: mapViewRef.current.scale, x: mapViewRef.current.x, y: mapViewRef.current.y, centerX: (a.x + b.x) / 2, centerY: (a.y + b.y) / 2 };
    }
  };
  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 7) moved.current = true;
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;
      const scale = Math.max(1, Math.min(3, pinchStart.current.scale * distance / Math.max(1, pinchStart.current.distance)));
      setMapView(clampView(scale, pinchStart.current.x + centerX - pinchStart.current.centerX, pinchStart.current.y + centerY - pinchStart.current.centerY));
    } else if (pointers.current.size === 1 && mapViewRef.current.scale > 1) {
      setMapView((current) => clampView(current.scale, current.x + event.clientX - previous.x, current.y + event.clientY - previous.y));
    }
  };
  const handleMapPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinchStart.current = null;
    if (event.pointerType === "touch" && !moved.current) {
      const now = Date.now();
      if (now - lastTap.current < 320) { handleMapDoubleClick(); lastTap.current = 0; } else lastTap.current = now;
    }
  };
  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomMap(mapViewRef.current.scale - event.deltaY * 0.01);
  };
  const countryCounts = records.reduce<Record<string, number>>((counts, record) => { const country = record.region.split("·")[0].trim(); if (country) counts[country] = (counts[country] ?? 0) + 1; return counts; }, {});
  const regions = [{ country: "法国", x: "48%", y: "181px" }, { country: "意大利", x: "54%", y: "215px" }, { country: "中国", x: "73%", y: "205px" }, { country: "美国", x: "19%", y: "194px" }, { country: "澳大利亚", x: "74%", y: "270px" }, { country: "新西兰", x: "83%", y: "306px" }].map((region) => ({ ...region, count: countryCounts[region.country] ?? 0 }));
  const countryRegions: Record<string, string[]> = {
    法国: ["香槟", "卢瓦尔河谷", "勃艮第", "波尔多", "罗讷河谷"],
    意大利: ["皮埃蒙特", "威尼托", "托斯卡纳", "西西里"],
    中国: ["宁夏贺兰山东麓", "新疆", "山东蓬莱", "云南香格里拉"],
    美国: ["纳帕谷", "索诺玛", "威拉米特谷"],
    澳大利亚: ["巴罗萨谷", "雅拉谷", "玛格丽特河"],
    新西兰: ["马尔堡", "中奥塔哥", "霍克斯湾"],
  };
  const countryFacts: Record<string, { area: string; output: string; grapes: string }> = {
    法国: { area: "约 79 万公顷", output: "约 46 亿升/年", grapes: "赤霞珠、梅洛、黑皮诺、霞多丽" },
    意大利: { area: "约 72 万公顷", output: "约 49 亿升/年", grapes: "桑娇维塞、内比奥罗、灰皮诺" },
    中国: { area: "约 78 万公顷", output: "约 8 亿升/年", grapes: "赤霞珠、蛇龙珠、马瑟兰、霞多丽" },
    美国: { area: "约 39 万公顷", output: "约 24 亿升/年", grapes: "赤霞珠、霞多丽、黑皮诺、仙粉黛" },
    澳大利亚: { area: "约 15 万公顷", output: "约 12 亿升/年", grapes: "西拉、霞多丽、赤霞珠、雷司令" },
    新西兰: { area: "约 4.2 万公顷", output: "约 3 亿升/年", grapes: "长相思、黑皮诺、霞多丽、灰皮诺" },
  };
  if (selectedCountry) { const facts = countryFacts[selectedCountry]; const visitedRegions = new Set(records.filter((record) => record.region.split("·")[0].trim() === selectedCountry).map((record) => record.region.split("·").slice(1).join("·").trim())); return <section className="region-map region-map-zoomed" aria-label={`${selectedCountry}葡萄酒产区地图`}><header className="region-zoom-header"><button onClick={() => setSelectedCountry(null)} aria-label="返回世界地图"><ArrowLeftIcon /></button><div><strong>{selectedCountry} · 产区地图</strong><small>国家概览与主要产区</small></div></header><div className="country-facts"><div><small>葡萄园面积</small><strong>{facts.area}</strong></div><div><small>葡萄酒年产量</small><strong>{facts.output}</strong></div><p><span>主要品种</span>{facts.grapes}</p></div><div className="region-zoom-canvas">{countryRegions[selectedCountry].map((region, index) => <button className={`region-node region-node-${index + 1}`} key={region}><span>{index + 1}</span><strong>{region}</strong><small>{visitedRegions.has(region) ? "已点亮" : "待继续探索"}</small></button>)}</div><p className="map-note">点按左上角，回到世界地图。</p></section>; }
  return <section className="region-map" aria-label="世界葡萄酒产区地图"><div className="map-heading"><GlobeIcon /><span>我的葡萄酒足迹</span></div><div className={`map-gesture-surface ${mapView.scale > 1 ? "is-zoomed" : ""}`} data-scroll-drag="ignore" onDoubleClick={handleMapDoubleClick} onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onPointerCancel={handleMapPointerEnd} onWheel={handleMapWheel} aria-label="可缩放的世界葡萄酒产区地图"><div className="map-transform-layer" style={{ transform: `translate3d(${mapView.x}px, ${mapView.y}px, 0) scale(${mapView.scale})` }}><img className="world-map-art" src={asset("assets/maps/world-wine-map.webp")} alt="世界葡萄酒产区地图" draggable={false} loading="lazy" decoding="async" />{regions.map((region) => <button className="region-pin" style={{ left: region.x, top: region.y }} key={region.country} onClick={() => { if (!moved.current) setSelectedCountry(region.country); }}><span>{region.count}</span>{region.country}</button>)}</div></div>{mapView.scale > 1 && <button className="map-reset" onClick={() => zoomMap(1)} aria-label="还原地图缩放">还原</button>}<p className="map-note">双击或双指捏合缩放 · 放大后拖动查看</p></section>;
}

function ConfirmScreen({ photo, onBack, onNext }: { photo: string | null; onBack: () => void; onNext: () => void }) {
  const [picker, setPicker] = useState<"year" | "grape" | "country" | "region" | null>(null);
  const [year, setYear] = useState("2020");
  const [grape, setGrape] = useState("黑皮诺");
  const [country, setCountry] = useState("法国");
  const [region, setRegion] = useState("勃艮第");
  const years = Array.from({ length: 31 }, (_, index) => String(2026 - index));
  const grapes = ["赤霞珠", "梅洛", "黑皮诺", "霞多丽", "长相思", "雷司令", "西拉", "歌海娜", "桑娇维塞", "马尔贝克"];
  const regionsByCountry: Record<string, string[]> = {
    法国: ["勃艮第", "波尔多", "香槟", "卢瓦尔河谷", "罗讷河谷", "普罗旺斯"],
    意大利: ["托斯卡纳", "皮埃蒙特", "威尼托", "西西里"],
    中国: ["宁夏贺兰山东麓", "新疆", "山东蓬莱", "云南香格里拉"],
    美国: ["纳帕谷", "索诺玛", "威拉米特谷", "圣巴巴拉"],
    澳大利亚: ["巴罗萨谷", "雅拉谷", "玛格丽特河", "猎人谷"],
    新西兰: ["马尔堡", "中奥塔哥", "霍克斯湾", "马丁堡"],
  };
  const countries = Object.keys(regionsByCountry);
  const pickerConfig = picker ? {
    year: { title: "选择年份", options: years, value: year, searchable: false, onSelect: setYear },
    grape: { title: "选择葡萄品种", options: grapes, value: grape, searchable: true, onSelect: setGrape },
    country: { title: "选择国家", options: countries, value: country, searchable: true, onSelect: (value: string) => { setCountry(value); setRegion(regionsByCountry[value][0]); } },
    region: { title: "选择产区", options: regionsByCountry[country], value: region, searchable: true, onSelect: setRegion },
  }[picker] : null;
  return <><MobileScroll className="app-scroll paper-screen"><main className="flow-content"><FlowHeader title="确认酒款" onBack={onBack} /><div className={`label-photo ${photo ? "has-photo" : ""}`}>{photo ? <img src={photo} alt="刚刚拍摄的酒标" /> : <div className="bottle-mark">B</div>}<div><strong>Bourgogne</strong><span>PINOT NOIR · {year}</span></div><span className="scan-pill"><CheckIcon /> 已识别</span></div><p className="helper-copy">请确认识别结果，点按任意字段即可修改。</p><div className="form-list"><Field label="酒款名称" value="Domaine Belle Rivière" /><SelectField label="年份" value={year} onClick={() => setPicker("year")} /><SelectField label="葡萄品种" value={grape} onClick={() => setPicker("grape")} /><SelectField label="国家" value={country} onClick={() => setPicker("country")} /><SelectField label="产区" value={region} onClick={() => setPicker("region")} /></div><button className="primary-action" onClick={onNext}>确认，继续</button></main></MobileScroll>{pickerConfig && <OptionPicker open={!!picker} onOpenChange={(open) => { if (!open) setPicker(null); }} title={pickerConfig.title} options={pickerConfig.options} value={pickerConfig.value} searchable={pickerConfig.searchable} onSelect={(value) => { pickerConfig.onSelect(value); setPicker(null); }} />}</>;
}

function Field({ label, value }: { label: string; value: string }) { return <label className="field-row"><span>{label}</span><KeyboardInput defaultValue={value} aria-label={label} /></label>; }

function SelectField({ label, value, onClick }: { label: string; value: string; onClick: () => void }) { return <button className="field-row select-field" onClick={onClick} aria-label={`${label}，当前为${value}`}><span>{label}</span><strong>{value}<ChevronDownIcon /></strong></button>; }

function OptionPicker({ open, onOpenChange, title, options, value, searchable, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; options: string[]; value: string; searchable: boolean; onSelect: (value: string) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));
  return <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={searchable ? "输入关键词或直接选择" : "选择酒标上的年份"} snap={0.62}><div className="option-picker" tabIndex={0} aria-label={`${title}选项`}>{searchable && <div className="picker-search"><KeyboardInput value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={`搜索${title.replace("选择", "")}`} aria-label={`搜索${title.replace("选择", "")}`} /></div>}<div className="picker-options">{visibleOptions.map((option) => <button className={option === value ? "selected" : ""} onClick={() => onSelect(option)} key={option}><span>{option}</span>{option === value && <CheckIcon />}</button>)}{visibleOptions.length === 0 && <p className="picker-empty">没有找到相关选项</p>}</div></div></BottomSheet>;
}

function TasteScreen({ liked, setLiked, selectedFlavors, toggleFlavor, note, onNoteChange, onBack, onSave, saving, cloudMessage }: { liked: string; setLiked: (liked: string) => void; selectedFlavors: string[]; toggleFlavor: (flavor: string) => void; note: string; onNoteChange: (note: string) => void; onBack: () => void; onSave: () => Promise<void>; saving: boolean; cloudMessage: string | null }) {
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content taste-content"><FlowHeader title="你的感受" onBack={onBack} /><section className="question-block"><h2>你喜欢这杯酒吗？</h2><div className="choice-row">{["不喜欢", "还不错", "喜欢"].map((option) => <button className={liked === option ? "selected" : ""} onClick={() => setLiked(option)} key={option}>{option}</button>)}</div></section><section className="question-block"><h2>喝起来更接近？</h2><div className="range-copy"><span>清爽</span><span>浓郁</span></div><input className="taste-range" type="range" min="0" max="100" defaultValue="58" aria-label="清爽到浓郁" /></section><section className="question-block"><h2>你感受到了什么？</h2><div className="flavor-grid">{flavors.map((flavor) => <button className={selectedFlavors.includes(flavor) ? "selected" : ""} onClick={() => toggleFlavor(flavor)} key={flavor}>{flavor}</button>)}</div></section><section className="question-block note-block"><div className="note-heading"><h2>想记下什么？ <span>选填</span></h2><small>{note.length}/1000</small></div><KeyboardTextarea value={note} maxLength={1000} rows={5} aria-label="品酒笔记" placeholder="可以写下香气、口感、搭配的食物，或者此刻的心情……" onChange={(event) => { onNoteChange(event.currentTarget.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight + 2}px`; }} /></section>{cloudMessage && <p className="helper-copy" role="status">{cloudMessage}</p>}<button className="primary-action" onClick={() => void onSave()} disabled={saving}>{saving ? "正在保存…" : "保存记录"}</button></main></MobileScroll>;
}

function SuccessScreen({ onDone }: { onDone: () => void }) { return <MobileScroll className="app-scroll paper-screen"><main className="success-content"><span className="success-kicker">已点亮新品种</span><img className="success-grape" src={asset("assets/grapes/pinot-noir.webp")} alt="黑皮诺葡萄插画" draggable={false} decoding="async" /><h1>黑皮诺</h1><p>Pinot Noir</p><div className="unlock-summary"><CheckIcon /><span>这次品鉴已经加入你的葡萄酒世界</span></div><button className="primary-action" onClick={onDone}>回到我的图鉴</button><button className="text-action" onClick={onDone}>查看这次记录</button></main></MobileScroll>; }

function ProfileScreen({ records, onExplore, onRecord, onRecords, onFlavor }: { records: TastingRecord[]; onExplore: () => void; onRecord: () => void; onRecords: () => void; onFlavor: () => void }) {
  useEffect(() => {
    const resetScroll = window.setTimeout(() => {
      const scroll = document.querySelector<HTMLElement>(".mobile-scroll");
      if (scroll) scroll.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(resetScroll);
  }, []);
  const badges = [
    { name: "图鉴达人", note: "品种收藏", icon: <StarFilledIcon />, tier: "gold" },
    { name: "产区旅人", note: "世界探索", icon: <GlobeIcon />, tier: "silver" },
    { name: "品鉴新星", note: "持续记录", icon: <BookmarkFilledIcon />, tier: "gold" },
    { name: "红葡萄入门", note: "红葡萄收藏", icon: <LayersIcon />, tier: "silver" },
    { name: "风味发现者", note: "香气探索", icon: <DrawingPinFilledIcon />, tier: "gray" },
    { name: "初次举杯", note: "旅程开始", icon: <CheckCircledIcon />, tier: "gray" },
  ];
  const stats = getRecordStats(records);
  return <><MobileScroll className="app-scroll paper-screen"><main className="profile-content"><p className="eyebrow">我的</p><div className="profile-head"><span>N</span><div><h1>Nicki</h1><p>{stats.grapeCount} 个品种 · {stats.regionCount} 个产区 · {stats.recordCount} 次品鉴</p></div></div><section className="badge-section"><div className="section-title"><h2>我的徽章</h2><button>全部 <span>›</span></button></div><Carousel className="badge-carousel" contentClassName="badge-row" ariaLabel="我的徽章，可左右滑动">{badges.map((badge) => <button className={`badge-item ${badge.tier}`} key={badge.name}><span className="badge-coin"><span>{badge.icon}</span></span><strong>{badge.name}</strong><small>{badge.note}</small></button>)}</Carousel></section><section className="footprint-section"><div className="section-title"><h2>我的足迹</h2></div><div className="footprint-row"><button onClick={onRecords} aria-label={`查看${stats.recordCount}条品鉴记录`}><strong>{stats.recordCount}</strong><span>品鉴记录</span></button><button><strong>{stats.grapeCount}</strong><span>葡萄品种</span></button><button><strong>{stats.regionCount}</strong><span>探索产区</span></button></div></section><div className="profile-menu"><button onClick={onFlavor}>我的风味偏好<span>›</span></button>{["分享我的图鉴", "设置"].map((item) => <button key={item}>{item}<span>›</span></button>)}</div></main></MobileScroll><BottomNav active="profile" onExplore={onExplore} onRecord={onRecord} onProfile={() => {}} /></>;
}

function TastingRecordsScreen({ grape, records: allRecords, cloudMessage, onBack }: { grape: string | null; records: TastingRecord[]; cloudMessage: string | null; onBack: () => void }) {
  const records = grape ? allRecords.filter((record) => record.grape === grape) : allRecords;
  const recordPhotos = ["wine-diary-red-table.webp", "wine-diary-notebook.webp", "wine-diary-chardonnay.webp"];
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content records-content"><FlowHeader title={grape ? `${grape}的品酒笔记` : "我的品鉴记录"} onBack={onBack} />{cloudMessage && <p className="records-summary" role="status">{cloudMessage}</p>}<div className="timeline-year"><strong>2026</strong><span>{grape ? `${records.length} 条${grape}记录` : `共 ${records.length} 次品鉴`}</span></div><div className="records-timeline">{records.map((record, index) => { const date = splitRecordDate(record.date); const showPhoto = index % 4 !== 3; return <article className="timeline-record" key={record.id}><time className="timeline-date" dateTime={record.createdAt}><strong>{date.day}</strong><span>{date.month}</span></time><div className="timeline-dot" aria-hidden="true" /><div className="timeline-content"><div className="timeline-meta"><span>{record.grape}</span><small>{record.region}</small></div>{showPhoto && <img className="timeline-photo" src={asset(`assets/${recordPhotos[index % recordPhotos.length]}`)} alt={`${record.wine}品鉴现场`} draggable={false} loading={index < 2 ? "eager" : "lazy"} decoding="async" />}<h2>{record.wine}</h2><p>{record.note || "这一杯还没有写下品鉴感受。"}</p>{record.flavors && record.flavors.length > 0 && <div className="timeline-flavors">{record.flavors.slice(0, 4).map((flavor) => <span key={flavor}>{flavor}</span>)}</div>}</div></article>; })}</div></main></MobileScroll>;
}

function splitRecordDate(value: string) {
  const match = value.match(/(\d{1,2})\D+(\d{1,2})/);
  return match ? { month: `${match[1]}月`, day: match[2].padStart(2, "0") } : { month: "品鉴", day: value };
}

function FlavorPreferenceScreen({ records, onBack }: { records: TastingRecord[]; onBack: () => void }) {
  const flavorCounts = records.flatMap((record) => record.flavors ?? []).reduce<Record<string, number>>((counts, flavor) => { counts[flavor] = (counts[flavor] ?? 0) + 1; return counts; }, {});
  const flavorTags = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, strength: Math.max(1, Math.min(5, count)) }));
  const bodyValues = records.map((record) => record.bodyLevel).filter((value): value is number => typeof value === "number");
  const bodyAverage = bodyValues.length ? Math.round(bodyValues.reduce((sum, value) => sum + value, 0) / bodyValues.length) : 50;
  const preferences = [{ left: "清爽", right: "浓郁", value: bodyAverage }];
  const favoriteGrapes = Object.entries(getRecordStats(records).grapeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(" · ") || "继续记录后生成";
  const regionCounts = records.reduce<Record<string, number>>((counts, record) => { if (record.region) counts[record.region] = (counts[record.region] ?? 0) + 1; return counts; }, {});
  const favoriteRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name.split("·").pop()?.trim() ?? name).join(" · ") || "继续记录后生成";
  const headline = records.length === 0 ? "还没有足够的品鉴记录" : bodyAverage < 45 ? "偏爱清爽轻盈的风格" : bodyAverage > 65 ? "偏爱饱满浓郁的风格" : "偏爱平衡、适中的风格";
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content flavor-profile"><FlowHeader title="我的风味偏好" onBack={onBack} /><section className="flavor-summary"><small>你的口味画像</small><h2>{headline}</h2><p>{records.length === 0 ? "完成第一条品鉴记录后，这里会自动生成你的口味画像。" : `根据数据库中的 ${records.length} 次品鉴实时计算。`}</p></section><section className="preference-section"><h3>常出现的风味</h3><div className="preference-tags">{flavorTags.length > 0 ? flavorTags.map((tag) => <span className={`strength-${tag.strength}`} key={tag.name}>{tag.name}</span>) : <span>暂无风味数据</span>}</div></section><section className="preference-section"><h3>你偏爱的口感</h3><div className="preference-scales">{preferences.map((item) => <div className="preference-scale" key={item.left}><div><span>{item.left}</span><span>{item.right}</span></div><i><b style={{ left: `${item.value}%` }} /></i></div>)}</div></section><section className="preference-section"><h3>更常喜欢</h3><div className="favorite-list"><div><span>葡萄品种</span><strong>{favoriteGrapes}</strong></div><div><span>产区</span><strong>{favoriteRegions}</strong></div><div><span>风味</span><strong>{flavorTags.slice(0, 3).map((tag) => tag.name).join(" · ") || "继续记录后生成"}</strong></div></div></section><p className="preference-footnote">根据你的 {records.length} 次品鉴记录自动生成，继续记录会让画像更准确。</p></main></MobileScroll>;
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="flow-header"><button onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><h1>{title}</h1><span /></header>; }

function BottomNav({ active, onExplore, onRecord, onProfile }: { active: "explore" | "profile"; onExplore: () => void; onRecord: () => void; onProfile: () => void }) { return <nav className="bottom-nav" aria-label="主要导航"><button className={active === "explore" ? "active" : ""} onClick={onExplore}><GlobeIcon /><span>探索</span></button><button className="record-button" onClick={onRecord} aria-label="记录一杯"><PlusIcon /></button><button className={active === "profile" ? "active" : ""} onClick={onProfile}><PersonIcon /><span>我的</span></button></nav>; }
