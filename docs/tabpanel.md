# WebC.panel.TabPanel

タブでコンテンツを切り替えるパネルです。タグ名は `<webc-tabpanel>` です。コンポーネント自身の幅に応じて、通常表示 → アイコンのみ → ドロワーと表示が切り替わります。

## config

| キー | 既定値 | 説明 |
| --- | --- | --- |
| `items` | `[]` | タブ項目の配列（下記）。 |
| `active` | `null` | 最初に選択する項目の `id`。未指定なら先頭の項目です。 |
| `tabPosition` | `'top'` | タブの位置。`'top'` / `'bottom'` / `'left'` / `'right'`。描画時に決まり、後から変更できません。 |
| `iconOnlyWidth` | `null` | 自身の幅がこの値（px）未満になると、アイコンのみの表示にします。`null` なら切り替えません。 |
| `drawerWidth` | `null` | 自身の幅がこの値（px）未満になると、ドロワー表示にします。`null` なら切り替えません。 |

共通の `renderTo` と `cls` も使えます（[component.md](component.md) を参照）。

### items

| キー | 説明 |
| --- | --- |
| `id` | 項目の識別子。`active`、`setActive`、`getActive` で使います。 |
| `text` | タブの文字列。`aria-label` にも使われます。 |
| `icon` | アイコン。文字列なら `textContent` として、Node ならそのまま追加します。省略するとアイコン無しです。 |
| `content` | 表示するコンテンツ。セレクタ文字列（`querySelector`）または Element。省略した項目はタブだけになります。 |

## 動作

- 選択中の項目の `content` だけが表示され、他は `hidden` になります。
- 幅の判定は、TabPanel 自身の幅（`ResizeObserver` で監視）で行います。`drawerWidth` が優先され、ドロワーでないときに `iconOnlyWidth` が判定されます。`ResizeObserver` が無い環境では切り替わりません。
- ドロワー表示では、タブ一覧は隠れ、メニューボタンが現れます。メニューボタンを押すと、`tabPosition` で指定した側（`left` なら左、`top` なら上など）からタブ一覧が出ます。
- ドロワーは、項目の選択、背景（バックドロップ）のクリック、Esc キーで閉じます。ドロワー表示でなくなったときも閉じます。
- 初期の選択では `tabchange` は発火しません。

## メソッド

| メソッド | 説明 |
| --- | --- |
| `setActive(id)` | 項目を選択します。存在しない `id` と、すでに選択中の `id` は無視されます。 |
| `getActive()` | 選択中の項目の `id`。 |
| `destroy()` | ResizeObserver と `document` の keydown リスナーを解放し、Component としての破棄を行います。`content` の要素も一緒に削除されます。 |

## イベント

| 名前 | detail | 説明 |
| --- | --- | --- |
| `tabchange` | `{ item, oldItem }` | 選択が変わったとき。`item` は新しい項目、`oldItem` は前の項目（無ければ `null`）。`items` の要素オブジェクトがそのまま渡されます。 |

## 生成される DOM

```
webc-tabpanel.webc-tabpanel.is-pos-{tabPosition}
│   （状態クラス: is-icon-only / is-drawer / is-drawer-open）
├─ button.webc-tabpanel-menu
├─ nav.webc-tabpanel-nav[role=tablist]
│  └─ button.webc-tabpanel-tab[role=tab] (.is-active)
│     ├─ span.webc-tabpanel-icon（icon 指定時のみ）
│     └─ span.webc-tabpanel-text
├─ div.webc-tabpanel-backdrop
└─ div.webc-tabpanel-body
   └─ （content）.webc-tabpanel-content[role=tabpanel]
```

- `content` の要素には `webc-tabpanel-content` クラスと `role="tabpanel"` が付きます。
- タブには `aria-selected` が設定されます。
- メニューボタンはドロワー表示のときだけ表示されます。

CSS カスタムプロパティは `.webc-tabpanel` 上の `--webc-primary`、`--webc-on-surface`、`--webc-on-surface-variant`、`--webc-surface`、`--webc-surface-container`、`--webc-surface-container-low`、`--webc-outline-variant`、`--webc-secondary-container`、`--webc-on-secondary-container` です。TabPanel には高さを与えてください（例: `height: 100%`）。

## 例

```html
<div id="frame" style="width: 900px; height: 400px;"></div>
<div id="home-page">ホーム</div>
<div id="user-page">ユーザー</div>

<script>
  const panel = new WebC.panel.TabPanel({
    renderTo: '#frame',
    tabPosition: 'left',
    active: 'users',
    iconOnlyWidth: 768,
    drawerWidth: 480,
    items: [
      { id: 'home', text: 'ホーム', icon: '🏠', content: '#home-page' },
      { id: 'users', text: 'ユーザー', icon: '👥', content: '#user-page' },
      { id: 'about', text: 'アイコン無し', content: document.createElement('div') },
    ],
  });

  panel.on('tabchange', (e) => {
    console.log(e.detail.oldItem?.id, '->', e.detail.item.id);
  });
  panel.setActive('home');
</script>
```

`examples/tabpanel.html` では、`tabPosition` を切り替えるたびに `destroy()` して作り直しています。その際、`content` も毎回新しく生成しています。

## 注意

- `content` に渡した要素は TabPanel 内へ移動し、`destroy()` で一緒に削除されます。TabPanel を作り直すときは、`content` の要素も作り直してください。
