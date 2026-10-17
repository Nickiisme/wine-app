/** Calendar dates stay in the timezone in which the user chose them. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validateTastingDate(value: string, today = localDate()): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || localDate(parsed) !== value) throw new Error("请选择有效的品鉴日期");
  if (value > today) throw new Error("品鉴日期不能晚于今天");
  return value;
}

type DatedRecord = { tastedOn?: string; tastedAtIso?: string; createdAt?: string; date?: string; deletedAt?: string };
export function tastingDate(record: DatedRecord): string {
  if (record.tastedOn) return record.tastedOn;
  for (const value of [record.tastedAtIso, /^\d{4}-\d{2}-\d{2}/.test(record.date ?? "") ? record.date : undefined, record.createdAt]) {
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return localDate(date);
  }
  return "";
}
export function tastingTime(record: DatedRecord): number {
  const day = tastingDate(record);
  return day ? new Date(`${day}T12:00:00`).getTime() : 0;
}
export function tastingLabel(record: DatedRecord): string {
  const day = tastingDate(record);
  return day ? `品鉴于 ${new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${day}T12:00:00`))}` : "品鉴日期未知";
}
