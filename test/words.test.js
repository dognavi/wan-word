import { test } from "node:test";
import assert from "node:assert/strict";
import { WORDS } from "../js/words.js";

// 全角カタカナ範囲（長音符ーを含む）。small kana・濁音・半濁音も同じブロックに含まれる。
const KATAKANA_RANGE = /^[゠-ヿ]+$/;

test("単語数が46語である", () => {
  assert.equal(WORDS.length, 46);
});

test("全ての単語がちょうど4文字（コードポイント単位）である", () => {
  const bad = WORDS.filter((w) => Array.from(w).length !== 4);
  assert.deepEqual(bad, []);
});

test("全ての単語がカタカナ範囲の文字のみで構成されている", () => {
  const bad = WORDS.filter((w) => !KATAKANA_RANGE.test(w));
  assert.deepEqual(bad, []);
});

test("単語リストに重複がない", () => {
  const seen = new Set(WORDS);
  assert.equal(seen.size, WORDS.length);
});
