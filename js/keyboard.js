// 濁点/半濁点サイクルの純粋ロジックと、五十音表キーボードのDOM生成。
// 配置データ(GYOU_TABLE/COLUMN_ORDER)はここが唯一のソース。
// index.html側にハードコードされた配置とここでの定義が2箇所に分かれてズレることを防ぐため、
// キーボードのDOMは必ずこのファイルの関数で生成する。

import { createEl, clearChildren } from "./sanitize.js";

// 列順(左から)。五十音表は右から左に進むため、右端がア行・左端がワ行になる。
export const COLUMN_ORDER = ["ワ", "ラ", "ヤ", "マ", "ハ", "ナ", "タ", "サ", "カ", "ア"];

// 行ごとの5段(ア/イ/ウ/エ/オ段)。nullは言語として構造的に存在しない位置
// (ヤ行イ/エ段、ワ行イ/ウ/エ段)。存在するが46語で未使用の文字(テ・ナ・ラ・ヤ・ユ等)は
// nullにせず実際の文字を入れ、isKeyNeededで動的に判定する(手書きの除外リストを持たない)。
export const GYOU_TABLE = {
  ア: ["ア", "イ", "ウ", "エ", "オ"],
  カ: ["カ", "キ", "ク", "ケ", "コ"],
  サ: ["サ", "シ", "ス", "セ", "ソ"],
  タ: ["タ", "チ", "ツ", "テ", "ト"],
  ナ: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ハ: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  マ: ["マ", "ミ", "ム", "メ", "モ"],
  ヤ: ["ヤ", null, "ユ", null, "ヨ"],
  ラ: ["ラ", "リ", "ル", "レ", "ロ"],
  ワ: ["ワ", null, null, null, "ン"], // オ段は伝統的にはヲの位置だが、46語での頻出を優先しンを配置
};

// 表に収まらない補助キー行の文字キー(小さい文字4種+長音符+ヲ)。
export const AUX_CHAR_KEYS = ["ッ", "ャ", "ュ", "ョ", "ー", "ヲ"];

export const DAKUTEN_MAP = {
  カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
  サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
  タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
  ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
};
export const HANDAKUTEN_MAP = { ハ: "パ", ヒ: "ピ", フ: "プ", ヘ: "ペ", ホ: "ポ" };

const REVERSE_DAKUTEN = Object.fromEntries(
  Object.entries(DAKUTEN_MAP).map(([seion, dakuon]) => [dakuon, seion])
);
const REVERSE_HANDAKUTEN = Object.fromEntries(
  Object.entries(HANDAKUTEN_MAP).map(([seion, handakuon]) => [handakuon, seion])
);

// 濁点キー: 「この文字に濁点マークを付ける/外す」という2状態トグル。
// 既に濁音なら清音に戻す。半濁音の状態なら、清音を経由せずそのまま対応する濁音に切り替える
// (「濁点マークにしたい」という操作の結果なので、清音を経由する必然性がないため)。
// 対象の行に濁音が存在しない場合は無変化。
export function toggleDakuten(char) {
  if (REVERSE_DAKUTEN[char]) {
    return REVERSE_DAKUTEN[char]; // 濁音 -> 清音
  }
  const seion = REVERSE_HANDAKUTEN[char] ?? char; // 半濁音なら清音を求める(なければそのまま)
  return DAKUTEN_MAP[seion] ?? char; // 清音に濁音があれば切り替え、なければ無変化
}

// 半濁点キー: 「この文字に半濁点マークを付ける/外す」という2状態トグル。
// 既に半濁音なら清音に戻す。濁音の状態ならそのまま対応する半濁音に切り替える。
// 半濁音が存在するのはハ行のみのため、それ以外の行では無変化。
export function toggleHandakuten(char) {
  if (REVERSE_HANDAKUTEN[char]) {
    return REVERSE_HANDAKUTEN[char]; // 半濁音 -> 清音
  }
  const seion = REVERSE_DAKUTEN[char] ?? char; // 濁音なら清音を求める(なければそのまま)
  return HANDAKUTEN_MAP[seion] ?? char; // 清音に半濁音(ハ行)があれば切り替え、なければ無変化
}

