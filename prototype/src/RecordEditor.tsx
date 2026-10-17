import { useRef, useState } from "react";
import { BottomSheet, KeyboardInput, KeyboardTextarea } from "./mobile";
import { tastingDate, validateTastingDate } from "./lib/tastingDates";
import { canSaveRecord, updateTastingRecord, uploadRecordPhotos, type TastingRecord, type RecordFieldMetadata } from "./lib/tastingRecords";
import { TastingDatePicker } from "./TastingDatePicker";

export function RecordEditor({ record, onClose, onSaved }: { record: TastingRecord; onClose: () => void; onSaved: (record: TastingRecord) => void }) {
  const [draft, setDraft] = useState({ ...record, tastedOn: tastingDate(record) });
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const change = (field: keyof TastingRecord, value: unknown, provenance?: keyof RecordFieldMetadata) => setDraft(current => ({ ...current, [field]: value,
    ...(provenance ? { fieldMetadata: { ...current.fieldMetadata, [provenance]: { source: "user_selected" as const, confirmed: true } } } : {}),
  }));
  const save = async () => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      validateTastingDate(draft.tastedOn);
      if (!canSaveRecord({ wine: draft.wine, grapes: draft.grapes ?? [], country: draft.country ?? "", region: draft.region, photoCount: (draft.photoIds?.length ?? 0) + photos.length, preference: draft.preference ?? null, bodyLevel: draft.bodyLevel ?? null, flavors: draft.flavors ?? [], note: draft.note })) throw new Error("至少保留一项酒款信息、照片或品鉴感受");
      let photoIds = draft.photoIds ?? [];
      if (photos.length) {
        const { ensureCloudbaseUser } = await import("./lib/cloudbase");
        const uploaded = await uploadRecordPhotos(photos, await ensureCloudbaseUser(), crypto.randomUUID());
        photoIds = [...photoIds, ...uploaded];
        setDraft(current => ({ ...current, photoIds })); setPhotos([]);
      }
      const updated = await updateTastingRecord({ ...draft, photoIds });
      onSaved(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试"); }
    finally { saving.current = false; setBusy(false); }
  };
  return <BottomSheet open onOpenChange={open => { if (!open && !busy) onClose(); }} title="编辑记录" snap={0.9}>
    <fieldset className="record-editor" disabled={busy}>
      <TastingDatePicker value={draft.tastedOn} onChange={value => change("tastedOn", value)} />
      {([['wine', '酒名'], ['year', '年份 / NV'], ['country', '国家'], ['region', '产区']] as const).map(([field, label]) => <label key={field}>{label}<KeyboardInput aria-label={label} value={draft[field] ?? ""} onChange={event => change(field, event.currentTarget.value, field)} /></label>)}
      <label>葡萄品种（用顿号分隔）<KeyboardInput aria-label="葡萄品种" value={draft.grape} onChange={event => { const value = event.currentTarget.value; setDraft(current => ({ ...current, grape: value, grapes: value.split(/[、,，]/).map(part => part.trim()).filter(Boolean), fieldMetadata: { ...current.fieldMetadata, grapes: { source: "user_selected", confirmed: true } } })); }} /></label>
      <label>喜欢程度<select aria-label="喜欢程度" value={draft.preference ?? ""} onChange={event => change("preference", event.currentTarget.value || undefined, "preference")}><option value="">未评价</option>{["不喜欢", "还不错", "喜欢"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>酒体<select aria-label="酒体" value={draft.bodyLevel ?? ""} onChange={event => change("bodyLevel", event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value), "bodyLevel")}><option value="">未评价</option><option value="25">轻盈</option><option value="50">适中</option><option value="80">饱满</option>{draft.bodyLevel !== undefined && ![25,50,80].includes(draft.bodyLevel) && <option value={draft.bodyLevel}>原有酒体评价（{draft.bodyLevel}）</option>}</select></label>
      <label>风味（用顿号分隔）<KeyboardInput aria-label="风味" value={(draft.flavors ?? []).join("、")} onChange={event => change("flavors", event.currentTarget.value.split(/[、,，]/), "flavors")} /></label>
      <label>一句话感受<KeyboardTextarea aria-label="一句话感受" value={draft.note} maxLength={1000} onChange={event => change("note", event.currentTarget.value)} /></label>
      <div className="record-editor-photos">{(draft.photoIds ?? []).map((id, index) => <div key={id}>{record.photoIds?.length === record.photos?.length && <img src={record.photos?.[(record.photoIds ?? []).indexOf(id)]} alt={`原有照片 ${index + 1}`} />}<button onClick={() => change("photoIds", draft.photoIds?.filter(item => item !== id))}>移除照片 {index + 1}</button></div>)}</div>
      <label>添加照片<input type="file" accept="image/*" multiple onChange={event => setPhotos(Array.from(event.currentTarget.files ?? []).slice(0, Math.max(0, 9 - (draft.photoIds?.length ?? 0))))} /></label>
      {photos.length > 0 && <small>已选择 {photos.length} 张新照片</small>}
      {record.cellarEntryId && <small>编辑品鉴不会改变库存或原始开瓶流水。</small>}
      {error && <p role="alert">{error}</p>}
      <button className="primary-action" onClick={() => void save()}>{busy ? "正在保存…" : "保存修改"}</button>
      <button className="text-action" onClick={onClose}>取消</button>
    </fieldset>
  </BottomSheet>;
}
