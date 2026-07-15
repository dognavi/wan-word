// 候補46語一覧の並び替えとDOM生成。words.jsから動的に生成し、手書きの一覧は持たない
// (語を追加してもこのファイルを直す必要がない)。

import { createEl, clearChildren } from "./sanitize.js";

// 五十音順(辞書的な照合順)に並べ替える。
export function getSortedCandidates(words) {
  return [...words].sort((a, b) => a.localeCompare(b, "ja"));
}

export function renderCandidatesList(container, words) {
  clearChildren(container);
  for (const word of getSortedCandidates(words)) {
    container.appendChild(createEl("li", { text: word }));
  }
}
