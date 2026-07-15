import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toggleDakuten,
  toggleHandakuten,
  getCursorIndex,
  applyDakutenAtCursor,
  applyHandakutenAtCursor,
} from "../js/keyboard.js";

// ===== 濁点キー(toggleDakuten): 2状態トグル =====

test("濁点キー: ハ→バ→ハ の2状態トグル", () => {
  assert.equal(toggleDakuten("ハ"), "バ");
  assert.equal(toggleDakuten("バ"), "ハ");
});

test("濁点キー: カ→ガ→カ の2状態トグル", () => {
  assert.equal(toggleDakuten("カ"), "ガ");
  assert.equal(toggleDakuten("ガ"), "カ");
});

test("濁点キー: サ→ザ→サ の2状態トグル", () => {
  assert.equal(toggleDakuten("サ"), "ザ");
  assert.equal(toggleDakuten("ザ"), "サ");
});

test("濁点キー: タ→ダ→タ の2状態トグル", () => {
  assert.equal(toggleDakuten("タ"), "ダ");
  assert.equal(toggleDakuten("ダ"), "タ");
});

test("濁点キー: ソ(経由専用キー)→ゾ→ソ の2状態トグル", () => {
  assert.equal(toggleDakuten("ソ"), "ゾ");
  assert.equal(toggleDakuten("ゾ"), "ソ");
});

test("濁点キー: 半濁音の状態からは、清音を経由せず直接対応する濁音に切り替わる（パ→バ）", () => {
  assert.equal(toggleDakuten("パ"), "バ");
});

test("濁点キー: 対象外の文字(ア行・ナ行・マ行・ヤ行・ラ行・ワ行・ン・小さい文字・長音符)は無変化", () => {
  for (const c of ["ア", "ナ", "マ", "ヤ", "ラ", "ワ", "ン", "ッ", "ャ", "ュ", "ョ", "ー"]) {
    assert.equal(toggleDakuten(c), c);
  }
});

// ===== 半濁点キー(toggleHandakuten): 2状態トグル、ハ行のみ =====

test("半濁点キー: ハ→パ→ハ の2状態トグル", () => {
  assert.equal(toggleHandakuten("ハ"), "パ");
  assert.equal(toggleHandakuten("パ"), "ハ");
});

test("半濁点キー: ホ→ポ→ホ の2状態トグル（ハ単体の特殊対応でないことの確認）", () => {
  assert.equal(toggleHandakuten("ホ"), "ポ");
  assert.equal(toggleHandakuten("ポ"), "ホ");
});

test("半濁点キー: ヒ(経由専用キー)→ピ→ヒ の2状態トグル", () => {
  assert.equal(toggleHandakuten("ヒ"), "ピ");
  assert.equal(toggleHandakuten("ピ"), "ヒ");
});

test("半濁点キー: ヘ(経由専用キー)→ペ→ヘ の2状態トグル", () => {
  assert.equal(toggleHandakuten("ヘ"), "ペ");
  assert.equal(toggleHandakuten("ペ"), "ヘ");
});

test("半濁点キー: 濁音の状態からは、清音を経由せず直接対応する半濁音に切り替わる（バ→パ）", () => {
  assert.equal(toggleHandakuten("バ"), "パ");
});

test("半濁点キー: 半濁音を持たない行(カ・サ・タ行)では無変化", () => {
  // カ・サ・タ行には半濁音が存在しない。清音・濁音のどちらに対しても無変化であることを確認する。
  // 半濁音を持たない行は「存在しない変換」を生みやすい壊れやすい箇所のため個別に検算する。
  for (const c of ["カ", "ガ", "サ", "ザ", "タ", "ダ", "ソ", "ゾ"]) {
    assert.equal(toggleHandakuten(c), c, `${c} は半濁音を持たないので無変化のはず`);
  }
});

test("半濁点キー: 対象外の文字(ア行・ナ行・マ行・ヤ行・ラ行・ワ行・ン・小さい文字・長音符)は無変化", () => {
  for (const c of ["ア", "ナ", "マ", "ヤ", "ラ", "ワ", "ン", "ッ", "ャ", "ュ", "ョ", "ー"]) {
    assert.equal(toggleHandakuten(c), c);
  }
});

// ===== カーソル位置 =====

test("getCursorIndexは空配列で-1(対象なし)を返す", () => {
  assert.equal(getCursorIndex([]), -1);
});

test("getCursorIndexは配列の最後の位置を返す(1文字・4文字それぞれ)", () => {
  assert.equal(getCursorIndex(["ハ"]), 0);
  assert.equal(getCursorIndex(["ハ", "ス", "キ", "ー"]), 3);
});

test("空の状態で濁点キー・半濁点キーを押しても無変化", () => {
  assert.deepEqual(applyDakutenAtCursor([]), []);
  assert.deepEqual(applyHandakutenAtCursor([]), []);
});

test("削除直後は、新しい最後尾のマスが濁点/半濁点キーの対象になる", () => {
  const afterTyping = ["ハ", "ス"];
  const afterDelete = afterTyping.slice(0, -1); // 削除操作を模す
  assert.deepEqual(applyDakutenAtCursor(afterDelete), ["バ"]);
  assert.deepEqual(applyHandakutenAtCursor(afterDelete), ["パ"]);
});

test("4文字目まで埋まった状態では、4文字目が濁点/半濁点キーの対象になる", () => {
  assert.deepEqual(applyDakutenAtCursor(["タ", "イ", "オ", "ホ"]), ["タ", "イ", "オ", "ボ"]);
  assert.deepEqual(applyHandakutenAtCursor(["タ", "イ", "オ", "ホ"]), ["タ", "イ", "オ", "ポ"]);
});

test("パピヨンの入力は、濁点/半濁点キーを分けたことで6タップになる", () => {
  // ハ→(半濁点)パ, ヒ→(半濁点)ピ, ヨ, ン
  let guess = [];
  guess = [...guess, "ハ"];
  guess = applyHandakutenAtCursor(guess);
  guess = [...guess, "ヒ"];
  guess = applyHandakutenAtCursor(guess);
  guess = [...guess, "ヨ"];
  guess = [...guess, "ン"];
  assert.deepEqual(guess, ["パ", "ピ", "ヨ", "ン"]);
});
