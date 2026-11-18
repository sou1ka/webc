'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC, createDropDownRecords } = require('./helpers');

/** テスト用に <form> を #list 内に作り、フィールドの renderTo に使う */
function setup() {
  const env = createWebC();
  const form = env.document.createElement('form');
  env.document.getElementById('list').appendChild(form);
  return { ...env, form };
}

const control = (field) => field.querySelector('.webc-field-control');
const nativeChange = (dom, el) => el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
const json = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- Field（共通）

test('Field_name_attribute_is_set_on_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, name: 'q' });

  assert.equal(control(f).getAttribute('name'), 'q');
});

test('Field_name_attribute_absent_when_name_not_given', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form });

  assert.equal(control(f).hasAttribute('name'), false);
});

test('Field_label_rendered_with_text_and_htmlFor_control_id', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, label: 'Name' });

  const label = f.querySelector('label.webc-field-label');
  assert.equal(label.textContent, 'Name');
  assert.notEqual(control(f).id, '');
  assert.equal(label.htmlFor, control(f).id);
});

test('Field_label_absent_when_label_not_given', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form });

  assert.equal(f.querySelector('label'), null);
});

test('Field_control_ids_are_unique_across_fields', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const a = new WebC.field.Input({ renderTo: form, label: 'A' });
  const b = new WebC.field.Input({ renderTo: form, label: 'B' });

  assert.notEqual(control(a).id, control(b).id);
  assert.equal(a.querySelector('label').htmlFor, control(a).id);
  assert.equal(b.querySelector('label').htmlFor, control(b).id);
});

test('Field_attrs_true_sets_empty_attribute', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, attrs: { required: true } });

  assert.equal(control(f).hasAttribute('required'), true);
  assert.equal(control(f).getAttribute('required'), '');
});

test('Field_attrs_false_or_null_are_omitted', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, attrs: { disabled: false, readonly: null } });

  assert.equal(control(f).hasAttribute('disabled'), false);
  assert.equal(control(f).hasAttribute('readonly'), false);
});

test('Field_attrs_other_values_are_stringified', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, attrs: { maxlength: 10, 'data-n': 0 } });

  assert.equal(control(f).getAttribute('maxlength'), '10');
  assert.equal(control(f).getAttribute('data-n'), '0');
});

test('Field_cls_is_added_to_element', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, cls: 'user-field' });

  assert.equal(f.classList.contains('user-field'), true);
});

test('Field_destroy_removes_element', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form });

  f.destroy();

  assert.equal(f.parentNode, null);
});

// ---------------------------------------------------------------- Input

test('Input_is_registered_as_webc_input', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-input'), WebC.field.Input);
});

test('Input_element_has_webc_field_and_kind_classes', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, cls: 'user-input' });

  assert.equal(f.classList.contains('webc-field'), true);
  assert.equal(f.classList.contains('webc-field-input'), true);
  assert.equal(f.classList.contains('user-input'), true);
});

test('Input_control_is_input_with_control_class_and_default_type_text', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form });

  assert.equal(control(f).tagName, 'INPUT');
  assert.equal(control(f).type, 'text');
});

test('Input_type_config_is_reflected_on_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, type: 'number' });

  assert.equal(control(f).type, 'number');
});

test('Input_default_value_is_empty_string_before_and_after_render', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({});

  assert.equal(f.getValue(), '');
  f.render(form);
  assert.equal(f.getValue(), '');
  assert.equal(control(f).value, '');
});

test('Input_getValue_returns_config_value_before_render', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ value: 'abc' });

  assert.equal(f.getValue(), 'abc');
});

test('Input_getValue_reads_control_after_render', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form, value: 'abc' });

  control(f).value = 'typed';

  assert.equal(f.getValue(), 'typed');
});

test('Input_number_type_value_is_string', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Input({ renderTo: form, type: 'number', value: '5' });

  assert.equal(f.getValue(), '5');
  assert.equal(typeof f.getValue(), 'string');
});

test('Input_setValue_updates_control_and_getValue', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form });

  f.setValue('x');

  assert.equal(control(f).value, 'x');
  assert.equal(f.getValue(), 'x');
});

test('Input_setValue_before_render_is_reflected_on_render', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({});

  f.setValue('early');
  f.render(form);

  assert.equal(control(f).value, 'early');
});

test('Input_setValue_fires_change_with_value_and_oldValue', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form, value: 'a' });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  f.setValue('b');

  assert.deepEqual(json(details), [{ value: 'b', oldValue: 'a' }]);
});

