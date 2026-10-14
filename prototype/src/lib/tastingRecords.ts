const COLLECTION = "tasting_records";

async function getCloudbase() {
  return import("./cloudbase");
}

export type TastingRecord = {
  id: string;
  grape: string;
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
};

export type NewTastingRecord = Omit<TastingRecord, "id" | "date"> & {
  tastedAt?: Date;
  photoFiles?: File[];
};

type CloudRecord = {
  id: string;
  user_id: string;
  grape: string;
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
  };
}

async function resolvePhotoUrls(records: CloudRecord[]) {
  const photoIds = [...new Set(records.flatMap((record) => record.photo_ids ?? []))];
  if (photoIds.length === 0) return new Map<string, string>();
  const { cloudbaseApp } = await getCloudbase();
  const result = await cloudbaseApp.getTempFileURL({
    fileList: photoIds.map((fileID) => ({ fileID, maxAge: 3600 })),
  });
  return new Map((result.fileList ?? []).filter((file) => file.tempFileURL).map((file) => [file.fileID, file.tempFileURL]));
}

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

async function uploadPhotos(files: File[], userId: string, recordId: string) {
  if (files.length === 0) return [];
  const { cloudbaseApp } = await getCloudbase();
  return Promise.all(files.map(async (file, index) => {
    const result = await cloudbaseApp.uploadFile({
      cloudPath: `tasting-records/${userId}/${recordId}/${index + 1}.${fileExtension(file)}`,
      filePath: file,
    });
    return result.fileID;
  }));
}

export async function listTastingRecords(): Promise<TastingRecord[]> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const { data, error } = await getCloudbasePostgres()
    .from(COLLECTION)
    .select("id,user_id,grape,wine_name,vintage,country,region,photo_ids,note,preference,flavors,body_level,tasted_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

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
    wine_name: record.wine,
    vintage: record.year,
    country: record.country,
    region: record.region,
    photo_ids: photoIds,
    note: record.note,
    preference: record.preference,
    flavors: record.flavors,
    body_level: record.bodyLevel,
    tasted_at: tastedAt,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const { error } = await db.from(COLLECTION).insert(payload);

  if (error) throw error;
  const photoUrls = await resolvePhotoUrls([payload]);
  return fromCloud(payload, photoIds.map((photoId) => photoUrls.get(photoId)).filter((url): url is string => Boolean(url)));
}
