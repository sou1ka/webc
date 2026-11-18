# WebC

WebC は、Custom Elements をベースにした UI コンポーネントライブラリです。ExtJS 風に config オブジェクトでコンポーネントを組み立てますが、ExtJS のクローンではありません。

- 単一ファイル（`src/webc.js`）で、グローバル変数 `WebC` として公開されます。バンドラは不要です。
- Shadow DOM を使わず、Light DOM に描画します。見た目は外部 CSS で変更できます。
- 既定の CSS（`src/webc.css`）は Material Design 3 風で、CSS カスタムプロパティを使っています。

提供するもの: DropDown / Input / TextArea / Checkbox / Radio / Switch / ToggleButton（フィールド）、Grid、TabPanel、Store、通信とフォーム値のヘルパー（`WebC.Lib`）。

## 導入

```html
<link rel="stylesheet" href="src/webc.css">
<script src="src/webc.js"></script>
```

## 最小の使用例

```html
<div id="list"></div>
<script>
  const dropdown = new WebC.field.DropDown({
    renderTo: '#list',
    valueField: 'val',
    displayField: 'name',
    value: '2',
    store: new WebC.data.Store({
      data: [
        { val: '1', name: 'フィールド1' },
        { val: '2', name: 'フィールド2' },
      ],
    }),
  });
  dropdown.on('change', (e) => console.log(e.detail.value));
</script>
```

## 対象ブラウザ

主対象は Chrome です。DropDown は `appearance: base-select` を使っているため、Chrome 以外では見た目が素の `<select>` になります。

## テスト

テストは `node:test` と jsdom で書かれています。

```
npm install
npm test
```

## examples

| ファイル | 内容 |
| --- | --- |
| `examples/index.html` | DropDown |
| `examples/grid.html` | Grid（ローカル Store と、`examples/data/users.json` を読むリモート Store） |
| `examples/tabpanel.html` | TabPanel（位置と幅による表示切替） |
| `examples/form.html` | フォーム（各フィールド、Grid の行クリックで `setValues`、送信で `getValues`） |

`grid.html` のリモート例は fetch を使うため、ローカルサーバ経由で開く必要があります。たとえば次のようにします。

```
npx http-server .
```

その後 `http://localhost:8080/examples/grid.html` を開いてください。他の例はファイルを直接開けます。

## ドキュメント

- [docs/component.md](docs/component.md): 共通の仕組み（config、イベント、destroy、独自コンポーネント）
- [docs/lib.md](docs/lib.md): `WebC.Lib`（request、getValues、setValues）
- [docs/store.md](docs/store.md): `WebC.data.Store`
- [docs/grid.md](docs/grid.md): `WebC.grid.Grid`
- [docs/tabpanel.md](docs/tabpanel.md): `WebC.panel.TabPanel`
- [docs/fields.md](docs/fields.md): `WebC.field.*`
