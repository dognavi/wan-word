// localStorageの読み書きとstreak計算。
//
// 【重要な設計制約】このファイルは Date も day.js も一切 import/参照しない。
// 「今日が何日か」を計算する能力そのものをこのファイルに持たせないことで、
// 出題ロジック(day.js)とstreak判定が別々に日付を計算してズレる事故を、
// 規約ではなく構造で防ぐ。全ての公開関数は todayDayNumber という整数を
// 呼び出し側(main.js)から受け取るだけで、自分では計算しない。
// この制約はコメントだけでなく storage.test.js の静的チェックでも固定している。

export const SCHEMA_VERSION = 1;

const STORAGE_KEY = "wanword-state";

export function createInitialStreak() {
  return { current: 0, lastPlayedDayNumber: null };
}

// localStorageからの読み込み。プライベートモード・無効化・容量超過・
// JSON破損など、失敗しうる操作は全てtry/catchで包み、失敗時はnullを返す
// (例外を投げない。呼び出し側はnullを「保存データなし」として扱えばよい)。
export function loadRawState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// localStorageへの書き込み。失敗しても例外を投げず、成功可否をbooleanで返すのみ。
// 呼び出し側は戻り値を無視してよい(保存できなくてもゲームは遊べる、という方針のため)。
export function saveRawState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// バージョン一致・streakの形が妥当かを確認する。
export function isValidSchema(state) {
  return (
    !!state &&
    state.version === SCHEMA_VERSION &&
    !!state.streak &&
    typeof state.streak.current === "number" &&
    (state.streak.lastPlayedDayNumber === null || typeof state.streak.lastPlayedDayNumber === "number")
  );
}

// 保存されているゲーム進行(history/gameStatus)が「今日の分」として復元してよいかを判定する。
// dayNumberが一致しない(日付が変わっている)場合は復元しない(古いデータは破棄して新規開始)。
export function isTodayGameState(state, todayDayNumber) {
  return (
    isValidSchema(state) &&
    state.dayNumber === todayDayNumber &&
    Array.isArray(state.history) &&
    typeof state.gameStatus === "string"
  );
}

// 画面表示用のstreak補正。差分が0(当日既にプレイ済み)か1(前日プレイ)ならそのまま、
// それ以外(2日以上の空白、または時計巻き戻りで差分が負)は実態に合わせて0に補正する。
// 保存データ自体は書き換えない(次に実際に勝敗が付いたときに applyWinToStreak/applyLossToStreak が更新する)。
export function getDisplayedStreak(streak, todayDayNumber) {
  if (streak.lastPlayedDayNumber === null) return streak.current;
  const diff = todayDayNumber - streak.lastPlayedDayNumber;
  if (diff === 0 || diff === 1) return streak.current;
  return 0;
}

// 勝利時のstreak更新。lastPlayedDayNumberが今日と同じなら同日内の再実行として
// 加算しない(冪等性ガード)。差分が1(前日)なら+1、それ以外(空白日・時計巻き戻り含む)は1にリセットする。
export function applyWinToStreak(streak, todayDayNumber) {
  if (streak.lastPlayedDayNumber === todayDayNumber) {
    return streak;
  }
  const diff = streak.lastPlayedDayNumber === null ? null : todayDayNumber - streak.lastPlayedDayNumber;
  const nextCurrent = diff === 1 ? streak.current + 1 : 1;
  return { current: nextCurrent, lastPlayedDayNumber: todayDayNumber };
}

// 敗北時のstreak更新。同日内の再実行は変更しない(冪等性ガード)。それ以外は0にリセットする。
export function applyLossToStreak(streak, todayDayNumber) {
  if (streak.lastPlayedDayNumber === todayDayNumber) {
    return streak;
  }
  return { current: 0, lastPlayedDayNumber: todayDayNumber };
}
