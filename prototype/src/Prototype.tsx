import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftIcon, CameraIcon, CheckIcon, GlobeIcon, ImageIcon, Pencil2Icon, PersonIcon, PlusIcon } from "@radix-ui/react-icons";
import { BottomSheet, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard } from "./mobile";
import "./locked-overrides.css";

type Screen = "explore" | "confirm" | "taste" | "success" | "profile";
type ExploreTab = "grapes" | "regions";
type GrapeNode = { name: string; english: string; image: string; side: "left" | "right"; recent?: boolean; locked?: boolean };
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const grapeNodes: GrapeNode[] = [
  { name: "赤霞珠", english: "Cabernet Sauvignon", image: asset("assets/grapes/cabernet.png"), side: "left" },
  { name: "梅洛", english: "Merlot", image: asset("assets/grapes/merlot.png"), side: "right" },
  { name: "黑皮诺", english: "Pinot Noir", image: asset("assets/grapes/pinot-noir.png"), side: "left", recent: true },
  { name: "霞多丽", english: "Chardonnay", image: asset("assets/grapes/chardonnay.png"), side: "right" },
  { name: "长相思", english: "Sauvignon Blanc", image: asset("assets/grapes/sauvignon-blanc.png"), side: "left" },
  { name: "雷司令", english: "Riesling", image: asset("assets/grapes/riesling.png"), side: "right", locked: true },
  { name: "西拉", english: "Syrah", image: asset("assets/grapes/riesling.png"), side: "left", locked: true },
  { name: "歌海娜", english: "Grenache", image: asset("assets/grapes/riesling.png"), side: "right", locked: true },
  { name: "桑娇维塞", english: "Sangiovese", image: asset("assets/grapes/riesling.png"), side: "left", locked: true },
];
const flavors = ["草莓", "樱桃", "花香", "香草", "香料", "烟熏"];

export default function Prototype() {
  const keyboard = useKeyboard();
  const [screen, setScreen] = useState<Screen>("explore");
  const [tab, setTab] = useState<ExploreTab>("grapes");
  const [recordSheet, setRecordSheet] = useState(false);
  const [liked, setLiked] = useState("喜欢");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(["草莓", "花香"]);
  const go = (next: Screen) => { keyboard.hide(); setScreen(next); };
  const startRecord = () => { setRecordSheet(false); go("confirm"); };

  return (
    <div className="wine-app">
      {screen === "explore" && <ExploreScreen tab={tab} onTab={setTab} onRecord={() => setRecordSheet(true)} onProfile={() => go("profile")} />}
      {screen === "confirm" && <ConfirmScreen onBack={() => go("explore")} onNext={() => go("taste")} />}
      {screen === "taste" && <TasteScreen liked={liked} setLiked={setLiked} selectedFlavors={selectedFlavors} toggleFlavor={(flavor) => setSelectedFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])} onBack={() => go("confirm")} onSave={() => go("success")} />}
      {screen === "success" && <SuccessScreen onDone={() => go("explore")} />}
      {screen === "profile" && <ProfileScreen onExplore={() => go("explore")} onRecord={() => setRecordSheet(true)} />}
      <BottomSheet open={recordSheet} onOpenChange={setRecordSheet} title="记录一杯" description="选择一种最方便的方式开始" snap={0.42}>
        <div className="record-options">
          <RecordOption icon={<CameraIcon />} title="拍摄酒标" detail="自动识别酒款信息" primary onClick={startRecord} />
          <RecordOption icon={<ImageIcon />} title="从相册选择" detail="使用已有的酒标照片" onClick={startRecord} />
          <RecordOption icon={<Pencil2Icon />} title="手动记录" detail="没有照片也可以记录" onClick={startRecord} />
        </div>
      </BottomSheet>
    </div>
  );
}

function RecordOption({ icon, title, detail, primary, onClick }: { icon: ReactNode; title: string; detail: string; primary?: boolean; onClick: () => void }) {
  return <button className={`record-option ${primary ? "primary" : ""}`} onClick={onClick}>{icon}<span><strong>{title}</strong><small>{detail}</small></span></button>;
}