// カーソル位置(盤面上で現在最後に埋まっているマス)を、入力バッファの配列から求める。
// 空なら-1(対象なし)。都度この関数で再計算し、外部に状態を持たせない
// (削除直後・4文字目埋まった状態のいずれでも一意に定まる設計にするため)。
export function getCursorIndex(guess) {
  return guess.length - 1;
}

function applyAtCursor(guess, toggleFn) {
  const cursorIndex = getCursorIndex(guess);
  if (cursorIndex < 0) {
    return guess;
  }
  const next = [...guess];
  next[cursorIndex] = toggleFn(next[cursorIndex]);
  return next;
}

// カーソル位置の文字だけに濁点トグルを適用した新しい配列を返す(元の配列は変更しない)。
export function applyDakutenAtCursor(guess) {
  return applyAtCursor(guess, toggleDakuten);
}

// カーソル位置の文字だけに半濁点トグルを適用した新しい配列を返す(元の配列は変更しない)。
export function applyHandakutenAtCursor(guess) {
  return applyAtCursor(guess, toggleHandakuten);
}

// words.jsの46語から、実際に使われている文字の集合を求める。
export function buildUsedCharSet(words) {
  const set = new Set();
  for (const word of words) {
    for (const c of Array.from(word.normalize("NFC"))) {
      set.add(c);
    }
  }
  return set;
}

// 平文字そのものが使われていなくても、濁点/半濁点サイクルの到達先が使われていれば
// そのキーは必要(例: 「ソ」自体は未使用でも「ゾ」に到達するため必要)。
// この判定を経ずに平文字の有無だけで「未使用」を決めると、経由専用キーを
// 誤って無効化してしまう(words.js から機械的に導出し、手書きの除外リストは持たない)。
export function isKeyNeeded(base, usedSet) {
  if (usedSet.has(base)) return true;
  if (DAKUTEN_MAP[base] && usedSet.has(DAKUTEN_MAP[base])) return true;
  if (HANDAKUTEN_MAP[base] && usedSet.has(HANDAKUTEN_MAP[base])) return true;
  return false;
}

function createCharKey(char, usedSet, onCharKey) {
  const key = createEl("button", { text: char, className: "key" });
  key.type = "button";
  key.dataset.char = char;
  if (!isKeyNeeded(char, usedSet)) {
    key.classList.add("key-unused");
    key.disabled = true;
    key.setAttribute("aria-disabled", "true");
    key.setAttribute("aria-label", `${char}（今日の候補では使用しません）`);
  } else {
    key.addEventListener("click", () => onCharKey(char));
  }
  return key;
}

function createEmptyCell() {
  return createEl("div", { className: "key key-empty", attrs: { "aria-hidden": "true" } });
}

function createControlKey(text, id, onClick) {
  const key = createEl("button", { text, className: "key", attrs: { id } });
  key.type = "button";
  key.addEventListener("click", onClick);
  return key;
}

// 五十音表キーボードのDOM生成。gridContainer/auxContainerに実際の<button>を並べる。
export function renderKeyboard({
  gridContainer,
  auxContainer,
  words,
  onCharKey,
  onDakutenKey,
  onHandakutenKey,
  onDeleteKey,
  onEnterKey,
}) {
  const usedSet = buildUsedCharSet(words);

  clearChildren(gridContainer);
  const dans = [0, 1, 2, 3, 4];
  for (const dan of dans) {
    for (const gyou of COLUMN_ORDER) {
      const char = GYOU_TABLE[gyou][dan];
      gridContainer.appendChild(
        char === null ? createEmptyCell() : createCharKey(char, usedSet, onCharKey)
      );
    }
  }

  clearChildren(auxContainer);
  for (const char of AUX_CHAR_KEYS) {
    auxContainer.appendChild(createCharKey(char, usedSet, onCharKey));
  }
  auxContainer.appendChild(createControlKey("゛", "dakuten-key", onDakutenKey));
  auxContainer.appendChild(createControlKey("゜", "handakuten-key", onHandakutenKey));
  auxContainer.appendChild(createControlKey("削除", "delete-key", onDeleteKey));
  auxContainer.appendChild(createControlKey("決定", "enter-key", onEnterKey));
}
