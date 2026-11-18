# WebC.grid.Grid

`<table>` ベースのデータグリッドです。データは [Store](store.md) から取得します。タグ名は `<webc-grid>` です。

## config

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `store` | `null` | 表示するデータの Store（必須）。 |
| `columns` | `[]` | 列定義の配列（下記）。 |
| `emptyText` | `'データがありません'` | 表示レコードが 0 件のときのメッセージ。 |
| `loadingText` | `'読み込み中…'` | Store の読み込み中に表示するメッセージ。 |
| `paging` | `false` | `true` でページングバーを表示します。 |

共通の `renderTo` と `cls` も使えます（[component.md](component.md) を参照）。ページサイズは Grid ではなく Store の `pageSize` で指定します。

### columns

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `text` | なし | ヘッダの文字列。 |
| `dataIndex` | なし | 表示するレコードのプロパティ名。ソートのキーにもなります。 |
| `width` | 未指定 | 幅。数値なら px、文字列ならそのまま CSS の値として使います。 |
| `sortable` | `true` | `false` でヘッダクリックによるソートを無効にします。 |
| `renderer` | なし | `(value, record) => 表示内容`。戻り値が Node ならそのままセルに追加し、それ以外は `textContent` として表示します（`null` / `undefined` は空文字）。 |

```js
{ text: '操作', dataIndex: 'id', sortable: false, renderer: (id) => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = `詳細 #${id}`;
    return a;
} }
```

## 動作

- **ソート**: `sortable` な列のヘッダをクリックすると、その列で昇順になります。同じ列を続けてクリックすると昇順と降順が切り替わります。別の列をクリックすると昇順から始まります。内部で `store.sort(dataIndex, 'ASC' | 'DESC')` を呼ぶため、Store が `remoteSort` ならサーバ側でのソートになります。
- **ページング**: `paging: true` で、先頭・前・次・末尾・再読み込みのボタンと、`現在 / 総ページ数` の表示を持つバーが付きます。ボタンは `store.loadPage(...)` と `store.load()` を呼びます。先頭ページでは先頭・前、最終ページでは次・末尾が無効になります。
- **選択**: 行をクリックすると、その行が選択され（`is-selected` クラスが付き、ハイライトされます）、`rowclick` と `selectionchange` が発火します。表示レコードが変わると（Store の `refresh`）選択は解除され、`selectionchange`（`record: null`）が発火します。
- **読み込み表示**: Store の `beforeload` から `loadend` の間、`loadingText` を重ねて表示します。
- **空表示**: 表示レコードが 0 件のとき `emptyText` を表示します。
- **ヘッダ固定**: ヘッダは `position: sticky` で固定されます。行が多いときは `.webc-grid-body` がスクロールするため、Grid に高さを与えてください（例: `.webc-grid { height: 360px; }`）。

## メソッド

| メソッド | 説明 |
| --- | --- |
| `getSelection()` | 選択中のレコード。無ければ `null`。 |
| `destroy()` | Store に登録したリスナーを外し、Component としての破棄を行います。 |

## イベント

| 名前 | detail | 説明 |
| --- | --- | --- |
| `rowclick` | `{ record, index }` | 行をクリックしたとき。選択済みの行をクリックしても発火します。`index` は表示中の行の位置です。 |
| `selectionchange` | `{ record }` | 選択が変わったとき。解除時は `record` が `null`。同じ行の再クリックでは発火しません。 |

## 生成される DOM

```
webc-grid.webc-grid
├─ div.webc-grid-body
│  └─ table.webc-grid-table
│     ├─ thead > tr > th.webc-grid-header (.is-sortable, .is-sort-asc / .is-sort-desc)
│     └─ tbody > tr.webc-grid-row (.is-selected) > td.webc-grid-cell
├─ div.webc-grid-empty
├─ div.webc-grid-loading
└─ div.webc-grid-paging（paging: true のときのみ）
   ├─ button.webc-grid-paging-first
   ├─ button.webc-grid-paging-prev
   ├─ span.webc-grid-paging-info
   ├─ button.webc-grid-paging-next
   ├─ button.webc-grid-paging-last
   └─ button.webc-grid-paging-reload
```

CSS カスタムプロパティは `.webc-grid` 上の `--webc-primary`、`--webc-on-surface`、`--webc-on-surface-variant`、`--webc-surface`、`--webc-outline-variant`、`--webc-secondary-container` です。

## 例

### ローカル

```js
const columns = [
  { text: 'ID', dataIndex: 'id', width: 64 },
  { text: '名前', dataIndex: 'name', width: 160 },
  { text: '年齢', dataIndex: 'age', width: 80 },
  { text: '部署', dataIndex: 'dept' },
];

const grid = new WebC.grid.Grid({
  renderTo: '#local',
  paging: true,
  columns,
  store: new WebC.data.Store({
    pageSize: 5,
    data: [
      { id: 1, name: 'Carol', age: 30, dept: '開発' },
      { id: 2, name: 'Alice', age: 25, dept: '営業' },
      // ...
    ],
  }),
});
grid.on('selectionchange', (e) => {
  console.log(e.detail.record);
});
```

### リモート（静的 JSON）

```js
const store = new WebC.data.Store({
  url: 'data/users.json',
  rootProperty: 'items',
  pageSize: 10,
});
const grid = new WebC.grid.Grid({ renderTo: '#remote', paging: true, columns, store });
grid.on('rowclick', (e) => console.log(e.detail.index, e.detail.record.name));
store.load().catch((e) => console.error('load failed', e));
```

`fetch` を使うため、ローカルサーバ経由で開く必要があります。

## 注意

- Grid の操作（ページ移動・再読み込みボタン・リモートソート）から始まった読み込みが失敗すると、未処理の Promise reject になります。Grid 側では捕捉しません。失敗を検知したい場合は、Store の `loadend`（`success: false`）を使えます。
- 自分で呼ぶ `store.load()` には `catch` を付けられます。
