'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC } = require('./helpers');

function setup() {
  const env = createWebC();
  const { window, WebC } = env;
  const target = window.document.getElementById('list');
  let seq = 0;
  // テスト毎に一意なタグ名で登録する（Component 自体は登録しない）
  const defineSub = (Base, body = {}) => {
    const name = `test-comp-${++seq}`;
    class Sub extends Base {}
    if (body.defaults) Sub.defaults = body.defaults;
    if (body.onRender) Sub.prototype.onRender = body.onRender;
    window.customElements.define(name, Sub);
    return Sub;
  };
  return { ...env, target, defineSub, Component: WebC.Component };
}

test('Component_config_merges_defaults_along_inheritance_chain', (t) => {
  const { dom, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Child = defineSub(Component, { defaults: { cls: 'child-cls', extra: 'e' } });
  class Grand extends Child {
    static defaults = { extra: 'g' };
  }
  dom.window.customElements.define('test-comp-grand', Grand);

  const c = new Grand({});

  assert.equal(c.config.renderTo, null);
  assert.equal(c.config.cls, 'child-cls');
  assert.equal(c.config.extra, 'g');
});

test('Component_config_constructor_argument_overrides_defaults', (t) => {
  const { dom, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component, { defaults: { cls: 'child-cls', extra: 'e' } });

  const c = new Sub({ extra: 'override' });

  assert.equal(c.config.cls, 'child-cls');
  assert.equal(c.config.extra, 'override');
});

test('Component_constructor_renders_to_selector_when_renderTo_given', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);

  const c = new Sub({ renderTo: '#list' });

  assert.equal(c.parentNode, target);
});

test('Component_constructor_does_not_render_without_renderTo', (t) => {
  const { dom, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);

  const c = new Sub({});

  assert.equal(c.parentNode, null);
});

test('Component_render_appends_to_element_target', (t) => {
  const { dom, document, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const holder = document.createElement('section');
  document.body.appendChild(holder);

  const c = new Sub({});
  c.render(holder);

  assert.equal(c.parentNode, holder);
});

test('Component_render_adds_cls_to_class_list', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);

  const c = new Sub({ cls: 'user-cls' });
  c.render(target);

  assert.equal(c.classList.contains('user-cls'), true);
});

test('Component_render_adds_no_class_when_cls_empty', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);

  const c = new Sub({ cls: '' });
  c.render(target);

  assert.equal(c.classList.length, 0);
});

test('Component_render_calls_onRender_only_once', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  let calls = 0;
  const Sub = defineSub(Component, { onRender() { calls += 1; } });

  const c = new Sub({});
  c.render(target);
  c.render(target);

  assert.equal(calls, 1);
});

test('Component_render_fires_render_event_after_appending', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({});
  const seen = [];
  c.on('render', () => seen.push(c.parentNode));

  c.render(target);

  assert.deepEqual(seen, [target]);
});

test('Component_on_listener_receives_detail_from_fire', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({});
  c.render(target);
  const details = [];
  c.on('custom', (e) => details.push(e.detail));

  c.fire('custom', { a: 1 });

  assert.deepEqual(details, [{ a: 1 }]);
});

test('Component_off_removes_listener', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({});
  c.render(target);
  let calls = 0;
  const fn = () => { calls += 1; };
  c.on('custom', fn);

  c.off('custom', fn);
  c.fire('custom');

  assert.equal(calls, 0);
});

test('Component_destroy_fires_destroy_event', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({});
  c.render(target);
  let calls = 0;
  c.on('destroy', () => { calls += 1; });

  c.destroy();

  assert.equal(calls, 1);
});

test('Component_destroy_removes_listeners_so_later_fire_is_ignored', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({});
  c.render(target);
  let customCalls = 0;
  c.on('custom', () => { customCalls += 1; });

  c.destroy();
  c.fire('custom');

  assert.equal(customCalls, 0);
});

test('Component_destroy_removes_element_from_dom', (t) => {
  const { dom, target, Component, defineSub } = setup();
  t.after(() => dom.window.close());
  const Sub = defineSub(Component);
  const c = new Sub({ renderTo: target });

  c.destroy();

  assert.equal(c.parentNode, null);
});
