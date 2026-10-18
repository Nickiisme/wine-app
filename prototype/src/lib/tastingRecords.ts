import { platform } from "../platform/web";
import type { PhotoFile } from "../platform/photos";
import { recordGrapeNames } from "./grapeCatalog";
import { localDate, validateTastingDate } from "./tastingDates";

const COLLECTION = "tasting_records";
const PHOTO_BUCKET = "tasting-photos";

async function getCloudbase() {
  return import("./cloudbase");
}

async function requireLifecycleSchema() {
  const { getCloudbasePostgres } = await getCloudbase();
  const { error } = await getCloudbasePostgres().from(COLLECTION).select("tasted_on,deleted_at,updated_at").limit(0);
  if (error) {
    if (/tasted_on|deleted_at|updated_at/i.test(error.message ?? "")) throw new Error("请先部署品鉴记录数据库迁移 postgresql-record-lifecycle.sql");
    throw error;
  }
}

export type TastingRecord = {
  id: string;
  grape: string;
  grapes?: string[];
  wine: string;
  year?: string;
  country?: string;
  region: string;
  date: string;
  note: string;
  photos?: string[];
  preference?: string;
  flavors?: string[];
  bodyLevel?: number;
  createdAt?: string;
  tastedAtIso?: string;
  tastedOn?: string;
  updatedAt?: string;
  deletedAt?: string;
  photoIds?: string[];
  fieldMetadata?: RecordFieldMetadata;
  cellarEntryId?: string;
  cellarMovementId?: string;
};

export type FieldSource = "user_selected" | "label_scan" | "inferred" | "default";
export type FieldMetadata = { source: FieldSource; confirmed: boolean };
export type RecordFieldMetadata = Partial<Record<"wine" | "year" | "grapes" | "country" | "region" | "preference" | "bodyLevel" | "flavors", FieldMetadata>>;
export type RecordMode = "quick_save" | "tasting";

export type FeedbackEvidence = {
  mode: RecordMode;
  confirmedPreference?: string;
  confirmedBodyLevel?: number;
  confirmedFlavors: string[];
  hasUserNote: boolean;
};

export type SaveFeedback =
  | { type: "collection"; title: string; description: string }
  | { type: "personal"; title: string; description: string }
  | { type: "knowledge"; title: string; description: string };

export function isConfirmedUserField(record: TastingRecord, field: keyof RecordFieldMetadata) {
  const metadata = record.fieldMetadata?.[field];
  return metadata?.source === "user_selected" && metadata.confirmed === true;
}

export function getFeedbackEvidence(record: TastingRecord): FeedbackEvidence {
  const confirmedPreference = isConfirmedUserField(record, "preference") ? record.preference : undefined;
  const confirmedBodyLevel = isConfirmedUserField(record, "bodyLevel") ? record.bodyLevel : undefined;
  const confirmedFlavors = isConfirmedUserField(record, "flavors") ? record.flavors ?? [] : [];
  const hasUserNote = record.note.trim().length > 0;
  const mode: RecordMode = confirmedPreference || confirmedBodyLevel !== undefined || confirmedFlavors.length > 0 || hasUserNote ? "tasting" : "quick_save";
  return { mode, confirmedPreference, confirmedBodyLevel, confirmedFlavors, hasUserNote };
}

function buildPersonalDescription(evidence: FeedbackEvidence) {
  const parts: string[] = [];
  if (evidence.confirmedPreference) parts.push(`你觉得这杯酒“${evidence.confirmedPreference}”`);
  if (evidence.confirmedFlavors.length > 0) parts.push(`感受到了${evidence.confirmedFlavors.slice(0, 3).join("、")}`);
  if (evidence.confirmedBodyLevel !== undefined) {
    parts.push(evidence.confirmedBodyLevel < 40 ? "口感偏轻盈" : evidence.confirmedBodyLevel > 65 ? "口感偏饱满" : "口感适中");
  }
  if (parts.length === 0 && evidence.hasUserNote) return "你写下了这杯酒的第一条品鉴感受。";
  return `${parts.join("，")}。`;
}

