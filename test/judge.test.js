import { test } from "node:test";
import assert from "node:assert/strict";
import { judge, GREEN, YELLOW, GRAY } from "../js/judge.js";

test("完全一致は全て緑", () => {
  assert.deepEqual(judge("ハスキー", "ハスキー"), [GREEN, GREEN, GREEN, GREEN]);
});

test("完全不一致は全てグレー", () => {
  assert.deepEqual(judge("ハスキー", "アイウエ"), [GRAY, GRAY, GRAY, GRAY]);
});

test("一部一致（位置違いの黄を含む）", () => {
  // 正解:ハスキー 入力:キハスー -> キ:黄(在庫あり) ハ:黄(在庫あり) ス:黄(在庫あり) ー:緑
  assert.deepEqual(judge("ハスキー", "キハスー"), [YELLOW, YELLOW, YELLOW, GREEN]);
});

test("正解「ワンコ」+ 入力「ンンワ」→ グレー・緑・黄", () => {
  // 2文字目のン(index1)が位置・文字とも一致し緑確定 -> 答えの「ン」の在庫(1個)を使い切る。
  // 1文字目のン(index0)は在庫切れのためグレー(黄にはならない)。
  // 3文字目のワ(index2)は答えの「ワ」の在庫が残っているため黄。
  //
  // 注意: 「黄・グレー・黄」は、位置一致(緑)を先に確定させず1文字ずつ判定する
  // 素朴な実装が生むアンチパターンの誤答である。2パスの実装ではこの誤答にはならない。
  const result = judge("ワンコ", "ンンワ");
  assert.deepEqual(result, [GRAY, GREEN, YELLOW]);
  assert.notDeepEqual(result, [YELLOW, GRAY, YELLOW]);
});

test("正解「ワンワン」+ 入力「ワワワワ」→ 緑・グレー・緑・グレー", () => {
  // 1,3文字目のワが緑確定し、答えの「ワ」の在庫(2個)を使い切る。
  // 残る2,4文字目のワは在庫切れのためグレー(黄にはならない)。
  assert.deepEqual(judge("ワンワン", "ワワワワ"), [GREEN, GRAY, GREEN, GRAY]);
});

test("正解「カミカミ」+ 入力「カカミミ」→ 緑・黄・黄・緑", () => {
  // 1文字目のカ(index0)と4文字目のミ(index3)が緑確定し在庫を消費。
  // 残る2文字目のカ・3文字目のミは在庫が残っているため黄。
  assert.deepEqual(judge("カミカミ", "カカミミ"), [GREEN, YELLOW, YELLOW, GREEN]);
});

test("正解「ペロペロ」+ 入力「ロペロペ」→ 重複文字の位置ズレ", () => {
  // 答え: ペ,ロ,ペ,ロ (ペ在庫2, ロ在庫2) / 入力: ロ,ペ,ロ,ペ
  // 緑確定: どの位置も一致しないため0個。在庫はペ2,ロ2のまま。
  // 左から: ロ(黄,ロ在庫2->1) ペ(黄,ペ在庫2->1) ロ(黄,ロ在庫1->0) ペ(黄,ペ在庫1->0)
  assert.deepEqual(judge("ペロペロ", "ロペロペ"), [YELLOW, YELLOW, YELLOW, YELLOW]);
});

test("正解「クンクン」+ 入力「クククン」→ 過剰な重複はグレーになる", () => {
  // 答え: ク,ン,ク,ン (ク在庫2, ン在庫2) / 入力: ク,ク,ク,ン
  // 緑確定: index0(ク=ク)緑、index2(ク=ク)も位置一致で緑、index3(ン=ン)緑。
  // 在庫消費後 ク在庫0、ン在庫1。
  // 残るindex1(ク): 在庫0のためグレー(黄にはならない)。
  assert.deepEqual(judge("クンクン", "クククン"), [GREEN, GRAY, GREEN, GREEN]);
});

test("正解「ハアハア」+ 入力「アハアハ」→ 重複文字の位置ズレ", () => {
  assert.deepEqual(judge("ハアハア", "アハアハ"), [YELLOW, YELLOW, YELLOW, YELLOW]);
});

test("正解「タレミミ」+ 入力「ミミタレ」→ 重複文字(ミ)を含む位置ズレ", () => {
  // 答え: タ,レ,ミ,ミ (ミ在庫2) / 入力: ミ,ミ,タ,レ
  // 緑確定: なし。左から: ミ(黄,ミ在庫2->1) ミ(黄,ミ在庫1->0) タ(黄,タ在庫1->0) レ(黄,レ在庫1->0)
  assert.deepEqual(judge("タレミミ", "ミミタレ"), [YELLOW, YELLOW, YELLOW, YELLOW]);
});

test("「バ」「パ」「ハ」は別文字として扱われる", () => {
  assert.deepEqual(judge("バセット", "パセット"), [GRAY, GREEN, GREEN, GREEN]);
  assert.deepEqual(judge("バセット", "ハセット"), [GRAY, GREEN, GREEN, GREEN]);
});

test("小さい文字(拗音・促音)は独立した1文字として判定される", () => {
  // answer: ダ,ッ,ク,ス / guess: ダ,ク,ッ,ク
  // 緑確定: index0(ダ)緑。在庫: ッ1,ク1,ス1
  // index1: guess ク, 在庫ク1 -> 黄, ク在庫0
  // index2: guess ッ, 在庫ッ1 -> 黄, ッ在庫0
  // index3: guess ク, 在庫ク0 -> グレー
  assert.deepEqual(judge("ダックス", "ダクック"), [GREEN, YELLOW, YELLOW, GRAY]);
});

test("長音符「ー」は独立した1文字として判定される", () => {
  // answer: ハ,ス,キ,ー / guess: ハ,キ,ー,ス
  // 緑確定: index0(ハ)緑。在庫: ス1,キ1,ー1
  // index1: guess キ -> 在庫キ1 -> 黄, キ在庫0
  // index2: guess ー -> 在庫ー1 -> 黄, ー在庫0
  // index3: guess ス -> 在庫ス1 -> 黄, ス在庫0
  assert.deepEqual(judge("ハスキー", "ハキース"), [GREEN, YELLOW, YELLOW, YELLOW]);
});

test("NFD分解形(結合濁点)の入力・正解でも正しく判定される", () => {
  // U+30CF(ハ) + U+3099(結合濁点) は、見た目は「バ」だが2コードポイントのNFD表現。
  // NFC正規化により、1コードポイントの通常表現の「バ」と同じ1文字として扱われることを、
  // 明示的なUnicodeエスケープで確認する(タイプ入力時の表現ゆれに依存しないようにするため)。
  const NFD_BA = "バ";
  assert.equal(Array.from(NFD_BA).length, 2, "前提: NFD_BAは2コードポイントである");
  assert.equal(NFD_BA.normalize("NFC"), "バ", "前提: NFC正規化で1コードポイントのバになる");

  const answerNfd = NFD_BA + "セット"; // 正解側がNFDのケース
  assert.deepEqual(judge(answerNfd, "バセット"), [GREEN, GREEN, GREEN, GREEN]);

  const guessNfd = NFD_BA + "セット"; // 入力側がNFDのケース
  assert.deepEqual(judge("バセット", guessNfd), [GREEN, GREEN, GREEN, GREEN]);
});
