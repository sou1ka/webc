'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, mockFetch, makeResponse } = require('./helpers');

const URL_BASE = 'https://example.test/fields';

const LOADED = () => [
  { val: 'a', name: 'Alpha' },
  { val: '2', name: 'Two' },
  { val: 'c', name: 'Gamma' },
];

/** 空の（url のみの）Store を持つ DropDown を描画する。LOADED を返すようモックする */
function setup(valueOverride = '2') {
  const env = createWebC();
  const { dom, WebC } = env;
  const calls = mockFetch(dom.window, () => makeResponse({ body: LOADED() }));
  const store = new WebC.data.Store({ url: URL_BASE });
  const dd = new WebC.field.DropDown({
    renderTo: '#list',
    valueField: 'val',
    displayField: 'name',
    value: valueOverride,
    store,
  });
  const select = dd.querySelector('select.webc-dropdown-select');
  return { ...env, calls, store, dd, select };
}

test('DropDown_load_rebuilds_options_and_syncs_selection_to_current_value', async (t) => {
  const { dom, dd, select, store } = setup('2');
  t.after(() => dom.window.close());
  assert.equal(select.querySelectorAll('option.webc-dropdown-option').length, 0);
  assert.equal(select.selectedIndex, -1);

  await store.load();

  const options = select.querySelectorAll('option.webc-dropdown-option');
  assert.deepEqual([...options].map((o) => o.textContent), ['Alpha', 'Two', 'Gamma']);
  assert.equal(select.selectedIndex, 1);
  assert.equal(dd.getValue(), '2');
});

test('DropDown_load_does_not_fire_change', async (t) => {
  const { dom, dd, store } = setup('2');
  t.after(() => dom.window.close());
  let calls = 0;
  dd.on('change', () => { calls += 1; });

  await store.load();

  assert.equal(calls, 0);
});

test('DropDown_load_selects_nothing_when_current_value_is_missing_in_loaded_data', async (t) => {
  const { dom, select, store } = setup('9');
  t.after(() => dom.window.close());

  await store.load();

  assert.equal(select.querySelectorAll('option.webc-dropdown-option').length, 3);
  assert.equal(select.selectedIndex, -1);
});

test('DropDown_load_selects_value_set_before_load_at_its_new_position', async (t) => {
  const { dom, dd, select, store } = setup('2');
  t.after(() => dom.window.close());
  dd.setValue('c');

  await store.load();

  assert.equal(select.selectedIndex, 2);
  assert.equal(dd.getValue(), 'c');
});

test('DropDown_user_select_after_load_yields_record_of_rebuilt_options', async (t) => {
  const { dom, dd, select, store } = setup('2');
  t.after(() => dom.window.close());
  await store.load();
  const events = [];
  dd.on('change', (e) => events.push(e));

  select.selectedIndex = 2;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  assert.equal(events.length, 1);
  assert.strictEqual(events[0].detail.value, 'c');
  assert.strictEqual(events[0].detail.oldValue, '2');
  assert.strictEqual(events[0].detail.record, store.getAt(2));
  assert.equal(dd.getValue(), 'c');
});

test('DropDown_destroy_then_store_load_does_not_throw_or_update_dom', async (t) => {
  const { dom, dd, select, store } = setup('2');
  t.after(() => dom.window.close());
  await store.load();
  const before = select.querySelectorAll('option.webc-dropdown-option').length;
  dd.destroy();

  await assert.doesNotReject(store.load());

  assert.equal(select.querySelectorAll('option.webc-dropdown-option').length, before);
});

test('DropDown_destroy_removes_element_and_own_change_listeners', (t) => {
  const { dom, dd, store } = setup('2');
  t.after(() => dom.window.close());
  let calls = 0;
  dd.on('change', () => { calls += 1; });

  dd.destroy();
  dd.setValue('c');

  assert.equal(dd.parentNode, null);
  assert.equal(calls, 0);
  assert.equal(store.isLoaded(), false);
});
