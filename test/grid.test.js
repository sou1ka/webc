'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/rows';

const RECORDS = () => [
  { id: 1, name: 'Carol', age: 30 },
  { id: 2, name: 'Alice', age: 25 },
  { id: 3, name: 'Bob', age: 35 },
];

const RECORDS5 = () => [
  { id: 1, name: 'e', age: 5 },
  { id: 2, name: 'b', age: 2 },
  { id: 3, name: 'd', age: 4 },
  { id: 4, name: 'a', age: 1 },
  { id: 5, name: 'c', age: 3 },
];

const COLUMNS = () => [
  { text: '名前', dataIndex: 'name', width: 120 },
  { text: '年齢', dataIndex: 'age', width: '30%' },
  { text: '操作', dataIndex: 'id', sortable: false },
];

/** records: null なら未読込の Store（url 付きで load する想定） */
function setup({ env = createWebC(), records = RECORDS(), storeConfig = {}, gridConfig = {} } = {}) {
  const { WebC } = env;
  const store = new WebC.data.Store({ data: records, ...storeConfig });
  const grid = new WebC.grid.Grid({ renderTo: '#list', store, columns: COLUMNS(), ...gridConfig });
  return { ...env, store, grid };
}

const headers = (grid) => [...grid.querySelectorAll('th.webc-grid-header')];
const rows = (grid) => [...grid.querySelectorAll('tr.webc-grid-row')];
const firstCells = (grid) => rows(grid).map((tr) => tr.querySelector('td').textContent);
const pick = (grid, selector) => grid.querySelector(selector);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

test('Grid_is_registered_as_webc_grid', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-grid'), WebC.grid.Grid);
});

test('Grid_element_has_webc_grid_and_cls_classes', (t) => {
  const { dom, grid } = setup({ gridConfig: { cls: 'user-grid' } });
  t.after(() => dom.window.close());

  assert.equal(grid.classList.contains('webc-grid'), true);
  assert.equal(grid.classList.contains('user-grid'), true);
});

test('Grid_renders_header_per_column_with_text', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  assert.deepEqual(headers(grid).map((th) => th.textContent), ['名前', '年齢', '操作']);
});

test('Grid_header_width_number_becomes_px_and_string_is_kept', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  const ths = headers(grid);
  assert.equal(ths[0].style.width, '120px');
  assert.equal(ths[1].style.width, '30%');
});

test('Grid_renders_row_per_record_with_cell_per_column', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  const trs = rows(grid);
  assert.equal(trs.length, 3);
  assert.equal(trs[0].querySelectorAll('td.webc-grid-cell').length, 3);
  assert.equal(trs[0].querySelectorAll('td')[1].textContent, '30');
  assert.deepEqual(firstCells(grid), ['Carol', 'Alice', 'Bob']);
});

test('Grid_cell_renderer_string_is_set_as_text_not_html', (t) => {
  const columns = [{ text: 'x', dataIndex: 'name', renderer: () => '<b>bold</b>' }];
  const { dom, grid } = setup({ gridConfig: { columns } });
  t.after(() => dom.window.close());

  const td = rows(grid)[0].querySelector('td');
  assert.equal(td.textContent, '<b>bold</b>');
  assert.equal(td.querySelector('b'), null);
});

test('Grid_cell_renderer_node_is_appended', (t) => {
  const env = createWebC();
  t.after(() => env.dom.window.close());
  const columns = [{
    text: 'x',
    dataIndex: 'name',
    renderer: () => {
      const span = env.document.createElement('span');
      span.className = 'custom';
      return span;
    },
  }];
  const { grid } = setup({ env, gridConfig: { columns } });

  assert.notEqual(rows(grid)[0].querySelector('td span.custom'), null);
});

test('Grid_cell_renderer_receives_value_and_record', (t) => {
  const calls = [];
  const columns = [{
    text: 'x',
    dataIndex: 'age',
    renderer: (value, record) => { calls.push([value, record]); return ''; },
  }];
  const { dom, store } = setup({ gridConfig: { columns } });
  t.after(() => dom.window.close());

  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 30);
  assert.strictEqual(calls[0][1], store.getAt(0));
});

