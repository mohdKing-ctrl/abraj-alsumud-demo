/* sell.js - the selling screen: products on one side, the bill on the other.
   Retail / wholesale switch (each unit of a product has its own retail and wholesale price), sale by piece, dozen,
   carton or any unit the product has, from the shop or from the warehouse, cash or credit. Also used to edit a saved bill. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, Calc = C.Calc, num = C.num, f3 = C.f3;
  var cart = null, flt = { q: '', cat: '' }, root = null;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function fresh() {
    return { type: ls('abraj_sale_type') === 'wholesale' ? 'wholesale' : 'retail', loc: ls('abraj_sale_loc') === 'wh' ? 'wh' : (S.settings.defLoc || 'shop'),
      cid: '', cname: '', cphone: '', lines: [], discount: 0, method: 'cash', paid: null, note: '', editing: null };
  }
  function vatPct() { return cart.editing ? num(cart.editing.vatPct) : (S.settings.vatOn ? num(S.settings.vatPct) : 0); }
  function unitOf(l) { var p = Store.product(l.pid); return p ? (p.units[l.ui] || p.units[0]) : null; }
  function priceFor(p, ui, type) { var u = p.units[ui] || p.units[0]; return type === 'wholesale' ? (num(u.w) || num(u.r)) : (num(u.r) || num(u.w)); }
  function totals() { return Calc.totals(cart.lines, cart.discount, vatPct()); }
  function paidNow(t) { return cart.paid === null ? t.total : Math.min(Math.max(num(cart.paid), 0), t.total); }
  /* how many smallest units of a product the bill asks for, and how many the chosen place has */
  function asked(pid) { return cart.lines.reduce(function (t, l) { var u = unitOf(l); return t + (l.pid === pid && u ? num(l.q) * u.f : 0); }, 0); }
  function available(pid) {
    var p = Store.product(pid); if (!p) return 0;
    var have = P.at(p, cart.loc);
    if (cart.editing && (cart.editing.loc || 'shop') === cart.loc) cart.editing.items.forEach(function (it) { if (it.pid === pid) have += num(it.q) * num(it.f || 1); });   // what this bill already holds
    return have;
  }

  /* ------------------------------------------------ products side */
  function matches() {
    var q = C.norm(flt.q);
    return S.products.filter(function (p) {
      if (p.archived) return false;
      if (flt.cat && p.cat !== flt.cat) return false;
      if (!q) return true;
      var hay = C.norm([p.name, p.nameEn, p.sku].concat(p.units.map(function (u) { return u.bc; })).join(' '));
      return hay.indexOf(q) >= 0;
    });
  }
  function gridHtml() {
    var list = matches();
    if (!S.products.length) return '<div class="empty">' + icon('box', 44) + '<p>' + L('لا توجد منتجات بعد. أضف منتجاتك من صفحة «المخزون».', 'No products yet. Add your products on the "Stock" page.') + '</p>' +
      (Store.can('stock') ? '<button type="button" class="btn primary mt" data-go="inventory">' + icon('plus') + L('إضافة منتج', 'Add a product') + '</button>' : '') + '</div>';
    if (!list.length) return '<div class="empty">' + icon('search', 40) + '<p>' + L('لا توجد نتائج', 'No results') + '</p></div>';
    return '<div class="p-grid">' + list.slice(0, 150).map(function (p) {
      var su = P.saleUnits(p, cart.type), first = su[0], cat = C.catOf(S.settings, p.cat), out = P.at(p, cart.loc) <= 0;
      return '<button type="button" class="p-card' + (out ? ' out' : '') + '" data-p="' + esc(p.id) + '">' +
        Media.thumb(p.img, P.name(p), cat.c, 'thumb pic') +
        (out ? '<span class="st badge bad">' + L('نافد', 'Out') + '</span>' : P.low(p) ? '<span class="st badge warn">' + L('منخفض', 'Low') + '</span>' : '') +
        '<span class="info"><span class="nm">' + esc(P.name(p)) + '</span>' +
        (first ? '<span class="pr"><span class="num">' + f3(first.price) + '</span> <small>/ ' + esc(P.unitName(first.u)) + '</small></span>' : '<span class="more">' + L('بدون سعر', 'No price') + '</span>') +
        '<span class="more">' + (su.length > 1 ? '+ ' + su.slice(1).map(function (x) { return esc(P.unitName(x.u)) + (x.u.f > 1 ? ' (' + C.qf(x.u.f) + ')' : ''); }).join('، ') + ' · ' : '') +
        L('المتوفر: ', 'In stock: ') + esc(P.breakdown(p, P.at(p, cart.loc))) + '</span></span></button>';
    }).join('') + '</div>' + (list.length > 150 ? '<p class="muted center mt small">' + L('اكتب في البحث لعرض بقية المنتجات', 'Type in the search to see the rest') + '</p>' : '');
  }
  function pick(p) {
    var su = P.saleUnits(p, cart.type);
    if (!su.length) { C.toast(L('لم يُحدد سعر بيع لهذا المنتج. حدده من المخزون.', 'This product has no selling price yet. Set it on the Stock page.'), 'warn'); return; }
    if (su.length === 1) return add(p, su[0].i);
    var m = C.modal({ title: esc(P.name(p)), size: 'sm', body: '<p class="muted mb">' + L('اختر وحدة البيع', 'Choose the selling unit') + ' (' + (cart.type === 'wholesale' ? L('جملة', 'wholesale') : L('تجزئة', 'retail')) + ')</p><div class="unit-pick">' +
      su.map(function (x) {
        return '<button type="button" data-u="' + x.i + '"><span>' + esc(P.unitName(x.u)) + (x.u.f > 1 ? ' <small class="muted">= ' + C.qf(x.u.f) + ' ' + esc(P.unitName(p.units[0])) + '</small>' : '') + '</span><b class="num">' + f3(x.price) + '</b></button>';
      }).join('') + '</div>' });
    m.body.addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (b) { add(p, +b.getAttribute('data-u')); m.close(); } });
  }
  function add(p, ui, qty) {
    var l = cart.lines.filter(function (x) { return x.pid === p.id && x.ui === ui && !x.manual; })[0];
    if (l) l.q = C.r3(num(l.q) + (qty || 1));
    else { l = { pid: p.id, ui: ui, q: qty || 1, price: priceFor(p, ui, cart.type) }; cart.lines.push(l); }
    drawCart();
    showLine(cart.lines.indexOf(l));
  }
  /* scroll the bill (only the bill, never the page) so that this line can be seen */
  function showLine(i) {
    var box = root.querySelector('#cart'), row = box && box.querySelector('.cart-line[data-i="' + i + '"]');
    if (!row || !box.offsetParent) return;
    var top = row.offsetTop, bottom = top + row.offsetHeight, bar = box.querySelector('.cart-title'), barH = bar ? bar.offsetHeight : 0;
    if (top - barH < box.scrollTop) box.scrollTop = top - barH - 8;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
  }
  function byBarcode(code) {
    code = C.normDigits(code).trim();
    if (!code) return false;
    for (var i = 0; i < S.products.length; i++) {
      var p = S.products[i];
      for (var k = 0; k < p.units.length; k++) if (p.units[k].bc && p.units[k].bc === code) { add(p, k); return true; }
      if (p.sku && p.sku === code) { pick(p); return true; }
    }
    return false;
  }

  /* ------------------------------------------------ the bill side */
  function lineHtml(l, i) {
    var p = l.pid ? Store.product(l.pid) : null, u = unitOf(l), canPrice = Store.can('discount');
    var name = p ? P.name(p) : (l.n || L('بند يدوي', 'Manual item'));
    var sub = '';
    if (p && u) {
      var need = asked(l.pid), have = available(l.pid);
      sub = (u.f > 1 ? esc(P.unitName(u)) + ' = ' + C.qf(u.f) + ' ' + esc(P.unitName(p.units[0])) + ' · ' : '') +
        (need > have + 0.0005 ? '<b style="color:var(--red)">' + L('المتوفر في ', 'Only ') + (C.lang === 'ar' ? esc(C.locName(cart.loc)) + ': ' : '') + esc(P.breakdown(p, have)) + (C.lang === 'en' ? ' in ' + esc(C.locName(cart.loc)) : '') + '</b>'
          : L('المتوفر: ', 'In stock: ') + esc(P.breakdown(p, have)));
    }
    var opts = p ? P.saleUnits(p, cart.type) : [];
    if (p && !opts.some(function (x) { return x.i === l.ui; })) opts.push({ i: l.ui, u: u, price: l.price });
    return '<div class="cart-line" data-i="' + i + '"><div><div class="nm">' + esc(name) + '</div><div class="sub">' + sub + '</div></div>' +
      '<button type="button" class="icon-btn sm red" data-rm title="' + L('حذف', 'Remove') + '">' + icon('trash', 18) + '</button>' +
      '<div class="ctl">' +
      (p && opts.length > 1 ? '<select class="input" data-unit style="width:auto">' + opts.map(function (x) { return '<option value="' + x.i + '"' + (x.i === l.ui ? ' selected' : '') + '>' + esc(P.unitName(x.u)) + '</option>'; }).join('') + '</select>'
        : (u ? '<span class="badge">' + esc(P.unitName(u)) + '</span>' : '')) +
      '<span class="qty"><button type="button" data-minus aria-label="-">' + icon('minus', 16) + '</button><input data-q inputmode="decimal" value="' + C.qf(l.q) + '" aria-label="' + L('الكمية', 'Quantity') + '"><button type="button" data-plus aria-label="+">' + icon('plus', 16) + '</button></span>' +
      '<input class="input num price" data-price inputmode="decimal" value="' + f3(l.price) + '"' + (canPrice ? '' : ' disabled') + ' aria-label="' + L('السعر', 'Price') + '">' +
      '<span class="lt num" data-lt>' + f3(Calc.line(l)) + '</span></div></div>';
  }
  function drawCart() {
    var el = root.querySelector('#cart'), t = totals(), ed = cart.editing, pct = vatPct();
    var custList = '<datalist id="cust-list">' + S.customers.map(function (c) { return '<option value="' + esc(c.name) + '">' + esc(c.phone || '') + '</option>'; }).join('') + '</datalist>';
    var keepScroll = el.scrollTop;
    el.innerHTML =
      '<div class="cart-title row between"><h3>' + (ed ? icon('edit') + ' ' + L('تعديل الفاتورة ', 'Editing bill ') + '<span class="ltr">' + esc(ed.number) + '</span>' : icon('receipt') + ' ' + L('الفاتورة', 'Bill')) + '</h3>' +
      '<span class="row">' + (cart.lines.length ? '<button type="button" class="btn sm ghost" id="c-clear">' + (ed ? L('إلغاء التعديل', 'Cancel edit') : L('تفريغ', 'Clear')) + '</button>' : (ed ? '<button type="button" class="btn sm ghost" id="c-clear">' + L('إلغاء التعديل', 'Cancel edit') + '</button>' : '')) +
      '<button type="button" class="icon-btn cart-close" id="c-close" aria-label="close">' + icon('x') + '</button></span></div>' +
      '<div class="cart-head"><div class="grid g2 keep"><input class="input" id="c-name" list="cust-list" placeholder="' + L('العميل (اختياري)', 'Customer (optional)') + '" value="' + esc(cart.cname) + '" autocomplete="off">' +
      '<input class="input ltr" id="c-phone" inputmode="tel" placeholder="' + L('الهاتف', 'Phone') + '" value="' + esc(cart.cphone) + '" autocomplete="off"></div>' + custList +
      '<div class="row between wrap"><span class="small muted">' + L('البيع من:', 'Selling from:') + '</span><div class="seg" id="c-loc"><button type="button" data-loc="shop" class="' + (cart.loc === 'shop' ? 'on' : '') + '">' + icon('store', 16) + L('المحل', 'Shop') + '</button><button type="button" data-loc="wh" class="' + (cart.loc === 'wh' ? 'on' : '') + '">' + icon('warehouse', 16) + L('المخزن', 'Warehouse') + '</button></div></div></div>' +
      '<div class="cart-lines" id="c-lines">' + (cart.lines.length ? cart.lines.map(lineHtml).join('') : '<div class="empty">' + icon('cart', 40) + '<p>' + L('اضغط على منتج لإضافته', 'Tap a product to add it') + '</p></div>') + '</div>' +
      '<div class="cart-foot">' +
      '<div class="row between"><button type="button" class="link small" id="c-manual">+ ' + L('بند يدوي', 'Manual item') + '</button><button type="button" class="link small" id="c-note">' + (cart.note ? L('تعديل الملاحظة', 'Edit note') : '+ ' + L('ملاحظة', 'Note')) + '</button></div>' +
      '<div class="tot-row"><span>' + L('المجموع', 'Sub-total') + '</span><b class="num" id="t-sub">' + f3(t.sub) + '</b></div>' +
      (Store.can('discount') ? '<div class="tot-row"><span>' + L('الخصم', 'Discount') + '</span><input class="input num" id="c-disc" inputmode="decimal" value="' + (cart.discount ? f3(cart.discount) : '') + '" placeholder="0.000"></div>' : '') +
      (pct > 0 ? '<div class="tot-row"><span>' + L('ضريبة القيمة المضافة ', 'VAT ') + pct + '%</span><b class="num" id="t-vat">' + f3(t.vat) + '</b></div>' : '') +
      '<div class="tot-row big"><span>' + L('الإجمالي', 'Total') + '</span><span class="num" id="t-total">' + C.money(t.total) + '</span></div>' +
      (ed ? '<div class="note">' + icon('alert', 18) + '<span>' + L('المدفوع سابقاً: ', 'Already paid: ') + '<b class="num">' + f3(Calc.paid(ed)) + '</b>. ' + L('التعديل يعيد حساب المخزون تلقائياً ويُسجَّل في سجل التعديلات.', 'Editing recalculates stock automatically and is written to the change log.') + '</span></div>'
        : '<div class="pay-methods" id="c-method">' + ['cash', 'card', 'transfer', 'cheque'].map(function (m) { return '<button type="button" data-m="' + m + '" class="' + (cart.method === m ? 'on' : '') + '">' + esc(C.payName(m)) + '</button>'; }).join('') + '</div>' +
        '<div class="tot-row"><span>' + L('المدفوع الآن', 'Paid now') + '</span><span class="row"><button type="button" class="btn sm ' + (cart.paid === null ? 'soft' : 'ghost') + '" id="c-full">' + L('كامل', 'Full') + '</button><button type="button" class="btn sm ' + (cart.paid === 0 ? 'amber' : 'ghost') + '" id="c-credit">' + L('آجل', 'Credit') + '</button>' +
        '<input class="input num" id="c-paid" inputmode="decimal" value="' + (cart.paid === null ? '' : f3(cart.paid)) + '" placeholder="' + f3(t.total) + '"></span></div>' +
        '<div class="tot-row small" id="t-bal-row"' + (paidNow(t) < t.total - 0.0005 ? '' : ' style="display:none"') + '><span style="color:var(--red);font-weight:700">' + L('المتبقي على العميل', 'Balance on customer') + '</span><b class="num" id="t-bal" style="color:var(--red)">' + f3(t.total - paidNow(t)) + '</b></div>') +
      (ed ? '<button type="button" class="btn primary lg block" data-save="none">' + icon('check') + L('حفظ التعديلات', 'Save changes') + '</button>'
        : '<div class="save-row"><button type="button" class="btn primary lg" data-save="print">' + icon('print') + L('حفظ وطباعة', 'Save & print') + '</button>' +
        '<button type="button" class="btn wa lg" data-save="wa">' + icon('whatsapp') + L('حفظ + واتساب', 'Save + WhatsApp') + '</button></div>' +
        '<div class="row between"><button type="button" class="btn ghost grow" data-save="none">' + L('حفظ فقط', 'Save only') + '</button>' +
        '<select class="input" id="c-size" style="width:auto" aria-label="' + L('مقاس الطباعة', 'Print size') + '">' + Print.sizeOptions(Print.size()) + '</select></div>') +
      '</div>';
    var tg = root.querySelector('#cart-toggle');
    if (tg) tg.innerHTML = '<span>' + icon('cart') + ' ' + L('الفاتورة', 'Bill') + ' (' + cart.lines.length + ')</span><b class="num">' + C.money(t.total) + '</b>';
    el.scrollTop = keepScroll;
  }
  function liveTotals() {
    var t = totals(), set = function (id, v) { var e = root.querySelector(id); if (e) e.textContent = v; };
    set('#t-sub', f3(t.sub)); set('#t-vat', f3(t.vat)); set('#t-total', C.money(t.total));
    var br = root.querySelector('#t-bal-row');
    if (br) { br.style.display = paidNow(t) < t.total - 0.0005 ? '' : 'none'; set('#t-bal', f3(t.total - paidNow(t))); }
    var pi = root.querySelector('#c-paid'); if (pi) pi.placeholder = f3(t.total);
    var tg = root.querySelector('#cart-toggle');
    if (tg) tg.innerHTML = '<span>' + icon('cart') + ' ' + L('الفاتورة', 'Bill') + ' (' + cart.lines.length + ')</span><b class="num">' + C.money(t.total) + '</b>';
  }

  /* ------------------------------------------------ save */
  function findCustomer() {
    var n = C.norm(cart.cname), ph = C.phoneKey(cart.cphone);
    return S.customers.filter(function (c) { return (n && C.norm(c.name) === n) || (ph && ph.length >= 8 && C.phoneKey(c.phone) === ph); })[0] || null;
  }
  function save(action, btn) {
    cart.lines = cart.lines.filter(function (l) { return num(l.q) > 0; });
    if (!cart.lines.length) return C.toast(L('الفاتورة فارغة', 'The bill is empty'), 'warn');
    var t = totals(), paid = paidNow(t), ed = cart.editing;
    if (!ed && paid < t.total - 0.0005 && !cart.cname.trim()) { C.toast(L('البيع الآجل يحتاج اسم العميل', 'A credit sale needs the customer name'), 'warn'); root.querySelector('#c-name').focus(); return; }
    if (S.settings.blockNegative) {
      var short = cart.lines.filter(function (l) { return l.pid && asked(l.pid) > available(l.pid) + 0.0005; })[0];
      if (short) return C.toast(L('الكمية غير متوفرة: ', 'Not enough stock: ') + P.name(Store.product(short.pid)), 'err');
    }
    var cust = findCustomer();
    var doc = {
      type: cart.type, loc: cart.loc, date: ed ? ed.date : C.today(), time: ed ? ed.time : C.nowTime(),
      customerId: cust ? cust.id : '', customerName: cart.cname.trim() || (cust ? cust.name : ''), customerPhone: cart.cphone.trim() || (cust ? cust.phone || '' : ''),
      customerVat: cust ? cust.vatNo || '' : '', note: cart.note, vatPct: vatPct(),
      items: cart.lines.map(function (l) {
        var p = l.pid ? Store.product(l.pid) : null, u = unitOf(l);
        return { pid: p ? p.id : '', n: p ? p.name : l.n, a: p ? p.nameEn || '' : '', unit: u ? u.n : (l.unit || ''), unitEn: u ? u.e || '' : '', f: u ? u.f : 1, q: num(l.q), price: num(l.price) };
      }),
      sub: t.sub, discount: t.discount, vat: t.vat, total: t.total
    };
    var job;
    if (ed) {
      doc.id = ed.id; doc.payments = (ed.payments || []).map(function (p) { return Object.assign({}, p); });
      var over = C.r3(Calc.paid(ed) - t.total);
      if (over > 0.0005 && !cart.refundOk) {
        // the bill became smaller than what the customer already paid: the difference goes back to him
        C.confirmBox(L('الإجمالي الجديد ', 'The new total ') + f3(t.total) + L(' أقل من المدفوع سابقاً ', ' is less than what was already paid ') + f3(Calc.paid(ed)) + L('. سيُسجَّل المدفوع بقيمة الإجمالي الجديد، وتُرجع للعميل ', '. The paid amount will be set to the new total and you give back ') + f3(over) + L(' ر.ع. متابعة؟', ' OMR to the customer. Continue?'), L('نعم، احفظ', 'Yes, save')).then(function (y) { if (y) { cart.refundOk = true; save(action, btn); } });
        return;
      }
      for (var k = doc.payments.length - 1; k >= 0 && over > 0.0005; k--) {          // take the difference off the latest payments
        var cut = Math.min(over, num(doc.payments[k].amount));
        doc.payments[k].amount = C.r3(num(doc.payments[k].amount) - cut); over = C.r3(over - cut);
      }
      doc.payments = doc.payments.filter(function (p) { return num(p.amount) > 0; });
      job = Store.updateInvoice(doc);
    }
    else {
      doc.payments = paid > 0 ? [{ amount: paid, method: cart.method, date: C.today() }] : [];
      doc.clientKey = cart.key || (cart.key = C.uid() + C.uid());
      // a new customer typed on the bill is saved to the customers list (so his balance and statement work)
      var pre = (!cust && doc.customerName && (Store.can('customers') || Store.can('sell')))
        ? Store.saveCustomer({ id: C.uid(), name: doc.customerName, phone: doc.customerPhone, type: cart.type, created: C.today() }).then(function (c) { doc.customerId = c.id; }, function () {})
        : Promise.resolve();
      job = pre.then(function () { return Store.createInvoice(doc); });
    }
    C.busy(btn, job).then(function (inv) {
      C.toast((ed ? L('تم حفظ التعديلات: ', 'Changes saved: ') : L('تم حفظ الفاتورة: ', 'Bill saved: ')) + inv.number);
      var keepType = cart.type, keepLoc = cart.loc;
      cart = fresh(); cart.type = keepType; cart.loc = keepLoc;
      root.querySelector('#cart').classList.remove('open');
      if (ed) { Shell.go('invoices', { open: inv.id }); return; }
      draw();
      if (action === 'print') Print.run(inv, Print.size());
      if (action === 'wa') WhatsApp.open(inv);
    }, function () {});
  }

  /* ------------------------------------------------ page */
  function draw() {
    root.innerHTML = '<div class="sell"><section>' +
      '<div class="sell-bar"><div class="seg amber" id="s-type"><button type="button" data-t="retail" class="' + (cart.type === 'retail' ? 'on' : '') + '">' + L('تجزئة', 'Retail') + '</button><button type="button" data-t="wholesale" class="' + (cart.type === 'wholesale' ? 'on' : '') + '">' + L('جملة', 'Wholesale') + '</button></div>' +
      '<div class="search">' + icon('search') + '<input class="input" id="s-q" type="search" placeholder="' + L('ابحث بالاسم أو امسح الباركود', 'Search by name or scan a barcode') + '" value="' + esc(flt.q) + '" autocomplete="off"></div>' +
      (Scanner.supported() ? '<button type="button" class="btn ghost" id="s-scan" title="' + L('مسح بالكاميرا', 'Scan with camera') + '">' + icon('barcode') + '</button>' : '') + '</div>' +
      '<div class="chips" id="s-cats"><button type="button" class="chip' + (flt.cat ? '' : ' on') + '" data-c="">' + L('الكل', 'All') + '</button>' +
      S.settings.cats.filter(function (c) { return S.products.some(function (p) { return p.cat === c.id; }); }).map(function (c) { return '<button type="button" class="chip' + (flt.cat === c.id ? ' on' : '') + '" data-c="' + esc(c.id) + '">' + esc(C.catName(c)) + '</button>'; }).join('') + '</div>' +
      '<div id="s-grid">' + gridHtml() + '</div></section>' +
      '<aside class="cart" id="cart"></aside></div>' +
      '<button type="button" class="btn primary lg cart-toggle" id="cart-toggle"></button>';
    drawCart();
  }
  function bind() {
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-p]'))) { var p = Store.product(b.getAttribute('data-p')); if (p) pick(p); return; }
      if ((b = e.target.closest('[data-t]'))) {
        cart.type = b.getAttribute('data-t'); ls('abraj_sale_type', cart.type);
        cart.lines.forEach(function (l) { var p = l.pid ? Store.product(l.pid) : null; if (p) l.price = priceFor(p, l.ui, cart.type); });      // re-price the bill for the other price list
        draw(); return;
      }
      if ((b = e.target.closest('[data-c]'))) { flt.cat = b.getAttribute('data-c'); draw(); return; }
      if ((b = e.target.closest('[data-loc]'))) { cart.loc = b.getAttribute('data-loc'); ls('abraj_sale_loc', cart.loc); draw(); return; }
      if ((b = e.target.closest('[data-m]'))) { cart.method = b.getAttribute('data-m'); drawCart(); return; }
      if ((b = e.target.closest('[data-save]'))) { save(b.getAttribute('data-save'), b); return; }
      if (e.target.closest('#s-scan')) { Scanner.open(function (code) { if (!byBarcode(code)) { flt.q = code; draw(); } }); return; }
      if (e.target.closest('#cart-toggle')) { root.querySelector('#cart').classList.add('open'); return; }
      if (e.target.closest('#c-close')) { root.querySelector('#cart').classList.remove('open'); return; }
      if (e.target.closest('#c-clear')) { var was = cart.editing; cart = fresh(); if (was) Shell.go('invoices'); else draw(); return; }
      if (e.target.closest('#c-full')) { cart.paid = null; drawCart(); return; }
      if (e.target.closest('#c-credit')) { cart.paid = 0; drawCart(); return; }
      if (e.target.closest('#c-note')) {
        var m = C.modal({ title: L('ملاحظة على الفاتورة', 'Note on the bill'), size: 'sm', body: '<textarea class="input" id="n-t" maxlength="500">' + esc(cart.note) + '</textarea>', foot: '<button type="button" class="btn primary" id="n-ok">' + L('تم', 'Done') + '</button>' });
        m.el.querySelector('#n-ok').onclick = function () { cart.note = m.el.querySelector('#n-t').value.trim(); m.close(); drawCart(); };
        return;
      }
      if (e.target.closest('#c-manual')) {
        var mm = C.modal({ title: L('بند يدوي (غير موجود في المخزون)', 'Manual item (not in stock list)'), size: 'sm',
          body: '<div class="col"><div class="field"><label>' + L('الوصف', 'Description') + '</label><input class="input" id="m-n"></div><div class="grid g2 keep"><div class="field"><label>' + L('الكمية', 'Qty') + '</label><input class="input num" id="m-q" inputmode="decimal" value="1"></div><div class="field"><label>' + L('السعر', 'Price') + '</label><input class="input num" id="m-p" inputmode="decimal"></div></div></div>',
          foot: '<button type="button" class="btn primary" id="m-ok">' + L('إضافة', 'Add') + '</button>' });
        mm.el.querySelector('#m-ok').onclick = function () {
          var n = mm.el.querySelector('#m-n').value.trim(), q = num(mm.el.querySelector('#m-q').value), pr = num(mm.el.querySelector('#m-p').value);
          if (!n || q <= 0) return C.toast(L('اكتب الوصف والكمية', 'Type the description and quantity'), 'warn');
          cart.lines.push({ pid: '', manual: true, n: n, ui: 0, q: q, price: pr }); mm.close(); drawCart();
        };
        return;
      }
      var row = e.target.closest('.cart-line');
      if (row) {
        var l = cart.lines[+row.getAttribute('data-i')];
        if (!l) return;
        if (e.target.closest('[data-rm]')) { cart.lines.splice(+row.getAttribute('data-i'), 1); drawCart(); }
        else if (e.target.closest('[data-plus]')) { l.q = C.r3(num(l.q) + 1); drawCart(); }
        else if (e.target.closest('[data-minus]')) { l.q = C.r3(Math.max(0, num(l.q) - 1)); if (!l.q) cart.lines.splice(+row.getAttribute('data-i'), 1); drawCart(); }
      }
    });
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 's-q') { flt.q = t.value; root.querySelector('#s-grid').innerHTML = gridHtml(); return; }
      if (t.id === 'c-name') { cart.cname = t.value; var c = findCustomer(); if (c && !cart.cphone && c.phone) { cart.cphone = c.phone; root.querySelector('#c-phone').value = c.phone; } return; }
      if (t.id === 'c-phone') { cart.cphone = t.value; return; }
      if (t.id === 'c-disc') { cart.discount = num(t.value); liveTotals(); return; }
      if (t.id === 'c-paid') { cart.paid = t.value.trim() === '' ? null : num(t.value); liveTotals(); return; }
      var row = t.closest('.cart-line');
      if (row) {
        var l = cart.lines[+row.getAttribute('data-i')];
        if (t.hasAttribute('data-q')) l.q = num(t.value);
        if (t.hasAttribute('data-price')) l.price = num(t.value);
        row.querySelector('[data-lt]').textContent = f3(Calc.line(l));
        liveTotals();
      }
    });
    root.addEventListener('change', function (e) {
      var t = e.target, row = t.closest('.cart-line');
      if (t.id === 'c-size') { Print.size(t.value); return; }
      if (row && t.hasAttribute('data-unit')) {
        var l = cart.lines[+row.getAttribute('data-i')], p = Store.product(l.pid);
        l.ui = +t.value; l.price = priceFor(p, l.ui, cart.type); drawCart(); return;
      }
      if (row && (t.hasAttribute('data-q') || t.hasAttribute('data-price'))) drawCart();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id === 's-q') {                 // a barcode gun types the code and presses Enter
        e.preventDefault();
        var code = e.target.value;
        if (byBarcode(code)) { flt.q = ''; e.target.value = ''; root.querySelector('#s-grid').innerHTML = gridHtml(); }
        else { var list = matches(); if (list.length === 1) { pick(list[0]); flt.q = ''; e.target.value = ''; root.querySelector('#s-grid').innerHTML = gridHtml(); } }
      }
    });
  }

  Shell.page('sell', {
    title: function () { return L('نقطة البيع', 'Point of sale'); },
    render: function (el) {
      if (!cart) cart = fresh();
      root = document.createElement('div'); el.appendChild(root);
      bind();
      draw();
    }
  });

  /* open a saved bill in the selling screen to change it */
  window.Sell = { edit: function (inv) {
    cart = fresh();
    cart.editing = inv; cart.type = inv.type || 'retail'; cart.loc = inv.loc || 'shop';
    cart.cname = inv.customerName || ''; cart.cphone = inv.customerPhone || ''; cart.discount = num(inv.discount); cart.note = inv.note || '';
    cart.lines = inv.items.map(function (it) {
      var p = it.pid ? Store.product(it.pid) : null, ui = -1;
      if (p) p.units.forEach(function (u, i) { if (ui < 0 && Math.abs(u.f - num(it.f || 1)) < 1e-9 && (u.n === it.unit || p.units.filter(function (x) { return Math.abs(x.f - num(it.f || 1)) < 1e-9; }).length === 1)) ui = i; });
      if (p && ui >= 0) return { pid: p.id, ui: ui, q: num(it.q), price: num(it.price) };
      return { pid: '', manual: true, n: it.n, unit: it.unit, ui: 0, q: num(it.q) * (p ? 1 : 1), price: num(it.price) };
    });
    Shell.go('sell');
  } };
})();
