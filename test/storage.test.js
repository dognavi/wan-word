import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCHEMA_VERSION,
  createInitialStreak,
  isValidSchema,
  isTodayGameState,
  getDisplayedStreak,
  applyWinToStreak,
  applyLossToStreak,
  loadRawState,
  saveRawState,
} from "../js/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== 静的チェック: storage.js が Date/day.js を一切参照しないことを固定する =====
// 「出題ロジックとstreak判定は必ずday.jsの同じ日付関数だけを参照する」という設計を、
// storage.js自身に日付計算の能力を持たせないことで構造的に保証している。
// このテストは、将来 storage.js に new Date() や day.js の import が書き足された
// 場合に、レビューを介さず機械的に検知するための回帰テストである。
test("storage.jsのソースコードはDateもday.jsも一切参照していない(静的チェック)", () => {
  const rawSource = fs.readFileSync(path.join(__dirname, "..", "js", "storage.js"), "utf8");
  // コメント行(説明文の中で"Date"という単語そのものに言及している箇所)は
  // 誤検知の原因になるため、実際のコードだけを見るために行コメントを除去してから調べる。
  const codeOnly = rawSource
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

  assert.doesNotMatch(codeOnly, /\bnew\s+Date\s*\(/, "storage.js が new Date() を直接呼んでいる");
  assert.doesNotMatch(codeOnly, /\bDate\.(now|parse|UTC)\s*\(/, "storage.js が Date の静的メソッドを呼んでいる");
  assert.doesNotMatch(codeOnly, /from\s+["']\.\/day\.js["']/, "storage.js が day.js を import している");
  assert.doesNotMatch(codeOnly, /\bgetJstEpochDayNumber\b|\bgetWordIndexForDate\b/, "storage.js が day.js の関数名を参照している");
});

// ===== スキーマ検証 =====

test("isValidSchema: version不一致は無効", () => {
  assert.equal(isValidSchema({ version: 999, streak: createInitialStreak() }), false);
});

test("isValidSchema: streakの形が壊れていれば無効", () => {
  assert.equal(isValidSchema({ version: SCHEMA_VERSION, streak: { current: "1", lastPlayedDayNumber: null } }), false);
  assert.equal(isValidSchema({ version: SCHEMA_VERSION }), false);
  assert.equal(isValidSchema(null), false);
  assert.equal(isValidSchema(undefined), false);
});

test("isValidSchema: 正しい形は有効", () => {
  assert.equal(isValidSchema({ version: SCHEMA_VERSION, streak: createInitialStreak() }), true);
});

test("isTodayGameState: dayNumberが今日と一致し、historyが配列なら有効", () => {
  const state = {
    version: SCHEMA_VERSION,
    dayNumber: 100,
    history: [],
    gameStatus: "playing",
    streak: createInitialStreak(),
  };
  assert.equal(isTodayGameState(state, 100), true);
});

test("isTodayGameState: dayNumberが今日と異なれば無効(日付が変わったら復元しない)", () => {
  const state = {
    version: SCHEMA_VERSION,
    dayNumber: 99,
    history: [{ guess: ["ワ"], result: ["gray"] }],
    gameStatus: "lost",
    streak: createInitialStreak(),
  };
  assert.equal(isTodayGameState(state, 100), false);
});

// ===== streak: 表示補正 =====

test("getDisplayedStreak: 前日プレイ(差分1)ならそのまま表示", () => {
  assert.equal(getDisplayedStreak({ current: 5, lastPlayedDayNumber: 99 }, 100), 5);
});

test("getDisplayedStreak: 当日既にプレイ済み(差分0)ならそのまま表示", () => {
  assert.equal(getDisplayedStreak({ current: 5, lastPlayedDayNumber: 100 }, 100), 5);
});

test("getDisplayedStreak: 2日以上の空白があれば0に補正して表示する", () => {
  assert.equal(getDisplayedStreak({ current: 5, lastPlayedDayNumber: 90 }, 100), 0);
});

test("getDisplayedStreak: 時計巻き戻り(差分が負)でも0に補正する", () => {
  assert.equal(getDisplayedStreak({ current: 5, lastPlayedDayNumber: 110 }, 100), 0);
});

test("getDisplayedStreak: 未プレイ(lastPlayedDayNumberがnull)なら現在値をそのまま返す(通常0)", () => {
  assert.equal(getDisplayedStreak(createInitialStreak(), 100), 0);
});

// ===== streak: 勝利時の更新 =====

test("applyWinToStreak: 前日プレイ(差分1)なら+1する", () => {
  const result = applyWinToStreak({ current: 5, lastPlayedDayNumber: 99 }, 100);
  assert.deepEqual(result, { current: 6, lastPlayedDayNumber: 100 });
});

test("applyWinToStreak: 初回プレイ(lastPlayedDayNumberがnull)なら1にする", () => {
  const result = applyWinToStreak(createInitialStreak(), 100);
  assert.deepEqual(result, { current: 1, lastPlayedDayNumber: 100 });
});

test("applyWinToStreak: 2日以上の空白があれば1にリセットする", () => {
  const result = applyWinToStreak({ current: 5, lastPlayedDayNumber: 90 }, 100);
  assert.deepEqual(result, { current: 1, lastPlayedDayNumber: 100 });
});

test("applyWinToStreak: 同日内の再実行は加算しない(冪等性ガード)", () => {
  const alreadyWonToday = { current: 6, lastPlayedDayNumber: 100 };
  const result = applyWinToStreak(alreadyWonToday, 100);
  assert.deepEqual(result, alreadyWonToday);
});

// ===== streak: 敗北時の更新 =====

test("applyLossToStreak: 0にリセットする", () => {
  const result = applyLossToStreak({ current: 5, lastPlayedDayNumber: 99 }, 100);
  assert.deepEqual(result, { current: 0, lastPlayedDayNumber: 100 });
});

test("applyLossToStreak: 同日内の再実行は変更しない(冪等性ガード)", () => {
  const alreadyLostToday = { current: 0, lastPlayedDayNumber: 100 };
  const result = applyLossToStreak(alreadyLostToday, 100);
  assert.deepEqual(result, alreadyLostToday);
});

// ===== localStorageの失敗耐性 =====

test("loadRawState: localStorageが例外を投げてもクラッシュせずnullを返す", (t) => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error("プライベートモード等を想定した例外");
    },
  };
  t.after(() => {
    globalThis.localStorage = originalLocalStorage;
  });
  assert.equal(loadRawState(), null);
});

test("loadRawState: 破損したJSONが保存されていてもクラッシュせずnullを返す", (t) => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      return "{ 壊れたJSON";
    },
  };
  t.after(() => {
    globalThis.localStorage = originalLocalStorage;
  });
  assert.equal(loadRawState(), null);
});

test("saveRawState: localStorageが例外を投げてもクラッシュせずfalseを返す", (t) => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    setItem() {
      throw new Error("容量超過等を想定した例外");
    },
  };
  t.after(() => {
    globalThis.localStorage = originalLocalStorage;
  });
  assert.equal(saveRawState({ foo: "bar" }), false);
});
