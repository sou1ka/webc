'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, createDropDownRecords } = require('./helpers');

function setup(overrides = {}) {
  const env = createWebC();
  const { WebC, dom } = env;
  const store = new WebC.data.Store({ data: createDropDownRecords() });
  const config = {
    renderTo: '#list',
    valueField: 'val',
    displayField: 'name',
    value: '2',
    store,
    cls: 'user-dropdown',
    ...overrides,
  };
  const dd = new WebC.field.DropDown(config);
  const select = dd.querySelector('select.webc-dropdown-select');
  return { ...env, store, dd, select, dom };
}

test('DropDown_is_registered_as_webc_dropdown', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-dropdown'), WebC.field.DropDown);
});

test('DropDown_element_has_webc_dropdown_and_cls_classes', (t) => {
  const { dom, dd } = setup();
  t.after(() => dom.window.close());

  assert.equal(dd.classList.contains('webc-dropdown'), true);
  assert.equal(dd.classList.contains('user-dropdown'), true);
});

test('DropDown_render_creates_select_with_option_per_record', (t) => {
  const { dom, select } = setup();
  t.after(() => dom.window.close());

  const options = select.querySelectorAll('option.webc-dropdown-option');
  assert.equal(options.length, 3);
  assert.deepEqual([...options].map((o) => o.textContent), [
    'フィールド1',
    'フィールド2',
    'フィールド3',
  ]);
});

test('DropDown_initial_value_selects_matching_option', (t) => {
  const { dom, select } = setup();
  t.after(() => dom.window.close());

  assert.equal(select.selectedIndex, 1);
});

test('DropDown_getValue_returns_config_value_before_render', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });

  const dd = new WebC.field.DropDown({ valueField: 'val', displayField: 'name', value: '3', store });

  assert.equal(dd.getValue(), '3');
});

test('DropDown_getValue_preserves_record_value_type', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: [
    { val: 10, name: 'ten' },
    { val: 20, name: 'twenty' },
  ] });

  const dd = new WebC.field.DropDown({ renderTo: '#list', valueField: 'val', displayField: 'name', value: 20, store });

  assert.strictEqual(dd.getValue(), 20);
  assert.equal(dd.querySelector('select').selectedIndex, 1);
});

test('DropDown_default_fields_are_value_and_text', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: [
    { value: 'a', text: 'Alpha' },
    { value: 'b', text: 'Beta' },
  ] });

  const dd = new WebC.field.DropDown({ renderTo: '#list', value: 'b', store });

  const options = dd.querySelectorAll('option.webc-dropdown-option');
  assert.deepEqual([...options].map((o) => o.textContent), ['Alpha', 'Beta']);
  assert.equal(dd.querySelector('select').selectedIndex, 1);
});

test('DropDown_null_value_selects_nothing', (t) => {
  const { dom, dd, select } = setup({ value: null });
  t.after(() => dom.window.close());

  assert.equal(select.selectedIndex, -1);
  assert.equal(dd.getValue(), null);
});

test('DropDown_unknown_value_selects_nothing_but_getValue_returns_it', (t) => {
  const { dom, dd, select } = setup({ value: 'zzz' });
  t.after(() => dom.window.close());

  assert.equal(select.selectedIndex, -1);
  assert.equal(dd.getValue(), 'zzz');
});

test('DropDown_setValue_updates_getValue_and_selected_option', (t) => {
  const { dom, dd, select } = setup();
  t.after(() => dom.window.close());

  dd.setValue('3');

  assert.equal(dd.getValue(), '3');
  assert.equal(select.selectedIndex, 2);
});

test('DropDown_setValue_null_clears_selection', (t) => {
  const { dom, dd, select } = setup();
  t.after(() => dom.window.close());

  dd.setValue(null);

  assert.equal(select.selectedIndex, -1);
  assert.equal(dd.getValue(), null);
});

test('DropDown_setValue_before_render_is_reflected_on_render', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });
  const dd = new WebC.field.DropDown({ valueField: 'val', displayField: 'name', value: '1', store });

  dd.setValue('3');
  dd.render('#list');

  assert.equal(dd.getValue(), '3');
  assert.equal(dd.querySelector('select').selectedIndex, 2);
});

test('DropDown_setValue_fires_change_with_detail', (t) => {
  const { dom, dd, store } = setup();
  t.after(() => dom.window.close());
  const events = [];
  dd.on('change', (e) => events.push(e));

  dd.setValue('3');

  assert.equal(events.length, 1);
  const { detail } = events[0];
  assert.strictEqual(detail.value, '3');
  assert.strictEqual(detail.oldValue, '2');
  assert.strictEqual(detail.record, store.getAt(2));
});

test('DropDown_setValue_same_value_does_not_fire_change', (t) => {
  const { dom, dd } = setup();
  t.after(() => dom.window.close());
  let calls = 0;
  dd.on('change', () => { calls += 1; });

  dd.setValue('2');

  assert.equal(calls, 0);
});

test('DropDown_setValue_fires_change_when_type_differs', (t) => {
  const { dom, dd } = setup();
  t.after(() => dom.window.close());
  let calls = 0;
  dd.on('change', () => { calls += 1; });

  dd.setValue(2);

  assert.equal(calls, 1);
});

test('DropDown_setValue_unknown_value_fires_change_with_null_record', (t) => {
  const { dom, dd, select } = setup();
  t.after(() => dom.window.close());
  const events = [];
  dd.on('change', (e) => events.push(e));

  dd.setValue('zzz');

  assert.equal(events.length, 1);
  assert.strictEqual(events[0].detail.value, 'zzz');
  assert.strictEqual(events[0].detail.record, null);
  assert.equal(select.selectedIndex, -1);
});

test('DropDown_user_select_fires_change_once_with_detail', (t) => {
  const { dom, dd, select, store } = setup();
  t.after(() => dom.window.close());
  const events = [];
  dd.on('change', (e) => events.push(e));

  select.selectedIndex = 2;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  assert.equal(events.length, 1);
  assert.strictEqual(events[0].detail.value, '3');
  assert.strictEqual(events[0].detail.oldValue, '2');
  assert.strictEqual(events[0].detail.record, store.getAt(2));
  assert.equal(dd.getValue(), '3');
});

test('DropDown_user_select_native_change_does_not_reach_document', (t) => {
  const { dom, dd, select, document } = setup();
  t.after(() => dom.window.close());
  let documentCalls = 0;
  document.addEventListener('change', () => { documentCalls += 1; });
  dd.on('change', () => {});

  select.selectedIndex = 0;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  assert.equal(documentCalls, 0);
});
