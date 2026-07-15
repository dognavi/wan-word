import { test } from "node:test";
import assert from "node:assert/strict";
import { getJstEpochDayNumber, getJstYearMonthDay } from "../js/day.js";

function withTZ(tz, fn) {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = original;
  }
}

test("制御アサーション: process.env.TZの実行時変更が実際にDateへ反映されている", () => {
  // Windows等の環境では、プロセス起動後にTZを書き換えてもDateの挙動に反映されない
  // 場合がある。これが確認できない状態で以降の「TZに依存しない」テストを走らせても、
  // TZが実際には切り替わっていないだけで見かけ上パスしてしまう(見せかけの安全)。
  // そのため、既知のTZ依存操作(getHours)で先に切り替わりを検証し、
  // 効いていなければここで明示的にテストを失敗させる。
  const hourInUTC = withTZ("UTC", () => new Date(0).getHours());
  const hourInTokyo = withTZ("Asia/Tokyo", () => new Date(0).getHours());
  assert.notEqual(
    hourInUTC,
    hourInTokyo,
    "この実行環境では process.env.TZ の実行時変更が Date に反映されていません。" +
      "後続の「TZに依存しない」テストは検証として意味を持たないため、実行環境を確認してください。"
  );
});

test("getJstEpochDayNumberはTZ設定に依存せず常に同じ値を返す", () => {
  const fixedDate = new Date("2026-07-14T12:00:00.000Z");
  const tzList = ["Asia/Tokyo", "America/New_York", "UTC", "Pacific/Kiritimati"];
  const results = tzList.map((tz) => withTZ(tz, () => getJstEpochDayNumber(fixedDate)));
  const [first, ...rest] = results;
  for (const r of rest) {
    assert.equal(r, first, `TZが変わると結果が変わってしまっている: ${JSON.stringify(results)}`);
  }
});

// 境界クロステスト(下記2件)は、必ず複数のTZを明示的に切り替えながら実行する。
// 単一の既定TZ(このNode実行環境ではAsia/Tokyo)だけで確認すると、実装のバグと
// TZの数値がたまたま相殺し合い、本来検出すべきバグを見逃すことが実際にあった
// (Y/M/D分解方式にわざと壊した際、Asia/Tokyo・America/New_York・Pacific/Kiritimatiでは
// 境界がずれず一見正常に見えたが、UTCでは正しく検出できた。1つのTZだけでは不十分)。
const BOUNDARY_TEST_TZS = ["Asia/Tokyo", "America/New_York", "UTC", "Pacific/Kiritimati"];

test("JST 23:59:59.999から翌0:00:00.000をまたぐ境界で絶対日数が+1される(複数TZで確認)", () => {
  // JST 23:59:59.999 = UTC 14:59:59.999 / JST翌日0:00:00.000 = UTC 15:00:00.000
  const beforeMidnightJst = new Date("2026-07-14T14:59:59.999Z");
  const atMidnightJst = new Date("2026-07-14T15:00:00.000Z");
  for (const tz of BOUNDARY_TEST_TZS) {
    const dayBefore = withTZ(tz, () => getJstEpochDayNumber(beforeMidnightJst));
    const dayAt = withTZ(tz, () => getJstEpochDayNumber(atMidnightJst));
    assert.equal(dayAt, dayBefore + 1, `TZ=${tz} で境界の+1が成立しない`);
  }
});

test("年をまたぐ境界でも正しく+1される(複数TZで確認)", () => {
  const beforeNewYearJst = new Date("2026-12-31T14:59:59.999Z"); // JST 2026-12-31 23:59:59.999
  const atNewYearJst = new Date("2026-12-31T15:00:00.000Z"); // JST 2027-01-01 00:00:00.000
  for (const tz of BOUNDARY_TEST_TZS) {
    const dayBefore = withTZ(tz, () => getJstEpochDayNumber(beforeNewYearJst));
    const dayAt = withTZ(tz, () => getJstEpochDayNumber(atNewYearJst));
    assert.equal(dayAt, dayBefore + 1, `TZ=${tz} で年またぎの+1が成立しない`);
  }
});

// ===== getJstYearMonthDay: 表示専用(ゲームロジックの意思決定には使わない) =====

test("getJstYearMonthDayは既知の日時に対して正しい年月日を返す", () => {
  // UTC 2026-07-14T15:00:00.000Z = JST 2026-07-15 00:00:00.000
  const result = getJstYearMonthDay(new Date("2026-07-14T15:00:00.000Z"));
  assert.deepEqual(result, { year: 2026, month: 7, day: 15 });
});

test("getJstYearMonthDayはTZ設定に依存せず常に同じ値を返す(複数TZで確認)", () => {
  const fixedDate = new Date("2026-07-14T15:00:00.000Z");
  const results = BOUNDARY_TEST_TZS.map((tz) => withTZ(tz, () => getJstYearMonthDay(fixedDate)));
  const [first, ...rest] = results;
  for (const r of rest) {
    assert.deepEqual(r, first, `TZが変わると結果が変わってしまっている: ${JSON.stringify(results)}`);
  }
});
