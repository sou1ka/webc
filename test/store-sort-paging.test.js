'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/rows';

// 元の並び: ids [1,2,3,4,5]
// name 昇順: ids [4,2,5,3,1] / n 降順: ids [1,3,5,2,4]
const RECORDS5 = () => [
  { id: 1, name: 'e', n: 5 },
  { id: 2, name: 'b', n: 2 },
  { id: 3, name: 'd', n: 4 },
  { id: 4, name: 'a', n: 1 },
  { id: 5, name: 'c', n: 3 },
];

// Store が返す配列は webc.js の realm なので Array.from で Node 側の配列にして比較する
const ids = (store) => Array.from(store.getData(), (r) => r.id);

test('Store_sort_ASC_orders_strings_with_localeCompare', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5() });

  store.sort('name', 'ASC');

  assert.deepEqual(ids(store), [4, 2, 5, 3, 1]);
});

test('Store_sort_ASC_orders_numbers_by_magnitude', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: [{ v: 10 }, { v: 2 }, { v: 1 }] });

  store.sort('v', 'ASC');

  assert.deepEqual(Array.from(store.getData(), (r) => r.v), [1, 2, 10]);
});

test('Store_sort_DESC_orders_numbers_by_magnitude', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: [{ v: 10 }, { v: 2 }, { v: 1 }] });

  store.sort('v', 'DESC');

  assert.deepEqual(Array.from(store.getData(), (r) => r.v), [10, 2, 1]);
});

test('Store_sort_local_fires_refresh_and_does_not_fetch', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: [] }));
  const store = new WebC.data.Store({ url: URL_BASE, data: RECORDS5() });
  let refreshCount = 0;
  store.on('refresh', () => { refreshCount += 1; });

  store.sort('name', 'ASC');

  assert.equal(refreshCount, 1);
  assert.equal(calls.length, 0);
});

test('Store_sort_resets_page_to_1', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });
  store.loadPage(2);

  store.sort('name', 'ASC');

  assert.equal(store.getPage(), 1);
});

test('Store_getData_without_paging_returns_all_records', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5() });

  assert.deepEqual(ids(store), [1, 2, 3, 4, 5]);
});

test('Store_getPage_defaults_to_1', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  assert.equal(store.getPage(), 1);
});

test('Store_loadPage_local_returns_slice_for_page', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  store.loadPage(2);

  assert.equal(store.getPage(), 2);
  assert.deepEqual(ids(store), [3, 4]);
});

test('Store_loadPage_local_last_page_may_be_partial', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  store.loadPage(3);

  assert.deepEqual(ids(store), [5]);
});

test('Store_loadPage_local_fires_refresh_and_does_not_fetch', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: [] }));
  const store = new WebC.data.Store({ url: URL_BASE, data: RECORDS5(), pageSize: 2 });
  let refreshCount = 0;
  store.on('refresh', () => { refreshCount += 1; });

  store.loadPage(2);

  assert.equal(refreshCount, 1);
  assert.equal(calls.length, 0);
});

test('Store_sort_local_then_loadPage_slices_sorted_order', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  store.sort('n', 'DESC');

  assert.deepEqual(ids(store), [1, 3]);
  store.loadPage(2);
  assert.deepEqual(ids(store), [5, 2]);
});

test('Store_getPageCount_rounds_up_partial_last_page', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  assert.equal(store.getPageCount(), 3);
});

test('Store_getPageCount_exact_multiple_gives_exact_pages', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5().slice(0, 4), pageSize: 2 });

  assert.equal(store.getPageCount(), 2);
});

test('Store_getPageCount_is_1_when_pageSize_is_0', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 0 });

  assert.equal(store.getPageCount(), 1);
});

test('Store_getTotalCount_local_returns_all_records_count', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  assert.equal(store.getTotalCount(), 5);
});

test('Store_findBy_searches_all_records_not_only_current_page', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: RECORDS5(), pageSize: 2 });

  const found = store.findBy('id', 5);

  assert.equal(found.id, 5);
});

test('Store_sort_remote_calls_load_with_sort_and_dir_params', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remoteSort: true });

  await store.sort('name', 'DESC');

  assert.equal(calls.length, 1);
  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('sort'), 'name');
  assert.equal(u.searchParams.get('dir'), 'DESC');
});

test('Store_sort_remote_resolves_with_loaded_records', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remoteSort: true });

  const records = await store.sort('name', 'ASC');

  assert.deepEqual(Array.from(records, (r) => r.id), [1, 2, 3, 4, 5]);
});

test('Store_sort_remote_resets_page_to_1', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remoteSort: true, remotePaging: true, pageSize: 2 });
  await store.loadPage(3);

  await store.sort('name', 'ASC');

  assert.equal(store.getPage(), 1);
});

test('Store_load_includes_sort_and_dir_after_remote_sort', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remoteSort: true });
  await store.sort('name', 'ASC');

  await store.load();

  const u = new URL(calls[1].url);
  assert.equal(u.searchParams.get('sort'), 'name');
  assert.equal(u.searchParams.get('dir'), 'ASC');
});

test('Store_load_has_no_sort_param_before_any_remote_sort', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remoteSort: true });

  await store.load();

  assert.equal(new URL(calls[0].url).searchParams.has('sort'), false);
});

test('Store_loadPage_remote_calls_load_with_page_and_limit_params', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remotePaging: true, pageSize: 2 });

  await store.loadPage(3);

  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('page'), '3');
  assert.equal(u.searchParams.get('limit'), '2');
  assert.equal(store.getPage(), 3);
});

test('Store_load_has_no_page_or_limit_params_when_pageSize_is_0', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remotePaging: true, pageSize: 0 });

  await store.load();

  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.has('page'), false);
  assert.equal(u.searchParams.has('limit'), false);
});

test('Store_remote_paging_keeps_fetched_data_without_slicing', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remotePaging: true, pageSize: 2 });

  await store.loadPage(2);

  assert.deepEqual(ids(store), [1, 2, 3, 4, 5]);
});

test('Store_getTotalCount_remote_uses_totalProperty', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: { rows: RECORDS5(), total: 42 } }));
  const store = new WebC.data.Store({
    url: URL_BASE, remotePaging: true, pageSize: 10, rootProperty: 'rows', totalProperty: 'total',
  });

  await store.loadPage(1);

  assert.equal(store.getTotalCount(), 42);
  assert.equal(store.getPageCount(), 5);
});

test('Store_getTotalCount_remote_falls_back_to_fetched_count_without_totalProperty', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: RECORDS5() }));
  const store = new WebC.data.Store({ url: URL_BASE, remotePaging: true, pageSize: 2 });

  await store.loadPage(1);

  assert.equal(store.getTotalCount(), 5);
});
