'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC } = require('./helpers');

/** <form id="f1"> を #list 内に作る。WebC フィールドは renderTo: form で描画する */
function setup() {
  const env = createWebC();
  const form = env.document.createElement('form');
  form.id = 'f1';
  env.document.getElementById('list').appendChild(form);
  return { ...env, form };
}

const control = (field) => field.querySelector('.webc-field-control');
const nativeChange = (dom, el) => el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
// webc.js 側で生成された detail は jsdom realm のため、JSON 経由で比較する
const json = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- Switch

test('Switch_is_registered_as_webc_switch', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-switch'), WebC.field.Switch);
});

test('Switch_element_has_webc_field_switch_class_and_not_checkbox_class', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const s = new WebC.field.Switch({ renderTo: form, cls: 'user-switch' });

  assert.equal(s.classList.contains('webc-field'), true);
  assert.equal(s.classList.contains('webc-field-switch'), true);
  assert.equal(s.classList.contains('webc-field-checkbox'), false);
  assert.equal(s.classList.contains('user-switch'), true);
});

test('Switch_control_is_checkbox_with_role_switch', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const s = new WebC.field.Switch({ renderTo: form });

  assert.equal(control(s).type, 'checkbox');
  assert.equal(control(s).getAttribute('role'), 'switch');
});

test('Switch_value_true_renders_checked_and_default_is_false', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const off = new WebC.field.Switch({ renderTo: form });
  const on = new WebC.field.Switch({ renderTo: form, value: true });

  assert.equal(off.getValue(), false);
  assert.equal(control(on).checked, true);
  assert.equal(on.getValue(), true);
});

test('Switch_label_follows_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const s = new WebC.field.Switch({ renderTo: form, label: 'Notify' });

  const label = s.querySelector('label.webc-field-label');
  assert.equal(control(s).nextElementSibling, label);
  assert.equal(label.htmlFor, control(s).id);
});

test('Switch_setValue_updates_checked_and_fires_change', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const s = new WebC.field.Switch({ renderTo: form });
  const details = [];
  s.on('change', (e) => details.push(e.detail));

  s.setValue(true);

  assert.equal(control(s).checked, true);
  assert.equal(s.getValue(), true);
  assert.deepEqual(json(details), [{ value: true, oldValue: false }]);
});

test('Switch_user_change_fires_change_once_with_detail', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const s = new WebC.field.Switch({ renderTo: form });
  const details = [];
  s.on('change', (e) => details.push(e.detail));

  control(s).checked = true;
  nativeChange(dom, control(s));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: true, oldValue: false });
});

test('Switch_getValues_returns_boolean_like_checkbox', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  new WebC.field.Switch({ renderTo: form, name: 'notify', value: true });
  new WebC.field.Switch({ renderTo: form, name: 'mail', value: false });

  assert.deepEqual(json(WebC.Lib.getValues(form)), { notify: true, mail: false });
});

// ---------------------------------------------------------------- ToggleButton

test('ToggleButton_is_registered_as_webc_togglebutton', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-togglebutton'), WebC.field.ToggleButton);
});

test('ToggleButton_element_has_togglebutton_class_and_not_radio_class', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const tb = new WebC.field.ToggleButton({ renderTo: form, cls: 'user-tb' });

  assert.equal(tb.classList.contains('webc-field'), true);
  assert.equal(tb.classList.contains('webc-field-togglebutton'), true);
  assert.equal(tb.classList.contains('webc-field-radio'), false);
  assert.equal(tb.classList.contains('user-tb'), true);
});

test('ToggleButton_control_is_radio_with_inputValue', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const tb = new WebC.field.ToggleButton({ renderTo: form, inputValue: 'left' });

  assert.equal(control(tb).type, 'radio');
  assert.equal(control(tb).getAttribute('value'), 'left');
});

test('ToggleButton_label_follows_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const tb = new WebC.field.ToggleButton({ renderTo: form, label: 'Left' });

  const label = tb.querySelector('label.webc-field-label');
  assert.equal(control(tb).nextElementSibling, label);
  assert.equal(label.htmlFor, control(tb).id);
});

test('ToggleButton_same_name_group_setValue_true_unchecks_other_member', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const a = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'left' });
  const b = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'right' });

  a.setValue(true);
  assert.equal(a.getValue(), true);
  assert.equal(b.getValue(), false);

  b.setValue(true);
  assert.equal(a.getValue(), false);
  assert.equal(b.getValue(), true);
});

test('ToggleButton_user_change_fires_change_on_newly_checked_side', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const a = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'left' });
  const b = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'right' });
  const details = [];
  b.on('change', (e) => details.push(e.detail));

  control(b).checked = true;
  nativeChange(dom, control(b));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: true, oldValue: false });
  assert.equal(a.getValue(), false);
});

test('ToggleButton_getValues_returns_checked_inputValue_or_null', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const a = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'left' });
  new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'right' });
  new WebC.field.ToggleButton({ renderTo: form, name: 'none', inputValue: 'x' });
  a.setValue(true);

  assert.deepEqual(json(WebC.Lib.getValues(form)), { align: 'left', none: null });
});

test('ToggleButton_setValues_selects_matching_inputValue', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const a = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'left', value: true });
  const b = new WebC.field.ToggleButton({ renderTo: form, name: 'align', inputValue: 'right' });

  WebC.Lib.setValues('#f1', { align: 'right' });

  assert.equal(a.getValue(), false);
  assert.equal(b.getValue(), true);
});
