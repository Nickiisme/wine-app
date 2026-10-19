import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCellarValue, formatCellarMoney } from "../src/lib/cellarValue.ts";

const entry = (purchasePrice, quantityRemaining = 1, currency = "CNY") => ({ purchasePrice, quantityRemaining, currency });

test("purchase cost is unit price times remaining stock, never purchased stock", () => {
  assert.deepEqual(calculateCellarValue([entry(268), entry(328), entry(198)]).totals, [{ currency: "CNY", amount: 794 }]);
  assert.equal(calculateCellarValue([entry(268, 3)]).totals[0].amount, 804);
  assert.equal(calculateCellarValue([entry(268, 2)]).totals[0].amount, 536);
  assert.deepEqual(calculateCellarValue([entry(268, 0)]).totals, []);
});

test("missing prices count entries, not bottles; consumed entries are excluded", () => {
  assert.deepEqual(calculateCellarValue([entry(null, 5), entry(null, 0), entry(198)]), {
    totals: [{ currency: "CNY", amount: 198 }], missingPriceCount: 1,
  });
  assert.deepEqual(calculateCellarValue([entry(null)]), { totals: [], missingPriceCount: 1 });
  assert.deepEqual(calculateCellarValue([]), { totals: [], missingPriceCount: 0 });
});

test("zero is a real price; invalid prices are not summed", () => {
  assert.deepEqual(calculateCellarValue([entry(0, 2)]), { totals: [{ currency: "CNY", amount: 0 }], missingPriceCount: 0 });
  assert.equal(calculateCellarValue([entry(NaN), entry(Infinity), entry(-1)]).missingPriceCount, 3);
});

test("currencies stay separate, including yen and yuan; decimal totals are stable", () => {
  assert.deepEqual(calculateCellarValue([entry(.1), entry(.2), entry(10, 2, "usd"), entry(100, 1, "JPY")]).totals, [
    { currency: "CNY", amount: .3 }, { currency: "USD", amount: 20 }, { currency: "JPY", amount: 100 },
  ]);
  assert.equal(formatCellarMoney(794, "CNY"), "¥794");
  assert.equal(formatCellarMoney(100, "JPY"), "JP¥100");
  assert.equal(formatCellarMoney(12.5, "USD"), "US$12.5");
});
