// JSTの日付計算・出題インデックス選出（唯一の日付ソース）。
// 出題インデックス選出にもstreak判定(storage.js)にも、必ずこのファイルの関数だけを参照する。
// storage.js が独自に「今日」「前日」を計算することは禁止(エイリアシング事故・TZバグの二重実装を防ぐ)。

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WORD_COUNT = 46;

// JSTの絶対日数(エポックからの通し番号、mod前の生の値)を一発計算式で求める。
// Y/M/Dに分解してから組み立て直す実装はしない(オフバイワンの余地を消すため)。
// Y/M/Dが必要なのは画面表示のみで、ゲームロジックの意思決定には使わない。
export function getJstEpochDayNumber(date) {
  return Math.floor((date.getTime() + JST_OFFSET_MS) / MS_PER_DAY);
}

// JSの `%` は数学的な剰余ではなく、負数を与えると負の値を返す。
// 端末時計が起点日より前など、日数差分が負になりうる場面のための正規化ヘルパー。
export function normalizeMod(n, m) {
  return ((n % m) + m) % m;
}

// 46語の出題順を決める固定の並べ替え索引表。
//
// 生成方法(このコメントの手順を再実行すれば誰でも同じ表を再現できる):
//   1. シード値 12345 で mulberry32(32bit整数演算のみの軽量PRNG。浮動小数点を
//      使わないため、PCとスマホ・ブラウザエンジンが違っても結果が変わらない)を初期化
//   2. [0, 1, ..., 45] に対して、そのPRNGでFisher-Yatesシャッフルを1回行う
//   3. 結果をこの配列としてハードコードする(実行時に毎回シャッフルを計算し直さない)
//
// 単語リストの並び順(words.js)からは今日・明日の答えを逆算できないようにするためのもの。
// 静的サイトである以上、ソースコードを実行すれば将来の答えも計算できてしまうことは防げない
// (候補プールが公開されているのと同様、これは秘匿ではなく「うっかり見える」対策)。
export const WORD_ORDER_PERMUTATION = [
  10, 25, 34, 11, 5, 26, 27, 17, 24, 38,
  39, 22, 12, 28, 0, 4, 32, 44, 3, 6,
  1, 9, 15, 18, 19, 42, 23, 41, 8, 40,
  7, 20, 31, 36, 33, 16, 30, 37, 29, 2,
  14, 43, 35, 21, 13, 45,
];

// mulberry32本体。上記の並べ替え表の再現性テストのためにエクスポートする
// (実行時の出題選出では使わず、ハードコードした WORD_ORDER_PERMUTATION を直接参照する)。
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePermutation(seed, size) {
  const arr = Array.from({ length: size }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getWordIndexForDate(date) {
  const dayNumber = getJstEpochDayNumber(date);
  return WORD_ORDER_PERMUTATION[normalizeMod(dayNumber, WORD_COUNT)];
}

// JSTの年月日を返す、表示専用の関数。ゲームロジックの意思決定(出題選出・streak判定)には
// 一切使わない(それらは getJstEpochDayNumber の絶対日数だけを使う)。
// UTC時刻に+9時間した上でUTC系のgetterを使うため、端末のタイムゾーン設定に依存しない。
export function getJstYearMonthDay(date) {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
  };
}