export function buildSaveFeedback(record: TastingRecord): SaveFeedback {
  const evidence = getFeedbackEvidence(record);
  const grapeName = recordGrapeNames(record)[0];
  if (evidence.mode === "tasting") {
    return { type: "personal", title: "记录了你的第一条口味线索", description: buildPersonalDescription(evidence) };
  }
  if (grapeName) {
    return { type: "collection", title: `${grapeName}图鉴已点亮`, description: "第一杯已收藏。多记录几次真实感受后，我们会逐渐看见你的偏好。" };
  }
  return { type: "collection", title: "第一杯已收藏", description: "补充葡萄品种后，可以点亮对应图鉴。" };
}

export function buildKnowledgeFeedback(grapeName: string, typicalFlavors: string[]): SaveFeedback | null {
  if (!grapeName || typicalFlavors.length === 0) return null;
  return { type: "knowledge", title: "下次品尝时可以留意", description: `${grapeName}通常带有${typicalFlavors.slice(0, 2).join("、")}等香气。这不是你的口味结论，继续记录真实感受后再看看。` };
}

export function canSaveRecord(input: { wine: string; grapes: string[]; country: string; region: string; photoCount: number; preference: string | null; bodyLevel: number | null; flavors: string[]; note: string }) {
  return Boolean(input.wine.trim() || input.grapes.length || input.country || input.region || input.photoCount || input.preference || input.bodyLevel !== null || input.flavors.length || input.note.trim());
}

export type NewTastingRecord = Omit<TastingRecord, "id" | "date"> & {
  tastedAt?: Date;
  photoFiles?: PhotoFile[];
  existingPhotoIds?: string[];
  cellarQuantity?: number;
};

type CloudRecord = {
  id: string;
  user_id: string;
  grape: string;
  grapes?: string[];
  wine_name: string;
  vintage?: string;
  country?: string;
  region: string;
  photo_ids?: string[];
  note?: string;
  preference?: string;
  flavors?: string[];
  body_level?: number;
  tasted_at?: string;
  tasted_on?: string;
  updated_at?: string;
  deleted_at?: string;
  created_at?: string;
  field_metadata?: RecordFieldMetadata;
  cellar_entry_id?: string;
  cellar_movement_id?: string;
};

function formatRecordDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function fromCloud(record: CloudRecord, photoUrls: string[] = []): TastingRecord {
  return {
    id: record.id,
    grape: record.grape,
    grapes: record.grapes ?? (record.grape ? record.grape.split("、").filter(Boolean) : []),
    wine: record.wine_name,
    year: record.vintage,
    country: record.country,
    region: record.region,
    date: formatRecordDate(record.tasted_on ? `${record.tasted_on}T12:00:00` : record.tasted_at ?? record.created_at),
    note: record.note ?? "",
    photos: photoUrls,
    preference: record.preference,
    flavors: record.flavors,
    bodyLevel: record.body_level,
    createdAt: record.created_at,
    tastedAtIso: record.tasted_at,
    tastedOn: record.tasted_on,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at,
    photoIds: record.photo_ids ?? [],
    fieldMetadata: record.field_metadata,
    cellarEntryId: record.cellar_entry_id,
    cellarMovementId: record.cellar_movement_id,
  };
}

export async function resolvePhotoUrls(records: Array<{ photo_ids?: string[] | null }>) {
  const photoIds = [...new Set(records.flatMap((record) => record.photo_ids ?? []))];
  if (photoIds.length === 0) return new Map<string, string>();
  const { cloudbaseApp } = await getCloudbase();
  const legacyFileIds = photoIds.filter((photoId) => photoId.startsWith("cloud://"));
  const objectPaths = photoIds.filter((photoId) => !photoId.startsWith("cloud://"));
  const urls = new Map<string, string>();

  if (objectPaths.length > 0) {
    const { data, error } = await cloudbaseApp.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(objectPaths, 3600);
    if (error) throw error;
    for (const item of data) {
      if (item.fullSignedURL) urls.set(item.path, item.fullSignedURL);
    }
  }

  // Keep records uploaded before the PG-storage migration readable.
  if (legacyFileIds.length > 0) {
    const result = await cloudbaseApp.getTempFileURL({
      fileList: legacyFileIds.map((fileID) => ({ fileID, maxAge: 3600 })),
    });
    for (const file of result.fileList ?? []) {
      if (file.tempFileURL) urls.set(file.fileID, file.tempFileURL);
    }
  }

  return urls;
}

