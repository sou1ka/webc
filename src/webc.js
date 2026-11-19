/**
 * WebC - ExtJS ライクな config 駆動の Web コンポーネント
 * グローバル変数 WebC として公開する。
 */
(function (global) {
  'use strict';

  /**
   * 通信ヘルパー
   *
   * defaults: 全リクエスト共通の設定（利用側で書き換える）
   */
  const Lib = {
    defaults: { headers: {}, contentType: 'json', responseType: 'json' },

    /**
     * fetch のラッパー
     * - GET: params をクエリ文字列に付与
     * - それ以外: contentType 'json' なら JSON.stringify、'form' なら URLSearchParams を body に
     * - headers は defaults.headers と request 指定をマージ（request 優先）
     * - responseType: 'json' → JSON / 'text' → 文字列 / 'xml' → Document
     * - HTTP 2xx 以外は Error（status・body プロパティ付き）で reject
     *   body は responseType に合わせて読んだ本文（json で読めなければ文字列）
     *
     * @param {{ url: string, method?: string, params?: object, headers?: object,
     *           contentType?: 'json'|'form', responseType?: 'json'|'text'|'xml' }} options
     * @returns {Promise<any>}
     */
    request(options) {
      const { url, method = 'GET', params = {}, headers = {} } = options;
      const contentType = options.contentType ?? Lib.defaults.contentType;
      const responseType = options.responseType ?? Lib.defaults.responseType;
      const init = { method, headers: { ...Lib.defaults.headers, ...headers } };
      let target = url;
      if (method === 'GET') {
        const query = new URLSearchParams(params).toString();
        if (query) target += (url.includes('?') ? '&' : '?') + query;
      } else if (contentType === 'json') {
        init.headers = { 'Content-Type': 'application/json', ...init.headers };
        init.body = JSON.stringify(params);
      } else {
        init.body = new URLSearchParams(params);
      }
      return global.fetch(target, init).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          let body = text;
          if (responseType === 'json') {
            try { body = JSON.parse(text); } catch { /* JSON でなければ文字列のまま */ }
          } else if (responseType === 'xml') {
            body = new DOMParser().parseFromString(text, 'application/xml');
          }
          throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body });
        }
        if (responseType === 'json') return res.json();
        const text = await res.text();
        return responseType === 'xml' ? new DOMParser().parseFromString(text, 'application/xml') : text;
      });
    },

    /**
     * form 内の name 付き要素の値をオブジェクトにする（disabled・button は除外）
     * - checkbox: true/false / radio: チェックされた value（無ければ null）/ その他: value（文字列）
     * - 同じ name が複数（radio 以外）なら配列
     *
     * @param {string|HTMLFormElement} form
     * @returns {object}
     */
    getValues(form) {
      const values = {};
      for (const el of toEl(form).elements) {
        if (!el.name || el.disabled || ['button', 'submit', 'reset', 'fieldset'].includes(el.type)) continue;
        if (el.type === 'radio') {
          if (el.checked) values[el.name] = el.value;
          else if (!(el.name in values)) values[el.name] = null;
          continue;
        }
        const value = el.type === 'checkbox' ? el.checked : el.value;
        values[el.name] = el.name in values ? [].concat(values[el.name], value) : value;
      }
      return values;
    },

    /**
     * values にある name の要素だけ更新する
     * - WebC フィールド内の要素はそのフィールドの setValue を呼ぶ（radio は value 一致で true / 不一致で false）
     * - 素の要素は直接書き換える
     *
     * @param {string|HTMLFormElement} form
     * @param {object} values
     */
    setValues(form, values) {
      for (const el of toEl(form).elements) {
        if (!el.name || !Object.hasOwn(values, el.name)) continue;
        const v = values[el.name];
        const field = el.closest('.webc-field');
        if (field && field._control === el) field.setValue(el.type === 'radio' ? el.value === String(v) : v);
        else if (el.type === 'radio') el.checked = el.value === String(v);
        else if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v ?? '';
      }
    },
  };

  /** 文字列なら querySelector、Element ならそのまま */
  const toEl = (target) => (typeof target === 'string' ? document.querySelector(target) : target);

  /** on / off / fire と、on で登録したリスナーの一括解除を付与する mixin */
  const Observable = (Base) => class extends Base {
    /** @param {string} name @param {Function} fn */
    on(name, fn) {
      this.addEventListener(name, fn);
      (this._listeners ??= []).push([name, fn]);
    }

    /** @param {string} name @param {Function} fn */
    off(name, fn) {
      this.removeEventListener(name, fn);
      this._listeners = (this._listeners ?? []).filter(([n, f]) => n !== name || f !== fn);
    }

    /** CustomEvent(name, { detail }) を dispatch する */
    fire(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    /** on で登録したリスナーをすべて解除する */
    _removeAllListeners() {
      for (const [name, fn] of this._listeners ?? []) this.removeEventListener(name, fn);
      this._listeners = [];
    }
  };

  /**
   * 全コンポーネントの基底クラス（Light DOM の Custom Element）
   *
   * config: { renderTo: string|Element|null, cls: string }
   * events: 'render', 'destroy'
   */
  class Component extends Observable(HTMLElement) {
    static defaults = { renderTo: null, cls: '' };

    /** @param {object} config  継承チェーン上の defaults とマージされる */
    constructor(config = {}) {
      super();
      // サブクラスのフィールド初期化は super() 後なので、状態は config と _ 始まりのプロパティに持つ
      this.config = Object.assign({}, ...collectDefaults(this.constructor), config);
      this._rendered = false;
      if (this.config.renderTo) this.render(this.config.renderTo);
    }

    /** @param {string|Element} target  文字列なら querySelector、Element ならそのまま */
    render(target) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!this._rendered) {
        this._rendered = true;
        this.onRender();
        if (this.config.cls) this.classList.add(...this.config.cls.split(/\s+/).filter(Boolean));
      }
      el.appendChild(this);
      this.fire('render');
    }

    /** サブクラスが自身の子 DOM を構築するフック（render 時に一度だけ呼ばれる） */
    onRender() {}

    /** 'destroy' を発火 → on で登録したリスナーを解除 → DOM から取り除く */
    destroy() {
      this.fire('destroy');
      this._removeAllListeners();
      this.remove();
    }
  }

  /** 継承チェーン上の static defaults を親 → 子の順で返す */
  function collectDefaults(ctor) {
    const list = [];
    for (let c = ctor; c && c !== HTMLElement; c = Object.getPrototypeOf(c)) {
      if (Object.hasOwn(c, 'defaults')) list.unshift(c.defaults);
    }
    return list;
  }

  /**
   * レコード配列を保持するストア。url 指定時は load() でリモートから取得する（JSON のみ）
   * ソート・ページングはローカル／リモート（remoteSort / remotePaging）を選べる
   *
   * config: { data, url, method, params, headers, contentType, rootProperty,
   *           pageSize, totalProperty, remoteSort, remotePaging }
   * events: 'beforeload'
   *         'load'    detail: { records }  （load 成功時）
   *         'loadend' detail: { success }  （load 終了時。失敗含む）
   *         'refresh'                      （表示レコードが変わった時。load / sort / loadPage）
   */
  class Store extends Observable(EventTarget) {
    static defaults = {
      data: null, url: null, method: 'GET', params: {}, headers: {}, contentType: undefined, rootProperty: null,
      pageSize: 0, totalProperty: null, remoteSort: false, remotePaging: false,
    };

    /** @param {object} config */
    constructor(config = {}) {
      super();
      this.config = Object.assign({}, Store.defaults, config);
      this.data = this.config.data || [];
      this._loaded = !!this.config.data;
      this._loading = null;
      this._sorter = null;
      this._page = 1;
      this._total = null;
    }

    /** 表示レコード（ソート・ページング適用後） */
    getData() {
      const { pageSize, remotePaging } = this.config;
      if (!pageSize || remotePaging) return this.data;
      const start = (this._page - 1) * pageSize;
      return this.data.slice(start, start + pageSize);
    }

    getAt(index) { return this.getData()[index]; }
    getCount() { return this.getData().length; }
    /** 全データから最初に一致したレコード、無ければ null */
    findBy(field, value) { return this.data.find((r) => r[field] === value) ?? null; }

    /**
     * config.params に params を上書きマージして Lib.request（responseType は常に 'json'）
     * → rootProperty の配列で data を置き換え → 'load' を発火
     * 読込中に再度呼ばれた場合は実行中の Promise を返す
     *
     * @param {object} [params]
     * @returns {Promise<object[]>} records
     */
    load(params) {
      if (this._loading) return this._loading;
      const { url, method, headers, contentType, rootProperty, totalProperty, pageSize, remoteSort, remotePaging } = this.config;
      const sortParams = remoteSort && this._sorter ? { sort: this._sorter.property, dir: this._sorter.direction } : {};
      const pageParams = remotePaging && pageSize > 0 ? { page: this._page, limit: pageSize } : {};
      this.fire('beforeload');
      this._loading = Lib.request({
        url, method, headers, contentType,
        params: { ...this.config.params, ...sortParams, ...pageParams, ...params },
        responseType: 'json',
      }).then((res) => {
        this.data = rootProperty ? res[rootProperty] : res;
        this._total = totalProperty ? res[totalProperty] : this.data.length;
        if (this._sorter && !remoteSort) this._applySort();
        this._loaded = true;
        this.fire('load', { records: this.data });
        this.fire('refresh');
        this.fire('loadend', { success: true });
        return this.data;
      }, (e) => {
        this.fire('loadend', { success: false });
        throw e;
      }).finally(() => {
        this._loading = null;
      });
      return this._loading;
    }

    /** config.data で生成した、または load が完了していれば true */
    isLoaded() {
      return this._loaded;
    }

    /**
     * ソートして 1 ページ目に戻す。remoteSort なら sort/dir を付けて load、それ以外はローカルで並べ替え
     * @param {string} property @param {'ASC'|'DESC'} direction
     */
    sort(property, direction) {
      this._sorter = { property, direction };
      this._page = 1;
      if (this.config.remoteSort) return this.load();
      this._applySort();
      this.fire('refresh');
    }

    /** 指定ページ（1 始まり）へ。remotePaging なら page/limit を付けて load、それ以外はローカルで切り出し */
    loadPage(page) {
      this._page = page;
      if (this.config.remotePaging) return this.load();
      this.fire('refresh');
    }

    getPage() { return this._page; }

    /** pageSize が 0 なら 1 */
    getPageCount() {
      const { pageSize } = this.config;
      return pageSize ? Math.max(1, Math.ceil(this.getTotalCount() / pageSize)) : 1;
    }

    /** ローカルは全件数、リモートは totalProperty の値（未指定なら取得件数） */
    getTotalCount() {
      return this.config.remotePaging ? (this._total ?? this.data.length) : this.data.length;
    }

    _applySort() {
      const { property, direction } = this._sorter;
      const sign = direction === 'DESC' ? -1 : 1;
      this.data = [...this.data].sort((a, b) => {
        const x = a[property];
        const y = b[property];
        const r = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x < y ? -1 : x > y ? 1 : 0);
        return r * sign;
      });
    }
  }

  /**
   * フィールドの基底クラス（customElements には登録しない）
   *
   * config: { name, label, value, attrs }
   *   attrs: 入力要素へそのまま付ける属性。true は空文字属性、false / null は付けない
   * events: 'change' detail: { value, oldValue }（値が変わった時のみ。ユーザー操作・setValue とも）
   * class: 'webc-field' + 'webc-field-{種類}'
   */
  let fieldSeq = 0;

  class Field extends Component {
    static defaults = { name: null, label: null, value: null, attrs: {} };
    /** class 'webc-field-{kind}' に使う種類名 */
    static kind = '';
    /** true ならラベルを入力要素の後ろに置く */
    static labelAfter = false;

    onRender() {
      const { name, label, attrs } = this.config;
      this.classList.add('webc-field', `webc-field-${this.constructor.kind}`);
      const control = this._createControl();
      control.classList.add('webc-field-control');
      control.id = `webc-field-${++fieldSeq}`;
      if (name) control.name = name;
      for (const [key, v] of Object.entries(attrs)) {
        if (v === true) control.setAttribute(key, '');
        else if (v != null && v !== false) control.setAttribute(key, String(v));
      }
      control.addEventListener('change', (e) => {
        // ネイティブの change は外に出さず、detail 付きの change に置き換える
        e.stopPropagation();
        this._onControlChange();
      });
      this._control = control;

      const labelEl = label != null ? createEl('label', 'webc-field-label', label) : null;
      if (labelEl) labelEl.htmlFor = control.id;
      if (labelEl && !this.constructor.labelAfter) this.append(labelEl);
      this.append(control);
      if (labelEl && this.constructor.labelAfter) this.append(labelEl);
      this._writeControl(this.config.value);
    }

    getValue() { return this._control ? this._readControl() : this.config.value; }

    /** 値が変わった場合のみ 'change' を発火する */
    setValue(value) {
      const oldValue = this.getValue();
      if (value === oldValue) return;
      this.config.value = value;
      if (this._control) this._writeControl(value);
      this.fire('change', this._changeDetail(value, oldValue));
    }

    /** サブクラスが入力要素を生成する */
    _createControl() {}
    _readControl() { return this._control.value; }
    _writeControl(value) { this._control.value = value ?? ''; }
    _changeDetail(value, oldValue) { return { value, oldValue }; }

    /** ユーザー操作による native change */
    _onControlChange() {
      const oldValue = this.config.value;
      const value = this._readControl();
      if (value === oldValue) return;
      this.config.value = value;
      this.fire('change', this._changeDetail(value, oldValue));
    }
  }

  /** <input type> を包むテキスト系フィールド。値は文字列 */
  class Input extends Field {
    static defaults = { type: 'text', value: '' };
    static kind = 'input';

    _createControl() {
      const el = document.createElement('input');
      el.type = this.config.type;
      return el;
    }
  }

  /** <textarea> を包むフィールド。値は文字列 */
  class TextArea extends Field {
    static defaults = { rows: 3, value: '' };
    static kind = 'textarea';

    _createControl() {
      const el = document.createElement('textarea');
      el.rows = this.config.rows;
      return el;
    }
  }

  /** チェックボックス。値は true/false */
  class Checkbox extends Field {
    static defaults = { value: false };
    static kind = 'checkbox';
    static labelAfter = true;

    _createControl() {
      const el = document.createElement('input');
      el.type = 'checkbox';
      return el;
    }

    _readControl() { return this._control.checked; }
    _writeControl(value) { this._control.checked = !!value; }
  }

  /**
   * ラジオボタン 1 つ。値は true/false（チェック状態）。送信値は inputValue
   * 同じ name の Radio でグループになる（ネイティブの挙動）
   */
  class Radio extends Checkbox {
    static defaults = { value: false, inputValue: 'on' };
    static kind = 'radio';

    _createControl() {
      const el = document.createElement('input');
      el.type = 'radio';
      el.value = this.config.inputValue;
      return el;
    }

    /** グループの他メンバーが選ばれて外れた時は change が来ず config.value が古いままなので、常に false からの変化とみなす */
    _onControlChange() {
      this.config.value = false;
      super._onControlChange();
    }
  }

  /** スイッチ（Checkbox に role="switch"）。値は true/false */
  class Switch extends Checkbox {
    static kind = 'switch';

    _createControl() {
      const el = super._createControl();
      el.setAttribute('role', 'switch');
      return el;
    }
  }

  /**
   * ボタン型の単一選択（Radio と同じ定義。ラジオを隠しラベルをボタンとして表示）
   * 同じ name の ToggleButton でグループになる
   */
  class ToggleButton extends Radio {
    static kind = 'togglebutton';
  }

  /**
   * ネイティブ <select>（appearance: base-select）を包むドロップダウン
   *
   * config: { name, label, attrs, valueField, displayField, value, store }
   * events: 'change' detail: { value, oldValue, record }
   * store の 'refresh' で option を再構築し、現在値で選択を同期する
   * 値の型を保つため、値は select からではなく config.value で保持する
   */
  class DropDown extends Field {
    static defaults = { valueField: 'value', displayField: 'text', value: null, store: null };
    static kind = 'dropdown';

    onRender() {
      this.classList.add('webc-dropdown');
      super.onRender();
    }

    getValue() { return this.config.value; }

    _createControl() {
      this._select = document.createElement('select');
      this._select.className = 'webc-dropdown-select';
      this._onStoreRefresh = () => this._buildOptions();
      this.config.store.on('refresh', this._onStoreRefresh);
      this._buildOptions();
      return this._select;
    }

    _writeControl() { this._syncSelect(); }

    _changeDetail(value, oldValue) {
      return { value, oldValue, record: this.config.store.findBy(this.config.valueField, value) };
    }

    _onControlChange() {
      this.setValue(this.config.store.getAt(this._select.selectedIndex)[this.config.valueField]);
    }

    /** store からリスナーを外してから Component の destroy を行う */
    destroy() {
      if (this._onStoreRefresh) this.config.store.off('refresh', this._onStoreRefresh);
      super.destroy();
    }

    _buildOptions() {
      const { store, displayField, valueField } = this.config;
      this._select.replaceChildren(...store.getData().map((record) => {
        const option = document.createElement('option');
        option.className = 'webc-dropdown-option';
        option.value = String(record[valueField]);
        option.textContent = record[displayField];
        return option;
      }));
      this._syncSelect();
    }

    _syncSelect() {
      const { store, valueField, value } = this.config;
      this._select.selectedIndex = store.getData().findIndex((r) => r[valueField] === value);
    }
  }

  /**
   * <table> ベースのデータグリッド
   *
   * config: { store, columns: [{ text, dataIndex, width, sortable, renderer }], emptyText, loadingText, paging }
   * events: 'rowclick' detail: { record, index } / 'selectionchange' detail: { record }
   */
  class Grid extends Component {
    static defaults = { store: null, columns: [], emptyText: 'データがありません', loadingText: '読み込み中…', paging: false };

    onRender() {
      const { store, columns, emptyText, loadingText, paging } = this.config;
      this.classList.add('webc-grid');
      this._selected = null;
      this._sortState = null;

      this._headers = columns.map((col) => {
        const th = createEl('th', 'webc-grid-header', col.text);
        if (col.width != null) th.style.width = typeof col.width === 'number' ? `${col.width}px` : col.width;
        if (col.sortable !== false) {
          th.classList.add('is-sortable');
          th.addEventListener('click', () => this._sortBy(col, th));
        }
        return th;
      });
      const headRow = document.createElement('tr');
      headRow.append(...this._headers);
      const thead = document.createElement('thead');
      thead.append(headRow);
      this._tbody = document.createElement('tbody');
      const table = createEl('table', 'webc-grid-table');
      table.append(thead, this._tbody);
      const body = createEl('div', 'webc-grid-body');
      body.append(table);

      this._empty = createEl('div', 'webc-grid-empty', emptyText);
      this._loadingEl = createEl('div', 'webc-grid-loading', loadingText);
      this._loadingEl.hidden = true;
      this.append(body, this._empty, this._loadingEl);
      if (paging) this.append(this._buildPaging());

      this._storeListeners = {
        beforeload: () => { this._loadingEl.hidden = false; },
        loadend: () => { this._loadingEl.hidden = true; },
        refresh: () => this._refresh(),
      };
      for (const [name, fn] of Object.entries(this._storeListeners)) store.on(name, fn);
      this._renderRows();
    }

    /** 選択中のレコード、無ければ null */
    getSelection() { return this._selected ?? null; }

    /** store からリスナーを外してから Component の destroy を行う */
    destroy() {
      for (const [name, fn] of Object.entries(this._storeListeners ?? {})) this.config.store.off(name, fn);
      super.destroy();
    }

    _sortBy(col, th) {
      const s = this._sortState;
      const direction = s && s.dataIndex === col.dataIndex && s.direction === 'ASC' ? 'DESC' : 'ASC';
      this._sortState = { dataIndex: col.dataIndex, direction };
      for (const h of this._headers) h.classList.remove('is-sort-asc', 'is-sort-desc');
      th.classList.add(direction === 'ASC' ? 'is-sort-asc' : 'is-sort-desc');
      this.config.store.sort(col.dataIndex, direction);
    }

    /** 表示レコードが変わった時：選択を解除して再描画 */
    _refresh() {
      if (this._selected) {
        this._selected = null;
        this.fire('selectionchange', { record: null });
      }
      this._renderRows();
    }

    _renderRows() {
      const { store, columns } = this.config;
      const records = store.getData();
      this._tbody.replaceChildren(...records.map((record, index) => {
        const tr = createEl('tr', 'webc-grid-row');
        for (const col of columns) {
          const td = createEl('td', 'webc-grid-cell');
          const value = record[col.dataIndex];
          const content = col.renderer ? col.renderer(value, record) : value;
          if (content instanceof Node) td.append(content);
          else td.textContent = content ?? '';
          tr.append(td);
        }
        tr.addEventListener('click', () => this._onRowClick(tr, record, index));
        return tr;
      }));
      this._empty.hidden = records.length > 0;
      if (this._pagingInfo) this._updatePaging();
    }

    _onRowClick(tr, record, index) {
      this.fire('rowclick', { record, index });
      if (this._selected === record) return;
      this._tbody.querySelector('.is-selected')?.classList.remove('is-selected');
      tr.classList.add('is-selected');
      this._selected = record;
      this.fire('selectionchange', { record });
    }

    _buildPaging() {
      const { store } = this.config;
      const button = (name, label, onClick) => {
        const b = createEl('button', `webc-grid-paging-${name}`, label);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
      };
      this._pagingButtons = {
        first: button('first', '«', () => store.loadPage(1)),
        prev: button('prev', '‹', () => store.loadPage(store.getPage() - 1)),
        next: button('next', '›', () => store.loadPage(store.getPage() + 1)),
        last: button('last', '»', () => store.loadPage(store.getPageCount())),
      };
      this._pagingInfo = createEl('span', 'webc-grid-paging-info');
      const { first, prev, next, last } = this._pagingButtons;
      const bar = createEl('div', 'webc-grid-paging');
      bar.append(first, prev, this._pagingInfo, next, last, button('reload', '⟳', () => store.load()));
      return bar;
    }

    _updatePaging() {
      const { store } = this.config;
      const page = store.getPage();
      const count = store.getPageCount();
      const { first, prev, next, last } = this._pagingButtons;
      this._pagingInfo.textContent = `${page} / ${count}`;
      first.disabled = prev.disabled = page <= 1;
      next.disabled = last.disabled = page >= count;
    }
  }

  /**
   * タブパネル / メニューパネル
   * 幅に応じて 通常 → アイコンのみ（is-icon-only）→ ドロワー（is-drawer）に切り替える
   *
   * config: { items: [{ id, text, icon, content }], active, tabPosition, iconOnlyWidth, drawerWidth }
   *   icon:    string（textContent）| Node
   *   content: string（querySelector）| Element。body 内へ移動する
   * events: 'tabchange' detail: { item, oldItem }
   */
  class TabPanel extends Component {
    static defaults = { items: [], active: null, tabPosition: 'top', iconOnlyWidth: null, drawerWidth: null };

    onRender() {
      const { items, tabPosition } = this.config;
      if (this.config.active == null && items.length) this.config.active = items[0].id;
      this.classList.add('webc-tabpanel', `is-pos-${tabPosition}`);

      const menu = createEl('button', 'webc-tabpanel-menu');
      menu.type = 'button';
      menu.addEventListener('click', () => this.classList.toggle('is-drawer-open'));

      const nav = createEl('nav', 'webc-tabpanel-nav');
      nav.setAttribute('role', 'tablist');
      const backdrop = createEl('div', 'webc-tabpanel-backdrop');
      backdrop.addEventListener('click', () => this._closeDrawer());
      const body = createEl('div', 'webc-tabpanel-body');

      this._tabs = new Map();
      this._contents = new Map();
      for (const item of items) {
        const tab = createEl('button', 'webc-tabpanel-tab');
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-label', item.text);
        if (item.icon != null) {
          const icon = createEl('span', 'webc-tabpanel-icon');
          if (item.icon instanceof Node) icon.append(item.icon);
          else icon.textContent = item.icon;
          tab.append(icon);
        }
        tab.append(createEl('span', 'webc-tabpanel-text', item.text));
        tab.addEventListener('click', () => {
          this.setActive(item.id);
          this._closeDrawer();
        });
        nav.append(tab);
        this._tabs.set(item.id, tab);

        const content = typeof item.content === 'string' ? document.querySelector(item.content) : item.content;
        if (content) {
          content.classList.add('webc-tabpanel-content');
          content.setAttribute('role', 'tabpanel');
          body.append(content);
          this._contents.set(item.id, content);
        }
      }
      this.append(menu, nav, backdrop, body);
      this._syncActive();

      this._onKeydown = (e) => { if (e.key === 'Escape') this._closeDrawer(); };
      document.addEventListener('keydown', this._onKeydown);
      if (global.ResizeObserver) {
        this._observer = new global.ResizeObserver((entries) => this._updateMode(entries[0].contentRect.width));
        this._observer.observe(this);
      }
    }

    /** 現在のアクティブな item の id */
    getActive() { return this.config.active; }

    /** 変化した場合のみ 'tabchange' を発火。存在しない id は無視 */
    setActive(id) {
      const { items, active } = this.config;
      const item = items.find((i) => i.id === id);
      if (!item || id === active) return;
      const oldItem = items.find((i) => i.id === active) ?? null;
      this.config.active = id;
      if (this._tabs) this._syncActive();
      this.fire('tabchange', { item, oldItem });
    }

    /** ResizeObserver と document のリスナーを外してから Component の destroy を行う */
    destroy() {
      this._observer?.disconnect();
      if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
      super.destroy();
    }

    _syncActive() {
      const { active } = this.config;
      for (const [id, tab] of this._tabs) {
        tab.classList.toggle('is-active', id === active);
        tab.setAttribute('aria-selected', String(id === active));
      }
      for (const [id, content] of this._contents) content.hidden = id !== active;
    }

    _updateMode(width) {
      const { iconOnlyWidth, drawerWidth } = this.config;
      const drawer = drawerWidth != null && width < drawerWidth;
      const iconOnly = !drawer && iconOnlyWidth != null && width < iconOnlyWidth;
      this.classList.toggle('is-drawer', drawer);
      this.classList.toggle('is-icon-only', iconOnly);
      if (!drawer) this._closeDrawer();
    }

    _closeDrawer() {
      this.classList.remove('is-drawer-open');
    }
  }

  /** class と textContent を指定して要素を作る */
  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  customElements.define('webc-input', Input);
  customElements.define('webc-textarea', TextArea);
  customElements.define('webc-checkbox', Checkbox);
  customElements.define('webc-radio', Radio);
  customElements.define('webc-switch', Switch);
  customElements.define('webc-togglebutton', ToggleButton);
  customElements.define('webc-dropdown', DropDown);
  customElements.define('webc-grid', Grid);
  customElements.define('webc-tabpanel', TabPanel);

  global.WebC = {
    Component,
    Lib,
    data: { Store },
    field: { Field, Input, TextArea, Checkbox, Radio, Switch, ToggleButton, DropDown },
    grid: { Grid },
    panel: { TabPanel },
  };
})(window);
