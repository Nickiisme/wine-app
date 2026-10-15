import { resolvePhotoUrls, uploadRecordPhotos } from "./tastingRecords";

async function cloud() { return import("./cloudbase"); }

export type CellarEntry = {
  id: string;
  wineName: string;
  vintage: string;
  grapes: string[];
  country: string;
  region: string;
  winery: string;
  photoIds: string[];
  photos: string[];
  purchaseDate: string;
  purchasePrice: number | null;
  currency: string;
  quantityPurchased: number;
  quantityRemaining: number;
  purchaseChannel: string;
  storageLocation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CellarMovement = {
  id: string;
  cellarEntryId: string;
  type: "consumed" | "gifted" | "sold" | "damaged";
  quantity: number;
  eventDate: string;
  tastingRecordId: string | null;
  notes: string;
  createdAt: string;
};

export type CellarInput = Pick<CellarEntry,
  "wineName" | "vintage" | "grapes" | "country" | "region" | "winery" |
  "purchaseDate" | "purchasePrice" | "currency" | "quantityPurchased" |
  "purchaseChannel" | "storageLocation" | "notes"> & { photoFiles?: File[] };

type CloudEntry = {
  id: string; user_id: string; wine_name: string; vintage: string | null; grape: string[] | null;
  country: string | null; region: string | null; winery: string | null; photo_ids: string[] | null;
  purchase_date: string; purchase_price: number | null; currency: string;
  quantity_purchased: number; quantity_remaining: number; purchase_channel: string | null;
  storage_location: string | null; notes: string | null; created_at: string; updated_at: string;
};

const columns = "id,user_id,wine_name,vintage,grape,country,region,winery,photo_ids,purchase_date,purchase_price,currency,quantity_purchased,quantity_remaining,purchase_channel,storage_location,notes,created_at,updated_at";

function fromCloud(row: CloudEntry, urls: Map<string, string>): CellarEntry {
  const photoIds = row.photo_ids ?? [];
  return {
    id: row.id, wineName: row.wine_name, vintage: row.vintage ?? "", grapes: row.grape ?? [],
    country: row.country ?? "", region: row.region ?? "", winery: row.winery ?? "",
    photoIds, photos: photoIds.map((id) => urls.get(id)).filter((url): url is string => Boolean(url)),
    purchaseDate: row.purchase_date, purchasePrice: row.purchase_price === null ? null : Number(row.purchase_price),
    currency: row.currency, quantityPurchased: row.quantity_purchased,
    quantityRemaining: row.quantity_remaining, purchaseChannel: row.purchase_channel ?? "",
    storageLocation: row.storage_location ?? "", notes: row.notes ?? "",
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function migrationError(error: unknown): Error {
  const rawMessage = error && typeof error === "object" && "message" in error ? error.message : error;
  const detail = typeof rawMessage === "string" ? rawMessage : JSON.stringify(rawMessage) || "未知错误";
  if (detail === "{}" || detail === '"[object Object]"') {
    return new Error("藏酒数据库暂时无法访问，请稍后重试。若持续出现，请检查 CloudBase 服务状态与权限配置。");
  }
  return /relation .*does not exist|function .*does not exist|schema cache/i.test(detail)
    ? new Error("藏酒数据库尚未启用：请在 CloudBase SQL 工作台执行 cloudbase/postgresql-cellar.sql")
    : new Error(detail);
}

export async function listCellarEntries(): Promise<CellarEntry[]> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await cloud();
  const userId = await ensureCloudbaseUser();
  const db = getCloudbasePostgres();
  const rows: CloudEntry[] = [];
  try {
    for (let from = 0; ; from += 100) {
      const { data, error } = await db.from("cellar_entries").select(columns).eq("user_id", userId)
        .order("created_at", { ascending: false }).range(from, from + 99);
      if (error) throw error;
      const page = (data ?? []) as unknown as CloudEntry[];
      rows.push(...page);
      if (page.length < 100) break;
    }
    const urls = await resolvePhotoUrls(rows);
    return rows.map((row) => fromCloud(row, urls));
  } catch (error) { throw migrationError(error); }
}

export async function createCellarEntry(input: CellarInput): Promise<CellarEntry> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await cloud();
  const userId = await ensureCloudbaseUser();
  const db = getCloudbasePostgres();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const photoIds = await uploadRecordPhotos(input.photoFiles ?? [], userId, id);
  const row: CloudEntry = {
    id, user_id: userId, wine_name: input.wineName.trim(), vintage: input.vintage || null,
    grape: input.grapes.length ? input.grapes : null, country: input.country || null,
    region: input.region || null, winery: input.winery.trim() || null, photo_ids: photoIds,
    purchase_date: input.purchaseDate, purchase_price: input.purchasePrice,
    currency: input.currency, quantity_purchased: input.quantityPurchased,
    quantity_remaining: input.quantityPurchased, purchase_channel: input.purchaseChannel.trim() || null,
    storage_location: input.storageLocation.trim() || null, notes: input.notes.trim() || null,
    created_at: now, updated_at: now,
  };
  try {
    const { error } = await db.from("cellar_entries").insert(row);
    if (error) throw error;
    return fromCloud(row, await resolvePhotoUrls([row]).catch(() => new Map<string, string>()));
  } catch (error) { throw migrationError(error); }
}

export async function updateCellarEntry(entry: CellarEntry, input: CellarInput): Promise<CellarEntry> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await cloud();
  const userId = await ensureCloudbaseUser();
  const db = getCloudbasePostgres();
  const newPhotos = await uploadRecordPhotos(input.photoFiles ?? [], userId, crypto.randomUUID());
  const changes = {
    wine_name: input.wineName.trim(), vintage: input.vintage || null,
    grape: input.grapes.length ? input.grapes : null, country: input.country || null,
    region: input.region || null, winery: input.winery.trim() || null,
    photo_ids: [...entry.photoIds, ...newPhotos], purchase_date: input.purchaseDate,
    purchase_price: input.purchasePrice, currency: input.currency,
    purchase_channel: input.purchaseChannel.trim() || null,
    storage_location: input.storageLocation.trim() || null, notes: input.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await db.from("cellar_entries").update(changes).eq("id", entry.id)
      .eq("user_id", userId).select(columns).single();
    if (error) throw error;
    return fromCloud(data as unknown as CloudEntry, await resolvePhotoUrls([{ photo_ids: changes.photo_ids }]).catch(() => new Map<string, string>()));
  } catch (error) { throw migrationError(error); }
}

