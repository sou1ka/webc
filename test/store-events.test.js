'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/rows';

const ITEMS = () => [{ id: 1 }, { id: 2 }];

test('Store_load_fires_beforeload_before_request', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const order = [];
  mockFetch(dom.window, () => {
    order.push('fetch');
    return makeResponse({ body: ITEMS() });
  });
  const store = new WebC.data.Store({ url: URL_BASE });
  store.on('beforeload', () => order.push('beforeload'));

  await store.load();

  assert.deepEqual(order, ['beforeload', 'fetch']);
});

test('Store_load_fires_beforeload_once_while_in_flight', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });
  let beforeloadCount = 0;
  store.on('beforeload', () => { beforeloadCount += 1; });

  const first = store.load();
  store.load();
  await first;

  assert.equal(beforeloadCount, 1);
});

test('Store_load_fires_loadend_with_success_true_after_load', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });
  const events = [];
  store.on('load', () => events.push('load'));
  store.on('loadend', (e) => events.push(['loadend', e.detail.success]));

  await store.load();

  assert.deepEqual(events, ['load', ['loadend', true]]);
});

test('Store_load_fires_loadend_with_success_false_when_request_fails', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ ok: false, status: 500, body: 'error' }));
  const store = new WebC.data.Store({ url: URL_BASE });
  const events = [];
  store.on('beforeload', () => events.push('beforeload'));
  store.on('loadend', (e) => events.push(['loadend', e.detail.success]));

  await assert.rejects(store.load(), (err) => err.status === 500);

  assert.deepEqual(events, ['beforeload', ['loadend', false]]);
});

test('Store_load_fires_refresh_after_records_are_replaced', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: ITEMS() }));
  const store = new WebC.data.Store({ url: URL_BASE });
  const seen = [];
  store.on('refresh', () => seen.push(store.getCount()));

  await store.load();

  assert.deepEqual(seen, [2]);
});

test('Store_load_does_not_fire_refresh_when_request_fails', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ ok: false, status: 500, body: 'error' }));
  const store = new WebC.data.Store({ url: URL_BASE });
  let refreshCount = 0;
  store.on('refresh', () => { refreshCount += 1; });

  await assert.rejects(store.load(), (err) => err.status === 500);

  assert.equal(refreshCount, 0);
});
