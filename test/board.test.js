import { test } from "node:test";
import assert from "node:assert/strict";
import { GREEN, YELLOW, GRAY } from "../js/judge.js";
import { computeKeyStates } from "../js/board.js";

test("単一行: 各文字がそのままの状態になる", () => {
  const history = [{ guess: ["ハ", "ス", "キ", "ー"], result: [GREEN, YELLOW, GRAY, GREEN] }];
  const states = computeKeyStates(history);
  assert.equal(states.get("ハ"), GREEN);
  assert.equal(states.get("ス"), YELLOW);
  assert.equal(states.get("キ"), GRAY);
  assert.equal(states.get("ー"), GREEN);
});

test("緑は既存の黄を上書きする", () => {
  const history = [
    { guess: ["ワ", "ン", "コ", "ー"], result: [YELLOW, GRAY, GRAY, GRAY] },
    { guess: ["ワ", "ワ", "ワ", "ワ"], result: [GREEN, GRAY, GRAY, GRAY] },
  ];
  const states = computeKeyStates(history);
  assert.equal(states.get("ワ"), GREEN);
});

test("緑は既存のグレーを上書きする", () => {
  const history = [
    { guess: ["ワ", "ン", "コ", "ー"], result: [GRAY, GRAY, GRAY, GRAY] },
    { guess: ["ワ", "ワ", "ワ", "ワ"], result: [GREEN, GRAY, GRAY, GRAY] },
  ];
  const states = computeKeyStates(history);
  assert.equal(states.get("ワ"), GREEN);
});

test("黄は既存のグレーを上書きする", () => {
  const history = [
    { guess: ["ワ", "ン", "コ", "ー"], result: [GRAY, GRAY, GRAY, GRAY] },
    { guess: ["ワ", "ワ", "ワ", "ワ"], result: [YELLOW, GRAY, GRAY, GRAY] },
  ];
  const states = computeKeyStates(history);
  assert.equal(states.get("ワ"), YELLOW);
});

test("グレーは既存の緑・黄を上書きしない（後の行が前の行より弱くても維持される）", () => {
  // 1行目でワが緑(位置一致)、2行目で同じワが別の位置でグレーになったとしても、
  // キーボード上のワは緑のまま維持されるべき(後の行が前の行を上書きしてはならない)。
  const historyGreenThenGray = [
    { guess: ["ワ", "ン", "コ", "ー"], result: [GREEN, GRAY, GRAY, GRAY] },
    { guess: ["コ", "ン", "ワ", "ー"], result: [GRAY, GRAY, GRAY, GRAY] },
  ];
  assert.equal(computeKeyStates(historyGreenThenGray).get("ワ"), GREEN);

  const historyYellowThenGray = [
    { guess: ["ワ", "ン", "コ", "ー"], result: [YELLOW, GRAY, GRAY, GRAY] },
    { guess: ["コ", "ン", "ワ", "ー"], result: [GRAY, GRAY, GRAY, GRAY] },
  ];
  assert.equal(computeKeyStates(historyYellowThenGray).get("ワ"), YELLOW);
});

test("複数行にまたがる集約: 最終的に最も強い状態が残る（最後の行が最も強い場合）", () => {
  const history = [
    { guess: ["ワ", "ワ", "ワ", "ワ"], result: [GRAY, GRAY, GRAY, GRAY] },
    { guess: ["ワ", "ン", "ワ", "ン"], result: [YELLOW, GRAY, YELLOW, GRAY] },
    { guess: ["ワ", "ン", "ワ", "ン"], result: [GREEN, GREEN, GREEN, GREEN] },
  ];
  const states = computeKeyStates(history);
  assert.equal(states.get("ワ"), GREEN);
  assert.equal(states.get("ン"), GREEN);
});

test("複数行にまたがる集約: 最後の行が最も弱くても、それまでの最強状態が維持される", () => {
  // 「常に最後の行で上書きする」という壊れた実装は、このように最後の行が
  // 一番弱い状態になるケースで初めて検出できる(前のテストは偶然最後が最強だったため、
  // その壊れた実装でも見た目上は正しく通ってしまっていた)。
  const history = [
    { guess: ["ワ", "ン", "ワ", "ン"], result: [GREEN, GREEN, GREEN, GREEN] },
    { guess: ["ワ", "ン", "ワ", "ン"], result: [YELLOW, GRAY, YELLOW, GRAY] },
    { guess: ["ワ", "ワ", "ワ", "ワ"], result: [GRAY, GRAY, GRAY, GRAY] },
  ];
  const states = computeKeyStates(history);
  assert.equal(states.get("ワ"), GREEN);
  assert.equal(states.get("ン"), GREEN);
});
