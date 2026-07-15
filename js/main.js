import { WORDS } from "./words.js";
import { renderKeyboard, applyDakutenAtCursor, applyHandakutenAtCursor } from "./keyboard.js";
import { judge, GREEN } from "./judge.js";
import { ROW_COUNT, WORD_LENGTH, computeKeyStates, renderBoard, applyKeyStates } from "./board.js";
import { getJstEpochDayNumber, getWordIndexForDate, getJstYearMonthDay } from "./day.js";
import { renderCandidatesList } from "./candidates.js";
import { buildShareText } from "./share.js";
import {
  loadRawState,
  saveRawState,
  isValidSchema,
  isTodayGameState,
  createInitialStreak,
  getDisplayedStreak,
  applyWinToStreak,
  applyLossToStreak,
  SCHEMA_VERSION,
} from "./storage.js";
import { setText } from "./sanitize.js";

console.log("わんワード起動");

// day.js が唯一の日付ソース。ここ(main.js)以外で Date を計算しない。
// todayDayNumber は出題インデックスの選出にも、storage.js のstreak判定にも
// この1回の計算結果だけを使い回す(2箇所で別々に計算しない)。
const now = new Date();
const todayDayNumber = getJstEpochDayNumber(now);
const TODAY_ANSWER = WORDS[getWordIndexForDate(now)];
// シェア文言の日付表示も、出題と同じ day.js の関数から求める(表示専用。ゲームロジックには使わない)。
const { month: todayMonth, day: todayDay } = getJstYearMonthDay(now);
const DATE_LABEL = `${todayMonth}/${todayDay}`;

const howtoDialog = document.getElementById("howto-dialog");
const candidatesDialog = document.getElementById("candidates-dialog");
const resultDialog = document.getElementById("result-dialog");
const resultHeadingEl = document.getElementById("result-heading");
const resultDetailEl = document.getElementById("result-detail");
const resultNextEl = document.getElementById("result-next");
const shareFeedbackEl = document.getElementById("share-feedback");
const shareTextFallbackEl = document.getElementById("share-text-fallback");
const streakInlineEl = document.getElementById("streak-inline");

renderCandidatesList(document.getElementById("candidates-list"), WORDS);

document.getElementById("open-howto-btn").addEventListener("click", () => {
  howtoDialog.showModal();
});
document.getElementById("close-howto-btn").addEventListener("click", () => {
  howtoDialog.close();
});

document.getElementById("open-candidates-btn").addEventListener("click", () => {
  candidatesDialog.showModal();
});
document.getElementById("close-candidates-btn").addEventListener("click", () => {
  candidatesDialog.close();
});

document.getElementById("close-result-btn").addEventListener("click", () => {
  resultDialog.close();
});

const boardEl = document.getElementById("board");
const keyboardGridEl = document.getElementById("keyboard-grid");
const keyboardAuxEl = document.getElementById("keyboard-aux");

// 保存データの読み込み。スキーマが壊れていれば全て初期値扱いにする。
// ゲームの進行(history/gameStatus)は「今日の分」でなければ引き継がないが、
// streakは日付が変わっていても引き継ぐ(進行状況とstreakの継続性は別物のため)。
const saved = loadRawState();
const savedSchemaValid = isValidSchema(saved);
const savedIsTodayGame = isTodayGameState(saved, todayDayNumber);

let history = savedIsTodayGame ? saved.history : [];
let currentGuess = [];
let gameStatus = savedIsTodayGame ? saved.gameStatus : "playing";
let streak = savedSchemaValid ? saved.streak : createInitialStreak();

function persist() {
  saveRawState({
    version: SCHEMA_VERSION,
    dayNumber: todayDayNumber,
    history,
    gameStatus,
    streak,
  });
}

function renderStreak() {
  setText(streakInlineEl, `連続${getDisplayedStreak(streak, todayDayNumber)}日`);
}

function updateEnterKeyState() {
  const enterKey = document.getElementById("enter-key");
  enterKey.disabled = gameStatus !== "playing" || currentGuess.length < WORD_LENGTH;
}

function endGame(status) {
  gameStatus = status;
  keyboardGridEl.classList.add("is-game-over");
  keyboardAuxEl.classList.add("is-game-over");
  updateEnterKeyState();
}

function render() {
  renderBoard(boardEl, { history, currentGuess });
  const keyStates = computeKeyStates(history);
  applyKeyStates(document.getElementById("keyboard-section"), keyStates);
  updateEnterKeyState();
}

// 正解した行のタイルを、左から順に少し遅れてポップさせる。
function playWinRevealAnimation(rowIndex) {
  const tiles = document.querySelectorAll("#board .tile");
  const rowTiles = Array.from(tiles).slice(rowIndex * WORD_LENGTH, rowIndex * WORD_LENGTH + WORD_LENGTH);
  rowTiles.forEach((tile, col) => {
    tile.style.animationDelay = `${col * 0.08}s`;
    tile.classList.add("tile-reveal");
  });
}

