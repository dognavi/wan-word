// 判定ロジック（2パス。純粋関数・DOM非依存）。
// 必ずこの順序で処理する:
// 1. 全マスを走査し、位置も文字も一致するものを緑に確定。緑にした分だけ在庫を減らす
// 2. 残った入力文字を左から順に見て、在庫が残っていれば黄、在庫切れならグレー
// 比較の前には必ず normalize('NFC') を通し、Array.from() でコードポイント単位に分割する。

export const GREEN = "green";
export const YELLOW = "yellow";
export const GRAY = "gray";

export function judge(answer, guess) {
  const a = Array.from(answer.normalize("NFC"));
  const g = Array.from(guess.normalize("NFC"));
  const n = g.length;
  const result = new Array(n).fill(null);

  const inventory = {};
  for (const c of a) {
    inventory[c] = (inventory[c] || 0) + 1;
  }

  // 1. 緑を先に全て確定し、その分だけ在庫を減らす
  for (let i = 0; i < n; i++) {
    if (g[i] === a[i]) {
      result[i] = GREEN;
      inventory[g[i]]--;
    }
  }

  // 2. 緑が確定していないマスを左から見て、在庫が残っていれば黄、なければグレー
  for (let i = 0; i < n; i++) {
    if (result[i]) continue;
    if (inventory[g[i]] > 0) {
      result[i] = YELLOW;
      inventory[g[i]]--;
    } else {
      result[i] = GRAY;
    }
  }

  return result;
}
