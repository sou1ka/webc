'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, createDropDownRecords } = require('./helpers');

/** <form id="f1"> を #list 内に作る。WebC フィールドは renderTo: form で描画する */
function setup() {
  const env = createWebC();
  const form = env.document.createElement('form');
  form.id = 'f1';
  env.document.getElementById('list').appendChild(form);
  return { ...env, form };
}

/** 素の要素を form に追加する */
function plain(env, form, html) {
  const holder = env.document.createElement('div');
  holder.innerHTML = html;
  while (holder.firstChild) form.appendChild(holder.firstChild);
}

/** realm の違いを吸収するため JSON 経由で比較用の値にする */
const json = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- getValues

test('getValues_returns_plain_input_values_by_name', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="a" value="x"><textarea name="t">hi</textarea>');

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { a: 'x', t: 'hi' });
});

test('getValues_ignores_elements_without_name', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input value="noname"><input name="a" value="x">');

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { a: 'x' });
});

test('getValues_webc_checkbox_returns_boolean_including_unchecked', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  new WebC.field.Checkbox({ renderTo: form, name: 'agree', value: false });
  new WebC.field.Checkbox({ renderTo: form, name: 'news', value: true });

  assert.deepEqual(json(WebC.Lib.getValues(form)), { agree: false, news: true });
});

test('getValues_native_checkbox_returns_boolean', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input type="checkbox" name="c" checked><input type="checkbox" name="d">');

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { c: true, d: false });
});

test('getValues_radio_group_returns_checked_inputValue', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const m = new WebC.field.Radio({ renderTo: form, name: 'gender', inputValue: 'm' });
  const f = new WebC.field.Radio({ renderTo: form, name: 'gender', inputValue: 'f' });
  f.setValue(true);

  assert.deepEqual(json(WebC.Lib.getValues(form)), { gender: 'f' });
  assert.equal(m.getValue(), false);
});

test('getValues_radio_group_without_checked_member_returns_null', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  new WebC.field.Radio({ renderTo: form, name: 'none', inputValue: 'x' });
  new WebC.field.Radio({ renderTo: form, name: 'none', inputValue: 'y' });

  assert.deepEqual(json(WebC.Lib.getValues(form)), { none: null });
});

test('getValues_select_returns_option_value_string', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const store = new WebC.data.Store({ data: createDropDownRecords() });
  new WebC.field.DropDown({
    renderTo: form, name: 'pick', valueField: 'val', displayField: 'name', store, value: '2',
  });

  assert.deepEqual(json(WebC.Lib.getValues(form)), { pick: '2' });
});

test('getValues_number_input_returns_string', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input type="number" name="n" value="5">');

  const values = env.WebC.Lib.getValues(env.form);

  assert.equal(values.n, '5');
  assert.equal(typeof values.n, 'string');
});

test('getValues_excludes_disabled_elements', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  plain(env, form, '<input name="off" disabled value="x"><input name="on" value="y">');
  new WebC.field.Input({ renderTo: form, name: 'wdis', value: 'z', attrs: { disabled: true } });

  assert.deepEqual(json(WebC.Lib.getValues(form)), { on: 'y' });
});

test('getValues_excludes_button_elements_of_all_button_types', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(
    env,
    env.form,
    '<button name="b1" type="button">a</button>'
      + '<button name="b2" type="submit">b</button>'
      + '<button name="b3" type="reset">c</button>'
      + '<input name="keep" value="k">',
  );

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { keep: 'k' });
});

test('getValues_same_name_multiple_elements_returns_array_in_order', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="tag" value="a"><input name="tag" value="b">');

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { tag: ['a', 'b'] });
});

test('getValues_same_name_checkboxes_returns_array_of_booleans', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input type="checkbox" name="c" checked><input type="checkbox" name="c">');

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { c: [true, false] });
});

test('getValues_accepts_selector_string', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="a" value="x">');

  assert.deepEqual(json(env.WebC.Lib.getValues('#f1')), { a: 'x' });
});

// ---------------------------------------------------------------- setValues

test('setValues_updates_only_keys_given', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="a" value="x"><input name="b" value="y">');

  env.WebC.Lib.setValues(env.form, { a: 'new' });

  assert.deepEqual(json(env.WebC.Lib.getValues(env.form)), { a: 'new', b: 'y' });
});