test('Input_setValue_same_value_does_not_fire_change', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form, value: 'a' });
  let count = 0;
  f.on('change', () => { count += 1; });

  f.setValue('a');

  assert.equal(count, 0);
});

test('Input_user_input_fires_change_once_with_detail', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  control(f).value = 'new';
  nativeChange(dom, control(f));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: 'new', oldValue: '' });
  assert.equal(f.getValue(), 'new');
});

test('Input_user_native_change_without_value_change_does_not_fire', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form, value: 'same' });
  let count = 0;
  f.on('change', () => { count += 1; });

  nativeChange(dom, control(f));

  assert.equal(count, 0);
});

test('Input_native_change_does_not_propagate_outside_field', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Input({ renderTo: form });
  let documentCalls = 0;
  dom.window.document.addEventListener('change', () => { documentCalls += 1; });

  control(f).value = 'x';
  nativeChange(dom, control(f));

  assert.equal(documentCalls, 0);
});

// ---------------------------------------------------------------- TextArea

test('TextArea_is_registered_as_webc_textarea', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-textarea'), WebC.field.TextArea);
});

test('TextArea_element_has_webc_field_textarea_class_and_textarea_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.TextArea({ renderTo: form });

  assert.equal(f.classList.contains('webc-field'), true);
  assert.equal(f.classList.contains('webc-field-textarea'), true);
  assert.equal(control(f).tagName, 'TEXTAREA');
});

test('TextArea_rows_default_and_config', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const dflt = new WebC.field.TextArea({ renderTo: form });
  const custom = new WebC.field.TextArea({ renderTo: form, rows: 5 });

  assert.equal(control(dflt).getAttribute('rows'), '3');
  assert.equal(control(custom).getAttribute('rows'), '5');
});

test('TextArea_default_value_is_empty_string', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.TextArea({ renderTo: form });

  assert.equal(f.getValue(), '');
});

test('TextArea_setValue_updates_control_and_fires_change', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.TextArea({ renderTo: form, value: 'a' });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  f.setValue('a\nb');

  assert.equal(control(f).value, 'a\nb');
  assert.equal(f.getValue(), 'a\nb');
  assert.deepEqual(json(details), [{ value: 'a\nb', oldValue: 'a' }]);
});

test('TextArea_user_input_fires_change_with_detail', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.TextArea({ renderTo: form });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  control(f).value = 'typed';
  nativeChange(dom, control(f));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: 'typed', oldValue: '' });
});

// ---------------------------------------------------------------- Checkbox

test('Checkbox_is_registered_as_webc_checkbox', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-checkbox'), WebC.field.Checkbox);
});

test('Checkbox_element_has_checkbox_control_and_kind_class', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Checkbox({ renderTo: form });

  assert.equal(f.classList.contains('webc-field-checkbox'), true);
  assert.equal(control(f).tagName, 'INPUT');
  assert.equal(control(f).type, 'checkbox');
});

test('Checkbox_default_value_is_false', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Checkbox({ renderTo: form });

  assert.equal(f.getValue(), false);
  assert.equal(control(f).checked, false);
});

test('Checkbox_value_true_renders_checked', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Checkbox({ renderTo: form, value: true });

  assert.equal(control(f).checked, true);
  assert.equal(f.getValue(), true);
});

test('Checkbox_label_follows_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Checkbox({ renderTo: form, label: 'Agree' });

  const label = f.querySelector('label.webc-field-label');
  assert.equal(control(f).nextElementSibling, label);
  assert.equal(label.textContent, 'Agree');
  assert.equal(label.htmlFor, control(f).id);
});

test('Checkbox_setValue_updates_checked_and_fires_change', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Checkbox({ renderTo: form });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  f.setValue(true);

  assert.equal(control(f).checked, true);
  assert.equal(f.getValue(), true);
  assert.deepEqual(json(details), [{ value: true, oldValue: false }]);
});

test('Checkbox_setValue_same_value_does_not_fire_change', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Checkbox({ renderTo: form });
  let count = 0;
  f.on('change', () => { count += 1; });

  f.setValue(false);

  assert.equal(count, 0);
});

test('Checkbox_user_change_fires_change_with_detail', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Checkbox({ renderTo: form });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  control(f).checked = true;
  nativeChange(dom, control(f));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: true, oldValue: false });
});

// ---------------------------------------------------------------- Radio

test('Radio_is_registered_as_webc_radio', (t) => {
  const { dom, WebC } = setup();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-radio'), WebC.field.Radio);
});

