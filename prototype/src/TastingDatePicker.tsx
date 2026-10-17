import { useState } from "react";
import { BottomSheet, KeyboardInput } from "./mobile";
import { localDate, validateTastingDate } from "./lib/tastingDates";
import "./record-lifecycle.css";

export function TastingDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const choose = (day: string) => {
    try { validateTastingDate(day); onChange(day); setError(""); setOpen(false); }
    catch (reason) { setError((reason as Error).message); }
  };
  return <section className="tasting-date-control">
    <button onClick={() => setOpen(true)}><span>品鉴时间</span><strong>{value === localDate() ? "今天" : value || "选择日期"} ›</strong></button>
    {value && value < localDate() && <small>将按实际品鉴日期计入足迹与统计</small>}
    <BottomSheet open={open} onOpenChange={setOpen} title="品鉴时间" snap={0.45}>
      <div className="record-actions"><button onClick={() => choose(localDate())}>今天</button><button onClick={() => { const date = new Date(); date.setDate(date.getDate() - 1); choose(localDate(date)); }}>昨天</button></div>
      <label>选择具体日期<KeyboardInput aria-label="品鉴日期" type="date" value={value} max={localDate()} onChange={event => choose(event.currentTarget.value)} /></label>
      {error && <p role="alert">{error}</p>}
    </BottomSheet>
  </section>;
}