test('Grid_empty_text_is_shown_when_no_records', (t) => {
  const { dom, grid } = setup({ records: [] });
  t.after(() => dom.window.close());

  const empty = pick(grid, 'div.webc-grid-empty');
  assert.equal(empty.hidden, false);
  assert.equal(empty.textContent, 'データがありません');
  assert.equal(rows(grid).length, 0);
});

test('Grid_empty_is_hidden_when_records_exist', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  assert.equal(pick(grid, 'div.webc-grid-empty').hidden, true);
});

test('Grid_uses_custom_emptyText', (t) => {
  const { dom, grid } = setup({ records: [], gridConfig: { emptyText: 'なし' } });
  t.after(() => dom.window.close());

  assert.equal(pick(grid, 'div.webc-grid-empty').textContent, 'なし');
});

test('Grid_loading_is_visible_only_while_store_is_loading', async (t) => {
  const { dom, store, grid } = setup({
    records: null, storeConfig: { url: URL_BASE }, gridConfig: { loadingText: '...' },
  });
  t.after(() => dom.window.close());
  const pending = deferred();
  mockFetch(dom.window, () => pending.promise);
  const loading = pick(grid, 'div.webc-grid-loading');
  assert.equal(loading.hidden, true);

  const p = store.load();
  assert.equal(loading.hidden, false);
  assert.equal(loading.textContent, '...');

  pending.resolve(makeResponse({ body: RECORDS() }));
  await p;

  assert.equal(loading.hidden, true);
});

test('Grid_loading_is_hidden_after_failed_load', async (t) => {
  const { dom, store, grid } = setup({ records: null, storeConfig: { url: URL_BASE } });
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ ok: false, status: 500, body: 'error' }));

  await assert.rejects(store.load(), (err) => err.status === 500);

  assert.equal(pick(grid, 'div.webc-grid-loading').hidden, true);
});

test('Grid_refresh_rerenders_rows_after_sort', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());

  store.sort('name', 'ASC');

  assert.deepEqual(firstCells(grid), ['Alice', 'Bob', 'Carol']);
});

test('Grid_refresh_rerenders_rows_after_load', async (t) => {
  const { dom, store, grid } = setup({ records: null, storeConfig: { url: URL_BASE } });
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: RECORDS() }));

  await store.load();

  assert.deepEqual(firstCells(grid), ['Carol', 'Alice', 'Bob']);
});

test('Grid_refresh_updates_empty_visibility_after_load', async (t) => {
  const { dom, store, grid } = setup({ records: null, storeConfig: { url: URL_BASE } });
  t.after(() => dom.window.close());
  const empty = pick(grid, 'div.webc-grid-empty');
  assert.equal(empty.hidden, false);
  mockFetch(dom.window, () => makeResponse({ body: RECORDS() }));

  await store.load();

  assert.equal(empty.hidden, true);
});

test('Grid_header_click_sorts_ASC_and_marks_header', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());

  headers(grid)[0].click();

  assert.deepEqual(firstCells(grid), ['Alice', 'Bob', 'Carol']);
  const [name, age, op] = headers(grid);
  assert.equal(name.classList.contains('is-sortable'), true);
  assert.equal(name.classList.contains('is-sort-asc'), true);
  assert.equal(name.classList.contains('is-sort-desc'), false);
  assert.equal(age.classList.contains('is-sort-asc'), false);
  assert.equal(op.classList.contains('is-sort-asc'), false);
  assert.equal(store.getAt(0).name, 'Alice');
});

test('Grid_header_click_on_same_column_toggles_to_DESC', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  headers(grid)[0].click();
  headers(grid)[0].click();

  assert.deepEqual(firstCells(grid), ['Carol', 'Bob', 'Alice']);
  assert.equal(headers(grid)[0].classList.contains('is-sort-desc'), true);
  assert.equal(headers(grid)[0].classList.contains('is-sort-asc'), false);
});