function fileExtension(file: PhotoFile) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export async function uploadRecordPhotos(files: PhotoFile[], userId: string, recordId: string) {
  if (files.length === 0) return [];
  const { cloudbaseApp } = await getCloudbase();
  const bucket = cloudbaseApp.storage.from(PHOTO_BUCKET);
  return Promise.all(files.map(async (file, index) => {
    const objectPath = `${userId}/${recordId}/${index + 1}.${fileExtension(file)}`;
    const { data, error } = await bucket.upload(objectPath, file, {
      contentType: file.type || undefined,
    });
    if (error) {
      const message = String(error.message ?? error);
      if (/row-level security|storage_access_denied|access denied|rls/i.test(message)) {
        throw new Error("照片存储权限尚未配置：请在 CloudBase SQL 工作台执行 cloudbase/postgresql-storage.sql");
      }
      throw error;
    }
    return data.path;
  }));
}

export async function listTastingRecords(): Promise<TastingRecord[]> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const db = getCloudbasePostgres();
  const pageSize = 100;
  const fetchAll = async (columns: string, supportsDeletion = true) => {
    const result: CloudRecord[] = [];
    for (let from = 0; ; from += pageSize) {
      let query = db
        .from(COLLECTION)
        .select(columns)
        .eq("user_id", userId);
      if (supportsDeletion) query = query.is("deleted_at", null);
      const { data, error } = await query
        .order("tasted_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const page = (data ?? []) as unknown as CloudRecord[];
      result.push(...page);
      if (page.length < pageSize) return result;
    }
  };
  let cloudRecords: CloudRecord[];
  try {
    cloudRecords = await fetchAll("*");
  } catch (error) {
    // Only a confirmed missing deletion column permits the legacy read path.
    // Never fall back on a network or permission error and expose deleted records.
    const detail = error as { message?: string; code?: string };
    if (!/deleted_at/.test(detail.message ?? "") || !["42703", "PGRST204"].includes(detail.code ?? "")) throw error;
    cloudRecords = await fetchAll("*", false);
  }
  const photoUrls = await resolvePhotoUrls(cloudRecords);
  return cloudRecords.map((record) => fromCloud(record, (record.photo_ids ?? []).map((id) => photoUrls.get(id)).filter((url): url is string => Boolean(url))));
}