function ExploreScreen({ tab, onTab, onRecord, onProfile }: { tab: ExploreTab; onTab: (tab: ExploreTab) => void; onRecord: () => void; onProfile: () => void }) {
  return <>
    <MobileScroll className="app-scroll paper-screen">
      <main className="explore-content">
        <header className="welcome"><p className="eyebrow">晚上好，Nicki</p><h1>你的葡萄酒世界已点亮：</h1><p className="stats"><strong>12</strong> 个品种 <i>·</i> <strong>8</strong> 个产区 <i>·</i> <strong>23</strong> 次品鉴</p></header>
        <div className="atlas-tabs" role="tablist" aria-label="图鉴视图"><button className={tab === "grapes" ? "active" : ""} onClick={() => onTab("grapes")}>品种图鉴</button><button className={tab === "regions" ? "active" : ""} onClick={() => onTab("regions")}>产区地图</button></div>
        {tab === "grapes" ? <GrapeAtlas /> : <RegionMap />}
      </main>
    </MobileScroll>
    <BottomNav active="explore" onExplore={() => onTab(tab)} onRecord={onRecord} onProfile={onProfile} />
  </>;
}

function GrapeAtlas() {
  return <section className="grape-atlas" aria-label="葡萄品种探索路径"><div className="path-line" aria-hidden="true" />{grapeNodes.map((grape, index) => <button key={`${grape.name}-${index}`} className={`grape-node ${grape.side} ${grape.locked ? "locked" : ""} ${grape.recent ? "recent" : ""}`} aria-label={`${grape.name}${grape.locked ? "，待探索" : ""}`}><span className="grape-art-wrap"><img src={grape.image} alt="" draggable={false} />{grape.recent && <span className="recent-spark">✦</span>}{grape.locked && <span className="locked-mark">?</span>}</span><strong>{grape.name}</strong><small>{grape.locked ? `${grape.english} · 待探索` : grape.english}</small></button>)}</section>;
}

function RegionMap() {
  const regions = [{ country: "法国", count: 5, x: "32%", y: "25%" }, { country: "意大利", count: 2, x: "57%", y: "36%" }, { country: "中国", count: 3, x: "75%", y: "45%" }, { country: "美国", count: 1, x: "17%", y: "43%" }, { country: "澳大利亚", count: 1, x: "77%", y: "73%" }, { country: "新西兰", count: 2, x: "88%", y: "81%" }];
  return <section className="region-map" aria-label="世界葡萄酒产区地图"><div className="map-heading"><GlobeIcon /><span>我的葡萄酒足迹</span></div><div className="world-shape" aria-hidden="true"><span className="continent americas" /><span className="continent europe" /><span className="continent asia" /><span className="continent oceania" /></div>{regions.map((region) => <button className="region-pin" style={{ left: region.x, top: region.y }} key={region.country}><span>{region.count}</span>{region.country}</button>)}<p className="map-note">点亮过的产区，会留在你的地图上。</p></section>;
}

function ConfirmScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content"><FlowHeader title="确认酒款" onBack={onBack} /><div className="label-photo"><div className="bottle-mark">B</div><div><strong>Bourgogne</strong><span>PINOT NOIR · 2020</span></div><span className="scan-pill"><CheckIcon /> 已识别</span></div><p className="helper-copy">请确认识别结果，点按任意字段即可修改。</p><div className="form-list"><Field label="酒款名称" value="Domaine Belle Rivière" /><Field label="年份" value="2020" /><Field label="葡萄品种" value="黑皮诺" /><Field label="国家" value="法国" /><Field label="产区" value="勃艮第" /></div><button className="primary-action" onClick={onNext}>确认，继续</button></main></MobileScroll>;
}

function Field({ label, value }: { label: string; value: string }) { return <label className="field-row"><span>{label}</span><KeyboardInput defaultValue={value} aria-label={label} /></label>; }

