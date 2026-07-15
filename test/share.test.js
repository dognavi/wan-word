import { test } from "node:test";
import assert from "node:assert/strict";
import { GREEN, YELLOW, GRAY } from "../js/judge.js";
import { buildShareText } from "../js/share.js";

// テスト用の推測に使う文字(タ・イ・オ・ン)は、タイトル文字列「わんワード」
// (わ・ん・ワ・ー・ド)や書式(数字・"/"・"X")と一切重ならないよう選んでいる。
// これにより「文字が含まれていない」というアサーション自体が、
// タイトル文字列との偶然の一致で意味を失わないようにする。
const SAMPLE_GUESS = ["タ", "イ", "オ", "ン"];
const GUESS_CHARS = SAMPLE_GUESS;

function sampleHistory() {
  return [
    { guess: [...SAMPLE_GUESS], result: [YELLOW, GRAY, GREEN, YELLOW] },
    { guess: [...SAMPLE_GUESS], result: [GREEN, GREEN, GREEN, GREEN] },
  ];
}

test("勝利時: 1行目は「わんワード 日付 回数/上限」の形式", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7/15" });
  const firstLine = text.split("\n")[0];
  assert.equal(firstLine, "わんワード 7/15 2/6");
});

test("敗北時: 回数の代わりにXを使う(本家Wordleと同じ表記)", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: false, maxRows: 6, dateLabel: "7/15" });
  const firstLine = text.split("\n")[0];
  assert.equal(firstLine, "わんワード 7/15 X/6");
});

test("各行の絵文字グリッドがresultの並びと一致する", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7/15" });
  const lines = text.split("\n");
  assert.equal(lines[1], "🟨⬜🟩🟨");
  assert.equal(lines[2], "🟩🟩🟩🟩");
});

test("【最重要】シェア文言に答えの文字(guessの中身)が一切含まれない", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7/15" });
  for (const char of GUESS_CHARS) {
    assert.ok(!text.includes(char), `シェア文言に推測文字「${char}」が含まれてしまっている(ネタバレ)`);
  }
});

test("日付や回数を変えても、シェア文言に答えの文字は含まれない(念のため別の語でも確認)", () => {
  const otherGuess = ["ホ", "ゴ", "ケ", "ン"];
  const history = [{ guess: otherGuess, result: [GREEN, GREEN, GREEN, GREEN] }];
  const text = buildShareText({ history, didWin: true, maxRows: 6, dateLabel: "12/31" });
  for (const char of otherGuess) {
    assert.ok(!text.includes(char), `シェア文言に推測文字「${char}」が含まれてしまっている(ネタバレ)`);
  }
});