test('setValues_accepts_selector_string', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="a" value="x">');

  env.WebC.Lib.setValues('#f1', { a: 'sel' });

  assert.equal(env.form.querySelector('input').value, 'sel');
});

test('setValues_webc_field_calls_setValue_and_fires_change', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const input = new WebC.field.Input({ renderTo: form, name: 'q', value: 'a' });
  const details = [];
  input.on('change', (e) => details.push(e.detail));

  WebC.Lib.setValues(form, { q: 'z' });

  assert.equal(input.getValue(), 'z');
  assert.deepEqual(json(details), [{ value: 'z', oldValue: 'a' }]);
});

test('setValues_dropdown_keeps_value_type_and_fires_change', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const store = new WebC.data.Store({ data: [{ v: 10, t: 'ten' }, { v: 20, t: 'twenty' }] });
  const dd = new WebC.field.DropDown({
    renderTo: form, name: 'n', valueField: 'v', displayField: 't', store, value: 10,
  });
  const details = [];
  dd.on('change', (e) => details.push(e.detail));

  WebC.Lib.setValues(form, { n: 20 });

  assert.strictEqual(dd.getValue(), 20);
  assert.equal(details.length, 1);
  assert.strictEqual(details[0].value, 20);
  assert.strictEqual(details[0].oldValue, 10);
});

test('setValues_radio_group_selects_matching_inputValue_only', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const m = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'm', value: true });
  const f = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'f' });

  WebC.Lib.setValues(form, { g: 'f' });

  assert.equal(f.getValue(), true);
  assert.equal(m.getValue(), false);
});

test('setValues_radio_group_matches_by_String_of_value', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const one = new WebC.field.Radio({ renderTo: form, name: 'n', inputValue: '1' });
  const two = new WebC.field.Radio({ renderTo: form, name: 'n', inputValue: '2' });

  WebC.Lib.setValues(form, { n: 1 });

  assert.equal(one.getValue(), true);
  assert.equal(two.getValue(), false);
});

test('setValues_radio_group_without_match_unchecks_all', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const m = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'm', value: true });
  const f = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'f' });

  WebC.Lib.setValues(form, { g: 'zzz' });

  assert.equal(m.getValue(), false);
  assert.equal(f.getValue(), false);
});

test('setValues_webc_checkbox_boolean', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  const cb = new WebC.field.Checkbox({ renderTo: form, name: 'agree' });

  WebC.Lib.setValues(form, { agree: true });

  assert.equal(cb.getValue(), true);
});

test('setValues_native_checkbox_sets_checked', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input type="checkbox" name="c">');
  const box = env.form.querySelector('input');

  env.WebC.Lib.setValues(env.form, { c: true });
  assert.equal(box.checked, true);

  env.WebC.Lib.setValues(env.form, { c: false });
  assert.equal(box.checked, false);
});

test('setValues_native_radio_checks_matching_value', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input type="radio" name="n" value="x"><input type="radio" name="n" value="y">');
  const [x, y] = env.form.querySelectorAll('input');

  env.WebC.Lib.setValues(env.form, { n: 'y' });

  assert.equal(y.checked, true);
  assert.equal(x.checked, false);
});

test('setValues_native_text_sets_value_and_null_becomes_empty', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  plain(env, env.form, '<input name="a" value="x"><input name="b" value="y">');

  env.WebC.Lib.setValues(env.form, { a: 'v', b: null });

  assert.equal(env.form.querySelector('[name="a"]').value, 'v');
  assert.equal(env.form.querySelector('[name="b"]').value, '');
});

test('setValues_then_getValues_round_trip', (t) => {
  const env = setup();
  t.after(() => env.dom.window.close());
  const { WebC, form } = env;
  new WebC.field.Input({ renderTo: form, name: 'name' });
  new WebC.field.Checkbox({ renderTo: form, name: 'agree' });
  new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'm' });
  new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'f' });
  const input = { name: 'Taro', agree: true, g: 'f' };

  WebC.Lib.setValues(form, input);

  assert.deepEqual(json(WebC.Lib.getValues(form)), input);
});
