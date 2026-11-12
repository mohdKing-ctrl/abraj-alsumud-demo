/* inventory.js - the stock page.
   - Every product: photo, names, category, barcode, the units it is bought and sold in (piece / dozen / carton / box...),
     how many pieces each unit holds, a RETAIL and a WHOLESALE price for every unit, the purchase price, how many are left
     in the shop and in the warehouse, the low-stock alert, supplier, shelf, expiry date, notes.
   - "Add a product by photo": take a picture with the phone, type the details, save - it is in stock.
   - Stock count / correction, and moving goods between the warehouse and the shop.
   - The ring that shows how much of the allowed photo room is used. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, num = C.num, f3 = C.f3;
  var flt = { q: '', cat: '', f: 'all' }, root = null;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function c5(n) { return String(Math.round(num(n) * 100000) / 100000); }
  function costOf(p, u) { return num(p.cost) * u.f; }

  /* ------------------------------------------------ list */
  function matches() {
    var q = C.norm(flt.q);
    return S.products.filter(function (p) {
      if (flt.cat && p.cat !== flt.cat) return false;
      if (flt.f === 'low' && !(P.low(p) && !P.out(p))) return false;
      if (flt.f === 'out' && !P.out(p)) return false;
      if (flt.f === 'nophoto' && p.img) return false;
      if (!q) return true;
      return C.norm([p.name, p.nameEn, p.sku, p.supplier, p.shelf].concat(p.units.map(function (u) { return u.bc; })).join(' ')).indexOf(q) >= 0;
    }).sort(P.newestFirst);
  }
  function stockBadge(p) {
    return P.out(p) ? '<span class="badge bad">' + L('نافد', 'Out of stock') + '</span>' : P.low(p) ? '<span class="badge warn">' + L('منخفض', 'Low') + '</span>' : '';
  }
  function basePrice(p) { var su = P.saleUnits(p, 'retail')[0]; return su ? f3(su.price) + ' / ' + P.unitName(su.u) : '-'; }
  function listHtml() {
    var list = matches(), cost = Store.sees('cost'), view = ls('abraj_inv_view') === 'list' ? 'list' : 'grid';
    if (!S.products.length) return '<div class="card empty">' + icon('camera', 48) + '<p><b>' + L('لا توجد منتجات بعد', 'No products yet') + '</b></p><p>' + L('صوّر أول منتج واكتب تفاصيله ليُسجَّل في المخزون.', 'Take a photo of your first product and type its details to put it in stock.') + '</p></div>';
    if (!list.length) return '<div class="card empty">' + icon('search', 40) + '<p>' + L('لا توجد نتائج', 'No results') + '</p></div>';
    if (view === 'list') {
      return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>' + L('المنتج', 'Product') + '</th><th>' + L('المحل', 'Shop') + '</th><th>' + L('المخزن', 'Warehouse') + '</th><th>' + L('الإجمالي', 'Total') + '</th>' +
        (cost ? '<th>' + L('سعر الشراء', 'Cost') + '</th>' : '') + '<th>' + L('سعر البيع', 'Price') + '</th><th></th></tr></thead><tbody>' +
        list.map(function (p) {
          var cat = C.catOf(S.settings, p.cat), b = p.units[0];
          return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer"><td>' + Media.thumb(p.img, P.name(p), cat.c) + '</td><td><b>' + esc(P.name(p)) + '</b><div class="small muted">' + esc(C.catName(cat)) + '</div></td>' +
            '<td class="num">' + C.qf(P.at(p, 'shop')) + '</td><td class="num">' + C.qf(P.at(p, 'wh')) + '</td><td><b>' + esc(P.breakdown(p, P.total(p))) + '</b> ' + stockBadge(p) + '</td>' +
            (cost ? '<td class="num">' + c5(p.cost) + ' <span class="small muted">/ ' + esc(P.unitName(b)) + '</span></td>' : '') + '<td>' + esc(basePrice(p)) + '</td><td class="act">' + icon(C.lang === 'ar' ? 'back' : 'next', 18) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return '<div class="inv-grid">' + list.map(function (p) {
      var cat = C.catOf(S.settings, p.cat), b = p.units[0];
      return '<button type="button" class="inv-card" data-id="' + esc(p.id) + '">' + Media.thumb(p.img, P.name(p), cat.c, 'thumb lg') +
        '<span class="grow"><span class="nm">' + esc(P.name(p)) + '</span><br><span class="meta">' + esc(C.catName(cat)) + '</span>' +
        '<span class="q" style="display:block">' + esc(P.breakdown(p, P.total(p))) + ' ' + stockBadge(p) + '</span>' +
        '<span class="meta" style="display:block">' + L('المحل: ', 'Shop: ') + C.qf(P.at(p, 'shop')) + ' · ' + L('المخزن: ', 'Warehouse: ') + C.qf(P.at(p, 'wh')) + ' ' + esc(P.unitName(b)) + '</span>' +
        '<span class="meta" style="display:block">' + (cost ? L('شراء: ', 'Cost: ') + c5(p.cost) + ' · ' : '') + L('بيع: ', 'Price: ') + esc(basePrice(p)) + '</span></span></button>';
    }).join('') + '</div>';
  }
  function draw() {
    var cost = Store.sees('cost'), can = Store.can('stock');
    var value = 0, retail = 0, low = 0, out = 0;
    S.products.forEach(function (p) {
      var t = P.total(p), b = p.units[0];
      if (t > 0) { value += t * num(p.cost); retail += t * (num(b.r) || (P.saleUnits(p, 'retail')[0] ? P.saleUnits(p, 'retail')[0].price / P.saleUnits(p, 'retail')[0].u.f : 0)); }
      if (P.out(p)) out++; else if (P.low(p)) low++;
    });
    root.innerHTML =
      '<div class="view-head"><h2>' + L('المخزون والمنتجات', 'Stock & products') + '</h2>' +
      (can ? '<button type="button" class="btn primary lg" id="i-cam">' + icon('camera') + L('إضافة منتج بالصورة', 'Add product by photo') + '</button><button type="button" class="btn ghost" id="i-add">' + icon('plus') + L('إضافة بدون صورة', 'Add without photo') + '</button>' : '') +
      '<button type="button" class="btn ghost" id="i-xl">' + icon('download') + 'Excel</button></div>' +
      '<div class="stats mb"><div class="stat"><span>' + icon('box', 16) + L('عدد المنتجات', 'Products') + '</span><b>' + S.products.length + '</b></div>' +
      (cost ? '<div class="stat green"><span>' + icon('money', 16) + L('قيمة المخزون (بسعر الشراء)', 'Stock value (at cost)') + '</span><b class="num">' + f3(value) + '</b></div>' : '') +
      '<div class="stat"><span>' + icon('tag', 16) + L('قيمة المخزون (بسعر البيع)', 'Stock value (at retail)') + '</span><b class="num">' + f3(retail) + '</b></div>' +
      '<div class="stat amber"><span>' + icon('alert', 16) + L('منخفض / نافد', 'Low / out') + '</span><b>' + low + ' / ' + out + '</b></div></div>' +
      '<div class="mb" id="i-ring">' + Media.ring('pos', L('مساحة صور المنتجات (نظام البيع)', 'Product photo storage (point of sale)'), { small: true }) + '</div>' +
      '<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" id="i-q" type="search" placeholder="' + L('ابحث بالاسم، الباركود، المورد، الرف', 'Search by name, barcode, supplier, shelf') + '" value="' + esc(flt.q) + '"></div>' +
      '<select class="input" id="i-cat" style="width:auto;max-width:200px"><option value="">' + L('كل التصنيفات', 'All categories') + '</option>' + S.settings.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (flt.cat === c.id ? ' selected' : '') + '>' + esc(C.catName(c)) + '</option>'; }).join('') + '</select>' +
      '<div class="seg" id="i-view"><button type="button" data-v="grid" class="' + (ls('abraj_inv_view') !== 'list' ? 'on' : '') + '" aria-label="grid">' + icon('grid', 18) + '</button><button type="button" data-v="list" class="' + (ls('abraj_inv_view') === 'list' ? 'on' : '') + '" aria-label="list">' + icon('list', 18) + '</button></div></div>' +
      '<div class="chips mb" id="i-f">' + [['all', L('الكل', 'All')], ['low', L('كمية منخفضة', 'Low stock')], ['out', L('نافد', 'Out of stock')], ['nophoto', L('بدون صورة', 'No photo')]].map(function (x) { return '<button type="button" class="chip' + (flt.f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div id="i-list">' + listHtml() + '</div>';
  }
  function bind() {
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('#i-cam')) { Shell.pickPhoto(true).then(function (f) { if (f) form(null, { file: f }); }); return; }
      if (e.target.closest('#i-add')) { form(null); return; }
      if (e.target.closest('#i-xl')) { exportXl(); return; }
      if ((b = e.target.closest('[data-f]'))) { flt.f = b.getAttribute('data-f'); draw(); return; }
      if ((b = e.target.closest('[data-v]'))) { ls('abraj_inv_view', b.getAttribute('data-v')); draw(); return; }
      if ((b = e.target.closest('[data-id]'))) details(b.getAttribute('data-id'));
    });
    root.addEventListener('input', function (e) { if (e.target.id === 'i-q') { flt.q = e.target.value; root.querySelector('#i-list').innerHTML = listHtml(); } });
    root.addEventListener('change', function (e) { if (e.target.id === 'i-cat') { flt.cat = e.target.value; draw(); } });
  }
  function redraw() { if (Shell.current === 'inventory' && root && root.isConnected) draw(); else Shell.refreshNav(); }
  function exportXl() {
    var cost = Store.sees('cost'), M = XLSX.S.MONEY;
    var rows = [[L('المنتج', 'Product'), 'English', L('التصنيف', 'Category'), L('الباركود', 'Barcode'), L('الوحدة الصغرى', 'Base unit'), L('المحل', 'Shop'), L('المخزن', 'Warehouse'), L('الإجمالي', 'Total')]
      .concat(cost ? [L('سعر الشراء', 'Cost'), L('قيمة المخزون', 'Stock value')] : []).concat([L('الوحدات والأسعار (تجزئة / جملة)', 'Units & prices (retail / wholesale)'), L('المورد', 'Supplier'), L('حد التنبيه', 'Alert at')])];
    matches().forEach(function (p) {
      var b = p.units[0];
      rows.push([p.name, p.nameEn || '', C.catName(C.catOf(S.settings, p.cat)), p.sku || b.bc || '', b.n, P.at(p, 'shop'), P.at(p, 'wh'), P.total(p)]
        .concat(cost ? [{ v: num(p.cost), s: M }, { v: C.r3(P.total(p) * num(p.cost)), s: M }] : [])
        .concat([p.units.map(function (u) { return u.n + (u.f > 1 ? ' (' + C.qf(u.f) + ')' : '') + ': ' + f3(u.r) + ' / ' + f3(u.w); }).join(' | '), p.supplier || '', num(p.minStock)]));
    });
    Shell.excel('Abraj-Alsumud_Stock', L('المخزون', 'Stock'), rows, [30, 24, 20, 16, 12, 10, 10, 10].concat(cost ? [12, 14] : []).concat([60, 20, 10]));
  }

  /* ------------------------------------------------ product card (everything about one product) */
  function history(p) {
    var rows = [];
    S.invoices.forEach(function (inv) {
      if (inv.void) return;
      inv.items.forEach(function (it) { if (it.pid === p.id) rows.push({ ts: inv.created || 0, t: L('بيع ', 'Sale ') + inv.number + (inv.customerName ? ' - ' + inv.customerName : ''), q: -num(it.q) * num(it.f || 1), loc: inv.loc || 'shop', by: inv.createdBy }); });
    });
    S.purchases.forEach(function (pu) {
      pu.items.forEach(function (it) { if (it.pid === p.id) rows.push({ ts: pu.created || 0, t: L('استلام بضاعة ', 'Goods received ') + pu.number + (pu.supplierName ? ' - ' + pu.supplierName : ''), q: num(it.q) * num(it.f || 1), loc: pu.loc || 'wh', by: pu.createdBy }); });
    });
    var MT = { add: L('إضافة يدوية', 'Manual add'), remove: L('إنقاص يدوي', 'Manual removal'), count: L('جرد', 'Stock count'), transfer: L('نقل', 'Transfer') };
    S.moves.forEach(function (m) {
      if (m.pid !== p.id) return;
      rows.push({ ts: m.ts, t: (MT[m.type] || m.type) + (m.type === 'transfer' ? ' ' + C.locName(m.loc) + ' ← ' : '') + (m.type === 'transfer' ? C.locName(m.to) : '') + (m.reason ? ' - ' + m.reason : ''),
        q: m.type === 'count' ? num(m.after) - num(m.before) : m.type === 'add' ? num(m.qty) : m.type === 'remove' ? -num(m.qty) : 0, loc: m.loc, by: m.by, tr: m.type === 'transfer' ? num(m.qty) : 0 });
    });
    rows.sort(function (a, b) { return b.ts - a.ts; });
    if (!rows.length) return '<p class="muted small">' + L('لا توجد حركات بعد.', 'No movements yet.') + '</p>';
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الحركة', 'Movement') + '</th><th>' + L('المكان', 'Place') + '</th><th class="t-end">' + L('الكمية', 'Qty') + '</th><th>' + L('بواسطة', 'By') + '</th></tr></thead><tbody>' +
      rows.slice(0, 50).map(function (r) {
        return '<tr><td class="nowrap small">' + C.fts(r.ts) + '</td><td>' + esc(r.t) + '</td><td>' + esc(C.locName(r.loc)) + '</td><td class="t-end num" style="font-weight:800;color:' + (r.q < 0 ? 'var(--red)' : r.q > 0 ? 'var(--g700)' : 'inherit') + '">' + (r.tr ? C.qf(r.tr) : (r.q > 0 ? '+' : '') + C.qf(r.q)) + '</td><td class="small">' + esc(r.by || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function details(id) {
    var p = Store.product(id);
    if (!p) return;
    var cat = C.catOf(S.settings, p.cat), cost = Store.sees('cost'), can = Store.can('stock'), b = p.units[0];
    var kv = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + esc(v) + '</dd>' : ''; };
    var loc = function (name, ic, q, cls) { return '<div class="loc-box ' + (cls || '') + '"><span>' + icon(ic, 15) + name + '</span><b class="num">' + C.qf(q) + '</b><small>' + esc(P.breakdown(p, q)) + '</small></div>'; };
    var m = C.modal({ title: esc(P.name(p)), size: 'lg',
      body: '<div class="detail-hero">' + (p.img ? '<img class="pic" alt="" src="' + esc(Media.url(p.img)) + '">' : '<span class="pic noimg" style="display:grid;--tile:' + cat.c + '">' + esc(C.initials(p.name)) + '</span>') +
        '<div class="col"><div><h2 style="font-size:20px">' + esc(p.name) + '</h2>' + (p.nameEn ? '<p class="muted ltr">' + esc(p.nameEn) + '</p>' : '') + '</div>' +
        '<div class="row wrap"><span class="badge info">' + esc(C.catName(cat)) + '</span>' + stockBadge(p) + (p.site ? '<span class="badge ok">' + icon('globe', 13) + L('معروض في الموقع', 'On the website') + '</span>' : '') + '</div>' +
        '<div class="loc-boxes">' + loc(L('المحل', 'Shop'), 'store', P.at(p, 'shop')) + loc(L('المخزن', 'Warehouse'), 'warehouse', P.at(p, 'wh')) + loc(L('الإجمالي', 'Total'), 'box', P.total(p), 'total') + '</div>' +
        '<dl class="kv">' + (cost ? '<dt>' + L('سعر الشراء (متوسط)', 'Purchase price (average)') + '</dt><dd class="num">' + c5(p.cost) + ' / ' + esc(P.unitName(b)) + '</dd>' +
          (num(p.lastCost) && Math.abs(num(p.lastCost) - num(p.cost)) > 0.00001 ? '<dt>' + L('آخر سعر شراء', 'Last purchase price') + '</dt><dd class="num">' + c5(p.lastCost) + '</dd>' : '') +
          '<dt>' + L('قيمة الموجود', 'Value in stock') + '</dt><dd class="num">' + C.money(P.total(p) * num(p.cost)) + '</dd>' : '') +
        kv(L('الباركود / الرمز', 'Barcode / code'), p.sku) + kv(L('المورد', 'Supplier'), p.supplier) + kv(L('مكان الرف', 'Shelf'), p.shelf) + kv(L('تاريخ الانتهاء', 'Expiry date'), p.expiry ? C.fdate(p.expiry) : '') +
        kv(L('تنبيه عند', 'Alert at'), num(p.minStock) ? C.qf(p.minStock) + ' ' + P.unitName(b) : '') + kv(L('أضافه', 'Added by'), p.createdBy ? p.createdBy + ' - ' + C.fts(p.created) : '') + '</dl></div></div>' +
        '<h4 class="mt2 mb">' + L('وحدات البيع والأسعار', 'Selling units & prices') + '</h4><div class="tbl-wrap"><table class="price-tbl"><thead><tr><th>' + L('الوحدة', 'Unit') + '</th><th>' + L('تحتوي على', 'Contains') + '</th><th>' + L('سعر التجزئة', 'Retail') + '</th><th>' + L('سعر الجملة', 'Wholesale') + '</th>' +
        (cost ? '<th>' + L('تكلفتها', 'Its cost') + '</th><th>' + L('الربح (تجزئة / جملة)', 'Profit (retail / wholesale)') + '</th>' : '') + '<th>' + L('باركود', 'Barcode') + '</th></tr></thead><tbody>' +
        p.units.map(function (u) {
          var c = costOf(p, u), pr = function (x) { return num(x) > 0 ? f3(num(x) - c) : '-'; };
          return '<tr><td><b>' + esc(P.unitName(u)) + '</b></td><td>' + (u.f > 1 ? C.qf(u.f) + ' ' + esc(P.unitName(b)) : '-') + '</td><td class="num"><b>' + (num(u.r) > 0 ? f3(u.r) : '-') + '</b></td><td class="num"><b>' + (num(u.w) > 0 ? f3(u.w) : '-') + '</b></td>' +
            (cost ? '<td class="num">' + f3(c) + '</td><td class="num">' + pr(u.r) + ' / ' + pr(u.w) + '</td>' : '') + '<td class="ltr small">' + esc(u.bc || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (p.desc ? '<h4 class="mt2">' + L('الوصف', 'Description') + '</h4><p style="white-space:pre-wrap">' + esc(p.desc) + '</p>' : '') +
        (Store.sees('stock') ? '<h4 class="mt2 mb">' + L('سجل حركة المنتج', 'Product movement history') + '</h4>' + history(p) : ''),
      foot: can ? '<button type="button" class="btn danger-soft" id="d-del">' + icon('trash') + L('حذف', 'Delete') + '</button><span class="grow"></span>' +
        '<button type="button" class="btn ghost" id="d-move">' + icon('swap') + L('نقل بين المحل والمخزن', 'Move shop ⇄ warehouse') + '</button>' +
        '<button type="button" class="btn ghost" id="d-stock">' + icon('box') + L('جرد / تعديل الكمية', 'Count / adjust') + '</button>' +
        '<button type="button" class="btn primary" id="d-edit">' + icon('edit') + L('تعديل', 'Edit') + '</button>' : '' });
    if (!can) return;
    var q = function (s) { return m.el.querySelector(s); };
    q('#d-edit').onclick = function () { m.close(); form(p).then(function (np) { if (np) details(np.id); }); };
    q('#d-stock').onclick = function () { m.close(); stock(p, 'count').then(function () { details(p.id); }); };
    q('#d-move').onclick = function () { m.close(); stock(p, 'transfer').then(function () { details(p.id); }); };
    q('#d-del').onclick = function () {
      C.confirmBox(L('حذف «', 'Delete "') + p.name + L('» نهائياً مع صورته؟ الفواتير السابقة تبقى كما هي.', '" for good, with its photo? Past bills stay as they are.'), L('حذف', 'Delete'), true).then(function (y) {
        if (!y) return;
        C.busy(q('#d-del'), Store.removeProducts([p.id])).then(function () { m.close(); C.toast(L('تم الحذف', 'Deleted')); redraw(); }, function () {});
      });
    };
  }

  /* ------------------------------------------------ add / edit a product */
  function form(p, opt) {
    opt = opt || {};
    var isNew = !p, seeCost = Store.can('cost');
    var units = (p ? p.units : [{ n: 'حبة', e: 'Piece', f: 1, r: 0, w: 0, bc: '' }]).map(function (u) { return Object.assign({}, u); });
    var img = p ? p.img || '' : '', fresh = '', saved = false, uploading = false;
    return new Promise(function (resolve) {
      var known = {}; S.settings.units.forEach(function (u) { known[u.n] = u; });
      var m = C.modal({ title: isNew ? icon('camera') + ' ' + L('منتج جديد', 'New product') : icon('edit') + ' ' + L('تعديل المنتج', 'Edit product'), size: 'lg', sticky: true,
        body: '<form id="pf" class="col" autocomplete="off" novalidate>' +
          '<div class="photo-drop" id="pf-photo"></div>' +
          '<div class="grid g2"><div class="field"><label>' + L('اسم المنتج *', 'Product name *') + '</label><input class="input" name="name" required maxlength="160" value="' + esc(p ? p.name : '') + '"></div>' +
          '<div class="field"><label>' + L('الاسم بالإنجليزية (اختياري)', 'English name (optional)') + '</label><input class="input ltr" name="nameEn" maxlength="160" value="' + esc(p ? p.nameEn || '' : '') + '"></div></div>' +
          '<div class="grid g3"><div class="field"><label>' + L('التصنيف', 'Category') + '</label><select class="input" name="cat">' + S.settings.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + ((p ? p.cat : 'agri') === c.id ? ' selected' : '') + '>' + esc(C.catName(c)) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>' + L('الباركود / رمز المنتج', 'Barcode / product code') + '</label><div class="row"><input class="input ltr grow" name="sku" maxlength="40" value="' + esc(p ? p.sku || '' : '') + '">' + (Scanner.supported() ? '<button type="button" class="btn ghost" id="pf-scan">' + icon('barcode') + '</button>' : '') + '</div></div>' +
          '<div class="field"><label>' + L('المورد', 'Supplier') + '</label><input class="input" name="supplier" list="pf-sup" maxlength="120" value="' + esc(p ? p.supplier || '' : '') + '"><datalist id="pf-sup">' + S.suppliers.map(function (s) { return '<option value="' + esc(s.name) + '">'; }).join('') + '</datalist></div></div>' +

          '<div class="section-block"><h4>' + icon('tag', 18) + L('وحدات البيع والأسعار (تجزئة وجملة)', 'Selling units & prices (retail and wholesale)') + '</h4>' +
          '<p class="small muted mb">' + L('السطر الأول هو أصغر وحدة تُباع (مثل الحبة). أضف وحدات أكبر مثل الدرزن أو الكرتون أو الصندوق، واكتب كم حبة في كل وحدة وسعرها. اترك السعر فارغاً إذا كانت الوحدة لا تُباع بهذا النوع.', 'The first row is the smallest unit you sell (e.g. a piece). Add bigger units such as dozen, carton or box, with how many pieces each holds and its price. Leave a price empty if the unit is not sold that way.') + '</p>' +
          '<table class="units-tbl"><thead><tr><th>' + L('الوحدة', 'Unit') + '</th><th>' + L('كم تحتوي؟', 'Holds') + '</th><th>' + L('سعر التجزئة', 'Retail price') + '</th><th>' + L('سعر الجملة', 'Wholesale price') + '</th><th>' + L('باركود الوحدة', 'Unit barcode') + '</th><th></th></tr></thead><tbody id="pf-units"></tbody></table>' +
          '<datalist id="pf-un">' + S.settings.units.map(function (u) { return '<option value="' + esc(u.n) + '">' + esc(u.e) + '</option>'; }).join('') + '</datalist>' +
          '<div class="row wrap mt"><span class="small muted">' + L('إضافة سريعة:', 'Quick add:') + '</span>' + [['درزن', 12], ['كرتون', 24], ['صندوق', 12], ['شدة', 6]].map(function (x) { return '<button type="button" class="btn sm soft" data-addu="' + x[0] + '" data-f="' + x[1] + '">+ ' + esc(L(x[0], (known[x[0]] || {}).e || x[0])) + '</button>'; }).join('') +
          '<button type="button" class="btn sm ghost" data-addu="" data-f="">+ ' + L('وحدة أخرى', 'Other unit') + '</button></div></div>' +

          '<div class="section-block"><h4>' + icon('box', 18) + L('الشراء والمخزون', 'Purchase & stock') + '</h4><div class="grid g3">' +
          (seeCost ? '<div class="field"><label>' + L('سعر الشراء', 'Purchase price') + '</label><div class="row"><input class="input num grow" name="cost" inputmode="decimal" value="' + (p && num(p.cost) ? c5(p.cost) : '') + '" placeholder="0.000"><select class="input" name="costUnit" style="width:auto"></select></div><span class="hint" id="pf-costhint"></span></div>' : '') +
          (isNew ? '<div class="field"><label>' + L('الكمية الموجودة الآن', 'Quantity in hand now') + '</label><div class="row"><input class="input num grow" name="qty" inputmode="decimal" placeholder="0"><select class="input" name="qtyUnit" style="width:auto"></select></div><span class="hint" id="pf-qtyhint"></span></div>' +
            '<div class="field"><label>' + L('موجودة في', 'Kept in') + '</label><select class="input" name="loc"><option value="wh">' + L('المخزن', 'Warehouse') + '</option><option value="shop"' + ((S.settings.defLoc || 'shop') === 'shop' ? ' selected' : '') + '>' + L('المحل', 'Shop') + '</option></select></div>'
            : '<div class="field span2"><label>' + L('الكمية الحالية', 'Current quantity') + '</label><div class="note">' + esc(P.breakdown(p, P.total(p))) + ' - ' + L('تتغير بالبيع والاستلام أو من «جرد / تعديل الكمية».', 'changes by sales, goods received, or "Count / adjust".') + '</div></div>') +
          '<div class="field"><label>' + L('نبّهني عند وصول الكمية إلى', 'Alert me when quantity reaches') + '</label><input class="input num" name="minStock" inputmode="decimal" value="' + (p && num(p.minStock) ? C.qf(p.minStock) : '') + '" placeholder="0"><span class="hint">' + L('بأصغر وحدة', 'in the smallest unit') + '</span></div>' +
          '<div class="field"><label>' + L('مكان الرف (اختياري)', 'Shelf (optional)') + '</label><input class="input" name="shelf" maxlength="60" value="' + esc(p ? p.shelf || '' : '') + '"></div>' +
          '<div class="field"><label>' + L('تاريخ الانتهاء (اختياري)', 'Expiry date (optional)') + '</label><input class="input" type="date" name="expiry" value="' + esc(p ? p.expiry || '' : '') + '"></div></div></div>' +

          '<div class="field"><label>' + L('وصف المنتج / ملاحظات', 'Description / notes') + '</label><textarea class="input" name="desc" maxlength="1500">' + esc(p ? p.desc || '' : '') + '</textarea></div>' +
          (S.features.website ? '<label class="switch"><input type="checkbox" name="site"' + (p && p.site ? ' checked' : '') + '><i></i><span>' + L('عرض هذا المنتج في الموقع الإلكتروني', 'Show this product on the website') + '</span></label>' : '') +
          '</form>',
        foot: '<button type="button" class="btn ghost" id="pf-cancel">' + L('إلغاء', 'Cancel') + '</button><button type="button" class="btn primary lg" id="pf-save">' + icon('check') + (isNew ? L('حفظ وتسجيل في المخزون', 'Save & put in stock') : L('حفظ التعديلات', 'Save changes')) + '</button>',
        onClose: function () { if (!saved && fresh) Media.del([fresh]); resolve(saved || null); } });
      var f = m.el.querySelector('#pf'), q = function (s) { return m.el.querySelector(s); };

      /* ---- photo ---- */
      function photo(state, msg) {
        var zone = q('#pf-photo'), cur = fresh || img, st = S.storage.pos || {}, full = st.limit > 0 && st.used >= st.limit;
        var btns = '<div class="acts"><button type="button" class="btn primary" data-ph="cam">' + icon('camera') + L('التقاط صورة', 'Take a photo') + '</button><button type="button" class="btn ghost" data-ph="file">' + icon('image') + L('اختيار من الصور', 'Choose a picture') + '</button>' +
          (cur ? '<button type="button" class="btn danger-soft" data-ph="rm">' + icon('trash') + L('إزالة', 'Remove') + '</button>' : '') + '</div>';
        if (state === 'busy') { zone.innerHTML = '<div class="btn ghost busy" style="border:0;background:none;min-height:60px"></div><p class="muted">' + L('جارٍ تصغير الصورة ورفعها...', 'Shrinking and uploading the photo...') + '</p>'; return; }
        zone.innerHTML = (cur ? '<img alt="" src="' + esc(Media.url(cur)) + '">' : icon('camera', 46) + '<p class="muted">' + L('صوّر المنتج أولاً، ثم اكتب تفاصيله بالأسفل', 'Take a photo of the product first, then type its details below') + '</p>') +
          (msg ? '<p class="' + (state === 'err' ? 'ring-msg' : 'saved') + '">' + msg + '</p>' : '') +
          (full && !cur ? '<div class="note bad">' + icon('alert', 18) + '<span>' + esc(C.errText({ code: 'storage_full' })) + '</span></div>' : '') + btns;
      }
      function setPhoto(file) {
        if (!file) return;
        uploading = true; photo('busy');
        Media.upload(file, 'pos', 'product').then(function (id) {
          if (fresh) Media.del([fresh]);
          fresh = id; uploading = false;
          var i = Media.info || {};
          photo('ok', icon('check', 15) + ' ' + L('تم تصغير الصورة: ', 'Photo shrunk: ') + '<span class="ltr">' + C.bytes(i.before) + ' → ' + C.bytes(i.after) + '</span>');
          var r = document.getElementById('i-ring'); if (r) r.innerHTML = Media.ring('pos', L('مساحة صور المنتجات (نظام البيع)', 'Product photo storage (point of sale)'), { small: true });
        }, function (e) { uploading = false; photo('err', esc(C.errText(e))); });
      }
      q('#pf-photo').addEventListener('click', function (e) {
        var b = e.target.closest('[data-ph]'); if (!b) return;
        var a = b.getAttribute('data-ph');
        if (a === 'rm') { if (fresh) { Media.del([fresh]); fresh = ''; } img = ''; photo(); }
        else Shell.pickPhoto(a === 'cam').then(setPhoto);
      });
      photo();
      if (opt.file) setPhoto(opt.file);

      /* ---- units ---- */
      function readUnits() {
        [].forEach.call(q('#pf-units').querySelectorAll('tr'), function (tr, i) {
          var g = function (n) { var el = tr.querySelector('[data-k="' + n + '"]'); return el ? el.value : ''; };
          var u = units[i]; if (!u) return;
          u.n = g('n').trim(); u.e = (known[u.n] || {}).e || (u.e && units[i]._n === u.n ? u.e : ''); u._n = u.n;
          if (i > 0) u.f = num(g('f'));
          u.r = num(g('r')); u.w = num(g('w')); u.bc = C.normDigits(g('bc')).trim();
        });
      }
      function drawUnits() {
        var base = units[0].n || L('حبة', 'piece');
        q('#pf-units').innerHTML = units.map(function (u, i) {
          return '<tr><td data-l="' + L('الوحدة', 'Unit') + '"><input class="input" data-k="n" list="pf-un" value="' + esc(u.n) + '" placeholder="' + (i ? L('كرتون', 'Carton') : L('حبة', 'Piece')) + '"></td>' +
            '<td data-l="' + L('كم تحتوي؟', 'Holds') + '">' + (i ? '<div class="row"><input class="input num" data-k="f" inputmode="decimal" value="' + (u.f ? C.qf(u.f) : '') + '" style="width:76px"><span class="small muted nowrap">' + esc(base) + '</span></div>' : '<span class="badge ok">' + L('أصغر وحدة', 'smallest unit') + '</span>') + '</td>' +
            '<td data-l="' + L('سعر التجزئة', 'Retail price') + '"><input class="input num" data-k="r" inputmode="decimal" value="' + (num(u.r) ? f3(u.r) : '') + '" placeholder="0.000"></td>' +
            '<td data-l="' + L('سعر الجملة', 'Wholesale price') + '"><input class="input num" data-k="w" inputmode="decimal" value="' + (num(u.w) ? f3(u.w) : '') + '" placeholder="0.000"></td>' +
            '<td data-l="' + L('باركود الوحدة', 'Unit barcode') + '"><input class="input ltr" data-k="bc" value="' + esc(u.bc || '') + '" maxlength="40"></td>' +
            '<td class="wide">' + (i ? '<button type="button" class="icon-btn red" data-rmu="' + i + '" title="' + L('حذف الوحدة', 'Remove unit') + '">' + icon('trash', 18) + '</button>' : '') + '</td></tr>';
        }).join('');
        fillUnitSelects();
      }
      function fillUnitSelects() {
        ['costUnit', 'qtyUnit'].forEach(function (name) {
          var sel = f[name]; if (!sel) return;
          var keep = sel.value;
          sel.innerHTML = units.map(function (u, i) { return '<option value="' + i + '">' + esc(L('لكل ', 'per ') + (u.n || '?')) + '</option>'; }).join('');
          if (name === 'qtyUnit') sel.innerHTML = units.map(function (u, i) { return '<option value="' + i + '">' + esc(u.n || '?') + '</option>'; }).join('');
          if (keep && +keep < units.length) sel.value = keep;
        });
        hints();
      }
      function hints() {
        var base = units[0].n || '';
        if (f.cost) { var u = units[+f.costUnit.value] || units[0], v = num(f.cost.value); q('#pf-costhint').textContent = v > 0 && u.f > 1 ? '= ' + c5(v / u.f) + ' ' + L('لكل ', 'per ') + base : ''; }
        if (f.qty) { var u2 = units[+f.qtyUnit.value] || units[0], v2 = num(f.qty.value); q('#pf-qtyhint').textContent = v2 > 0 && u2.f > 1 ? '= ' + C.qf(v2 * u2.f) + ' ' + base : ''; }
      }
      drawUnits();
      m.el.addEventListener('click', function (e) {
        var b;
        if ((b = e.target.closest('[data-addu]'))) {
          readUnits();
          if (units.length >= 8) return C.toast(L('8 وحدات كحد أقصى', '8 units at most'), 'warn');
          var n = b.getAttribute('data-addu');
          if (n && units.some(function (u) { return u.n === n; })) return C.toast(L('هذه الوحدة موجودة', 'This unit is already there'), 'warn');
          units.push({ n: n, e: (known[n] || {}).e || '', f: num(b.getAttribute('data-f')) || 0, r: 0, w: 0, bc: '' });
          drawUnits();
          var rows = q('#pf-units').querySelectorAll('tr'); rows[rows.length - 1].querySelector(n ? '[data-k="f"]' : '[data-k="n"]').focus();
          return;
        }
        if ((b = e.target.closest('[data-rmu]'))) { readUnits(); units.splice(+b.getAttribute('data-rmu'), 1); drawUnits(); return; }
        if (e.target.closest('#pf-scan')) Scanner.open(function (code) { f.sku.value = code; });
      });
      f.addEventListener('input', function (e) {
        if (e.target.closest('#pf-units') && e.target.getAttribute('data-k') === 'n') {
          var tr = e.target.closest('tr'), i = [].indexOf.call(q('#pf-units').children, tr), k = known[e.target.value.trim()];
          var fi = tr.querySelector('[data-k="f"]');
          if (i > 0 && k && k.f > 1 && fi && !fi.value) fi.value = k.f;                       // "كرتون" suggests 24, "درزن" suggests 12...
        }
        hints();
      });
      f.addEventListener('change', function (e) { if (e.target.closest('#pf-units')) { readUnits(); fillUnitSelects(); } else hints(); });
      f.addEventListener('submit', function (e) { e.preventDefault(); });

      q('#pf-cancel').onclick = function () { m.close(); };
      q('#pf-save').onclick = function () {
        if (uploading) return C.toast(L('انتظر حتى ينتهي رفع الصورة', 'Wait for the photo upload to finish'), 'warn');
        readUnits();
        var name = f.name.value.trim();
        if (!name) { f.name.classList.add('err'); f.name.focus(); return C.toast(L('اكتب اسم المنتج', 'Type the product name'), 'warn'); }
        var seen = {}, bad = '';
        units.forEach(function (u, i) {
          if (!u.n) bad = L('اكتب اسم كل وحدة', 'Type the name of every unit');
          else if (seen[u.n]) bad = L('اسم الوحدة مكرر: ', 'Unit name repeated: ') + u.n;
          else if (i > 0 && !(u.f > 1)) bad = L('اكتب كم ', 'Type how many ') + (units[0].n || '') + L(' في ', ' are in a ') + u.n + L(' (أكثر من 1)', ' (more than 1)');
          seen[u.n] = 1;
        });
        if (bad) return C.toast(bad, 'warn');
        if (!units.some(function (u) { return u.r > 0 || u.w > 0; }) && !f._warned) { f._warned = true; return C.toast(L('لم تكتب أي سعر بيع. اضغط حفظ مرة أخرى للمتابعة بدون سعر.', 'No selling price typed. Press Save again to continue without one.'), 'warn', 5000); }
        var doc = Object.assign({}, p || {}, {
          id: p ? p.id : C.uid(), name: name, nameEn: f.nameEn.value.trim(), cat: f.cat.value, sku: C.normDigits(f.sku.value).trim(), supplier: f.supplier.value.trim(),
          units: units.map(function (u) { return { n: u.n, e: u.e || '', f: u.f, r: u.r, w: u.w, bc: u.bc }; }),
          minStock: num(f.minStock.value), shelf: f.shelf.value.trim(), expiry: f.expiry.value, desc: f.desc.value.trim(), img: fresh || img
        });
        if (f.site) doc.site = f.site.checked;
        if (f.cost) { var cu = units[+f.costUnit.value] || units[0]; doc.cost = num(f.cost.value) / (cu.f || 1); }
        if (isNew) { var qu = units[+f.qtyUnit.value] || units[0], st = { shop: 0, wh: 0 }; st[f.loc.value] = C.r3(num(f.qty.value) * qu.f); doc.stock = st; }
        C.busy(q('#pf-save'), Store.saveProduct(doc)).then(function (np) {
          saved = np; m.close();
          C.toast(isNew ? L('تم تسجيل المنتج في المخزون', 'The product is now in stock') : L('تم الحفظ', 'Saved'));
          redraw();
        }, function () {});
      };
      if (!opt.file) setTimeout(function () { if (isNew) f.name.focus(); }, 60);
    });
  }

  /* ------------------------------------------------ count / correct / move */
  function stock(p, mode) {
    return new Promise(function (resolve) {
      var type = mode || 'count', done = false;
      var m = C.modal({ title: icon('box') + ' ' + esc(P.name(p)), size: 'md', onClose: function () { resolve(done); },
        body: '<div class="col"><div class="loc-boxes"><div class="loc-box"><span>' + icon('store', 15) + L('المحل', 'Shop') + '</span><b class="num">' + C.qf(P.at(p, 'shop')) + '</b><small>' + esc(P.breakdown(p, P.at(p, 'shop'))) + '</small></div>' +
          '<div class="loc-box"><span>' + icon('warehouse', 15) + L('المخزن', 'Warehouse') + '</span><b class="num">' + C.qf(P.at(p, 'wh')) + '</b><small>' + esc(P.breakdown(p, P.at(p, 'wh'))) + '</small></div>' +
          '<div class="loc-box total"><span>' + L('الإجمالي', 'Total') + '</span><b class="num">' + C.qf(P.total(p)) + '</b><small>' + esc(P.unitName(p.units[0])) + '</small></div></div>' +
          '<div class="seg" id="st-type" style="align-self:flex-start;flex-wrap:wrap">' + [['count', L('جرد (العدد الفعلي)', 'Count (actual number)')], ['add', L('إضافة', 'Add')], ['remove', L('إنقاص / تالف', 'Remove / damaged')], ['transfer', L('نقل', 'Move')]].map(function (x) { return '<button type="button" data-ty="' + x[0] + '" class="' + (type === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          '<div class="grid g2 keep"><div class="field"><label id="st-loclabel"></label><select class="input" id="st-loc"><option value="shop">' + L('المحل', 'Shop') + '</option><option value="wh"' + (type === 'transfer' ? ' selected' : '') + '>' + L('المخزن', 'Warehouse') + '</option></select></div>' +
          '<div class="field"><label id="st-qlabel"></label><div class="row"><input class="input num grow" id="st-q" inputmode="decimal"><select class="input" id="st-u" style="width:auto">' + p.units.map(function (u, i) { return '<option value="' + i + '">' + esc(P.unitName(u)) + '</option>'; }).join('') + '</select></div></div></div>' +
          '<p class="small muted" id="st-hint"></p>' +
          '<div class="field"><label>' + L('السبب / ملاحظة (اختياري)', 'Reason / note (optional)') + '</label><input class="input" id="st-r" maxlength="200"></div></div>',
        foot: '<button type="button" class="btn primary lg" id="st-ok">' + icon('check') + L('تنفيذ', 'Apply') + '</button>' });
      var q = function (s) { return m.el.querySelector(s); };
      function labels() {
        q('#st-loclabel').textContent = type === 'transfer' ? L('النقل من', 'Move from') : L('المكان', 'Place');
        q('#st-qlabel').textContent = type === 'count' ? L('العدد الفعلي الموجود', 'Actual number found') : L('الكمية', 'Quantity');
        var loc = q('#st-loc').value, u = p.units[+q('#st-u').value], v = num(q('#st-q').value) * u.f, have = P.at(p, loc), after;
        after = type === 'count' ? v : type === 'add' ? have + v : type === 'remove' ? have - v : have - v;
        q('#st-hint').textContent = q('#st-q').value === '' ? '' : (type === 'transfer' ? L('سينتقل ', 'Moving ') + C.qf(v) + ' ' + P.unitName(p.units[0]) + L(' من ', ' from ') + C.locName(loc) + L(' إلى ', ' to ') + C.locName(loc === 'shop' ? 'wh' : 'shop') + ' · '
          : '') + (q('#st-q').value === '' ? '' : C.locName(loc) + ': ' + C.qf(have) + ' → ' + C.qf(after) + ' ' + P.unitName(p.units[0]));
      }
      m.el.addEventListener('click', function (e) { var b = e.target.closest('[data-ty]'); if (b) { type = b.getAttribute('data-ty'); [].forEach.call(m.el.querySelectorAll('[data-ty]'), function (x) { x.classList.toggle('on', x === b); }); labels(); } });
      m.el.addEventListener('input', labels); m.el.addEventListener('change', labels);
      labels(); setTimeout(function () { q('#st-q').focus(); }, 60);
      q('#st-ok').onclick = function () {
        var raw = q('#st-q').value.trim(), u = p.units[+q('#st-u').value], v = C.r3(num(raw) * u.f);
        if (raw === '' || v < 0 || (type !== 'count' && v <= 0)) return C.toast(L('اكتب الكمية', 'Type the quantity'), 'warn');
        C.busy(q('#st-ok'), Store.stockMove({ pid: p.id, type: type, loc: q('#st-loc').value, qty: v, reason: q('#st-r').value.trim() })).then(function () {
          done = true; m.close(); C.toast(L('تم تحديث الكمية', 'Quantity updated')); redraw();
        }, function () {});
      };
    });
  }

  Shell.page('inventory', {
    title: function () { return L('المخزون', 'Stock'); },
    render: function (el) { root = document.createElement('div'); el.appendChild(root); bind(); draw(); }
  });
  window.Inventory = { form: form, details: details, stock: stock };
})();
