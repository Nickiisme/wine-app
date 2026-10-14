const COLLECTION = "tasting_records";
const PHOTO_BUCKET = "tasting-photos";

async function getCloudbase() {
  return import("./cloudbase");
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
  fieldMetadata?: RecordFieldMetadata;
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
  const grapeName = record.grapes?.find((grape) => grape && grape !== "不确定") || record.grape.split("、").find((grape) => grape && grape !== "不确定");
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
  photoFiles?: File[];
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
  created_at?: string;
  field_metadata?: RecordFieldMetadata;
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
    date: formatRecordDate(record.tasted_at ?? record.created_at),
    note: record.note ?? "",
    photos: photoUrls,
    preference: record.preference,
    flavors: record.flavors,
    bodyLevel: record.body_level,
    createdAt: record.created_at,
    fieldMetadata: record.field_metadata,
  };
}

async function resolvePhotoUrls(records: CloudRecord[]) {
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

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

async function uploadPhotos(files: File[], userId: string, recordId: string) {
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
  const extendedResult = await db
    .from(COLLECTION)
    .select("id,user_id,grape,grapes,wine_name,vintage,country,region,photo_ids,note,preference,flavors,body_level,field_metadata,tasted_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  let data: unknown[] | null = extendedResult.data;
  let error = extendedResult.error;

  // Remain readable before the optional metadata migration has been applied.
  if (error && /grapes|field_metadata|column/i.test(String(error.message ?? error))) {
    const legacyResult = await db
      .from(COLLECTION)
      .select("id,user_id,grape,wine_name,vintage,country,region,photo_ids,note,preference,flavors,body_level,tasted_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) throw error;
  const cloudRecords = (data ?? []) as CloudRecord[];
  const photoUrls = await resolvePhotoUrls(cloudRecords);
  return cloudRecords.map((record) => fromCloud(record, (record.photo_ids ?? []).map((id) => photoUrls.get(id)).filter((url): url is string => Boolean(url))));
}

export async function createTastingRecord(
  record: NewTastingRecord,
): Promise<TastingRecord> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const tastedAt = (record.tastedAt ?? new Date()).toISOString();
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const db = getCloudbasePostgres();

  const { error: profileError } = await db.from("profiles").upsert(
    { id: userId, nickname: "葡萄酒探索者", login_type: "anonymous" },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const photoIds = await uploadPhotos(record.photoFiles ?? [], userId, id);

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
    created_at: createdAt,
    updated_at: createdAt,
  };
  let { error } = await db.from(COLLECTION).insert(payload);

  if (error && /grapes|field_metadata|column/i.test(String(error.message ?? error))) {
    const { grapes: _grapes, field_metadata: _fieldMetadata, ...legacyPayload } = payload;
    ({ error } = await db.from(COLLECTION).insert(legacyPayload));
  }

  if (error) throw error;
  const photoUrls = await resolvePhotoUrls([payload]);
  return fromCloud(payload, photoIds.map((photoId) => photoUrls.get(photoId)).filter((url): url is string => Boolean(url)));
}