export async function createTastingRecord(
  record: NewTastingRecord,
): Promise<TastingRecord> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const tastedOn = validateTastingDate(record.tastedOn ?? localDate(record.tastedAt ?? new Date()));
  await requireLifecycleSchema();
  const tastedAt = new Date(`${tastedOn}T12:00:00`).toISOString();
  const createdAt = new Date().toISOString();
  const id = platform.id();
  const db = getCloudbasePostgres();

  const { error: profileError } = await db.from("profiles").upsert(
    { id: userId, nickname: "葡萄酒探索者", login_type: "anonymous" },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const photoIds = [...(record.existingPhotoIds ?? []), ...await uploadRecordPhotos(record.photoFiles ?? [], userId, id)];

  const payload = {
    id,
    user_id: userId,
    grape: record.grape,
    grapes: record.grapes,
    wine_name: record.wine,
    vintage: record.year,
    country: record.country,
    region: record.region,
    photo_ids: photoIds,
    note: record.note,
    preference: record.preference,
    flavors: record.flavors,
    body_level: record.bodyLevel,
    field_metadata: record.fieldMetadata,
    tasted_at: tastedAt,
    tasted_on: tastedOn,
    created_at: createdAt,
    updated_at: createdAt,
  };
  if (record.cellarEntryId) {
    const rpc = db as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: { movement_id?: string } | null; error: Error | null }> };
    if (typeof rpc.rpc !== "function") throw new Error("当前 CloudBase SDK 不支持藏酒事务，请更新 SDK 后重试");
    const { data, error } = await rpc.rpc("save_cellar_tasting", {
      p_entry_id: record.cellarEntryId,
      p_quantity: record.cellarQuantity ?? 1,
      p_event_date: tastedOn,
      p_record: payload,
    });
    if (error) throw error;
    const { data: persisted } = await db.from(COLLECTION).select("*").eq("id", id).eq("user_id", userId);
    const cloudRecord: CloudRecord = (persisted?.[0] as unknown as CloudRecord) ?? { ...payload, updated_at: undefined, cellar_entry_id: record.cellarEntryId, cellar_movement_id: data?.movement_id };
    const photoUrls = await resolvePhotoUrls([cloudRecord]).catch(() => new Map<string, string>());
    return fromCloud(cloudRecord, photoIds.map((photoId) => photoUrls.get(photoId)).filter((url): url is string => Boolean(url)));
  }
  let { data: inserted, error } = await db.from(COLLECTION).insert(payload).select("*");

  if (error && /grapes|field_metadata|column/i.test(String(error.message ?? error))) {
    const { grapes: _grapes, field_metadata: _fieldMetadata, ...legacyPayload } = payload;
    ({ data: inserted, error } = await db.from(COLLECTION).insert(legacyPayload).select("*"));
  }

  if (error) throw error;
  const persisted = (inserted?.[0] as unknown as CloudRecord) ?? payload;
  const photoUrls = await resolvePhotoUrls([persisted]).catch(() => new Map<string, string>());
  return fromCloud(persisted, photoIds.map((photoId) => photoUrls.get(photoId)).filter((url): url is string => Boolean(url)));
}

/** Updates never alter creation time or cellar movements. RLS enforces ownership. */
export async function updateTastingRecord(record: TastingRecord): Promise<TastingRecord> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  await requireLifecycleSchema();
  const day = validateTastingDate(record.tastedOn ?? localDate());
  const { data, error } = await getCloudbasePostgres().from(COLLECTION).update({
    wine_name: record.wine, vintage: record.year || null, grape: record.grape, grapes: record.grapes,
    country: record.country || null, region: record.region, note: record.note,
    preference: record.preference || null, body_level: record.bodyLevel ?? null,
    flavors: (record.flavors ?? []).map(value => value.trim()).filter(Boolean), field_metadata: record.fieldMetadata,
    tasted_on: day, tasted_at: new Date(`${day}T12:00:00`).toISOString(), photo_ids: record.photoIds ?? [],
  }).eq("id", record.id).eq("user_id", userId).is("deleted_at", null)
    .eq("updated_at", record.updatedAt ?? record.createdAt ?? "").select("*");
  if (error) throw error;
  if (!data?.length) throw new Error("记录已被修改或删除，请刷新后再编辑");
  const row = data[0] as unknown as CloudRecord;
  const urls = await resolvePhotoUrls([row]).catch(() => new Map<string, string>());
  return fromCloud(row, (row.photo_ids ?? []).map(id => urls.get(id)).filter((url): url is string => Boolean(url)));
}

export async function softDeleteTastingRecord(id: string): Promise<void> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  await requireLifecycleSchema();
  const { data, error } = await getCloudbasePostgres().from(COLLECTION)
    .update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id).is("deleted_at", null).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("记录不存在或已删除，请刷新后重试");
}

/** The database trigger enforces the 30-day recovery window. */
export async function restoreTastingRecord(id: string): Promise<void> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const { data, error } = await getCloudbasePostgres().from(COLLECTION)
    .update({ deleted_at: null }).eq("user_id", userId).eq("id", id)
    .gt("deleted_at", new Date(Date.now() - 30 * 86400000).toISOString()).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("记录不存在或已超过30天恢复期限");
}