// 正解そのものは表示しない(1日1問になった際、負けた人がSNS等で正解を書くと
// まだ解いていない人のゲームが台無しになるため。本家Wordle等も同様)。
function showResult(status, detail) {
  resultHeadingEl.textContent = status === "won" ? "せいかい！" : "残念…";
  resultHeadingEl.className = `result-heading ${status === "won" ? "result-heading--win" : "result-heading--lose"}`;
  setText(resultDetailEl, detail);
  setText(resultNextEl, "次の問題は明日出ます");
  shareFeedbackEl.hidden = true;
  shareTextFallbackEl.hidden = true;
  resultDialog.showModal();
}

// シェア文言を画面に表示し、ユーザーが手動で選択・コピーできるようにする(最終フォールバック)。
// 「コピーできませんでした」で終わらせず、必ずテキスト自体を見せる。
function showShareFallbackText(text) {
  shareTextFallbackEl.value = text;
  shareTextFallbackEl.hidden = false;
  shareTextFallbackEl.focus();
  shareTextFallbackEl.select();
}

// ネイティブの共有シート。セキュアコンテキスト限定・対応ブラウザも限られるため、
// 使えない/失敗した場合は呼び出し側が次のフォールバックに進める。
// ユーザーが共有シートを自分でキャンセルした場合(AbortError)は失敗として扱わない。
async function tryNativeShare(text) {
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare === "function" && !navigator.canShare({ text })) return false;
  try {
    await navigator.share({ text });
    return true;
  } catch (err) {
    if (err && err.name === "AbortError") return true;
    console.warn("navigator.shareに失敗しました:", err);
    return false;
  }
}

// navigator.clipboard は非セキュアコンテキスト(http非localhost等)ではオブジェクト自体が
// 存在しない。存在確認とtry/catchの両方を行い、失敗理由を握りつぶさずconsole.warnに残す。
async function tryClipboardWrite(text) {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("navigator.clipboardが利用できません(非セキュアコンテキストの可能性)");
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn("navigator.clipboard.writeTextに失敗しました:", err);
    return false;
  }
}

document.getElementById("share-result-btn").addEventListener("click", async () => {
  const text = buildShareText({
    history,
    didWin: gameStatus === "won",
    maxRows: ROW_COUNT,
    dateLabel: DATE_LABEL,
  });

  shareTextFallbackEl.hidden = true;

  if (await tryNativeShare(text)) {
    setText(shareFeedbackEl, "共有しました");
    shareFeedbackEl.hidden = false;
    return;
  }

  if (await tryClipboardWrite(text)) {
    setText(shareFeedbackEl, "コピーしました");
    shareFeedbackEl.hidden = false;
    return;
  }

  setText(shareFeedbackEl, "自動コピーができないため、下のテキストを選択してコピーしてください");
  shareFeedbackEl.hidden = false;
  showShareFallbackText(text);
});

function handleCharKey(char) {
  if (gameStatus !== "playing" || currentGuess.length >= WORD_LENGTH) return;
  currentGuess = [...currentGuess, char];
  render();
}

function handleDakutenKey() {
  if (gameStatus !== "playing") return;
  currentGuess = applyDakutenAtCursor(currentGuess);
  render();
}

function handleHandakutenKey() {
  if (gameStatus !== "playing") return;
  currentGuess = applyHandakutenAtCursor(currentGuess);
  render();
}

function handleDeleteKey() {
  if (gameStatus !== "playing") return;
  currentGuess = currentGuess.slice(0, -1);
  render();
}

function handleEnterKey() {
  if (gameStatus !== "playing" || currentGuess.length < WORD_LENGTH) return;

  const result = judge(TODAY_ANSWER, currentGuess.join(""));
  const rowIndex = history.length;
  history = [...history, { guess: currentGuess, result }];
  currentGuess = [];
  render();

  const isWin = result.every((r) => r === GREEN);
  if (isWin) {
    streak = applyWinToStreak(streak, todayDayNumber);
    renderStreak();
    endGame("won");
    persist();
    playWinRevealAnimation(rowIndex);
    showResult("won", `${rowIndex + 1}回で正解しました`);
    return;
  }

  if (history.length >= ROW_COUNT) {
    streak = applyLossToStreak(streak, todayDayNumber);
    renderStreak();
    endGame("lost");
    persist();
    showResult("lost", "また挑戦してね");
    return;
  }

  persist();
}

renderKeyboard({
  gridContainer: keyboardGridEl,
  auxContainer: keyboardAuxEl,
  words: WORDS,
  onCharKey: handleCharKey,
  onDakutenKey: handleDakutenKey,
  onHandakutenKey: handleHandakutenKey,
  onDeleteKey: handleDeleteKey,
  onEnterKey: handleEnterKey,
});

render();
renderStreak();
// ゲームが既に完了している状態(勝敗確定済み)を復元した場合、盤面・キーボードの
// 無効化状態だけ復元し、ダイアログやアニメーションは再生しない(リロードのたびに
// 演出が出るのは不自然なため)。
if (gameStatus !== "playing") {
  endGame(gameStatus);
}
persist();
