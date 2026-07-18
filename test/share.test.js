import { test } from "node:test";
import assert from "node:assert/strict";
import { GREEN, YELLOW, GRAY } from "../js/judge.js";
import { buildShareText, buildTweetIntentUrl } from "../js/share.js";

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

test("勝利時: 1行目は日付、2行目は「◯回中◯回目で成功！」の形式", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  const lines = text.split("\n");
  assert.equal(lines[0], "わんワード 7月15日");
  assert.equal(lines[1], "6回中2回目で成功！");
});

test("敗北時: 2行目は「◯回で正解できず…」になる", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: false, maxRows: 6, dateLabel: "7月15日" });
  const lines = text.split("\n");
  assert.equal(lines[0], "わんワード 7月15日");
  assert.equal(lines[1], "6回で正解できず…");
});

test("各行の絵文字グリッドがresultの並びと一致する(日付・結果サマリーの2行の後に続く)", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  const lines = text.split("\n");
  assert.equal(lines[2], "🟨⬜🟩🟨");
  assert.equal(lines[3], "🟩🟩🟩🟩");
});

test("【最重要】シェア文言に答えの文字(guessの中身)が一切含まれない", () => {
  const text = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  for (const char of GUESS_CHARS) {
    assert.ok(!text.includes(char), `シェア文言に推測文字「${char}」が含まれてしまっている(ネタバレ)`);
  }
});

test("日付や回数を変えても、シェア文言に答えの文字は含まれない(念のため別の語でも確認)", () => {
  const otherGuess = ["ホ", "ゴ", "ケ", "ン"];
  const history = [{ guess: otherGuess, result: [GREEN, GREEN, GREEN, GREEN] }];
  const text = buildShareText({ history, didWin: true, maxRows: 6, dateLabel: "12月31日" });
  for (const char of otherGuess) {
    assert.ok(!text.includes(char), `シェア文言に推測文字「${char}」が含まれてしまっている(ネタバレ)`);
  }
});

test("buildTweetIntentUrl: X公式Web Intent形式のURLを組み立てる", () => {
  const shareText = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  const url = buildTweetIntentUrl({ shareText, hashtag: "#わんワード", url: "https://dognavi.github.io/wan-word/" });

  assert.ok(url.startsWith("https://twitter.com/intent/tweet?text="));

  const encodedText = url.slice("https://twitter.com/intent/tweet?text=".length);
  const decodedText = decodeURIComponent(encodedText);
  assert.equal(decodedText, `${shareText}\n#わんワード\nhttps://dognavi.github.io/wan-word/`);
});

test("buildTweetIntentUrl: URLに含まれる文言にハッシュタグとサイトURLが含まれる", () => {
  const shareText = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  const url = buildTweetIntentUrl({ shareText, hashtag: "#わんワード", url: "https://dognavi.github.io/wan-word/" });
  const decodedText = decodeURIComponent(url.slice("https://twitter.com/intent/tweet?text=".length));

  assert.ok(decodedText.includes("#わんワード"));
  assert.ok(decodedText.includes("https://dognavi.github.io/wan-word/"));
});

test("【最重要】buildTweetIntentUrlのURLにも答えの文字(guessの中身)が一切含まれない", () => {
  const shareText = buildShareText({ history: sampleHistory(), didWin: true, maxRows: 6, dateLabel: "7月15日" });
  const url = buildTweetIntentUrl({ shareText, hashtag: "#わんワード", url: "https://dognavi.github.io/wan-word/" });
  const decodedText = decodeURIComponent(url.slice("https://twitter.com/intent/tweet?text=".length));

  for (const char of GUESS_CHARS) {
    assert.ok(!decodedText.includes(char), `ツイート文言に推測文字「${char}」が含まれてしまっている(ネタバレ)`);
  }
});
