import { useEffect, useState } from "react";
import { ArrowLeftIcon, CameraIcon, PlusIcon } from "@radix-ui/react-icons";
import { KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboardInsets } from "./mobile";
import type { CellarEntry, CellarMovement } from "./lib/cellar";
import { calculateCellarValue, formatCellarMoney } from "./lib/cellarValue";
import "./cellar.css";
import { platform } from "./platform/web";

export type PurchaseDraft = {
  purchaseDate: string;
  purchasePrice: string;
  currency: string;
  quantity: string;
  purchaseChannel: string;
  storageLocation: string;
  notes: string;
};

const dateLabel = (value: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) : "未填写";
const priceLabel = (entry: CellarEntry) => entry.purchasePrice === null ? "未填写" : `${entry.currency} ${entry.purchasePrice.toFixed(2)}`;
const wineLabel = (entry: CellarEntry) => entry.wineName || "未命名藏酒";

function CellarHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <div className="record-header-dock"><header className="flow-header"><button onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><h1>{title}</h1><span /></header></div>;
}

export function CellarListScreen({ entries, loading, error, onBack, onAdd, onOpen }: { entries: CellarEntry[]; loading: boolean; error: string | null; onBack: () => void; onAdd: () => void; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<"stored" | "consumed">("stored");
  const visible = entries.filter((entry) => status === "stored" ? entry.quantityRemaining > 0 : entry.quantityRemaining === 0);
  const value = calculateCellarValue(entries);
  const valueUnavailable = loading || Boolean(error);
  return <><CellarHeader title="我的藏酒" onBack={onBack} /><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content cellar-page cellar-collection-page">
    <div className="cellar-tabs" role="tablist" aria-label="藏酒状态"><button role="tab" aria-selected={status === "stored"} className={status === "stored" ? "active" : ""} onClick={() => setStatus("stored")}>在藏 <span>{entries.filter((entry) => entry.quantityRemaining > 0).length}</span></button><button role="tab" aria-selected={status === "consumed"} className={status === "consumed" ? "active" : ""} onClick={() => setStatus("consumed")}>已饮用 <span>{entries.filter((entry) => entry.quantityRemaining === 0).length}</span></button></div>
    <section className="cellar-value" aria-label="在藏葡萄酒购买总价值" aria-live="polite">
      <div className="cellar-value-line"><span>藏酒总价值</span><div className="cellar-value-amounts">{valueUnavailable ? <strong>—</strong> : value.totals.length ? value.totals.map((total) => <strong key={total.currency}>{formatCellarMoney(total.amount, total.currency)}</strong>) : <strong>{value.missingPriceCount ? "—" : "¥0"}</strong>}</div><small>按购买价计算</small></div>
      {!valueUnavailable && value.totals.length > 1 && <p>不同币种分别统计，未作汇率换算</p>}
    </section>
    <div className="cellar-list-heading"><p>{status === "stored" ? `还有 ${entries.reduce((sum, entry) => sum + entry.quantityRemaining, 0)} 瓶，等下一次举杯` : "每一瓶都留下了故事"}</p><button onClick={onAdd}><PlusIcon />添加藏酒</button></div>
    {error && <p className="cellar-error" role="alert">{error}</p>}{loading && !error ? <p className="cellar-empty">正在读取藏酒…</p> : visible.length ? <div className="cellar-list">{visible.map((entry) => <button className="cellar-card" key={entry.id} onClick={() => onOpen(entry.id)}><span className="cellar-card-photo">{entry.photos[0] ? <img src={entry.photos[0]} alt={`${wineLabel(entry)}照片`} loading="lazy" draggable={false} /> : <><CameraIcon /><small>暂无照片</small></>}</span><span className="cellar-card-main"><strong>{wineLabel(entry)}</strong><span>{entry.vintage || "年份未填写"} · {status === "stored" ? `剩余${entry.quantityRemaining}瓶` : "已饮用"}</span><span>{/^\d{4}-\d{2}/.test(entry.purchaseDate) ? `购于${entry.purchaseDate.slice(0, 4)}年${entry.purchaseDate.slice(5, 7)}月` : "购买日期未填写"}</span><span>{entry.purchasePrice === null ? "价格未填写" : `${formatCellarMoney(entry.purchasePrice, entry.currency)} / 瓶`}</span><small>{[entry.country, entry.region].filter(Boolean).join(" · ") || "产地未填写"}</small></span></button>)}</div> : !error ? <div className="cellar-empty"><CameraIcon aria-hidden="true" /><p>{status === "stored" ? "这里还没有藏酒。遇见想留下的酒，就从第一瓶开始。" : "喝完的酒会留在这里，回看每一次举杯。"}</p></div> : null}
  </main></MobileScroll></>;
}

export function CellarPurchaseScreen({ wineName, photo, draft, onChange, onBack, onSave, saving, error, editing, remaining }: { wineName: string; photo?: string; draft: PurchaseDraft; onChange: (draft: PurchaseDraft) => void; onBack: () => void; onSave: () => void; saving: boolean; error: string | null; editing: boolean; remaining?: number }) {
  const { bottomInset } = useKeyboardInsets();
  const [saveInset, setSaveInset] = useState(0);
  useEffect(() => {
    const updateInset = () => setSaveInset(platform.saveBarInset(bottomInset));
    updateInset();
    return platform.onSaveViewportChange(updateInset);
  }, [bottomInset]);
  const set = (changes: Partial<PurchaseDraft>) => onChange({ ...draft, ...changes });
  return <><CellarHeader title="记录购买信息" onBack={onBack} /><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content cellar-page cellar-form-page cellar-purchase-page">
    <div className="cellar-wine-preview">{photo && <img src={photo} alt="藏酒照片" />}<span><small>{editing ? "编辑这瓶酒" : "即将加入藏酒"}</small><strong>{wineName || "未命名藏酒"}</strong></span></div>
    <div className="cellar-form">
      <label><span>购买日期</span><KeyboardInput type="date" value={draft.purchaseDate} onChange={(event) => set({ purchaseDate: event.currentTarget.value })} /></label>
      <label><span>单瓶价格 <small>选填{draft.currency !== "CNY" ? ` · ${draft.currency}` : ""}</small></span><KeyboardInput inputMode="decimal" value={draft.purchasePrice} onChange={(event) => set({ purchasePrice: event.currentTarget.value })} placeholder="未填写" /></label>
      <label><span>{editing ? "当前在藏" : "购买数量"}</span>{editing ? <strong>{remaining} 瓶</strong> : <KeyboardInput inputMode="numeric" value={draft.quantity} onChange={(event) => set({ quantity: event.currentTarget.value })} aria-label="购买数量" />}</label>
      <label className="cellar-note-field"><span>备注 <small>选填</small></span><KeyboardTextarea value={draft.notes} onChange={(event) => set({ notes: event.currentTarget.value })} placeholder="记下这瓶酒的故事……" rows={3} /></label>
    </div>
    {editing && <p className="cellar-consume-hint">为保留出入库历史，已购买数量不可在编辑时修改。</p>}
  </main></MobileScroll><div className="cellar-purchase-save-bar" style={{ bottom: saveInset }}>{error && <p className="cellar-error" role="alert">{error}</p>}<button className="primary-action" disabled={saving} onClick={onSave}>{saving ? "正在保存…" : editing ? "保存修改" : "加入我的藏酒"}</button></div></>;
}

export function CellarDetailScreen({ entry, movements, onBack, onOpen, onEdit }: { entry: CellarEntry; movements: CellarMovement[]; onBack: () => void; onOpen: () => void; onEdit: () => void }) {
  return <><CellarHeader title="藏酒详情" onBack={onBack} /><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content cellar-page cellar-detail-page">
    {entry.photos[0] && <img className="cellar-detail-photo" src={entry.photos[0]} alt={`${wineLabel(entry)}照片`} />}
    <div className="cellar-detail-title"><small>{entry.quantityRemaining > 0 ? "在藏" : "已饮用"}</small><h2>{wineLabel(entry)}</h2><p>{[entry.vintage, entry.winery, entry.country, entry.region].filter(Boolean).join(" · ") || "酒款资料待补充"}</p>{entry.grapes.length > 0 && <p>葡萄品种：{entry.grapes.join("、")}</p>}</div>
    <section className="cellar-detail-section"><h3>这瓶酒</h3><div><span>在藏数量</span><strong>{entry.quantityRemaining} 瓶</strong></div><div><span>累计购买</span><strong>{entry.quantityPurchased} 瓶</strong></div><div><span>购买日期</span><strong>{dateLabel(entry.purchaseDate)}</strong></div><div><span>单瓶价格</span><strong>{priceLabel(entry)}</strong></div><div><span>购买渠道</span><strong>{entry.purchaseChannel || "未填写"}</strong></div><div><span>存放位置</span><strong>{entry.storageLocation || "未填写"}</strong></div><div><span>备注</span><strong>{entry.notes || "未填写"}</strong></div></section>
    {movements.length > 0 && <section className="cellar-detail-section cellar-history"><h3>开瓶记录</h3>{movements.map((movement) => <div key={movement.id}><span>{dateLabel(movement.eventDate)}{movement.tastingRecordId ? " · 已记录品鉴" : " · 只标记已饮用"}</span><strong>−{movement.quantity} 瓶</strong></div>)}</section>}
    <div className="cellar-detail-actions"><button className="primary-action" onClick={onOpen} disabled={entry.quantityRemaining === 0}>开一瓶</button><button className="cellar-secondary" onClick={onEdit}>编辑信息</button></div>
  </main></MobileScroll></>;
}

export function CellarConsumeScreen({ entry, mode, date, quantity, onDate, onQuantity, onBack, onSubmit, saving, error }: { entry: CellarEntry; mode: "mark" | "tasting"; date: string; quantity: string; onDate: (date: string) => void; onQuantity: (quantity: string) => void; onBack: () => void; onSubmit: () => void; saving: boolean; error: string | null }) {
  return <><CellarHeader title="开一瓶" onBack={onBack} /><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content cellar-page cellar-form-page"><div className="cellar-wine-preview"><span><small>{mode === "tasting" ? "记录这次品鉴" : "只标记已饮用"}</small><strong>{wineLabel(entry)}</strong></span></div><p className="cellar-consume-hint">目前在藏 {entry.quantityRemaining} 瓶。只扣减这次实际饮用的数量。</p><div className="cellar-form"><label><span>饮用日期</span><KeyboardInput type="date" value={date} onChange={(event) => onDate(event.currentTarget.value)} /></label><label><span>饮用数量</span><KeyboardInput inputMode="numeric" value={quantity} onChange={(event) => onQuantity(event.currentTarget.value)} aria-label="饮用数量" /></label></div>{error && <p className="cellar-error" role="alert">{error}</p>}<button className="primary-action" disabled={saving} onClick={onSubmit}>{saving ? "正在保存…" : mode === "tasting" ? "继续写品鉴感受" : "确认饮用并扣减库存"}</button></main></MobileScroll></>;
}
