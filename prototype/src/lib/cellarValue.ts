import type { CellarEntry } from "./cellar";

type ValuedEntry = Pick<CellarEntry, "purchasePrice" | "quantityRemaining" | "currency">;

/** Purchase-cost value of bottles still in stock, never a market valuation. */
export function calculateCellarValue(entries: readonly ValuedEntry[]) {
  const centsByCurrency = new Map<string, number>();
  let missingPriceCount = 0;
  for (const entry of entries) {
    if (entry.quantityRemaining <= 0) continue;
    if (entry.purchasePrice == null || !Number.isFinite(entry.purchasePrice) || entry.purchasePrice < 0) {
      missingPriceCount++;
      continue;
    }
    const currency = entry.currency.trim().toUpperCase() || "未指定币种";
    const unitCents = Math.round((entry.purchasePrice + Number.EPSILON) * 100);
    centsByCurrency.set(currency, (centsByCurrency.get(currency) ?? 0) + unitCents * entry.quantityRemaining);
  }
  return {
    totals: [...centsByCurrency].map(([currency, cents]) => ({ currency, amount: cents / 100 })),
    missingPriceCount,
  };
}

const currencySymbols: Record<string, string> = {
  CNY: "¥", USD: "US$", EUR: "€", GBP: "£", AUD: "A$", NZD: "NZ$", JPY: "JP¥", HKD: "HK$",
};

export function formatCellarMoney(amount: number, currency: string) {
  const code = currency.trim().toUpperCase();
  const symbol = currencySymbols[code] ?? `${code || "未指定币种"} `;
  return `${symbol}${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}
