# Component（共通の仕組み）

`WebC.Component` は全コンポーネントの基底クラスです。`HTMLElement` を継承した Custom Element で、Light DOM に描画します。Grid・TabPanel・各フィールドはすべてこのクラスを継承しています（Store は Component ではなく、`on` / `off` / `fire` だけを共有します。[store.md](store.md) を参照）。

## config で組み立てる

コンストラクタに config オブジェクトを渡します。

```js
const grid = new WebC.grid.Grid({
  renderTo: '#grid',
  cls: 'my-grid',
  store,
  columns: [...],
});
```

渡した config は、後述の `defaults` とマージされて `this.config` に保持されます。

### 共通の config

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `renderTo` | `null` | 描画先。セレクタ文字列または Element。指定するとコンストラクタ内で `render()` が呼ばれます。 |
| `cls` | `''` | ルート要素に追加するクラス。空白区切りで複数指定できます。 |

## render

```js
const panel = new WebC.panel.TabPanel({ items });
panel.render('#target');       // セレクタ文字列
panel.render(document.body);   // Element
```

- 初回の `render()` で、子 DOM の構築（`onRender()`）と `cls` の追加が一度だけ行われます。
- その後、自身を描画先へ `appendChild` し、`render` イベントを発火します。2 回目以降の呼び出しでは DOM の再構築はせず、描画先への移動と `render` イベントのみ行います。
- 描画先にセレクタ文字列を渡した場合、一致する要素が無いと例外になります。

## defaults のマージ

各クラスは静的プロパティ `defaults` を持ちます。インスタンス生成時に、継承チェーン上の `defaults` が親から子の順にマージされ、最後に渡した config で上書きされます。

```js
class Base extends WebC.Component {
  static defaults = { a: 1, b: 1 };
}
class Child extends Base {
  static defaults = { b: 2 };
}
// new Child({ c: 3 }).config  →  { renderTo: null, cls: '', a: 1, b: 2, c: 3 }
```

サブクラスのフィールド初期化はコンストラクタの `super()` の後に行われます。そのため状態は `config` と、`_` で始まるプロパティに持たせてください。

## イベント

Component は `on` / `off` / `fire` を持ちます。

| メソッド | 説明 |
| --- | --- |
| `on(name, fn)` | リスナーを登録します。 |
| `off(name, fn)` | `on` で登録したリスナーを解除します。 |
| `fire(name, detail)` | `CustomEvent(name, { detail })` を自身に dispatch します。 |

ハンドラには event オブジェクトが渡され、データは `e.detail` から読みます。

```js
grid.on('rowclick', (e) => {
  console.log(e.detail.record, e.detail.index);
});
```

`fire` が作る CustomEvent はバブリングしません。標準の `addEventListener` でも受け取れますが、`destroy()` による一括解除の対象になるのは `on` で登録したものだけです。

### 基底クラスのイベント

| 名前 | detail | 説明 |
| --- | --- | --- |
| `render` | なし | `render()` のたびに発火します。 |
| `destroy` | なし | `destroy()` の先頭で発火します。 |

## destroy

```js
panel.destroy();
```

`destroy` イベントを発火し、`on` で登録したリスナーを解除し、DOM から取り除きます。Grid / DropDown は Store に登録したリスナー、TabPanel は `document` の keydown リスナーと ResizeObserver も解放します。

## 見た目のカスタマイズ

見た目は、既定のクラス名に当たる外部 CSS で変えます。各コンポーネントが生成する DOM とクラス名は、各ドキュメントに記載しています。`cls` で独自クラスを足し、そのクラスをセレクタに使うこともできます。

既定の CSS は、各コンポーネントのルートクラス（`.webc-grid`、`.webc-tabpanel`、`.webc-field`、`.webc-dropdown`）上の CSS カスタムプロパティ（`--webc-primary` など）を参照しています。色はこれらを上書きして変えられます。

```css
.webc-grid { --webc-primary: #00695c; }
```

## 独自コンポーネントを作る

`WebC.Component` を継承し、`onRender()` で子 DOM を作ります。`Component` 自体は `customElements` に登録されていないため、継承したクラスは `customElements.define` で登録する必要があります。登録しないと `new` で例外になります。タグ名にはハイフンが必要です。

```js
class Hello extends WebC.Component {
  static defaults = { text: 'Hello' };

  onRender() {
    this.classList.add('my-hello');
    this.textContent = this.config.text;
  }
}
customElements.define('my-hello', Hello);

const hello = new Hello({ renderTo: '#target', text: 'こんにちは', cls: 'big' });
hello.on('render', () => console.log('rendered'));
```

`WebC.field.Field` も同様に登録されていません。独自のフィールドを作る場合は、サブクラスを `customElements.define` してください（[fields.md](fields.md) を参照）。
