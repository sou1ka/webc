'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWebC } = require('./helpers');

/**
 * window.ResizeObserver のモック。コンストラクタで callback を保存し、
 * observe / disconnect の呼び出しを記録する。インスタンス一覧を返す。
 */
function installResizeObserver(window) {
  const instances = [];
  class MockResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      this.disconnected = false;
      instances.push(this);
    }

    observe(el) { this.observed.push(el); }

    unobserve() {}

    disconnect() { this.disconnected = true; }
  }
  window.ResizeObserver = MockResizeObserver;
  return instances;
}

/** items: コンテンツの一部は文字列（セレクタ）、一部は Element で指定する */
function setup({ config = {}, items = null, withResizeObserver = true } = {}) {
  const env = createWebC();
  const { dom, WebC } = env;
  const doc = dom.window.document;

  const elA = doc.createElement('div');
  elA.id = 'c-a';
  elA.textContent = 'A';
  doc.body.appendChild(elA);

  const elB = doc.createElement('div');
  elB.id = 'c-b';
  elB.textContent = 'B';
  doc.body.appendChild(elB);

  const elC = doc.createElement('div');
  elC.id = 'c-c';
  elC.textContent = 'C';
  doc.body.appendChild(elC);

  const defaultItems = [
    { id: 'a', text: 'Alpha', content: '#c-a' },
    { id: 'b', text: 'Beta', content: elB },
    { id: 'c', text: 'Gamma', content: '#c-c' },
  ];
  const useItems = items ?? defaultItems;

  const instances = withResizeObserver ? installResizeObserver(dom.window) : null;
  const panel = new WebC.panel.TabPanel({ renderTo: '#list', items: useItems, ...config });

  return { ...env, panel, items: useItems, instances, elB, doc };
}

const tabs = (panel) => [...panel.querySelectorAll('button.webc-tabpanel-tab')];
const contents = (panel) => [...panel.querySelectorAll('.webc-tabpanel-content')];
const resize = (instances, width) => instances[0].callback([{ contentRect: { width } }]);
const pressKey = (dom, key) => dom.window.document.dispatchEvent(
  new dom.window.KeyboardEvent('keydown', { key, bubbles: true }),
);

test('TabPanel_is_registered_as_webc_tabpanel', (t) => {
  const { dom, WebC } = createWebC();
  t.after(() => dom.window.close());

  assert.equal(dom.window.customElements.get('webc-tabpanel'), WebC.panel.TabPanel);
});

test('TabPanel_element_has_classes_including_tabPosition', (t) => {
  const { dom, panel } = setup({ config: { cls: 'user-tabs', tabPosition: 'left' } });
  t.after(() => dom.window.close());

  assert.equal(panel.classList.contains('webc-tabpanel'), true);
  assert.equal(panel.classList.contains('user-tabs'), true);
  assert.equal(panel.classList.contains('is-pos-left'), true);
});

test('TabPanel_renders_menu_button', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  assert.notEqual(panel.querySelector('button.webc-tabpanel-menu'), null);
});

test('TabPanel_renders_tablist_with_tab_per_item', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  const nav = panel.querySelector('nav.webc-tabpanel-nav');
  assert.equal(nav.getAttribute('role'), 'tablist');
  const all = tabs(panel);
  assert.equal(all.length, 3);
  assert.deepEqual(all.map((b) => b.getAttribute('role')), ['tab', 'tab', 'tab']);
  assert.deepEqual(all.map((b) => b.getAttribute('aria-label')), ['Alpha', 'Beta', 'Gamma']);
});

test('TabPanel_tab_shows_text_in_text_span', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  const spans = tabs(panel).map((b) => b.querySelector('span.webc-tabpanel-text').textContent);
  assert.deepEqual(spans, ['Alpha', 'Beta', 'Gamma']);
});

test('TabPanel_icon_span_only_rendered_when_icon_given', (t) => {
  const items = [
    { id: 'a', text: 'Alpha', icon: 'star', content: '#c-a' },
    { id: 'b', text: 'Beta', content: '#c-b' },
  ];
  const { dom, panel } = setup({ items });
  t.after(() => dom.window.close());

  const [first, second] = tabs(panel);
  assert.equal(first.querySelectorAll('span.webc-tabpanel-icon').length, 1);
  assert.equal(first.querySelector('span.webc-tabpanel-icon').textContent, 'star');
  assert.equal(second.querySelectorAll('span.webc-tabpanel-icon').length, 0);
});

