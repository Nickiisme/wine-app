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
  _id: string;
  grape: string;
  wine: string;
  region: string;
  note?: string;
  preference?: string;
  flavors?: string[];
  bodyLevel?: number;
  tastedAt?: string;
  createdAt?: string;
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
    id: record._id,
    grape: record.grape,
    wine: record.wine,
    region: record.region,
    date: formatRecordDate(record.tastedAt ?? record.createdAt),
    note: record.note ?? "",
    preference: record.preference,
    flavors: record.flavors,
    bodyLevel: record.bodyLevel,
    createdAt: record.createdAt,
  };
}

export async function listTastingRecords(): Promise<TastingRecord[]> {
  const { cloudbaseApp, ensureCloudbaseUser } = await getCloudbase();
  await ensureCloudbaseUser();
  const result = await cloudbaseApp
    .database()
    .collection(COLLECTION)
    // CloudBase security rules require the owner constraint in client queries.
    .where({ _openid: "{uid}" })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return (result.data as CloudRecord[]).map(fromCloud);
}

export async function createTastingRecord(
  record: NewTastingRecord,
): Promise<TastingRecord> {
  const { cloudbaseApp, ensureCloudbaseUser } = await getCloudbase();
  const userId = await ensureCloudbaseUser();
  const tastedAt = (record.tastedAt ?? new Date()).toISOString();
  const createdAt = new Date().toISOString();
  const payload = {
    userId,
    grape: record.grape,
    wine: record.wine,
    region: record.region,
    note: record.note,
    preference: record.preference,
    flavors: record.flavors,
    bodyLevel: record.bodyLevel,
    tastedAt,
    createdAt,
    updatedAt: createdAt,
  };
  const result = await cloudbaseApp.database().collection(COLLECTION).add(payload);

  if (!result.id) throw new Error("CloudBase 未返回新记录 ID");
  return fromCloud({ _id: result.id, ...payload });
}
