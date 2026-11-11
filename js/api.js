/* api.js - all saving and loading goes through here (point of sale AND website control panel).

   Two back ends behind one interface:
     server -> the PHP program on Hostinger (real login, SQLite database, shared by every device)
     local  -> js/local-backend.js, the same actions done inside this browser. Used ONLY by the demo copy, or when the
               files are opened straight from a folder / on localhost with no PHP. A real website address never falls
               back to it: there a missing server is a loud error, never a quiet "saved in the browser".
   Also here: photos (shrinking before upload, upload, addresses) and the storage ring.                               */
(function () {
  'use strict';
  var C = window.Core, L = C.L;
  var ROOT = window.ROOT || '';
  var DEMO = window.ABRAJ_DEMO || null;
  var API = ROOT + 'api/index.php';

  var S = {
    mode: 'server', user: null, features: {}, unread: 0,
    storage: { pos: { used: 0, count: 0, limit: 0 }, site: { used: 0, count: 0, limit: 0 } },
    settings: C.defaultSettings(), counter: 0, pcounter: 0,
    products: [], customers: [], suppliers: [], invoices: [], purchases: [], expenses: [], reminders: [], moves: [],
    site: {}, posts: [], sections: [], subscribers: [], messages: []
  };
  var hooks = { authLost: null, storage: null };

  function err(code, status, extra) { var e = new Error(code); e.code = code; e.status = status || 0; e.extra = extra || null; return e; }

  /* ------------------------------------------------ calls */
  function serverCall(action, body) {
    var post = body !== undefined;
    var opt = { method: post ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'X-Requested-With': 'abraj' } };
    if (post) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    var ctl = window.AbortController ? new AbortController() : null, timer = null;
    if (ctl) { opt.signal = ctl.signal; timer = setTimeout(function () { ctl.abort(); }, /restore|load|media/.test(action) ? 120000 : 40000); }
    var done = function () { if (timer) clearTimeout(timer); };
    return fetch(API + '?action=' + action, opt).then(function (res) {
      return res.text().then(function (txt) {
        done();
        var j = null;
        try { j = JSON.parse(txt); } catch (e) { /* not our API */ }
        if (!j || typeof j !== 'object') throw err('no_api', res.status);
        if (!j.ok) {
          var e = err(j.error || 'server_error', res.status, j);
          if (e.code === 'not_logged_in' && action !== 'status' && hooks.authLost) hooks.authLost();
          throw e;
        }
        return j;
      });
    }, function () { done(); throw err('network'); });
  }
  function call(action, body) {
    var p = S.mode === 'local' ? window.LocalBackend.handle(action, body) : serverCall(action, body);
    return p.then(function (r) { if (r && r.storage) setStorage(r.storage); return r; },
      function (e) { if (e && e.extra && e.extra.storage) setStorage(e.extra.storage); throw e; });
  }
  function setStorage(st) { S.storage = st; if (hooks.storage) hooks.storage(st); }

  /* ------------------------------------------------ boot */
  /* Resolves to 'ready' | 'login' | 'setup'. */
  function status() {
    if (DEMO) { S.mode = 'local'; return window.LocalBackend.ready().then(function () { return window.LocalBackend.handle('status'); }); }
    return serverCall('status').then(function (st) { S.mode = 'server'; return st; }, function (e) {
      var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
      if (local && window.LocalBackend && (e.code === 'no_api' || e.code === 'network')) {
        S.mode = 'local';
        return window.LocalBackend.ready().then(function () { return window.LocalBackend.handle('status'); });
      }
      throw e;
    });
  }
  function boot(kind) {
    return status().then(function (st) {
      S.features = st.features || {};
      if (st.setup_needed) return 'setup';
      if (!st.user) return 'login';
      S.user = st.user;
      if (kind === 'none') return 'ready';
      return (kind === 'admin' ? loadSite() : loadPos()).then(function () { return 'ready'; });
    });
  }
  function fixProduct(p) {
    p.units = Array.isArray(p.units) && p.units.length ? p.units : [{ n: 'حبة', e: 'Piece', f: 1, r: 0, w: 0, bc: '' }];
    p.stock = p.stock && typeof p.stock === 'object' ? p.stock : { shop: 0, wh: 0 };
    return p;
  }
  function adoptCommon(d) {
    S.user = d.user || S.user; S.features = d.features || S.features;
    S.settings = Object.assign(C.defaultSettings(), d.settings || {});
    if (d.storage) setStorage(d.storage);
  }
  function loadPos() {
    return call('load').then(function (d) {
      adoptCommon(d);
      S.products = (d.products || []).map(fixProduct);
      ['customers', 'suppliers', 'invoices', 'purchases', 'expenses', 'reminders', 'moves'].forEach(function (k) { S[k] = d[k] || []; });
      S.counter = d.counter || 0; S.pcounter = d.pcounter || 0; S.unread = d.unread || 0;
      // a brand-new install: write the default business details once (only the owner can)
      if (!d.settings && isAdmin()) return call('put', { col: 'settings', doc: S.settings }).then(function () {});
    });
  }
  function loadSite() {
    return call('site_load').then(function (d) {
      adoptCommon(d);
      S.site = d.site || {};
      S.products = (d.products || []).map(fixProduct);
      ['posts', 'sections', 'subscribers', 'messages'].forEach(function (k) { S[k] = d[k] || []; });
      S.unread = S.messages.filter(function (m) { return !m.read; }).length;
    });
  }
  /* the public website: no sign-in. (Demo copy / files opened from a folder: answered inside the browser.) */
  function publicCall(action, body) {
    if (DEMO) { S.mode = 'local'; return window.LocalBackend.handle(action, body); }
    return serverCall(action, body).catch(function (e) {
      var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
      if (local && window.LocalBackend && (e.code === 'no_api' || e.code === 'network')) { S.mode = 'local'; return window.LocalBackend.handle(action, body); }
      throw e;
    });
  }
  function poll() { return call('poll').then(function (r) { S.unread = r.unread || 0; return r; }); }
  function login(u, p) { return call('login', { username: u, password: p }).then(function (r) { S.user = r.user; return r.user; }); }
  function setup(body) { return call('setup', body).then(function (r) { S.user = r.user; return r.user; }); }
  function logout() { return call('logout', {}).then(function () { S.user = null; }); }

  /* ------------------------------------------------ who may do what (the server enforces the same rules) */
  function isAdmin() { return !!S.user && S.user.role === 'admin'; }
  function isViewer() { return !!S.user && S.user.role === 'viewer'; }
  function sees(perm) { return !!S.user && (S.user.role !== 'staff' || (S.user.perms || []).indexOf(perm) >= 0); }
  function can(perm) { return !!S.user && !isViewer() && (isAdmin() || (S.user.perms || []).indexOf(perm) >= 0); }
  function guard() { return isViewer() ? Promise.reject(err('read_only')) : null; }

  /* ------------------------------------------------ small list helpers */
  function upsert(list, doc) {
    for (var i = 0; i < list.length; i++) if (list[i].id === doc.id) { list[i] = doc; return; }
    list.push(doc);
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function drop(key, ids) { var g = {}; ids.forEach(function (i) { g[i] = 1; }); S[key] = S[key].filter(function (x) { return !g[x.id]; }); }
  /* the server sends back the fresh quantities of the products a change touched */
  function applyStock(map) {
    if (!map) return;
    Object.keys(map).forEach(function (pid) {
      var p = byId(S.products, pid);
      if (p) { p.stock = map[pid].stock; if ('cost' in map[pid]) { p.cost = map[pid].cost; p.lastCost = map[pid].lastCost; } }
    });
  }
  function put(col, doc, key) {
    var g = guard(); if (g) return g;
    return call('put', { col: col, doc: doc }).then(function (r) { if (key) upsert(S[key], col === 'products' ? fixProduct(r.doc) : r.doc); return r.doc; });
  }
  function del(col, ids, key) {
    var g = guard(); if (g) return g;
    return call('del', { col: col, ids: ids }).then(function () { if (key) drop(key, ids); });
  }

  /* ------------------------------------------------ writes: point of sale */
  function saveSettings(patch) {
    var g = guard(); if (g) return g;
    var next = Object.assign({}, S.settings, patch);
    return call('put', { col: 'settings', doc: next }).then(function (r) { S.settings = Object.assign(C.defaultSettings(), r.doc); });
  }
  function createInvoice(inv) {
    var g = guard(); if (g) return g;
    return call('create_invoice', { doc: inv }).then(function (r) { upsert(S.invoices, r.doc); S.counter = r.counter; applyStock(r.stock); return r.doc; });
  }
  function updateInvoice(inv) {
    var g = guard(); if (g) return g;
    return call('update_invoice', { doc: inv }).then(function (r) { upsert(S.invoices, r.doc); applyStock(r.stock); return r.doc; });
  }
  function voidInvoice(id, reason) {
    var g = guard(); if (g) return g;
    return call('void_invoice', { id: id, reason: reason || '' }).then(function (r) { upsert(S.invoices, r.doc); applyStock(r.stock); return r.doc; });
  }
  function touchInvoice(id, body) {
    var g = guard(); if (g) return g;
    return call('invoice_touch', Object.assign({ id: id }, body)).then(function (r) { upsert(S.invoices, r.doc); return r.doc; });
  }
  function removeInvoices(ids) {
    var g = guard(); if (g) return g;
    return call('del_invoices', { ids: ids }).then(function (r) { drop('invoices', ids); applyStock(r.stock); });
  }
  function createPurchase(doc) {
    var g = guard(); if (g) return g;
    return call('create_purchase', { doc: doc }).then(function (r) { upsert(S.purchases, r.doc); applyStock(r.stock); return r.doc; });
  }
  function touchPurchase(id, payment) {
    var g = guard(); if (g) return g;
    return call('purchase_touch', { id: id, payment: payment }).then(function (r) { upsert(S.purchases, r.doc); return r.doc; });
  }
  function removePurchase(id) {
    var g = guard(); if (g) return g;
    return call('del_purchase', { id: id }).then(function (r) { drop('purchases', [id]); applyStock(r.stock); });
  }
  function stockMove(body) {
    var g = guard(); if (g) return g;
    return call('stock_move', body).then(function (r) { S.moves.push(r.move); applyStock(r.stock); return r.move; });
  }

  /* ------------------------------------------------ backup */
  function exportAll() {
    var out = { app: 'abraj-alsumud', version: 1, exported: new Date().toISOString(), counter: S.counter, pcounter: S.pcounter, settings: S.settings };
    ['products', 'customers', 'suppliers', 'invoices', 'purchases', 'expenses', 'reminders', 'moves'].forEach(function (k) { out[k] = S[k]; });
    return out;
  }
  function restore(data) {
    var g = guard(); if (g) return g;
    if (!data || !Array.isArray(data.invoices) || !Array.isArray(data.products)) return Promise.reject(err('bad_backup'));
    return call('restore', { data: data }).then(loadPos);
  }

  /* ------------------------------------------------ photos */
  var webpOk = null;
  function canWebp() {
    if (webpOk === null) { try { webpOk = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { webpOk = false; } }
    return webpOk;
  }
  function toBlob(canvas, type, q) {
    return new Promise(function (res) {
      if (canvas.toBlob) canvas.toBlob(function (b) { res(b); }, type, q);
      else { var bin = atob(canvas.toDataURL(type, q).split(',')[1]), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); res(new Blob([u], { type: type })); }
    });
  }
  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaTag(file); });
    }
    return viaTag(file);
  }
  function viaTag(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(err('bad_image')); };
      im.src = url;
    });
  }
  function draw(img, max) {
    var w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);      // transparent PNGs get a white background
    c.imageSmoothingQuality = 'high';
    c.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }
  /* Photo sizes: small on purpose. A phone photo of 4-8 MB becomes about 40-110 KB, so pages stay fast and the hosting never fills up. */
  var PRESET = {
    product: { max: 900, q: 0.62, cap: 110 * 1024 },
    post: { max: 1280, q: 0.66, cap: 200 * 1024 },
    banner: { max: 1600, q: 0.68, cap: 300 * 1024 },
    logo: { max: 500, q: 0.8, cap: 90 * 1024 }
  };
  /* -> { blob, thumb, before, after } : the shrunken photo, its small thumbnail, the sizes before / after */
  function compress(file, presetName) {
    var p = PRESET[presetName] || PRESET.product, type = canWebp() ? 'image/webp' : 'image/jpeg';
    if (!file || !/^image\//.test(file.type || 'image/')) return Promise.reject(err('bad_image'));
    return loadImage(file).then(function (img) {
      var max = p.max, q = p.q;
      function attempt() {
        return toBlob(draw(img, max), type, q).then(function (b) {
          if (!b) throw err('bad_image');
          if (b.size > p.cap && (q > 0.42 || max > 520)) {             // still heavy: lower the quality, then the size
            if (q > 0.42) q -= 0.08; else max = Math.round(max * 0.82);
            return attempt();
          }
          return b;
        });
      }
      return attempt().then(function (blob) {
        return toBlob(draw(img, 260), type, 0.6).then(function (thumb) {
          if (img.close) img.close();
          return { blob: blob, thumb: thumb, before: file.size || 0, after: blob.size + (thumb ? thumb.size : 0) };
        });
      });
    });
  }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1]); };
      fr.onerror = function () { rej(err('bad_image')); };
      fr.readAsDataURL(blob);
    });
  }
  /* shrink + upload. scope = 'pos' (product photos) | 'site' (website photos). Resolves the photo's name. */
  function upload(file, scope, preset) {
    var g = guard(); if (g) return g;
    var st = S.storage[scope] || {};
    if (st.limit > 0 && st.used >= st.limit) return Promise.reject(err('storage_full'));      // do not even start when the room is used up
    return compress(file, preset).then(function (c) {
      window.Media.info = { before: c.before, after: c.after };          // shown to the user: "4.2 MB -> 78 KB"
      if (S.mode === 'local') return window.LocalBackend.handle('media_upload', { scope: scope, blob: c.blob, thumbBlob: c.thumb }).then(function (r) { setStorage(r.storage); return r.id; });
      return Promise.all([b64(c.blob), c.thumb ? b64(c.thumb) : null]).then(function (d) {
        return call('media_upload', { scope: scope, data: d[0], thumb: d[1] }).then(function (r) { return r.id; });
      });
    });
  }
  function mediaDel(ids) {
    ids = (ids || []).filter(Boolean);
    if (!ids.length || isViewer()) return Promise.resolve();
    return call('media_del', { ids: ids }).catch(function () { /* tidy-up only */ });
  }
  function mediaUrl(id, thumb) {
    if (!id) return '';
    if (S.mode === 'local') return window.LocalBackend.mediaUrl(id, thumb);
    return ROOT + 'api/media.php?f=' + encodeURIComponent(id) + (thumb ? '&t=1' : '');
  }
  /* a product / post picture, or a coloured tile with its first letters when there is no photo */
  function thumbHtml(id, name, color, cls) {
    if (id) return '<img class="' + (cls || 'thumb') + '" loading="lazy" alt="" src="' + C.esc(mediaUrl(id, true)) + '">';
    return '<span class="' + (cls || 'thumb') + ' noimg" style="--tile:' + (color || '#64736c') + '">' + C.esc(C.initials(name)) + '</span>';
  }

  /* The storage ring: how much of the allowed photo room one side (shop / website) has used. */
  function ring(scope, title, opt) {
    opt = opt || {};
    var st = S.storage[scope] || { used: 0, limit: 0, count: 0 };
    var pct = st.limit > 0 ? Math.min(100, st.used / st.limit * 100) : 0;
    var shown = pct > 0 && pct < 0.1 ? '<0.1' : (pct < 10 ? pct.toFixed(1) : String(Math.round(pct)));
    var R = 52, CIR = 2 * Math.PI * R, cls = pct >= 100 ? 'full' : pct >= 85 ? 'warn' : '';
    return '<div class="ring-card ' + cls + (opt.small ? ' small' : '') + '">' +
      '<div class="ring"><svg viewBox="0 0 120 120" role="img" aria-label="' + C.esc(title) + ' ' + shown + '%">' +
      '<circle class="ring-bg" cx="60" cy="60" r="' + R + '"/>' +
      '<circle class="ring-fg" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + CIR.toFixed(1) + '" stroke-dashoffset="' + (CIR * (1 - Math.max(pct, pct > 0 ? 1.2 : 0) / 100)).toFixed(1) + '" transform="rotate(-90 60 60)"/>' +
      '</svg><div class="ring-mid"><b>' + shown + '%</b><span>' + L('مستخدم', 'used') + '</span></div></div>' +
      '<div class="ring-info"><h4>' + C.esc(title) + '</h4>' +
      '<p class="ring-num"><b dir="ltr">' + C.bytes(st.used) + '</b> ' + L('من', 'of') + ' <b dir="ltr">' + C.bytes(st.limit) + '</b></p>' +
      '<p class="muted">' + L('عدد الصور: ', 'Photos: ') + st.count + ' · ' + L('المتبقي: ', 'Free: ') + '<span dir="ltr">' + C.bytes(Math.max(0, st.limit - st.used)) + '</span></p>' +
      (pct >= 100 ? '<p class="ring-msg">' + L('امتلأت المساحة. احذف ما لا تحتاجه لتتمكن من رفع صور جديدة.', 'Storage is full. Delete what you do not need to upload new photos.') + '</p>'
        : pct >= 85 ? '<p class="ring-msg">' + L('المساحة قاربت على الامتلاء.', 'Storage is almost full.') + '</p>' : '') +
      '</div></div>';
  }

  window.Store = {
    s: S, hooks: hooks, demo: !!DEMO, call: call, publicCall: publicCall, boot: boot, loadPos: loadPos, loadSite: loadSite, poll: poll,
    login: login, setup: setup, logout: logout,
    isAdmin: isAdmin, isViewer: isViewer, sees: sees, can: can, isLocal: function () { return S.mode === 'local'; },
    byId: byId, upsert: upsert, put: put, del: del,
    product: function (id) { return byId(S.products, id); },
    saveSettings: saveSettings,
    saveProduct: function (d) { return put('products', d, 'products'); },
    removeProducts: function (ids) { return del('products', ids, 'products'); },
    saveCustomer: function (d) { return put('customers', d, 'customers'); },
    removeCustomer: function (id) { return del('customers', [id], 'customers'); },
    saveSupplier: function (d) { return put('suppliers', d, 'suppliers'); },
    removeSupplier: function (id) { return del('suppliers', [id], 'suppliers'); },
    saveExpense: function (d) { return put('expenses', d, 'expenses'); },
    removeExpense: function (id) { return del('expenses', [id], 'expenses'); },
    saveReminder: function (d) { return put('reminders', d, 'reminders'); },
    removeReminder: function (id) { return del('reminders', [id], 'reminders'); },
    createInvoice: createInvoice, updateInvoice: updateInvoice, voidInvoice: voidInvoice, touchInvoice: touchInvoice, removeInvoices: removeInvoices,
    createPurchase: createPurchase, touchPurchase: touchPurchase, removePurchase: removePurchase, stockMove: stockMove,
    exportAll: exportAll, restore: restore,
    saveSite: function (d) { var g = guard(); if (g) return g; return call('put', { col: 'site', doc: d }).then(function (r) { S.site = r.doc; }); },
    savePost: function (d) { return put('posts', d, 'posts'); },
    removePost: function (id) { return del('posts', [id], 'posts'); },
    saveSection: function (d) { return put('sections', d, 'sections'); },
    removeSection: function (id) { return del('sections', [id], 'sections'); },
    saveMessage: function (d) { return put('messages', d, 'messages').then(function (x) { S.unread = S.messages.filter(function (m) { return !m.read; }).length; return x; }); },
    removeMessages: function (ids) { return del('messages', ids, 'messages').then(function () { S.unread = S.messages.filter(function (m) { return !m.read; }).length; }); },
    removeSubscribers: function (ids) { return del('subscribers', ids, 'subscribers'); },
    productSite: function (id, on, extra) {
      var g = guard(); if (g) return g;
      return call('product_site', Object.assign({ id: id, site: !!on }, extra || {})).then(function () { var p = byId(S.products, id); if (p) { p.site = !!on; Object.assign(p, extra || {}); } });
    },
    users: function () { return call('users'); },
    addUser: function (u) { var g = guard(); if (g) return g; return call('user_add', u); },
    updateUser: function (u) { var g = guard(); if (g) return g; return call('user_update', u); },
    delUser: function (id) { var g = guard(); if (g) return g; return call('user_del', { id: id }); },
    setPassword: function (b) { return call('user_password', b); },
    health: function () { return call('health'); },
    log: function () { return call('log').then(function (r) { return r.log; }); }
  };
  window.Media = { compress: compress, upload: upload, del: mediaDel, url: mediaUrl, thumb: thumbHtml, ring: ring, PRESET: PRESET };
})();
