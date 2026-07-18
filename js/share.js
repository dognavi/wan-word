// シェア文言(絵文字グリッド)の組み立て。
// 答えの文字(guessの中身)には絶対に触れない。result(green/yellow/gray)だけを絵文字に変換する。
// 負けても正解を出さない設計と同じ理由(1日1問になった際、まだ解いていない人のネタバレになるため)。
//
// 日付は呼び出し側(main.js)が day.js から求めた文字列を dateLabel として渡す。
// この関数自体は Date を一切扱わない(テストのしやすさと、日付一元化の原則のため)。

import { GREEN, YELLOW, GRAY } from "./judge.js";

const RESULT_EMOJI = { [GREEN]: "🟩", [YELLOW]: "🟨", [GRAY]: "⬜" };

export function buildShareText({ history, didWin, maxRows, dateLabel }) {
  const attemptsLabel = didWin ? String(history.length) : "X";
  const lines = [`わんワード ${dateLabel} ${attemptsLabel}/${maxRows}`];
  for (const entry of history) {
    lines.push(entry.result.map((state) => RESULT_EMOJI[state]).join(""));
  }
  return lines.join("\n");
}

const TWITTER_INTENT_BASE_URL = "https://twitter.com/intent/tweet";

// X(Twitter)公式のWeb Intent形式のURLを組み立てる。DOM/windowに一切触れない
// 純粋関数とし、実際に開く処理(window.open)は呼び出し側(main.js)に任せる。
// shareTextはbuildShareTextの出力をそのまま渡す前提(答えの文字を含まない保証を継承する)。
export function buildTweetIntentUrl({ shareText, hashtag, url }) {
  const text = `${shareText}\n${hashtag}\n${url}`;
  return `${TWITTER_INTENT_BASE_URL}?text=${encodeURIComponent(text)}`;
}
