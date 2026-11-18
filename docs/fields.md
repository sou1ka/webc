# フィールド（WebC.field）

入力要素を包むコンポーネント群です。`WebC.field` に次のクラスがあります。

| クラス | タグ名 | 値 |
| --- | --- | --- |
| `Input` | `<webc-input>` | 文字列 |
| `TextArea` | `<webc-textarea>` | 文字列 |
| `Checkbox` | `<webc-checkbox>` | boolean |
| `Radio` | `<webc-radio>` | boolean（チェック状態） |
| `Switch` | `<webc-switch>` | boolean |
| `ToggleButton` | `<webc-togglebutton>` | boolean（チェック状態） |
| `DropDown` | `<webc-dropdown>` | `valueField` の値（型を保持） |

`WebC.field.Field` は共通の基底クラスで、`customElements` には登録されていません。

フォーム専用のパネルはありません。ネイティブの `<form>` の中に置いて使い、値の取得と設定には [`WebC.Lib.getValues` / `setValues`](lib.md) を使います。

## Field 共通

### config

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `name` | `null` | 入力要素の `name`。フォームの送信や `Lib.getValues` で使われます。 |
| `label` | `null` | ラベル文字列。`null` ならラベルを作りません。 |
| `value` | `null`（クラスごとに異なる） | 初期値。 |
| `attrs` | `{}` | 入力要素へそのまま付ける属性のオブジェクト。 |

`attrs` の値の扱いは次の通りです。

| 値 | 結果 |
| --- | --- |
| `true` | 空の属性（例: `required`） |
| `false` / `null` / `undefined` | 付けない |
| その他 | `String(値)` を属性値にする |

```js
new WebC.field.Input({
  renderTo: '#row',
  name: 'name',
  label: '名前',
  attrs: { required: true, maxlength: 20 },
});
```

共通の `renderTo` と `cls` も使えます（[component.md](component.md) を参照）。

### メソッド

| メソッド | 説明 |
| --- | --- |
| `getValue()` | 現在の値。描画前は `config.value`。 |
| `setValue(value)` | 値を設定します。現在値と `===` で等しければ何もしません。値が変わると `change` を発火します。描画前に呼んだ場合も、`config.value` を更新して `change` を発火します。 |

### イベント

| 名前 | detail | 説明 |
| --- | --- | --- |
| `change` | `{ value, oldValue }` | 値が変わったとき（ユーザー操作・`setValue` とも）。 |

- ユーザー操作では、ネイティブの `change` が起きるタイミングで発火します。ネイティブの `change` は外へ出さず、この `change` に置き換えています。
- この `change` はバブリングしません。`<form>` 側ではなく、各フィールドに `on('change', ...)` を付けてください。
- `Lib.setValues` 経由で値が変わった場合も発火します。

### 生成される DOM

```
webc-xxx.webc-field.webc-field-{kind}
├─ label.webc-field-label    （label 指定時。Checkbox 系は入力要素の後ろ）
└─ input / textarea / select .webc-field-control
```

- `{kind}` は `input` / `textarea` / `checkbox` / `radio` / `switch` / `togglebutton` / `dropdown` です。
- 入力要素には一意な `id` が振られ、`label` の `for` と対応します。
- ラベルを入力要素の後ろに置くのは、Checkbox、Radio、Switch、ToggleButton です。

CSS カスタムプロパティは `.webc-field` 上の `--webc-primary`、`--webc-on-surface`、`--webc-on-surface-variant`、`--webc-surface-container-highest`、`--webc-error` です。Switch は `--webc-outline`、`--webc-on-primary`、ToggleButton は `--webc-outline`、`--webc-secondary-container`、`--webc-on-secondary-container` も使います。

### 独自のフィールド

Field を継承する場合は、`_createControl()` で入力要素を返し、`static kind` に種類名を指定します。値の読み書きを変えるときは `_readControl()` と `_writeControl(value)` をオーバーライドします。登録には `customElements.define` が必要です。

## Input

`<input>` を包みます。値は文字列です。

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `type` | `'text'` | `<input>` の `type`。`'number'` や `'email'` など。 |
| `value` | `''` | 初期値。 |

`type: 'number'` でも値は文字列です。

## TextArea

`<textarea>` を包みます。値は文字列です。

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `rows` | `3` | 行数。 |
| `value` | `''` | 初期値。 |

## Checkbox

チェックボックスです。値は `true` / `false` です。`value` の既定値は `false` です。ラベルは入力要素の後ろに置かれます。

## Radio

ラジオボタン 1 つに対応します。値はチェック状態の `true` / `false` です。

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `inputValue` | `'on'` | フォーム送信時の値（入力要素の `value`）。 |
| `value` | `false` | 初期のチェック状態。 |

- 1 コンポーネントが 1 つのラジオです。選択肢の数だけ Radio を作り、同じ `name` を付けて並べます。
- `change` は、新たに選ばれた側だけが発火します。外れた側は発火しません。
- `Lib.getValues` は、チェックされたものの `inputValue` を返します。

