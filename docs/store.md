# WebC.data.Store

レコード（オブジェクト）の配列を保持するデータストアです。Component ではなく `EventTarget` を継承しており、DOM は生成しません。`on` / `off` / `fire` を使えます。Grid や DropDown がデータ源として参照します。

ソートとページングは、ローカル（ブラウザ内）とリモート（サーバ側）のどちらでも行えます。

## config

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `data` | `null` | レコード配列。指定すると読み込み済み（`isLoaded()` が `true`）になります。 |
| `url` | `null` | `load()` の取得先。 |
| `method` | `'GET'` | HTTP メソッド。`'GET'` / `'POST'` のように大文字で指定します。 |
| `params` | `{}` | `load()` で常に送るパラメータ。 |
| `headers` | `{}` | リクエストヘッダ。 |
| `contentType` | `undefined` | `'json'` / `'form'`。未指定なら `WebC.Lib.defaults.contentType`。 |
| `rootProperty` | `null` | レスポンスの中でレコード配列が入っているプロパティ名。`null` ならレスポンス全体を配列として扱います。 |
| `totalProperty` | `null` | 総件数が入っているプロパティ名。リモートページングの総ページ数の計算に使います。 |
| `pageSize` | `0` | 1 ページの件数。`0` ならページングしません。 |
| `remoteSort` | `false` | `true` でソートをサーバに任せます。 |
| `remotePaging` | `false` | `true` でページングをサーバに任せます。 |

`load()` は常に JSON としてレスポンスを読みます。`Lib.defaults.responseType` の設定は影響しません。

## メソッド

| メソッド | 戻り値 | 説明 |
| --- | --- | --- |
| `load(params)` | `Promise<object[]>` | `url` から取得し、データを置き換えます。`params` は `config.params` などに上書きマージされます。 |
| `isLoaded()` | `boolean` | `config.data` で生成した、または `load` が成功していれば `true`。 |
| `getData()` | `object[]` | 表示対象のレコード（ソート・ページング適用後。ローカルページングなら現在ページ分）。 |
| `getAt(index)` | `object` | `getData()` の `index` 番目。無ければ `undefined`。 |
| `getCount()` | `number` | `getData()` の件数。 |
| `findBy(field, value)` | `object` または `null` | 全データから `record[field] === value` の最初のレコード。無ければ `null`。 |
| `sort(property, direction)` | `Promise` または `undefined` | ソートして 1 ページ目に戻します。`direction` は `'ASC'` / `'DESC'`。`'DESC'` 以外は昇順です。`remoteSort` なら `load()` の Promise を返します。 |
| `loadPage(page)` | `Promise` または `undefined` | 指定ページ（1 始まり）へ移動します。`remotePaging` なら `load()` の Promise を返します。 |
| `getPage()` | `number` | 現在のページ（1 始まり）。 |
| `getPageCount()` | `number` | 総ページ数。`pageSize` が `0` なら `1`。 |
| `getTotalCount()` | `number` | 総件数。ローカルは全件数。`remotePaging` では `totalProperty` の値（無ければ取得件数）。 |

- `load()` の実行中に再度呼ぶと、新しい通信は行わず、実行中の Promise を返します（このときの `params` は使われません）。
- ローカルソートは、文字列同士なら `localeCompare`、それ以外は `<` `>` で比較します。対象は全データです。
- `findBy` は保持しているデータ全体が対象です。`remotePaging` の場合は、現在ページ分のみです。

## リモート時に送るパラメータ

`load()` は次のパラメータをマージして送ります（後ろほど優先）。

1. `config.params`
2. ソート済みかつ `remoteSort: true` の場合: `sort`（プロパティ名）、`dir`（`'ASC'` / `'DESC'`）
3. `remotePaging: true` かつ `pageSize > 0` の場合: `page`（1 始まり）、`limit`（`pageSize`）
4. `load(params)` の引数

名前（`sort` / `dir` / `page` / `limit`）は固定で、変更できません。`method: 'GET'` ならクエリ文字列、`'POST'` なら body で送られます（[lib.md](lib.md) を参照）。

## イベント

| 名前 | detail | 発火タイミング |
| --- | --- | --- |
| `beforeload` | なし | `load()` で通信を始める直前。 |
| `load` | `{ records }` | 読み込みに成功したとき。`records` は取得したレコード配列。 |
| `refresh` | なし | 表示レコードが変わったとき（`load` 成功、ローカルの `sort`、ローカルの `loadPage`）。 |
| `loadend` | `{ success }` | 読み込みの終了時。失敗でも発火し、`success` は `false` になります。 |

読み込み成功時の順序は `beforeload` → `load` → `refresh` → `loadend` です。失敗時は `beforeload` → `loadend`（`success: false`）で、`load` と `refresh` は発火しません。

## 例

### ローカル

```js
const store = new WebC.data.Store({
  pageSize: 5,
  data: [
    { id: 1, name: 'Carol', age: 30 },
    { id: 2, name: 'Alice', age: 25 },
    { id: 3, name: 'Bob', age: 35 },
  ],
});

store.sort('name', 'ASC');
store.getAt(0);          // { id: 2, name: 'Alice', ... }
store.findBy('id', 3);   // { id: 3, name: 'Bob', ... }
```

### リモート（静的 JSON、ソート・ページングはローカル）

```js
const store = new WebC.data.Store({
  url: 'data/users.json',
  rootProperty: 'items',
  pageSize: 10,
});
store.on('load', (e) => console.log(e.detail.records.length));
store.load().catch((e) => console.error('load failed', e));
```

### リモート（サーバ側でソート・ページング）

`/api/users?sort=name&dir=ASC&page=2&limit=20` のようなリクエストになります。

```js
const store = new WebC.data.Store({
  url: '/api/users',
  rootProperty: 'items',
  totalProperty: 'total',
  pageSize: 20,
  remoteSort: true,
  remotePaging: true,
});
store.load();
store.loadPage(2);
store.sort('name', 'ASC');
```

## 注意

- `url` の無い Store で `load()`（再読み込み）を呼ぶと失敗します。`data` だけで作った Store では `load()` を呼ばないでください。
- `method` は `'GET'` / `'POST'` のように大文字で指定します。小文字の `'get'` は GET として扱われません。
- Store 自体は JSON しか読みません。XML やテキストのレスポンスには対応していません。
- `load()` の失敗は Promise の reject で通知されます。`load()`、および `remoteSort` / `remotePaging` の `sort()` / `loadPage()` の戻り値には `catch` を付けてください。
