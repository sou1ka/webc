'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/api';

// init.headers は webc.js の realm で作られるため、Node 側のオブジェクトに複製して比較する
const headersOf = (init) => ({ ...init.headers });

test('Lib_request_get_appends_params_as_query_string', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  return WebC.Lib.request({ url: URL_BASE, params: { a: '1', b: 'x y' } }).then(() => {
    const u = new URL(calls[0].url);
    assert.equal(u.origin + u.pathname, URL_BASE);
    assert.equal(u.searchParams.get('a'), '1');
    assert.equal(u.searchParams.get('b'), 'x y');
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.body, undefined);
  });
});

test('Lib_request_get_without_params_keeps_url_unchanged', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE });

  assert.equal(calls[0].url, URL_BASE);
});

test('Lib_request_get_joins_existing_query_with_ampersand', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: `${URL_BASE}?k=v`, params: { a: '1' } });

  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('k'), 'v');
  assert.equal(u.searchParams.get('a'), '1');
  assert.ok(calls[0].url.includes('?k=v&'));
});

test('Lib_request_post_json_sends_stringified_params_with_content_type', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE, method: 'POST', params: { a: 1, b: 'x' } });

  const { init } = calls[0];
  assert.equal(init.method, 'POST');
  assert.equal(init.body, JSON.stringify({ a: 1, b: 'x' }));
  assert.equal(headersOf(init)['Content-Type'], 'application/json');
});

test('Lib_request_post_form_sends_urlsearchparams_body_without_content_type', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE, method: 'POST', params: { a: '1', b: 'x y' }, contentType: 'form' });

  const { init } = calls[0];
  const body = new URLSearchParams(String(init.body));
  assert.equal(body.get('a'), '1');
  assert.equal(body.get('b'), 'x y');
  assert.equal(Object.keys(headersOf(init)).some((k) => k.toLowerCase() === 'content-type'), false);
});

test('Lib_request_contentType_falls_back_to_Lib_defaults', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  WebC.Lib.defaults.contentType = 'form';
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE, method: 'POST', params: { a: '1' } });

  assert.equal(String(calls[0].init.body), 'a=1');
});

test('Lib_request_contentType_option_overrides_Lib_defaults', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  WebC.Lib.defaults.contentType = 'form';
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE, method: 'POST', params: { a: 1 }, contentType: 'json' });

  assert.equal(calls[0].init.body, JSON.stringify({ a: 1 }));
  assert.equal(headersOf(calls[0].init)['Content-Type'], 'application/json');
});

test('Lib_request_headers_merge_defaults_with_request_priority', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  WebC.Lib.defaults.headers = { 'X-A': '1', 'X-B': '2' };
  const calls = mockFetch(dom.window, () => makeResponse({ body: {} }));

  await WebC.Lib.request({ url: URL_BASE, headers: { 'X-B': '3' } });

  assert.deepEqual(headersOf(calls[0].init), { 'X-A': '1', 'X-B': '3' });
});

test('Lib_request_responseType_json_returns_parsed_body', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: { ok: 1 } }));

  const result = await WebC.Lib.request({ url: URL_BASE, responseType: 'json' });

  assert.deepEqual(result, { ok: 1 });
});

test('Lib_request_responseType_text_returns_text_body', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: 'plain text' }));

  const result = await WebC.Lib.request({ url: URL_BASE, responseType: 'text' });

  assert.equal(result, 'plain text');
});

test('Lib_request_responseType_xml_returns_parsed_document', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ body: '<root><item id="1">A</item></root>' }));

  const doc = await WebC.Lib.request({ url: URL_BASE, responseType: 'xml' });

  assert.equal(doc.nodeType, 9);
  assert.equal(doc.querySelector('item').textContent, 'A');
  assert.equal(doc.querySelector('item').getAttribute('id'), '1');
});

test('Lib_request_responseType_falls_back_to_Lib_defaults_and_option_overrides_it', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  WebC.Lib.defaults.responseType = 'text';
  mockFetch(dom.window, () => makeResponse({ body: { ok: 1 } }));

  const fromDefaults = await WebC.Lib.request({ url: URL_BASE });
  const fromOption = await WebC.Lib.request({ url: URL_BASE, responseType: 'json' });

  assert.equal(fromDefaults, JSON.stringify({ ok: 1 }));
  assert.deepEqual(fromOption, { ok: 1 });
});

test('Lib_request_rejects_with_status_when_response_not_ok', async (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  mockFetch(dom.window, () => makeResponse({ ok: false, status: 404, body: 'not found' }));

  await assert.rejects(
    WebC.Lib.request({ url: URL_BASE }),
    (err) => err.status === 404,
  );
});