```js
new WebC.field.Radio({ renderTo: '#gender-row', name: 'gender', inputValue: 'm', label: '男性' });
new WebC.field.Radio({ renderTo: '#gender-row', name: 'gender', inputValue: 'f', label: '女性' });
```

## Switch

Checkbox と同じ動作で、入力要素に `role="switch"` が付きます。値は `true` / `false` です。

## ToggleButton

Radio と同じ定義です。ラジオを隠し、ラベルをボタンとして表示します。同じ `name` の ToggleButton でグループになり、単一選択になります。`inputValue` と `change` の動作は Radio と同じです。

複数を同時に選べるようにしたい場合は、Checkbox を使ってください。

## DropDown

ネイティブの `<select>`（`appearance: base-select`）を包みます。Chrome 以外では見た目が素の `<select>` になります。

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `store` | `null` | 選択肢の Store（必須）。 |
| `valueField` | `'value'` | 値に使うレコードのプロパティ名。 |
| `displayField` | `'text'` | 表示に使うレコードのプロパティ名。 |
| `value` | `null` | 初期値。`valueField` の値と `===` で一致する選択肢が選ばれます。一致しなければ何も選択されません。 |

- 値は `<select>` ではなく `config.value` に保持するため、Store のレコードの値の型（数値など）がそのまま保たれます。`getValue()` と `change` の `detail.value` もその型です。
- `change` の detail は `{ value, oldValue, record }` です。`record` は `valueField` が一致する Store のレコード（無ければ `null`）です。
- Store の `refresh` で選択肢を作り直し、現在値で選択を同期します。リモートの Store なら、`load` 完了後に選択肢が現れます。
- 選択肢は `store.getData()` から作られるため、Store にページングがあると現在ページ分だけになります。
- `Lib.getValues` が返すのは、`<select>` の値（文字列）です。型を保った値が必要なときは `getValue()` を使ってください。
- `Lib.setValues` では、値がそのまま `setValue` に渡されます。
- `destroy()` で Store に登録したリスナーを外します。

DOM は `webc-dropdown.webc-field.webc-field-dropdown.webc-dropdown` の中に、`label.webc-field-label` と `select.webc-dropdown-select.webc-field-control` があり、選択肢は `option.webc-dropdown-option` です。CSS カスタムプロパティは `.webc-dropdown` 上の `--webc-primary`、`--webc-on-surface`、`--webc-on-surface-variant`、`--webc-surface-container`、`--webc-surface-container-highest`、`--webc-secondary-container` です。

```js
const dropdown = new WebC.field.DropDown({
  renderTo: '#select-row',
  name: 'dept',
  label: '部署',
  valueField: 'id',
  displayField: 'name',
  value: 2,
  store: new WebC.data.Store({
    data: [
      { id: 1, name: '営業' },
      { id: 2, name: '開発' },
    ],
  }),
});
dropdown.on('change', (e) => console.log(e.detail.value, e.detail.record));
```

## 例: Grid の行クリックでフォームへ反映し、送信で値を取得する

`examples/form.html` を元にした例です。

```html
<div id="grid"></div>
<form id="user-form">
  <div id="text-row"></div>
  <div id="gender-row"></div>
  <div id="check-row"></div>
  <button type="submit">送信</button>
  <button type="reset">リセット</button>
</form>

<script>
  new WebC.field.Input({ renderTo: '#text-row', name: 'name', label: '名前', attrs: { required: true } });
  new WebC.field.Radio({ renderTo: '#gender-row', name: 'gender', inputValue: 'm', label: '男性' });
  new WebC.field.Radio({ renderTo: '#gender-row', name: 'gender', inputValue: 'f', label: '女性' });
  new WebC.field.Checkbox({ renderTo: '#check-row', name: 'admin', label: '管理者' });
  new WebC.field.Switch({ renderTo: '#check-row', name: 'notify', label: '通知する', value: true });

  const grid = new WebC.grid.Grid({
    renderTo: '#grid',
    columns: [
      { text: '名前', dataIndex: 'name' },
      { text: '管理者', dataIndex: 'admin', renderer: (v) => (v ? '✓' : '') },
    ],
    store: new WebC.data.Store({
      data: [
        { name: '佐藤 一郎', gender: 'm', admin: true, notify: true },
        { name: '鈴木 花子', gender: 'f', admin: false, notify: false },
      ],
    }),
  });

  const form = document.querySelector('#user-form');

  // 行クリック → フォームへ反映
  grid.on('rowclick', (e) => WebC.Lib.setValues(form, e.detail.record));

  // 送信 → 値を取得
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = WebC.Lib.getValues(form);
    console.log(values);
    // WebC.Lib.request({ url: '/api/users', method: 'POST', params: values });
  });
</script>
```

## 注意

- DropDown は値を `config.value` に保持しているため、`form.reset()` では元に戻りません。reset では `change` も発火しません。元に戻したいときは `setValue` を呼んでください。