test('Grid_header_click_on_other_column_starts_ASC', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());

  headers(grid)[0].click();
  headers(grid)[0].click();
  headers(grid)[1].click();

  const [name, age] = headers(grid);
  assert.equal(age.classList.contains('is-sort-asc'), true);
  assert.equal(name.classList.contains('is-sort-asc'), false);
  assert.equal(name.classList.contains('is-sort-desc'), false);
  assert.deepEqual(firstCells(grid), ['Alice', 'Carol', 'Bob']);
});

test('Grid_header_click_on_unsortable_column_does_not_sort', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  const op = headers(grid)[2];
  let refreshCount = 0;
  store.on('refresh', () => { refreshCount += 1; });

  op.click();

  assert.equal(op.classList.contains('is-sortable'), false);
  assert.equal(op.classList.contains('is-sort-asc'), false);
  assert.equal(refreshCount, 0);
  assert.deepEqual(firstCells(grid), ['Carol', 'Alice', 'Bob']);
});

test('Grid_header_click_remote_sort_requests_sort_params', async (t) => {
  const { dom, grid } = setup({ records: null, storeConfig: { url: URL_BASE, remoteSort: true } });
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS() }));

  headers(grid)[1].click();
  await flush();

  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('sort'), 'age');
  assert.equal(u.searchParams.get('dir'), 'ASC');
});

test('Grid_row_click_fires_rowclick_with_record_and_display_index', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  const details = [];
  grid.on('rowclick', (e) => details.push(e.detail));

  rows(grid)[1].click();

  assert.equal(details.length, 1);
  assert.strictEqual(details[0].record, store.getAt(1));
  assert.equal(details[0].index, 1);
});

test('Grid_row_click_index_follows_sorted_display_order', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  store.sort('age', 'DESC');
  const details = [];
  grid.on('rowclick', (e) => details.push(e.detail));

  rows(grid)[0].click();

  assert.equal(details[0].index, 0);
  assert.strictEqual(details[0].record, store.getAt(0));
  assert.equal(details[0].record.name, 'Bob');
});

test('Grid_row_click_selects_row_and_fires_selectionchange', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  const events = [];
  grid.on('selectionchange', (e) => events.push(e.detail.record));
  assert.equal(grid.getSelection(), null);

  rows(grid)[2].click();

  assert.equal(rows(grid)[2].classList.contains('is-selected'), true);
  assert.equal(rows(grid)[0].classList.contains('is-selected'), false);
  assert.strictEqual(grid.getSelection(), store.getAt(2));
  assert.equal(events.length, 1);
  assert.strictEqual(events[0], store.getAt(2));
});

test('Grid_row_click_on_selected_row_keeps_selection_without_selectionchange', (t) => {
  const { dom, grid } = setup();
  t.after(() => dom.window.close());
  rows(grid)[0].click();
  let selectionCount = 0;
  let rowclickCount = 0;
  grid.on('selectionchange', () => { selectionCount += 1; });
  grid.on('rowclick', () => { rowclickCount += 1; });

  rows(grid)[0].click();

  assert.equal(selectionCount, 0);
  assert.equal(rowclickCount, 1);
  assert.equal(rows(grid)[0].classList.contains('is-selected'), true);
});

test('Grid_row_click_on_other_row_moves_selection', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  rows(grid)[0].click();
  const events = [];
  grid.on('selectionchange', (e) => events.push(e.detail.record));

  rows(grid)[1].click();

  assert.equal(rows(grid)[0].classList.contains('is-selected'), false);
  assert.equal(rows(grid)[1].classList.contains('is-selected'), true);
  assert.strictEqual(grid.getSelection(), store.getAt(1));
  assert.strictEqual(events[0], store.getAt(1));
});

test('Grid_refresh_clears_selection_and_fires_selectionchange_with_null', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  rows(grid)[0].click();
  const events = [];
  grid.on('selectionchange', (e) => events.push(e.detail.record));

  store.sort('name', 'ASC');

  assert.equal(grid.getSelection(), null);
  assert.equal(rows(grid).some((tr) => tr.classList.contains('is-selected')), false);
  assert.deepEqual(events, [null]);
});

test('Grid_refresh_without_selection_does_not_fire_selectionchange', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  let selectionCount = 0;
  grid.on('selectionchange', () => { selectionCount += 1; });

  store.sort('name', 'ASC');

  assert.equal(selectionCount, 0);
});

