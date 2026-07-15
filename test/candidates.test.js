import { test } from "node:test";
import assert from "node:assert/strict";
import { WORDS } from "../js/words.js";
import { getSortedCandidates } from "../js/candidates.js";

// localeCompare(..., "ja") の実際の挙動をこの環境で検算済みの結果。
// カ/サ/タ/ハ行では、清音と濁音・半濁音が完全に「行ごと」ではなく、
// 後続の文字次第で入り組む場合がある(例: サークル→ザッシュ→サモエドの順)。
// これはIntlの照合順序として妥当だが、辞書のように「さ行の後にざ行」を
// 期待する感覚とは異なりうるため、実際の結果をそのまま期待値として固定しておく。
const EXPECTED_ORDER = [
  "アフガン", "アマガミ", "オカワリ", "オサンポ", "オスワリ", "カミカミ", "カミツキ",
  "キャリー", "キョセイ", "クレート", "クンクン", "ケンシン", "コーギー", "コッカー",
  "サークル", "ザッシュ", "サモエド", "シーズー", "シバイヌ", "ジュウイ", "スピッツ",
  "セッター", "タイオン", "ダックス", "タレミミ", "ツメキリ", "トリマー", "ノミダニ",
  "ハーネス", "ハアハア", "ハウンド", "ハスキー", "バセット", "パピヨン", "ビーグル",
  "ビション", "ピレネー", "プードル", "ペロペロ", "ボクサー", "ホゴケン", "ボルゾイ",
  "マスチフ", "ムダボエ", "ワクチン", "ワンワン",
];

test("getSortedCandidatesは46語すべてを含み、増減がない", () => {
  const sorted = getSortedCandidates(WORDS);
  assert.equal(sorted.length, 46);
  assert.deepEqual([...sorted].sort(), [...WORDS].sort());
});

test("getSortedCandidatesは元の配列(words.jsの並び順)そのままではない(並び替えが行われている)", () => {
  const sorted = getSortedCandidates(WORDS);
  assert.notDeepEqual(sorted, WORDS);
});

test("getSortedCandidatesはこの環境のja照合順序で並び替える(検算済みの結果と一致)", () => {
  const sorted = getSortedCandidates(WORDS);
  assert.deepEqual(sorted, EXPECTED_ORDER);
});

test("getSortedCandidatesは元の配列を変更しない", () => {
  const before = [...WORDS];
  getSortedCandidates(WORDS);
  assert.deepEqual(WORDS, before);
});
