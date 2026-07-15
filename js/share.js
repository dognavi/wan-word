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