test('TabPanel_icon_string_is_text_not_html', (t) => {
  const items = [{ id: 'a', text: 'Alpha', icon: '<i>x</i>', content: '#c-a' }];
  const { dom, panel } = setup({ items });
  t.after(() => dom.window.close());

  const icon = tabs(panel)[0].querySelector('span.webc-tabpanel-icon');
  assert.equal(icon.textContent, '<i>x</i>');
  assert.equal(icon.querySelector('i'), null);
});

test('TabPanel_icon_node_is_appended', (t) => {
  const env = createWebC();
  const { dom } = env;
  t.after(() => dom.window.close());
  const iconNode = dom.window.document.createElement('img');
  iconNode.className = 'custom-icon';
  dom.window.document.body.appendChild(dom.window.document.createElement('div')).id = 'c-a';
  const items = [{ id: 'a', text: 'Alpha', icon: iconNode, content: '#c-a' }];
  const { WebC } = env;
  const panel = new WebC.panel.TabPanel({ renderTo: '#list', items });

  assert.notEqual(tabs(panel)[0].querySelector('span.webc-tabpanel-icon img.custom-icon'), null);
});

test('TabPanel_moves_content_elements_into_body_with_role', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  const body = panel.querySelector('div.webc-tabpanel-body');
  const list = contents(panel);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((el) => el.id), ['c-a', 'c-b', 'c-c']);
  assert.ok(list.every((el) => el.parentNode === body));
  assert.ok(list.every((el) => el.getAttribute('role') === 'tabpanel'));
});

test('TabPanel_only_active_content_is_visible_by_default', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  const [a, b, c] = contents(panel);
  assert.equal(a.hidden, false);
  assert.equal(b.hidden, true);
  assert.equal(c.hidden, true);
});

test('TabPanel_active_defaults_to_first_item', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  assert.equal(panel.getActive(), 'a');
  const [first] = tabs(panel);
  assert.equal(first.classList.contains('is-active'), true);
  assert.equal(first.getAttribute('aria-selected'), 'true');
});

test('TabPanel_active_config_selects_given_item', (t) => {
  const { dom, panel } = setup({ config: { active: 'b' } });
  t.after(() => dom.window.close());

  assert.equal(panel.getActive(), 'b');
  assert.equal(contents(panel)[1].hidden, false);
  assert.equal(contents(panel)[0].hidden, true);
  assert.equal(tabs(panel)[1].classList.contains('is-active'), true);
  assert.equal(tabs(panel)[1].getAttribute('aria-selected'), 'true');
});

test('TabPanel_is_active_and_aria_selected_only_on_active_tab', (t) => {
  const { dom, panel } = setup({ config: { active: 'c' } });
  t.after(() => dom.window.close());

  const all = tabs(panel);
  assert.deepEqual(all.map((b) => b.classList.contains('is-active')), [false, false, true]);
  assert.deepEqual(all.map((b) => b.getAttribute('aria-selected')), ['false', 'false', 'true']);
});

test('TabPanel_setActive_switches_visible_content_and_tab_state', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  panel.setActive('b');

  assert.equal(panel.getActive(), 'b');
  assert.deepEqual(contents(panel).map((el) => el.hidden), [true, false, true]);
  assert.deepEqual(tabs(panel).map((b) => b.classList.contains('is-active')), [false, true, false]);
  assert.deepEqual(tabs(panel).map((b) => b.getAttribute('aria-selected')), ['false', 'true', 'false']);
});

test('TabPanel_setActive_fires_tabchange_with_item_and_oldItem', (t) => {
  const { dom, panel, items } = setup();
  t.after(() => dom.window.close());
  const events = [];
  panel.on('tabchange', (e) => events.push(e.detail));

  panel.setActive('b');

  assert.equal(events.length, 1);
  assert.strictEqual(events[0].item, items[1]);
  assert.strictEqual(events[0].oldItem, items[0]);
});

test('TabPanel_setActive_same_id_does_not_fire_tabchange', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());
  let count = 0;
  panel.on('tabchange', () => { count += 1; });

  panel.setActive('a');

  assert.equal(count, 0);
});

test('TabPanel_setActive_unknown_id_is_ignored', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());
  let count = 0;
  panel.on('tabchange', () => { count += 1; });

  panel.setActive('zzz');

  assert.equal(count, 0);
  assert.equal(panel.getActive(), 'a');
  assert.equal(contents(panel)[0].hidden, false);
  assert.equal(tabs(panel)[0].classList.contains('is-active'), true);
});

test('TabPanel_tab_click_activates_tab_and_fires_tabchange', (t) => {
  const { dom, panel, items } = setup();
  t.after(() => dom.window.close());
  const events = [];
  panel.on('tabchange', (e) => events.push(e.detail));

  tabs(panel)[2].click();

  assert.equal(panel.getActive(), 'c');
  assert.equal(contents(panel)[2].hidden, false);
  assert.equal(events.length, 1);
  assert.strictEqual(events[0].item, items[2]);
});

