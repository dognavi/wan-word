// ユーザー入力・単語データをDOMに描画する際は innerHTML を使わず、
// このファイルのヘルパー（textContent/createElement ベース）経由で行う。

export function setText(el, text) {
  el.textContent = text ?? "";
}

export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function createEl(tag, { text, className, attrs } = {}) {
  const el = document.createElement(tag);
  if (text != null) {
    el.textContent = text;
  }
  if (className) {
    el.className = className;
  }
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}
