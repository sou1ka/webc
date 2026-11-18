'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC } = require('./helpers');

const RECORDS = () => [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
  { id: 2, name: 'c' },
];

test('Store_constructor_defaults_data_to_empty_array', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({});

  assert.deepEqual(Array.from(store.getData()), []);
  assert.equal(store.getCount(), 0);
});

test('Store_getData_returns_given_data', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const data = RECORDS();

  const store = new WebC.data.Store({ data });

  assert.deepEqual(store.getData(), data);
});

test('Store_getCount_returns_number_of_records', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: RECORDS() });

  assert.equal(store.getCount(), 3);
});

test('Store_getAt_returns_record_at_index', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: RECORDS() });

  assert.deepEqual(store.getAt(1), { id: 2, name: 'b' });
});

test('Store_findBy_returns_first_matching_record', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: RECORDS() });

  assert.deepEqual(store.findBy('id', 2), { id: 2, name: 'b' });
});

test('Store_findBy_returns_null_when_no_match', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: RECORDS() });

  assert.equal(store.findBy('id', 99), null);
});

test('Store_findBy_uses_strict_equality', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  const store = new WebC.data.Store({ data: RECORDS() });

  assert.equal(store.findBy('id', '2'), null);
});