test('TabPanel_tab_click_on_active_tab_does_not_fire_tabchange', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());
  let count = 0;
  panel.on('tabchange', () => { count += 1; });

  tabs(panel)[0].click();

  assert.equal(count, 0);
});

test('TabPanel_without_ResizeObserver_renders_normally', (t) => {
  const { dom, panel } = setup({
    withResizeObserver: false,
    config: { drawerWidth: 500, iconOnlyWidth: 800 },
  });
  t.after(() => dom.window.close());

  assert.equal(panel.classList.contains('is-drawer'), false);
  assert.equal(panel.classList.contains('is-icon-only'), false);
  assert.equal(tabs(panel).length, 3);
});

test('TabPanel_observes_itself_on_render', (t) => {
  const { dom, panel, instances } = setup();
  t.after(() => dom.window.close());

  assert.equal(instances.length, 1);
  assert.deepEqual(instances[0].observed, [panel]);
});

test('TabPanel_width_below_drawerWidth_sets_is_drawer', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());

  resize(instances, 400);

  assert.equal(panel.classList.contains('is-drawer'), true);
  assert.equal(panel.classList.contains('is-icon-only'), false);
});

test('TabPanel_width_between_thresholds_sets_is_icon_only', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());

  resize(instances, 600);

  assert.equal(panel.classList.contains('is-icon-only'), true);
  assert.equal(panel.classList.contains('is-drawer'), false);
});

test('TabPanel_width_above_thresholds_clears_both_classes', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());

  resize(instances, 400);
  resize(instances, 1000);

  assert.equal(panel.classList.contains('is-drawer'), false);
  assert.equal(panel.classList.contains('is-icon-only'), false);
});

test('TabPanel_null_drawerWidth_is_skipped', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: null, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());

  resize(instances, 100);

  assert.equal(panel.classList.contains('is-drawer'), false);
  assert.equal(panel.classList.contains('is-icon-only'), true);
});

test('TabPanel_null_iconOnlyWidth_is_skipped', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: null } });
  t.after(() => dom.window.close());

  resize(instances, 600);

  assert.equal(panel.classList.contains('is-drawer'), false);
  assert.equal(panel.classList.contains('is-icon-only'), false);
});

test('TabPanel_menu_click_toggles_is_drawer_open', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  const menu = panel.querySelector('button.webc-tabpanel-menu');

  menu.click();
  assert.equal(panel.classList.contains('is-drawer-open'), true);

  menu.click();
  assert.equal(panel.classList.contains('is-drawer-open'), false);
});

test('TabPanel_backdrop_click_closes_drawer', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  panel.querySelector('div.webc-tabpanel-backdrop').click();

  assert.equal(panel.classList.contains('is-drawer-open'), false);
});

test('TabPanel_tab_click_closes_drawer_and_activates_tab', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  tabs(panel)[1].click();

  assert.equal(panel.classList.contains('is-drawer-open'), false);
  assert.equal(panel.getActive(), 'b');
});

test('TabPanel_Escape_closes_drawer', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  pressKey(dom, 'Escape');

  assert.equal(panel.classList.contains('is-drawer-open'), false);
});

test('TabPanel_other_keys_keep_drawer_open', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  pressKey(dom, 'a');

  assert.equal(panel.classList.contains('is-drawer-open'), true);
});

test('TabPanel_leaving_drawer_mode_closes_drawer', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  resize(instances, 1000);

  assert.equal(panel.classList.contains('is-drawer'), false);
  assert.equal(panel.classList.contains('is-drawer-open'), false);
});

test('TabPanel_destroy_disconnects_ResizeObserver', (t) => {
  const { dom, panel, instances } = setup();
  t.after(() => dom.window.close());

  panel.destroy();

  assert.equal(instances[0].disconnected, true);
});

test('TabPanel_destroy_removes_document_keydown_listener', (t) => {
  const { dom, panel, instances } = setup({ config: { drawerWidth: 500, iconOnlyWidth: 800 } });
  t.after(() => dom.window.close());
  resize(instances, 400);
  panel.querySelector('button.webc-tabpanel-menu').click();

  panel.destroy();
  pressKey(dom, 'Escape');

  assert.equal(panel.classList.contains('is-drawer-open'), true);
});

test('TabPanel_destroy_removes_element', (t) => {
  const { dom, panel } = setup();
  t.after(() => dom.window.close());

  panel.destroy();

  assert.equal(panel.parentNode, null);
});
