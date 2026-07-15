// 盤面の描画とキーボード色反映。判定結果(judge.js)を色+記号+テキストで表現する。
import { GREEN, YELLOW, GRAY } from "./judge.js";
import { createEl, clearChildren } from "./sanitize.js";

export const ROW_COUNT = 6;
export const WORD_LENGTH = 4;

const STATE_PRIORITY = { [GREEN]: 3, [YELLOW]: 2, [GRAY]: 1 };
const STATE_SYMBOL = { [GREEN]: "○", [YELLOW]: "△", [GRAY]: "✕" };
const STATE_LABEL = { [GREEN]: "一致", [YELLOW]: "含むが位置違い", [GRAY]: "含まない" };
const TILE_STATE_CLASS = { [GREEN]: "tile-correct", [YELLOW]: "tile-present", [GRAY]: "tile-absent" };
const KEY_STATE_CLASS = { [GREEN]: "key-correct", [YELLOW]: "key-present", [GRAY]: "key-absent" };
const ALL_KEY_STATE_CLASSES = Object.values(KEY_STATE_CLASS);

// 全履歴(確定済みの各行)を通して、各文字が到達した最も強い状態(緑>黄>グレー)を求める。
// 後の行の弱い結果が、前の行の強い結果を上書きしないようにする
// (例: 1行目でワが緑、2行目でワが黄でも、緑のまま維持される)。
export function computeKeyStates(history) {
  const states = new Map();
  for (const { guess, result } of history) {
    for (let i = 0; i < guess.length; i++) {
      const char = guess[i];
      const newState = result[i];
      const current = states.get(char);
      if (!current || STATE_PRIORITY[newState] > STATE_PRIORITY[current]) {
        states.set(char, newState);
      }
    }
  }
  return states;
}

function createTile(char, state) {
  const tile = createEl("div", { className: "tile" });
  if (state) {
    tile.classList.add(TILE_STATE_CLASS[state]);
    tile.setAttribute("aria-label", `${char}、${STATE_LABEL[state]}`);
  }
  tile.appendChild(createEl("span", { text: char ?? "", className: "tile-char" }));
  if (state) {
    tile.appendChild(
      createEl("span", { text: STATE_SYMBOL[state], className: "tile-badge", attrs: { "aria-hidden": "true" } })
    );
  }
  return tile;
}

// 盤面全体(6行×4列)を描画する。
// history: 確定済みの行の配列 [{ guess: ["ワ","ン","ワ","ン"], result: [GREEN, GRAY, GREEN, GRAY] }, ...]
// currentGuess: 入力中の行の文字配列(まだ判定されていない。色は付けない)
export function renderBoard(container, { history, currentGuess }) {
  clearChildren(container);
  for (let row = 0; row < ROW_COUNT; row++) {
    const entry = history[row];
    for (let col = 0; col < WORD_LENGTH; col++) {
      if (entry) {
        container.appendChild(createTile(entry.guess[col], entry.result[col]));
      } else if (row === history.length) {
        container.appendChild(createTile(currentGuess[col] ?? null, null));
      } else {
        container.appendChild(createTile(null, null));
      }
    }
  }
}

// キーボードの各キー(data-char属性を持つ全てのbutton)に、computeKeyStatesの結果を反映する。
export function applyKeyStates(keyboardRoot, keyStates) {
  const buttons = keyboardRoot.querySelectorAll("button[data-char]");
  for (const btn of buttons) {
    btn.classList.remove(...ALL_KEY_STATE_CLASSES);
    const state = keyStates.get(btn.dataset.char);
    if (state) {
      btn.classList.add(KEY_STATE_CLASS[state]);
      if (!btn.classList.contains("key-unused")) {
        btn.setAttribute("aria-label", `${btn.dataset.char}（${STATE_LABEL[state]}）`);
      }
    }
  }
}
