'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/items';

const ITEMS = () => [
  { id: 10, name: 'x' },
  { id: 11, name: 'y' },
];

// Store が返す配列は webc.js の realm なので Array.from で Node 側の配列にして比較する
const plain = (arr) => Array.from(arr, (r) => ({ ...r }));

test('Store_isLoaded_true_when_constructed_with_data', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: ITEMS() });

  assert.equal(store.isLoaded(), true);
});

test('Store_isLoaded_false_when_constructed_without_data', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ url: URL_BASE });

  assert.equal(store.isLoaded(), false);
});

test('Store_isLoaded_becomes_true_after_load', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });

  await store.load();

  assert.equal(store.isLoaded(), true);
});

test('Store_load_requests_url_with_GET_and_merged_params', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: [] }));
  const store = new WebC.data.Store({ url: URL_BASE, params: { a: '1', b: '2' } });

  await store.load({ b: '3' });

  const u = new URL(calls[0].url);
  assert.equal(u.origin + u.pathname, URL_BASE);
  assert.equal(u.searchParams.get('a'), '1');
  assert.equal(u.searchParams.get('b'), '3');
  assert.equal(calls[0].init.method, 'GET');
});

test('Store_load_posts_with_config_headers_and_contentType', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: [] }));
  const store = new WebC.data.Store({
    url: URL_BASE,
    method: 'POST',
    headers: { 'X-T': 't' },
    contentType: 'form',
  });

  await store.load({ q: '1' });

  const { init } = calls[0];
  assert.equal(init.method, 'POST');
  assert.equal(String(init.body), 'q=1');
  assert.equal({ ...init.headers }['X-T'], 't');
});

test('Store_load_parses_json_even_when_Lib_default_responseType_is_text', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  WebC.Lib.defaults.responseType = 'text';
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });

  const records = await store.load();

  assert.deepEqual(plain(records), ITEMS());
  assert.equal(store.getCount(), 2);
});

test('Store_load_uses_whole_response_as_records_when_rootProperty_is_null', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE, rootProperty: null });

  await store.load();

  assert.deepEqual(plain(store.getData()), ITEMS());
});

test('Store_load_extracts_records_from_rootProperty', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: { items: ITEMS(), total: 2 } }));
  const store = new WebC.data.Store({ url: URL_BASE, rootProperty: 'items' });

  await store.load();

  assert.deepEqual(plain(store.getData()), ITEMS());
  assert.equal(store.getCount(), 2);
});

test('Store_load_replaces_existing_data', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE, data: [{ id: 9, name: 'old' }] });

  await store.load();

  assert.equal(store.getCount(), 2);
  assert.equal(store.findBy('id', 9), null);
  assert.deepEqual(plain([store.findBy('id', 10)]), [ITEMS()[0]]);
});

test('Store_load_resolves_with_records', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });

  const records = await store.load();

  assert.deepEqual(plain(records), ITEMS());
});

test('Store_load_fires_load_event_with_records_after_data_is_replaced', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });
  const seen = [];
  store.on('load', (e) => seen.push({ count: store.getCount(), records: plain(e.detail.records) }));

  await store.load();

  assert.deepEqual(seen, [{ count: 2, records: ITEMS() }]);
});

test('Store_load_returns_same_promise_while_in_flight', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });

  const first = store.load();
  const second = store.load();
  await first;

  assert.strictEqual(second, first);
  assert.equal(calls.length, 1);
});

test('Store_load_fetches_again_after_completion', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });

  await store.load();
  await store.load();

  assert.equal(calls.length, 2);
});

test('Store_load_rejects_and_does_not_fire_load_when_request_fails', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ ok: false, status: 500, body: 'error' }));
  const store = new WebC.data.Store({ url: URL_BASE });
  let loadCount = 0;
  store.on('load', () => { loadCount += 1; });

  await assert.rejects(store.load(), (err) => err.status === 500);

  assert.equal(loadCount, 0);
});
