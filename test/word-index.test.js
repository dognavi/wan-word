import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMod,
  getWordIndexForDate,
  getJstEpochDayNumber,
  generatePermutation,
  WORD_ORDER_PERMUTATION,
} from "../js/day.js";

const SEED = 12345;
const WORD_COUNT = 46;

test("normalizeModは正の入力でそのまま剰余を返す", () => {
  assert.equal(normalizeMod(5, 46), 5);
  assert.equal(normalizeMod(46, 46), 0);
  assert.equal(normalizeMod(47, 46), 1);
});

test("normalizeModは負の入力でも0〜m-1の範囲に正規化する", () => {
  // JSの `%` は数学的な剰余ではないため、素の `%` だと -1 % 46 は -1 になり
  // 配列アクセスに使うとバグる。normalizeModはこれを正しく45に正規化する。
  assert.equal(normalizeMod(-1, 46), 45);
  assert.equal(normalizeMod(-46, 46), 0);
  assert.equal(normalizeMod(-47, 46), 45);
});

test("WORD_ORDER_PERMUTATIONは、コメントに残したシード・アルゴリズムから再現できる", () => {
  // 改変やコピペミスによる破損を検知するための再現性テスト。
  const regenerated = generatePermutation(SEED, WORD_COUNT);
  assert.deepEqual(regenerated, WORD_ORDER_PERMUTATION);
});

test("WORD_ORDER_PERMUTATIONは0〜45の妥当な並べ替えである", () => {
  assert.equal(WORD_ORDER_PERMUTATION.length, WORD_COUNT);
  const sorted = [...WORD_ORDER_PERMUTATION].sort((a, b) => a - b);
  const expected = Array.from({ length: WORD_COUNT }, (_, i) => i);
  assert.deepEqual(sorted, expected);
});

test("単語インデックスは相対的な日数差分で一貫している（起点日そのものの値には依存しない）", () => {
  // Phase 6でEPOCHを確定し直しても期待値がズレないよう、絶対日付ではなく
  // 「基準日から何日後か」という相対差分で検証する。
  const baseDate = new Date("2026-01-01T00:00:00.000Z");
  const baseDay = getJstEpochDayNumber(baseDate);

  for (let offset = 0; offset < WORD_COUNT * 2; offset++) {
    const targetDate = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
    const expectedIndex = WORD_ORDER_PERMUTATION[normalizeMod(baseDay + offset, WORD_COUNT)];
    assert.equal(getWordIndexForDate(targetDate), expectedIndex);
  }
});

test("46日離れた2つの日付は同じ単語インデックスになる（46日周期）", () => {
  const dateA = new Date("2026-03-10T00:00:00.000Z");
  const dateB = new Date(dateA.getTime() + WORD_COUNT * 24 * 60 * 60 * 1000);
  assert.equal(getWordIndexForDate(dateA), getWordIndexForDate(dateB));
});
