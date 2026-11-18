'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const WEBC_CODE = fs.readFileSync(path.join(__dirname, '..', 'src', 'webc.js'), 'utf8');

/**
 * テスト毎に新しい jsdom を生成し、webc.js を評価して window.WebC を返す。
 * customElements.define の重複登録を避けるため、呼び出しごとに新しい window を作る。
 */
function createWebC() {
  const dom = new JSDOM('<!doctype html><body><div id="list"></div></body>', {
    runScripts: 'outside-only',
  });
  dom.window.eval(WEBC_CODE);
  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    WebC: dom.window.WebC,
  };
}

/** DropDown の使用例で用いるレコード（呼び出しごとに新しい配列を返す） */
const createDropDownRecords = () => [
  { val: '1', name: 'フィールド1' },
  { val: '2', name: 'フィールド2' },
  { val: '3', name: 'フィールド3' },
];

/**
 * window.fetch を差し替える。呼び出し (url, init) を記録し、responder(url, init) の戻り値を返す。
 * @returns {Array<{url: string, init: object}>} 記録された呼び出し
 */
function mockFetch(window, responder) {
  const calls = [];
  window.fetch = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  return calls;
}

/**
 * fetch の Response 相当（実装が使う ok / status / json() / text() のみ）。
 * body が文字列ならそのまま text() で返し、オブジェクトなら JSON 文字列として扱う。
 */
function makeResponse({ ok = true, status = 200, body = null } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok,
    status,
    json: async () => JSON.parse(text),
    text: async () => text,
  };
}

module.exports = { createWebC, createDropDownRecords, mockFetch, makeResponse };
