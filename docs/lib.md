# WebC.Lib

通信とフォーム値のヘルパーです。

## Lib.defaults

全リクエスト共通の設定です。利用側で書き換えます。

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `headers` | `{}` | 共通ヘッダ。`request` の `headers` とマージされ、`request` 側が優先されます。 |
| `contentType` | `'json'` | `'json'` または `'form'`。リクエストボディの形式です。 |
| `responseType` | `'json'` | `'json'`、`'text'`、`'xml'` のいずれか。 |

認証ヘッダを一括で設定する例です。

```js
WebC.Lib.defaults.headers = { Authorization: 'Bearer xxxxx' };
```

`Lib.defaults.headers` は、`WebC.data.Store` が内部で行う通信にも適用されます。

## Lib.request(options)

`fetch` のラッパーです。`Promise` を返します。

| オプション | 既定値 | 説明 |
| --- | --- | --- |
| `url` | なし | リクエスト先（必須）。 |
| `method` | `'GET'` | HTTP メソッド。大文字で指定してください（後述）。 |
| `params` | `{}` | 送信するデータ。 |
| `headers` | `{}` | このリクエストのヘッダ。 |
| `contentType` | `Lib.defaults.contentType` | `'json'` / `'form'`。 |
| `responseType` | `Lib.defaults.responseType` | `'json'` / `'text'` / `'xml'`。 |

### リクエスト

- `method` が `'GET'` の場合、`params` をクエリ文字列として `url` に付けます。`url` に既に `?` があれば `&` で続けます。`params` が空なら何も付けません。
- `'GET'` 以外の場合、`params` を body に入れます。
  - `contentType: 'json'`: `JSON.stringify(params)` を body にし、`Content-Type: application/json` を付けます（`headers` で `Content-Type` を指定した場合はそちらが優先されます）。
  - `contentType: 'form'`: `URLSearchParams` を body にします。
- `GET` の判定は文字列の完全一致です。`'get'` のような小文字は GET として扱われず、body 付きで送られます。

### レスポンス

- `responseType: 'json'`: JSON を解析した値で resolve します。
- `responseType: 'text'`: 文字列で resolve します。
- `responseType: 'xml'`: `application/xml` として解析した `Document` で resolve します。

### エラー

エラーは Promise の reject で通知されます。HTTP ステータスが 2xx 以外の場合は、`status` プロパティ付きの `Error`（メッセージは `HTTP 404` のような形式）で reject します。通信自体の失敗は `fetch` の例外がそのまま reject されます。

```js
WebC.Lib.request({ url: '/api/users', params: { q: 'a' } })
  .then((users) => console.log(users))
  .catch((e) => console.error(e.status, e.message));
```

## Lib.getValues(form)

フォーム内の値をオブジェクトにして返します。`form` はセレクタ文字列または `<form>` 要素です。

| 要素 | 値 |
| --- | --- |
| checkbox | `true` / `false`（`checked` の状態） |
| radio | チェックされた要素の `value`。どれも選ばれていなければ `null` |
| その他（text、select、textarea など） | `value`（文字列） |

- `name` が無い要素、`disabled` の要素、`button` / `submit` / `reset` / `fieldset` は含まれません。
- radio 以外で同じ `name` が複数ある場合は、値の配列になります。checkbox なら真偽値の配列です。
- 数値型の項目も `value` は文字列です。

WebC のフィールドは内部にネイティブの入力要素を持つため、そのまま対象になります。DropDown は内部の `<select>` の値（文字列）を返します。

```js
const values = WebC.Lib.getValues('#user-form');
// { name: '佐藤', admin: true, gender: 'm', period: 'week', ... }
```

## Lib.setValues(form, values)

`values` に含まれる `name` の要素だけを更新します。含まれない `name` の要素は変更されません。

- WebC のフィールド内の入力要素は、そのフィールドの `setValue` が呼ばれます。値が変わった場合はフィールドの `change` イベントが発火します。Radio / ToggleButton には `value` が `inputValue` と一致するかの真偽値が渡されます（DropDown には値がそのまま渡されます）。
- 素の要素は直接書き換えます。
  - radio: `value` が `String(v)` と一致すればチェック、しなければ外します。
  - checkbox: `!!v` でチェックを設定します。
  - その他: `value` に `v` を設定します（`null` / `undefined` は空文字）。

```js
WebC.Lib.setValues('#user-form', { name: '鈴木', admin: false, gender: 'f' });
```

## 例: getValues と request で送信する

```js
const form = document.querySelector('#user-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  WebC.Lib.request({
    url: '/api/users',
    method: 'POST',
    params: WebC.Lib.getValues(form),
  }).then(() => console.log('saved'))
    .catch((err) => console.error(err.status));
});
```
