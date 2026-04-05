# イースター待受プロジェクト

`index.html` が本番ページ、`editor.html` が iPad 向け配置エディタです。

## 使い方

1. `editor.html` を開いて配置を調整
2. `保存` で `layout.json` を書き出し
3. プロジェクト内の `layout.json` を差し替え
4. `index.html` を開いて本番表示を確認

## 素材

- `source-assets/`: 受け取った元素材
- `assets/real/`: 実際にサイトで使う素材

## 構成

- `layout.json`: 背景とオブジェクト配置
- `assets/easter/`: 差し替え用アセット
- `scripts/app.js`: 本番ページロジック
- `scripts/editor.js`: 配置エディタ
- `scripts/layout-config.js`: 共通処理
