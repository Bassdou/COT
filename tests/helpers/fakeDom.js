'use strict';
/**
 * DOM מדומה מינימלי להרצת calculator.js האמיתי תחת Node (בלי jsdom ובלי התקנות).
 * הוא תומך רק במה שהאפליקציה צריכה: מזהים (id), מחלקות, מאפיינים, innerHTML של הטבלה,
 * וכמה סלקטורים ספציפיים (tr:nth-child(N) .shift-type-input וכו').
 */

function stripTags(html) {
  return String(html).replace(/<[^>]*>/g, '');
}

class FakeClassList {
  constructor(el) { this.el = el; }
  _set() { return new Set((this.el.attrs.class || '').split(/\s+/).filter(Boolean)); }
  _save(set) { this.el.attrs.class = Array.from(set).join(' '); }
  add(...c) { const s = this._set(); c.forEach((x) => s.add(x)); this._save(s); }
  remove(...c) { const s = this._set(); c.forEach((x) => s.delete(x)); this._save(s); }
  contains(c) { return this._set().has(c); }
}

class FakeEl {
  constructor(id, tag) {
    this.id = id || '';
    this.tagName = (tag || 'DIV').toUpperCase();
    this.attrs = {};
    this.style = {};
    this.children = [];
    this.parent = null;
    this.readOnly = false;
    this.disabled = false;
    this.nextElementSibling = { innerText: '' };
    this._value = '';
    this._text = '';
    this._html = '';
    this.classList = new FakeClassList(this);
    this.onclick = null;
  }
  get value() { return this._value; }
  set value(v) { this._value = String(v); }
  get innerText() { return this._text || stripTags(this._html); }
  set innerText(v) { this._text = String(v); this._html = ''; }
  get innerHTML() { return this._html || this._text; }
  set innerHTML(v) { this._html = String(v); this._text = ''; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); }
  hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n); }
  closest(sel) {
    let el = this;
    const tag = sel.toUpperCase();
    while (el) { if (el.tagName === tag) return el; el = el.parent; }
    return null;
  }
  focus() {} select() {} blur() {} click() {}
  cloneNode() { return new FakeEl(this.id, this.tagName); }
  get parentNode() { return { replaceChild() {} }; }
  querySelectorAll(sel) {
    if (sel === '.time-input') return this.children.filter((c) => c.classList.contains('time-input'));
    if (sel === 'tr') return this.children.filter((c) => c.tagName === 'TR');
    if (sel === 'input.shift-type-input, input.time-input') return this.children.filter((c) => c.classList.contains('shift-type-input') || c.classList.contains('time-input'));
    return [];
  }
  querySelector(sel) {
    if (sel === '.shift-type-input') return this.children.find((c) => c.classList.contains('shift-type-input')) || null;
    if (sel === '.time-input') return this.children.find((c) => c.classList.contains('time-input')) || null;
    return null;
  }
}

function parseAttrs(str) {
  const attrs = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1]] = m[2];
  return attrs;
}

function createFakeDocument() {
  const registry = new Map();
  const listeners = {};
  const doc = {
    registry,
    listeners,
    body: { appendChild() {}, removeChild() {}, insertAdjacentHTML() {} },
    title: '',
    // לא כל id נוצר אוטומטית: תאים של הטבלה (val-*) קיימים רק אם נוצרו בפועל, כמו בדפדפן.
    getElementById(id) {
      if (registry.has(id)) return registry.get(id);
      if (id.startsWith('val-')) return null;
      const el = new FakeEl(id);
      registry.set(id, el);
      return el;
    },
    createElement(tag) {
      if (String(tag).toLowerCase() === 'option') return { value: '', text: '', selected: false };
      return new FakeEl('', tag);
    },
    querySelector(sel) {
      let m = sel.match(/^(?:#tbody )?tr:nth-child\((\d+)\) \.shift-type-input$/);
      if (m) {
        const row = doc.getElementById('tbody').children[Number(m[1]) - 1];
        return row ? row.querySelector('.shift-type-input') : null;
      }
      m = sel.match(/^#tbody tr:nth-child\((\d+)\)$/);
      if (m) return doc.getElementById('tbody').children[Number(m[1]) - 1] || null;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, ev) { (listeners[type] || []).forEach((fn) => fn(ev)); },
  };

  // innerHTML של tbody: ממיר את המחרוזת ש-generateTable בונה לשורות ותאים
  const tbody = new FakeEl('tbody', 'TBODY');
  let tbodyHtml = '';
  Object.defineProperty(tbody, 'innerHTML', {
    get() { return tbodyHtml; },
    set(html) {
      tbodyHtml = String(html);
      tbody.children = [];
      // מחיקת תאים ישנים מהרישום
      for (const k of Array.from(registry.keys())) if (k.startsWith('val-')) registry.delete(k);
      const rowRe = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/g;
      let rm;
      while ((rm = rowRe.exec(tbodyHtml))) {
        const tr = new FakeEl('', 'TR');
        tr.attrs = parseAttrs(rm[1]);
        tr.parent = tbody;
        const cellRe = /<(td|input)\b([^>]*)>/g;
        let cm;
        while ((cm = cellRe.exec(rm[2]))) {
          const el = new FakeEl('', cm[1]);
          el.attrs = parseAttrs(cm[2]);
          el.id = el.attrs.id || '';
          el.parent = tr;
          if (cm[1].toLowerCase() === 'input') { el._value = el.attrs.value || ''; tr.children.push(el); }
          if (el.id) registry.set(el.id, el);
        }
        tbody.children.push(tr);
      }
    },
  });
  registry.set('tbody', tbody);
  return doc;
}

module.exports = { createFakeDocument, FakeEl, stripTags };
