/** A pending request survives a lost response/reload. Never replace its key on retry. */
type Args = Record<string, unknown>;
export type CellarReceipt = { movement_id: string; tasting_record_id?: string; quantity_remaining: number };
type Envelope = { intentId: string; fingerprint: string; rpcName: string; args: Args; result?: CellarReceipt };
type Storage = { get(key: string): string | null; set(key: string, value: string): void };
type Rpc = (name: string, args: Args) => Promise<{ data: unknown; error: unknown }>;

// One in-flight action per user/entry, including both mark-only and tasting flows.
export function createCellarRequestRunner(storage: Storage, namespace = "default") {
  const flights = new Map<string, { fingerprint: string; promise: Promise<Envelope> }>();
  return function run(options: {
    userId: string; entryId: string; intentId: string; fingerprint: string;
    rpcName: string; prepare: () => Promise<Args>; rpc: Rpc;
  }): Promise<Envelope> {
    const { userId, entryId, intentId, fingerprint, rpcName, prepare, rpc } = options;
    if (!intentId) return Promise.reject(new Error("缺少本次操作标识，请重新打开操作页面"));
    const key = `wine-cellar-request-v1:${namespace}:${userId}:${entryId}`;
    const signature = `${rpcName}:${fingerprint}`;
    const flight = flights.get(key);
    if (flight) return flight.fingerprint === signature ? flight.promise : Promise.reject(new Error("请等待当前藏酒操作完成"));
    const promise = Promise.resolve().then(async () => {
      const raw = storage.get(key);
      let stored: Envelope | undefined = raw ? JSON.parse(raw) : undefined;
      if (stored && (!stored.args || typeof stored.args.p_request_id !== "string" || !stored.intentId || !stored.rpcName)) {
        throw new Error("待确认的藏酒操作信息损坏，请先核对库存，勿重复提交");
      }
      // A completed different intent is a genuinely new action. An unresolved one is always recovered.
      if (stored?.result && stored.intentId !== intentId) stored = undefined;
      if (stored && (stored.fingerprint !== fingerprint || stored.rpcName !== rpcName)) {
        throw new Error("上次藏酒操作尚需确认，请保持原内容重试后再发起新操作");
      }
      if (!stored) {
        stored = { intentId, fingerprint, rpcName, args: await prepare() };
        if (stored.args.p_request_id !== intentId) throw new Error("藏酒请求标识不一致");
        // If durable storage fails, do not send a stock mutation.
        storage.set(key, JSON.stringify(stored));
      }
      if (stored.result) return stored;
      const { data, error } = await rpc(stored.rpcName, stored.args);
      if (error) {
        // A PostgreSQL statement error is a confirmed rollback. Unknown/network errors retain the envelope.
        const code = String((error as { code?: unknown }).code ?? "");
        if (/^(DATABASE_)?[234P][0-9A-Z]{4}$/.test(code)) storage.set(key, "");
        throw error;
      }
      const receipt = data as CellarReceipt | null;
      if (!receipt?.movement_id || !Number.isInteger(receipt.quantity_remaining)) throw new Error("库存操作返回结果不完整，请重试确认");
      stored.result = receipt;
      storage.set(key, JSON.stringify(stored));
      return stored;
    }).finally(() => { flights.delete(key); });
    flights.set(key, { fingerprint: signature, promise });
    return promise;
  };
}