export async function listCellarMovements(entryId: string): Promise<CellarMovement[]> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await cloud();
  const userId = await ensureCloudbaseUser();
  const db = getCloudbasePostgres();
  const { data, error } = await db.from("cellar_movements")
    .select("id,cellar_entry_id,type,quantity,event_date,tasting_record_id,notes,created_at")
    .eq("cellar_entry_id", entryId).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw migrationError(error);
  return ((data ?? []) as unknown as Array<{ id: string; cellar_entry_id: string; type: CellarMovement["type"]; quantity: number; event_date: string; tasting_record_id: string | null; notes: string | null; created_at: string }>).map((row) => ({
    id: row.id, cellarEntryId: row.cellar_entry_id, type: row.type, quantity: row.quantity,
    eventDate: row.event_date, tastingRecordId: row.tasting_record_id, notes: row.notes ?? "", createdAt: row.created_at,
  }));
}

export async function consumeCellarEntry(entryId: string, quantity: number, eventDate: string): Promise<void> {
  const { getCloudbasePostgres } = await cloud();
  const db = getCloudbasePostgres() as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: Error | null }> };
  if (typeof db.rpc !== "function") throw new Error("当前 CloudBase SDK 不支持藏酒事务，请更新 SDK 后重试");
  const { error } = await db.rpc("consume_cellar_entry", { p_entry_id: entryId, p_quantity: quantity, p_event_date: eventDate });
  if (error) throw migrationError(error);
}
