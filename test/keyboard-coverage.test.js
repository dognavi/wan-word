import { test } from "node:test";
import assert from "node:assert/strict";
import { WORDS } from "../js/words.js";
import {
  COLUMN_ORDER,
  GYOU_TABLE,
  AUX_CHAR_KEYS,
  toggleDakuten,
  toggleHandakuten,
  isKeyNeeded,
  buildUsedCharSet,
} from "../js/keyboard.js";

// baseキーを実際に押した後、濁点キー・半濁点キーを繰り返し押すことで到達できる
// 全ての文字を幅優先探索で求める。DAKUTEN_MAP等の静的な対応表を直接読むのではなく、
// 実際のtoggleDakuten/toggleHandakuten関数を呼ぶことで、これらの実装ミス
// (循環が壊れている、対象外の行にまで作用する等)もこのテストで検出できるようにする。
function reachableFromBase(base) {
  const seen = new Set([base]);
  const queue = [base];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of [toggleDakuten(current), toggleHandakuten(current)]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function computeReachableCharSet(usedSet) {
  const reachable = new Set();
  for (const gyou of COLUMN_ORDER) {
    for (const base of GYOU_TABLE[gyou]) {
      if (base === null) continue;
      // isKeyNeededがfalseを返すキーは実際のアプリではdisabledになり押せないため、
      // 「押せるキーだけで入力可能か」を確認するにはここで除外する必要がある。
      if (!isKeyNeeded(base, usedSet)) continue;
      for (const c of reachableFromBase(base)) reachable.add(c);
    }
  }
  for (const char of AUX_CHAR_KEYS) {
    if (isKeyNeeded(char, usedSet)) reachable.add(char);
  }
  return reachable;
}

test("46語の全ユニーク文字は、実際に有効なキーだけで入力可能である", () => {
  const usedSet = buildUsedCharSet(WORDS);
  const reachable = computeReachableCharSet(usedSet);
  const unreachable = [...usedSet].filter((c) => !reachable.has(c));
  assert.deepEqual(
    unreachable,
    [],
    `キーボードで入力できない文字がある(この日は永久に正解不能): ${unreachable.join(",")}`
  );
});

test("isKeyNeededは経由専用キー(ソ・ヒ・ヘ)を有効と判定する", () => {
  const usedSet = buildUsedCharSet(WORDS);
  for (const c of ["ソ", "ヒ", "ヘ"]) {
    assert.equal(isKeyNeeded(c, usedSet), true, `${c} は経由専用キーとして必要なはず`);
  }
});

test("isKeyNeededは、平文字・濁点/半濁点到達先のどちらも使われない文字を無効と判定する", () => {
  const usedSet = buildUsedCharSet(WORDS);
  for (const c of ["テ", "ナ", "ラ", "ヤ", "ユ", "ヲ"]) {
    assert.equal(isKeyNeeded(c, usedSet), false, `${c} は使われないはず`);
  }
});
