/* local-backend.js - the server's actions (api/index.php) done inside this browser.
   Used ONLY by the demo copy, and when the files are opened from a folder / on localhost without PHP.
   Records are kept in localStorage, photos in IndexedDB. The real website never uses this file's storage. */
(function () {
  'use strict';
  var C = window.Core, r3 = C.r3, num = C.num;
  var DEMO = window.ABRAJ_DEMO || null;
  var KEY = DEMO ? 'abraj_demo_db_v1' : 'abraj_local_db_v1';
  var IDB = DEMO ? 'abraj_demo_media' : 'abraj_local_media';
  var GB = 1024 * 1024 * 1024;
  var LIMITS = { pos: 10 * GB, site: 10 * GB, max_staff: 15 };

  var db = null, idb = null, urls = {}, readyP = null;

  function err(code, extra) { var e = new Error(code); e.code = code; e.extra = extra || null; return e; }
  function fresh() {
    var d = { users: [], docs: {}, meta: { counter: 0, pcounter: 0 }, log: [], media: {}, session: null };
    if (DEMO && DEMO.seed) DEMO.seed(d);
    return d;
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
    if (!db || !db.docs) { db = fresh(); try { save(); } catch (e) { /* ignore */ } }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { throw err('storage_browser'); } }
  function col(name) { return db.docs[name] || (db.docs[name] = {}); }
  function all(name) { var c = col(name); return Object.keys(c).map(function (k) { return c[k]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return Math.floor(Date.now() / 1000); }
  function me() { return db.session ? db.users.filter(function (u) { return u.id === db.session; })[0] || null : null; }
  function pub(u) { return u ? { id: u.id, username: u.username, name: u.name, role: u.role, perms: u.perms || [] } : null; }
  function log(type, ref, detail) { db.log.unshift({ ts: now(), user: (me() || {}).name || '', type: type, ref: ref || '', detail: detail || '' }); if (db.log.length > 800) db.log.length = 800; }
  function usage() {
    var u = { pos: { used: 0, count: 0, limit: LIMITS.pos }, site: { used: 0, count: 0, limit: LIMITS.site } };
    Object.keys(db.media).forEach(function (k) { var m = db.media[k]; if (u[m.scope]) { u[m.scope].used += m.bytes; u[m.scope].count++; } });
    return u;
  }
  var MEDIA_RE = /^[a-f0-9]{20}\.(webp|jpg|png)$/;
  function docMedia(doc) {
    var found = {};
    (function walk(v) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); });
      else if (typeof v === 'string' && MEDIA_RE.test(v)) found[v] = 1;
    })(doc);
    return Object.keys(found);
  }
  function mediaDelete(names) {
    names.forEach(function (n) {
      delete db.media[n];
      if (urls[n]) { try { URL.revokeObjectURL(urls[n].full); URL.revokeObjectURL(urls[n].thumb); } catch (e) { /* ignore */ } delete urls[n]; }
      if (idb) { try { idb.transaction('m', 'readwrite').objectStore('m').delete(n); } catch (e) { /* ignore */ } }
    });
  }
  function release(old, next) {
    if (!old) return;
    var keep = {}; (next ? docMedia(next) : []).forEach(function (m) { keep[m] = 1; });
    mediaDelete(docMedia(old).filter(function (m) { return !keep[m]; }));
  }

  /* ------------------------------------------------ photos in IndexedDB */
  function openIdb() {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open(IDB, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('m'); };
        rq.onsuccess = function () { idb = rq.result; res(); };
        rq.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }
  function loadUrls() {
    return new Promise(function (res) {
      if (!idb) return res();
      try {
        var st = idb.transaction('m').objectStore('m'), rq = st.openCursor();
        rq.onsuccess = function () {
          var cur = rq.result;
          if (!cur) return res();
          var v = cur.value;
          if (v && v.blob) urls[cur.key] = { full: URL.createObjectURL(v.blob), thumb: URL.createObjectURL(v.thumb || v.blob) };
          cur.continue();
        };
        rq.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }
  function ready() {
    if (!readyP) readyP = openIdb().then(loadUrls).then(function () { load(); });
    return readyP;
  }
  function mediaUrl(id, thumb) {
    if (urls[id]) return thumb ? urls[id].thumb : urls[id].full;
    if (DEMO && DEMO.media && DEMO.media[id]) return (window.ROOT || '') + DEMO.media[id];   // pictures that ship with the demo (paths from the site root)
    return '';
  }

  /* ------------------------------------------------ stock + bills (the same rules as the server) */
  function product(id) { return col('products')[id] || null; }
  function total(p) { return r3(num((p.stock || {}).shop) + num((p.stock || {}).wh)); }
  function applyStock(items, loc, sign) {
    items.forEach(function (it) {
      var p = it.pid ? product(it.pid) : null;
      if (!p) return;
      p.stock = p.stock || { shop: 0, wh: 0 };
      p.stock[loc] = r3(num(p.stock[loc]) + sign * num(it.q) * num(it.f || 1));
    });
  }
  function stockOf(items) {
    var out = {};
    items.forEach(function (it) { var p = it.pid ? product(it.pid) : null; if (p && !out[it.pid]) out[it.pid] = { stock: clone(p.stock), cost: p.cost || 0, lastCost: p.lastCost || 0 }; });
    return out;
  }
  function cleanItems(items, sale) {
    if (!Array.isArray(items) || !items.length) throw err('bad_doc');
    return items.map(function (it) {
      var q = num(it.q), f = num(it.f || 1), price = num(sale ? it.price : it.cost);
      if (q <= 0 || f <= 0 || price < 0) throw err('bad_doc');
      var row = { pid: it.pid || '', n: String(it.n || ''), a: String(it.a || ''), unit: String(it.unit || ''), unitEn: String(it.unitEn || ''), f: f, q: q };
      if (sale) row.price = price; else row.cost = price;
      return row;
    });
  }
  function cleanPays(pays) {
    return (pays || []).map(function (p) {
      if (!(num(p.amount) > 0)) throw err('bad_doc');
      return { amount: r3(num(p.amount)), method: p.method || 'cash', date: p.date || C.today(), by: p.by || (me() || {}).name || '' };
    });
  }
  function paidSum(pays) { return r3(pays.reduce(function (t, p) { return t + num(p.amount); }, 0)); }
  function checkInvoice(inp) {
    var doc = { items: cleanItems(inp.items, true) };
    doc.items.forEach(function (it) { var p = it.pid ? product(it.pid) : null; it.cost = p ? Math.round(num(p.cost) * it.f * 1e5) / 1e5 : 0; });
    var t = C.Calc.totals(doc.items, inp.discount, inp.vatPct);
    ['sub', 'discount', 'vat', 'total'].forEach(function (k) { if (Math.abs(num(inp[k]) - t[k]) > 0.002) throw err('bad_totals'); doc[k] = t[k]; });
    doc.vatPct = num(inp.vatPct);
    doc.payments = cleanPays(inp.payments);
    if (paidSum(doc.payments) > doc.total + 0.002) throw err('overpaid');
    doc.type = inp.type === 'wholesale' ? 'wholesale' : 'retail';
    doc.loc = inp.loc === 'wh' ? 'wh' : 'shop';
    doc.date = inp.date || C.today(); doc.time = inp.time || C.nowTime();
    ['customerId', 'customerName', 'customerPhone', 'customerVat', 'note'].forEach(function (k) { doc[k] = String(inp[k] || '').trim(); });
    return doc;
  }
  function prefix() { var s = col('settings').main || {}; return (String(s.prefix || 'INV').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'INV').slice(0, 8); }
  function padNo(n, p) { return p + '-' + String(n).padStart(5, '0'); }

  function publicSite() {
    var s = col('settings').main || {}, site = col('site').main || {}, biz = {};
    ['name', 'nameAr', 'activity', 'activityAr', 'addr', 'addrAr', 'phone', 'whatsapp', 'email', 'cr', 'logo', 'instagram', 'map', 'hours', 'hoursAr', 'cats'].forEach(function (k) { if (k in s) biz[k] = s[k]; });
    var showPrice = !('showPrices' in site) || !!site.showPrices;
    var products = all('products').filter(function (p) { return p.site && !p.archived; }).map(function (p) {
      return { id: p.id, name: p.name || '', nameEn: p.nameEn || '', cat: p.cat || '', img: p.img || '', desc: p.desc || '', descEn: p.descEn || '',
        units: (p.units || []).filter(function (u) { return num(u.r) > 0 || num(u.w) > 0; }).map(function (u) { return { n: u.n, e: u.e, f: u.f, r: showPrice ? num(u.r) : 0 }; }),
        ws: (p.units || []).some(function (u) { return num(u.w) > 0; }), out: total(p) <= 0, created: p.created || 0 };
    });
    var posts = all('posts').filter(function (p) { return !p.hidden; }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var sections = all('sections').filter(function (p) { return !p.hidden; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    return { ok: true, biz: biz, site: site, products: products, posts: posts, sections: sections };
  }

  /* ------------------------------------------------ the actions */
  var A = {
    status: function () { return { ok: true, setup_needed: !db.users.length, user: pub(me()), features: { staff_accounts: true, max_staff: LIMITS.max_staff, website: true } }; },
    setup: function (b) {
      if (db.users.length) throw err('already_setup');
      db.users.push({ id: 1, username: String(b.username || 'owner').toLowerCase(), name: b.name || b.username, role: 'admin', perms: [] });
      if (b.viewer && b.viewer.username) db.users.push({ id: 2, username: String(b.viewer.username).toLowerCase(), name: b.viewer.name || 'Support', role: 'viewer', perms: [] });
      db.session = 1;
      return { ok: true, user: pub(me()) };
    },
    login: function (b) {
      var name = String(b.username || '').toLowerCase().trim();
      var u = db.users.filter(function (x) { return x.username === name; })[0];
      if (!u && DEMO) u = db.users[0];                       // the demo lets anybody in
      if (!u) throw err('bad_login');
      db.session = u.id;
      return { ok: true, user: pub(u) };
    },
    logout: function () { db.session = null; return { ok: true }; },
    load: function () {
      if (!me()) throw err('not_logged_in');
      var r = { ok: true, user: pub(me()), features: A.status().features, storage: usage(), counter: db.meta.counter, pcounter: db.meta.pcounter,
        settings: col('settings').main || null, unread: all('messages').filter(function (m) { return !m.read; }).length };
      ['products', 'customers', 'suppliers', 'invoices', 'purchases', 'expenses', 'reminders', 'moves'].forEach(function (k) { r[k] = clone(all(k)); });
      return r;
    },
    site_load: function () {
      if (!me()) throw err('not_logged_in');
      return { ok: true, user: pub(me()), features: A.status().features, storage: usage(), settings: col('settings').main || null, site: col('site').main || null,
        posts: clone(all('posts')), sections: clone(all('sections')), subscribers: clone(all('subscribers')), messages: clone(all('messages')), products: clone(all('products')) };
    },
    site_public: function () { return clone(publicSite()); },
    site_subscribe: function (b) {
      var site = col('site').main || {}, fields = site.subFields || ['name', 'phone'], doc = { id: C.uid(), ts: now(), name: '', phone: '', email: '' };
      fields.forEach(function (k) { doc[k] = String(b[k] || '').trim(); if (!doc[k]) throw err('missing_' + k); });
      if (doc.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(doc.email)) throw err('bad_email');
      var dup = all('subscribers').some(function (s) { return (doc.phone && s.phone === doc.phone) || (doc.email && s.email === doc.email); });
      if (!dup) col('subscribers')[doc.id] = doc;
      return { ok: true, already: dup };
    },
    site_message: function (b) {
      var doc = { id: C.uid(), ts: now(), read: false, name: String(b.name || '').trim(), phone: String(b.phone || '').trim(), email: String(b.email || '').trim(), text: String(b.text || '').trim(), product: String(b.product || '') };
      if (!doc.name) throw err('missing_name');
      if (!doc.phone && !doc.email) throw err('missing_phone');
      if (!doc.text) throw err('missing_text');
      col('messages')[doc.id] = doc;
      return { ok: true };
    },
    poll: function () { return { ok: true, unread: all('messages').filter(function (m) { return !m.read; }).length, storage: usage() }; },
    health: function () {
      return { ok: true, kind: 'browser', dir: DEMO ? 'demo' : 'this browser', writable: true, db_bytes: (JSON.stringify(db) || '').length, php: '-', sqlite: '-', backups: 0, last_backup: null,
        invoices: all('invoices').length, products: all('products').length, media_writable: !!idb, storage: usage(), time: C.today() + ' ' + C.nowTime() };
    },
    put: function (b) {
      var c = b.col, single = c === 'settings' || c === 'site', doc = clone(b.doc), id = single ? 'main' : doc.id, old = col(c)[id] || null;
      if (c === 'products') {
        if (!String(doc.name || '').trim()) throw err('missing_name');
        doc.units = (doc.units || []).map(function (u) { return { n: u.n, e: u.e || '', f: num(u.f) || 1, r: r3(num(u.r)), w: r3(num(u.w)), bc: String(u.bc || '').trim() }; });
        if (old) {
          doc.stock = old.stock; doc.created = old.created; doc.lastCost = old.lastCost || doc.cost || 0;
          var ch = [];
          if (JSON.stringify(old.units) !== JSON.stringify(doc.units)) ch.push('prices/units');
          if (Math.abs(num(old.cost) - num(doc.cost)) > 0.000005) ch.push('cost ' + num(old.cost) + ' > ' + num(doc.cost));
          if (ch.length) log('product_edit', doc.name, ch.join(', '));
        } else {
          doc.stock = { shop: r3(Math.max(0, num((doc.stock || {}).shop))), wh: r3(Math.max(0, num((doc.stock || {}).wh))) };
          doc.cost = num(doc.cost); doc.lastCost = doc.cost; doc.created = now(); doc.createdBy = (me() || {}).name || '';
          log('product_add', doc.name, 'stock ' + total(doc));
        }
        doc.minStock = r3(Math.max(0, num(doc.minStock)));
      }
      if (c === 'expenses') { if (!(num(doc.amount) > 0)) throw err('bad_doc'); doc.amount = r3(num(doc.amount)); if (!old) { doc.created = now(); doc.createdBy = (me() || {}).name || ''; } }
      if ((c === 'posts' || c === 'sections') && !old) doc.ts = doc.ts || now();
      col(c)[id] = doc;
      release(old, doc);
      return { ok: true, doc: clone(doc), storage: usage() };
    },
    del: function (b) {
      (b.ids || [b.id]).forEach(function (id) {
        var old = col(b.col)[id];
        if (!old) return;
        delete col(b.col)[id];
        release(old, null);
        if (b.col === 'products') log('product_del', old.name, 'stock ' + total(old));
      });
      return { ok: true, storage: usage() };
    },
    product_site: function (b) {
      var p = product(b.id);
      if (!p) throw err('not_found');
      p.site = !!b.site;
      if ('desc' in b) p.desc = b.desc;
      if ('descEn' in b) p.descEn = b.descEn;
      return { ok: true };
    },
    create_invoice: function (b) {
      var doc = checkInvoice(b.doc), n = db.meta.counter + 1;
      if (!doc.customerName && paidSum(doc.payments) < doc.total - 0.002) throw err('credit_needs_customer');
      db.meta.counter = n;
      doc.no = n; doc.id = String(n); doc.number = padNo(n, prefix()); doc.created = now(); doc.createdBy = (me() || {}).name || ''; doc.void = false;
      applyStock(doc.items, doc.loc, -1);
      col('invoices')[doc.id] = doc;
      return { ok: true, doc: clone(doc), counter: n, stock: stockOf(doc.items) };
    },
    update_invoice: function (b) {
      var old = col('invoices')[b.doc.id];
      if (!old) throw err('not_found');
      if (old.void) throw err('is_void');
      applyStock(old.items, old.loc || 'shop', +1);
      var doc;
      try { doc = checkInvoice(b.doc); } catch (e) { applyStock(old.items, old.loc || 'shop', -1); throw e; }
      applyStock(doc.items, doc.loc, -1);
      ['id', 'no', 'number', 'created', 'createdBy'].forEach(function (k) { doc[k] = old[k]; });
      doc.void = false;
      doc.edits = (old.edits || []).concat([{ ts: now(), by: (me() || {}).name || '', from: old.total, to: doc.total }]).slice(-30);
      col('invoices')[doc.id] = doc;
      log('invoice_edit', doc.number, old.total + ' > ' + doc.total);
      return { ok: true, doc: clone(doc), stock: stockOf(doc.items.concat(old.items)) };
    },
    void_invoice: function (b) {
      var old = col('invoices')[b.id];
      if (!old) throw err('not_found');
      if (!old.void) {
        applyStock(old.items, old.loc || 'shop', +1);
        old.void = true; old.voidedAt = now(); old.voidedBy = (me() || {}).name || ''; old.voidReason = b.reason || '';
        log('invoice_void', old.number, String(old.total));
      }
      return { ok: true, doc: clone(old), stock: stockOf(old.items) };
    },
    invoice_touch: function (b) {
      var old = col('invoices')[b.id];
      if (!old) throw err('not_found');
      if (b.payment) {
        if (old.void) throw err('is_void');
        var pay = cleanPays([b.payment])[0];
        if (paidSum(old.payments.concat([pay])) > num(old.total) + 0.002) throw err('overpaid');
        old.payments.push(pay);
      }
      if ('phone' in b) old.customerPhone = String(b.phone || '').trim();
      return { ok: true, doc: clone(old) };
    },
    del_invoices: function (b) {
      var touched = [];
      b.ids.forEach(function (id) {
        var old = col('invoices')[id];
        if (!old) return;
        if (!old.void) { applyStock(old.items, old.loc || 'shop', +1); touched = touched.concat(old.items); }
        delete col('invoices')[id];
        log('invoice_del', old.number, String(old.total));
      });
      return { ok: true, deleted: b.ids.length, stock: stockOf(touched) };
    },
    create_purchase: function (b) {
      var inp = b.doc, doc = { items: cleanItems(inp.items, false) };
      doc.total = r3(doc.items.reduce(function (t, it) { return t + r3(it.cost * it.q); }, 0));
      if (Math.abs(num(inp.total) - doc.total) > 0.002) throw err('bad_totals');
      doc.payments = cleanPays(inp.payments);
      if (paidSum(doc.payments) > doc.total + 0.002) throw err('overpaid');
      doc.loc = inp.loc === 'shop' ? 'shop' : 'wh';
      doc.date = inp.date || C.today();
      ['supplierId', 'supplierName', 'ref', 'note'].forEach(function (k) { doc[k] = String(inp[k] || '').trim(); });
      doc.items.forEach(function (it) {
        var p = it.pid ? product(it.pid) : null;
        if (!p) return;
        p.stock = p.stock || { shop: 0, wh: 0 };
        var add = it.q * it.f, unitCost = it.cost / it.f, have = total(p);
        p.cost = Math.round((have > 0 ? (have * num(p.cost) + add * unitCost) / (have + add) : unitCost) * 1e5) / 1e5;
        p.lastCost = Math.round(unitCost * 1e5) / 1e5;
        p.stock[doc.loc] = r3(num(p.stock[doc.loc]) + add);
        if (doc.supplierName) p.supplier = doc.supplierName;
      });
      var n = db.meta.pcounter + 1;
      db.meta.pcounter = n;
      doc.no = n; doc.id = 'p' + n; doc.number = padNo(n, 'PUR'); doc.created = now(); doc.createdBy = (me() || {}).name || '';
      col('purchases')[doc.id] = doc;
      log('purchase_add', doc.number, String(doc.total));
      return { ok: true, doc: clone(doc), stock: stockOf(doc.items) };
    },
    purchase_touch: function (b) {
      var old = col('purchases')[b.id];
      if (!old) throw err('not_found');
      var pay = cleanPays([b.payment])[0];
      if (paidSum(old.payments.concat([pay])) > num(old.total) + 0.002) throw err('overpaid');
      old.payments.push(pay);
      return { ok: true, doc: clone(old) };
    },
    del_purchase: function (b) {
      var old = col('purchases')[b.id];
      if (!old) throw err('not_found');
      applyStock(old.items, old.loc || 'wh', -1);
      delete col('purchases')[b.id];
      log('purchase_del', old.number, String(old.total));
      return { ok: true, stock: stockOf(old.items) };
    },
    stock_move: function (b) {
      var p = product(b.pid), qty = num(b.qty), loc = b.loc === 'wh' ? 'wh' : 'shop', to = '';
      if (!p) throw err('not_found');
      p.stock = p.stock || { shop: 0, wh: 0 };
      var before = num(p.stock[loc]);
      if (b.type === 'add') p.stock[loc] = r3(before + qty);
      if (b.type === 'remove') p.stock[loc] = r3(before - qty);
      if (b.type === 'count') p.stock[loc] = r3(qty);
      if (b.type === 'transfer') {
        to = loc === 'shop' ? 'wh' : 'shop';
        if (qty > before + 0.0005) throw err('not_enough_stock');
        p.stock[loc] = r3(before - qty); p.stock[to] = r3(num(p.stock[to]) + qty);
      }
      var move = { id: C.uid(), ts: now(), pid: b.pid, name: p.name, type: b.type, loc: loc, to: to, qty: qty, before: before, after: p.stock[loc], reason: b.reason || '', by: (me() || {}).name || '' };
      col('moves')[move.id] = move;
      log('stock_' + b.type, p.name, before + ' > ' + p.stock[loc] + ' (' + loc + (to ? ' > ' + to : '') + ')');
      return { ok: true, move: clone(move), stock: stockOf([{ pid: b.pid }]) };
    },
    media_upload: function (b) {
      var bytes = b.blob.size + (b.thumbBlob ? b.thumbBlob.size : 0), use = usage()[b.scope];
      if (use.limit > 0 && use.used + bytes > use.limit) throw err('storage_full', { storage: usage() });
      var id = (C.uid() + C.uid()).slice(0, 20) + (b.blob.type === 'image/webp' ? '.webp' : b.blob.type === 'image/png' ? '.png' : '.jpg');
      db.media[id] = { scope: b.scope, bytes: bytes };
      urls[id] = { full: URL.createObjectURL(b.blob), thumb: URL.createObjectURL(b.thumbBlob || b.blob) };
      if (idb) { try { idb.transaction('m', 'readwrite').objectStore('m').put({ blob: b.blob, thumb: b.thumbBlob || null }, id); } catch (e) { /* kept for this visit only */ } }
      return { ok: true, id: id, bytes: bytes, storage: usage() };
    },
    media_del: function (b) {
      var used = {};
      Object.keys(db.docs).forEach(function (c) { docMedia(db.docs[c]).forEach(function (m) { used[m] = 1; }); });
      mediaDelete((b.ids || []).filter(function (m) { return !used[m]; }));
      return { ok: true, storage: usage() };
    },
    storage: function () { return { ok: true, storage: usage() }; },
    log: function () { return { ok: true, log: clone(db.log) }; },
    restore: function (b) {
      var d = b.data;
      ['products', 'customers', 'suppliers', 'invoices', 'purchases', 'expenses', 'reminders', 'moves'].forEach(function (k) {
        if (!(k in d)) return;
        db.docs[k] = {};
        (d[k] || []).forEach(function (x) { db.docs[k][x.id] = x; });
      });
      if (d.settings) col('settings').main = d.settings;
      db.meta.counter = Math.max(num(d.counter), d.invoices.reduce(function (m, i) { return Math.max(m, i.no || 0); }, 0), db.meta.counter);
      db.meta.pcounter = Math.max(num(d.pcounter), (d.purchases || []).reduce(function (m, i) { return Math.max(m, i.no || 0); }, 0), db.meta.pcounter);
      return { ok: true };
    },
    users: function () { return { ok: true, users: db.users.map(pub), max_staff: LIMITS.max_staff }; },
    user_add: function (b) {
      var name = String(b.username || '').toLowerCase().trim();
      if (!/^[a-z0-9._-]{3,32}$/.test(name)) throw err('bad_username');
      if (String(b.password || '').length < 8) throw err('password_short');
      if (db.users.some(function (u) { return u.username === name; })) throw err('username_taken');
      if (db.users.filter(function (u) { return u.role === 'staff'; }).length >= LIMITS.max_staff) throw err('staff_limit');
      db.users.push({ id: db.users.reduce(function (m, u) { return Math.max(m, u.id); }, 0) + 1, username: name, name: b.name || name, role: 'staff', perms: b.perms || [] });
      return { ok: true };
    },
    user_update: function (b) {
      var u = db.users.filter(function (x) { return x.id === b.id; })[0];
      if (!u) throw err('not_found');
      if (u.role !== 'staff') throw err('protected_account');
      u.name = b.name || u.username; u.perms = b.perms || [];
      return { ok: true };
    },
    user_del: function (b) {
      var u = db.users.filter(function (x) { return x.id === b.id; })[0];
      if (!u) throw err('not_found');
      if (u.role !== 'staff') throw err('protected_account');
      db.users = db.users.filter(function (x) { return x.id !== b.id; });
      return { ok: true };
    },
    user_password: function (b) { if (String(b.password || '').length < 8) throw err('password_short'); return { ok: true }; }
  };
  var READ = { status: 1, load: 1, site_load: 1, site_public: 1, poll: 1, health: 1, storage: 1, log: 1, users: 1 };

  function handle(action, body) {
    return ready().then(function () {
      if (!A[action]) throw err('unknown_action');
      var snap = READ[action] ? null : JSON.stringify(db);
      try {
        var r = A[action](body || {});
        if (!READ[action]) save();
        return r;
      } catch (e) {
        if (snap) db = JSON.parse(snap);                   // nothing is half-applied
        throw e.code ? e : err('server_error');
      }
    });
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return new Promise(function (res) {
      try { if (idb) idb.close(); var rq = indexedDB.deleteDatabase(IDB); rq.onsuccess = rq.onerror = rq.onblocked = function () { res(); }; } catch (e) { res(); }
    });
  }

  window.LocalBackend = { ready: ready, handle: handle, mediaUrl: mediaUrl, reset: reset };
})();