test('Grid_paging_elements_exist_only_when_paging_enabled', (t) => {
  const withoutPaging = setup();
  t.after(() => withoutPaging.dom.window.close());
  assert.equal(pick(withoutPaging.grid, 'div.webc-grid-paging'), null);

  const withPaging = setup({ storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => withPaging.dom.window.close());
  const paging = pick(withPaging.grid, 'div.webc-grid-paging');
  assert.notEqual(paging, null);
  for (const name of ['first', 'prev', 'next', 'last', 'reload']) {
    assert.notEqual(paging.querySelector(`button.webc-grid-paging-${name}`), null);
  }
  assert.notEqual(paging.querySelector('span.webc-grid-paging-info'), null);
});

test('Grid_paging_info_shows_current_and_total_pages', (t) => {
  const { dom, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());

  assert.equal(pick(grid, '.webc-grid-paging-info').textContent, '1 / 3');
  assert.equal(rows(grid).length, 2);
});

test('Grid_paging_first_and_prev_disabled_on_first_page', (t) => {
  const { dom, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());

  assert.equal(pick(grid, '.webc-grid-paging-first').disabled, true);
  assert.equal(pick(grid, '.webc-grid-paging-prev').disabled, true);
  assert.equal(pick(grid, '.webc-grid-paging-next').disabled, false);
  assert.equal(pick(grid, '.webc-grid-paging-last').disabled, false);
});

test('Grid_paging_next_and_last_disabled_on_last_page', (t) => {
  const { dom, store, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());

  store.loadPage(3);

  assert.equal(pick(grid, '.webc-grid-paging-info').textContent, '3 / 3');
  assert.equal(pick(grid, '.webc-grid-paging-next').disabled, true);
  assert.equal(pick(grid, '.webc-grid-paging-last').disabled, true);
  assert.equal(pick(grid, '.webc-grid-paging-first').disabled, false);
  assert.equal(pick(grid, '.webc-grid-paging-prev').disabled, false);
});

test('Grid_paging_next_click_loads_next_page', (t) => {
  const { dom, store, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());

  pick(grid, '.webc-grid-paging-next').click();

  assert.equal(store.getPage(), 2);
  assert.equal(rows(grid).length, 2);
  assert.equal(pick(grid, '.webc-grid-paging-info').textContent, '2 / 3');
});

test('Grid_paging_prev_click_loads_previous_page', (t) => {
  const { dom, store, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());
  store.loadPage(2);

  pick(grid, '.webc-grid-paging-prev').click();

  assert.equal(store.getPage(), 1);
});

test('Grid_paging_last_click_loads_last_page', (t) => {
  const { dom, store, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());

  pick(grid, '.webc-grid-paging-last').click();

  assert.equal(store.getPage(), 3);
  assert.equal(rows(grid).length, 1);
});

test('Grid_paging_first_click_loads_first_page', (t) => {
  const { dom, store, grid } = setup({ records: RECORDS5(), storeConfig: { pageSize: 2 }, gridConfig: { paging: true } });
  t.after(() => dom.window.close());
  store.loadPage(3);

  pick(grid, '.webc-grid-paging-first').click();

  assert.equal(store.getPage(), 1);
  assert.equal(pick(grid, '.webc-grid-paging-info').textContent, '1 / 3');
});

test('Grid_paging_reload_click_calls_store_load', async (t) => {
  const { dom, grid } = setup({
    records: null, storeConfig: { url: URL_BASE, pageSize: 2 }, gridConfig: { paging: true },
  });
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS() }));

  pick(grid, '.webc-grid-paging-reload').click();
  await flush();

  assert.equal(calls.length, 1);
});

test('Grid_destroy_removes_element_and_store_listeners', (t) => {
  const { dom, store, grid } = setup();
  t.after(() => dom.window.close());
  const before = firstCells(grid);

  grid.destroy();
  store.sort('name', 'ASC');

  assert.equal(grid.parentNode, null);
  assert.deepEqual(firstCells(grid), before);
});