function TasteScreen({ liked, setLiked, selectedFlavors, toggleFlavor, onBack, onSave }: { liked: string; setLiked: (liked: string) => void; selectedFlavors: string[]; toggleFlavor: (flavor: string) => void; onBack: () => void; onSave: () => void }) {
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content taste-content"><FlowHeader title="你的感受" onBack={onBack} /><section className="question-block"><h2>你喜欢这杯酒吗？</h2><div className="choice-row">{["不喜欢", "还不错", "喜欢"].map((option) => <button className={liked === option ? "selected" : ""} onClick={() => setLiked(option)} key={option}>{option}</button>)}</div></section><section className="question-block"><h2>喝起来更接近？</h2><div className="range-copy"><span>清爽</span><span>浓郁</span></div><input className="taste-range" type="range" min="0" max="100" defaultValue="58" aria-label="清爽到浓郁" /></section><section className="question-block"><h2>你感受到了什么？</h2><div className="flavor-grid">{flavors.map((flavor) => <button className={selectedFlavors.includes(flavor) ? "selected" : ""} onClick={() => toggleFlavor(flavor)} key={flavor}>{flavor}</button>)}</div></section><section className="question-block note-block"><h2>想记下什么？ <span>选填</span></h2><KeyboardTextarea placeholder="今天和朋友一起喝，第一口有淡淡的草莓香……" /></section><button className="primary-action" onClick={onSave}>保存记录</button></main></MobileScroll>;
}

function SuccessScreen({ onDone }: { onDone: () => void }) { return <MobileScroll className="app-scroll paper-screen"><main className="success-content"><span className="success-kicker">已点亮新品种</span><img className="success-grape" src={asset("assets/grapes/pinot-noir.png")} alt="黑皮诺葡萄插画" draggable={false} /><h1>黑皮诺</h1><p>Pinot Noir</p><div className="unlock-summary"><CheckIcon /><span>这次品鉴已经加入你的葡萄酒世界</span></div><button className="primary-action" onClick={onDone}>回到我的图鉴</button><button className="text-action" onClick={onDone}>查看这次记录</button></main></MobileScroll>; }

function ProfileScreen({ onExplore, onRecord }: { onExplore: () => void; onRecord: () => void }) {
  useEffect(() => {
    const resetScroll = window.setTimeout(() => {
      const scroll = document.querySelector<HTMLElement>(".mobile-scroll");
      if (scroll) scroll.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(resetScroll);
  }, []);
  const badges = [
    { name: "葡萄酒初见", note: "旅程徽章", image: asset("assets/grapes/cabernet.png"), tone: "wine" },
    { name: "黑皮诺旅行家", note: "组合徽章", image: asset("assets/grapes/pinot-noir.png"), tone: "plum" },
    { name: "风味发现者", note: "成长徽章", image: asset("assets/grapes/chardonnay.png"), tone: "sage" },
  ];
  return <><MobileScroll className="app-scroll paper-screen"><main className="profile-content"><p className="eyebrow">我的</p><div className="profile-head"><span>N</span><div><h1>Nicki</h1><p>12 个品种 · 8 个产区 · 23 次品鉴</p></div></div><section className="badge-section"><div className="section-title"><h2>我的徽章</h2><button>全部 <span>›</span></button></div><div className="badge-row">{badges.map((badge) => <button className={`badge-item ${badge.tone}`} key={badge.name}><span className="badge-visual"><img src={badge.image} alt="" draggable={false} /></span><strong>{badge.name}</strong><small>{badge.note}</small></button>)}</div></section><section className="footprint-section"><div className="section-title"><h2>我的足迹</h2></div><div className="footprint-row"><button><strong>23</strong><span>品鉴记录</span></button><button><strong>12</strong><span>葡萄品种</span></button><button><strong>8</strong><span>探索产区</span></button></div></section><div className="profile-menu">{["我的品鉴记录", "我的风味偏好", "分享我的图鉴", "设置"].map((item) => <button key={item}>{item}<span>›</span></button>)}</div></main></MobileScroll><BottomNav active="profile" onExplore={onExplore} onRecord={onRecord} onProfile={() => {}} /></>;
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="flow-header"><button onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><h1>{title}</h1><span /></header>; }

function BottomNav({ active, onExplore, onRecord, onProfile }: { active: "explore" | "profile"; onExplore: () => void; onRecord: () => void; onProfile: () => void }) { return <nav className="bottom-nav" aria-label="主要导航"><button className={active === "explore" ? "active" : ""} onClick={onExplore}><GlobeIcon /><span>探索</span></button><button className="record-button" onClick={onRecord} aria-label="记录一杯"><PlusIcon /></button><button className={active === "profile" ? "active" : ""} onClick={onProfile}><PersonIcon /><span>我的</span></button></nav>; }
