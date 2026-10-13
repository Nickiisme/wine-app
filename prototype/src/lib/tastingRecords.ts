const COLLECTION = "tasting_records";

async function getCloudbase() {
  return import("./cloudbase");
}

export type TastingRecord = {
  id: string;
  grape: string;
  wine: string;
  region: string;
  date: string;
  note: string;
  preference?: string;
  flavors?: string[];
  bodyLevel?: number;
  createdAt?: string;
};

export type NewTastingRecord = Omit<TastingRecord, "id" | "date"> & {
  tastedAt?: Date;
};

type CloudRecord = {
  id: string;
  user_id: string;
  grape: string;
  wine_name: string;
  region: string;
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

function fromCloud(record: CloudRecord): TastingRecord {
  return {
    id: record.id,
    grape: record.grape,
    wine: record.wine_name,
    region: record.region,
    date: formatRecordDate(record.tasted_at ?? record.created_at),
    note: record.note ?? "",
    preference: record.preference,
    flavors: record.flavors,
    bodyLevel: record.body_level,
    createdAt: record.created_at,
  };
}

export async function listTastingRecords(): Promise<TastingRecord[]> {
  const { ensureCloudbaseUser, getCloudbasePostgres } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const { data, error } = await getCloudbasePostgres()
    .from(COLLECTION)
    .select("id,user_id,grape,wine_name,region,note,preference,flavors,body_level,tasted_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return ((data ?? []) as CloudRecord[]).map(fromCloud);
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

  const payload = {
    id,
    user_id: userId,
    grape: record.grape,
    wine_name: record.wine,
    region: record.region,
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
  return fromCloud(payload);
}