test('Radio_element_has_radio_control_with_inputValue', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Radio({ renderTo: form, inputValue: 'yes' });

  assert.equal(f.classList.contains('webc-field-radio'), true);
  assert.equal(control(f).type, 'radio');
  assert.equal(control(f).getAttribute('value'), 'yes');
});

test('Radio_inputValue_default_is_on', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Radio({ renderTo: form });

  assert.equal(control(f).getAttribute('value'), 'on');
});

test('Radio_default_value_is_false_and_true_renders_checked', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const off = new WebC.field.Radio({ renderTo: form });
  const on = new WebC.field.Radio({ renderTo: form, value: true });

  assert.equal(off.getValue(), false);
  assert.equal(control(on).checked, true);
  assert.equal(on.getValue(), true);
});

test('Radio_label_follows_control', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());

  const f = new WebC.field.Radio({ renderTo: form, label: 'Male' });

  const label = f.querySelector('label.webc-field-label');
  assert.equal(control(f).nextElementSibling, label);
  assert.equal(label.htmlFor, control(f).id);
});

test('Radio_same_name_group_setValue_true_unchecks_other_member', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const m = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'm' });
  const f = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'f' });

  m.setValue(true);
  assert.equal(m.getValue(), true);
  assert.equal(f.getValue(), false);

  f.setValue(true);
  assert.equal(m.getValue(), false);
  assert.equal(f.getValue(), true);
});

test('Radio_setValue_fires_change_with_detail', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const f = new WebC.field.Radio({ renderTo: form });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  f.setValue(true);

  assert.deepEqual(json(details), [{ value: true, oldValue: false }]);
});

test('Radio_user_change_fires_change_on_newly_checked_side', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const m = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'm' });
  const f = new WebC.field.Radio({ renderTo: form, name: 'g', inputValue: 'f' });
  const details = [];
  f.on('change', (e) => details.push(e.detail));

  control(f).checked = true;
  nativeChange(dom, control(f));

  assert.equal(details.length, 1);
  assert.deepEqual(json(details[0]), { value: true, oldValue: false });
  assert.equal(m.getValue(), false);
});

// ---------------------------------------------------------------- DropDown（Field 継承への変更後の仕様）

test('DropDown_element_has_webc_field_dropdown_class', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });

  const dd = new WebC.field.DropDown({ renderTo: form, valueField: 'val', displayField: 'name', store });

  assert.equal(dd.classList.contains('webc-field'), true);
  assert.equal(dd.classList.contains('webc-field-dropdown'), true);
  assert.equal(dd.querySelector('select').classList.contains('webc-field-control'), true);
  assert.equal(dd.querySelector('select').classList.contains('webc-dropdown-select'), true);
});

test('DropDown_name_attribute_is_set_on_select', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });

  const dd = new WebC.field.DropDown({ renderTo: form, valueField: 'val', displayField: 'name', store, name: 'pick' });

  assert.equal(dd.querySelector('select').getAttribute('name'), 'pick');
});

test('DropDown_label_htmlFor_matches_select_id', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });

  const dd = new WebC.field.DropDown({ renderTo: form, valueField: 'val', displayField: 'name', store, label: 'Field' });

  const select = dd.querySelector('select');
  const label = dd.querySelector('label.webc-field-label');
  assert.equal(label.textContent, 'Field');
  assert.notEqual(select.id, '');
  assert.equal(label.htmlFor, select.id);
});

test('DropDown_attrs_are_applied_to_select', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: createDropDownRecords() });

  const dd = new WebC.field.DropDown({
    renderTo: form,
    valueField: 'val',
    displayField: 'name',
    store,
    attrs: { required: true, 'data-x': 'y', disabled: false },
  });

  const select = dd.querySelector('select');
  assert.equal(select.hasAttribute('required'), true);
  assert.equal(select.getAttribute('data-x'), 'y');
  assert.equal(select.hasAttribute('disabled'), false);
});

test('DropDown_option_value_attribute_is_string_of_record_value', (t) => {
  const { dom, WebC, form } = setup();
  t.after(() => dom.window.close());
  const store = new WebC.data.Store({ data: [{ v: 10, t: 'ten' }, { v: 20, t: 'twenty' }] });

  const dd = new WebC.field.DropDown({ renderTo: form, valueField: 'v', displayField: 't', store });

  const options = [...dd.querySelectorAll('option.webc-dropdown-option')];
  assert.deepEqual(options.map((o) => o.getAttribute('value')), ['10', '20']);
});
