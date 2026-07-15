# わんワード

犬用語のカタカナ4文字を当てる、1日1問のパズルゲームです。HTML/CSS/JavaScriptのみで動く静的サイトで、GitHub Pagesで公開します。

## 概要

- 毎日1問、犬に関するカタカナ4文字の単語を6回以内に当てます
- 候補となる46語は画面から確認できます（絞り込みの推理が成立するように、候補は隠しません）
- ビルドツール・外部API・サーバーは使わない、完全な静的サイトです

## 遊び方

- 画面上のカタカナキーボードで4文字を入力して回答します（濁点キーで「清音→濁音→半濁音」を切り替えられます）
- 1マスごとに、位置も文字も一致＝緑／文字は含むが位置違い＝黄／含まない＝グレーで結果が表示されます
- 6回以内に当ててください
- 記録はこの端末（ブラウザ）にのみ保存されます。端末をまたぐと別の記録になります
- 未プレイの日があると連続記録（streak）は途切れます
- 候補46語は46日で1巡します。一巡後は単語を追加していく予定です

## 技術スタック

- HTML5 / CSS3 / Vanilla JavaScript（フレームワークなし）
- GitHub Pages（静的ホスティング）
- テスト: Node標準の `node --test`（追加ライブラリなし）

## ディレクトリ構成

```
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js         # エントリーポイント
│   ├── words.js        # 単語リスト（平文）
│   ├── day.js           # JST日付計算・出題インデックス選出
│   ├── judge.js         # 判定ロジック
│   ├── keyboard.js      # 濁点サイクル・オンスクリーンキーボード
│   ├── board.js         # 盤面描画
│   ├── candidates.js    # 候補一覧UI
│   ├── storage.js       # localStorage(結果・streak)
│   └── sanitize.js       # 安全なDOM生成ヘルパー
├── test/                # node --test 用のテスト一式
└── package.json
```

## セットアップ

ビルド不要の静的サイトです。リポジトリをクローンし、簡易HTTPサーバーで配信して確認します（`file://` で直接開くとブラウザによっては動作しない機能があるため推奨）。

```bash
# 例: Python の簡易サーバーを使う場合
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いて確認してください。

## テスト

```bash
npm test
```

## デプロイ（GitHub Pages）

1. GitHubにリポジトリを作成しpush
2. リポジトリの Settings > Pages で公開元ブランチ（例: `main` の `/root`）を指定する

## 開発

このプロジェクトはPhaseごとに実装を進めています。実装計画は [`.claude/plans/wanword-daily-puzzle.md`](.claude/plans/wanword-daily-puzzle.md) を参照してください。
