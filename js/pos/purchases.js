/* purchases.js - goods received from suppliers.
   The owner buys by carton / box / dozen: he chooses the unit, how many, and what one unit cost him. Saving the receipt
   adds the pieces to the warehouse (or the shop) and updates the product's purchase price (weighted average + last price).
   Also: the list of past receipts, paying a supplier later, and the suppliers list with what is owed to each. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, Calc = C.Calc, num = C.num, f3 = C.f3;
  var tab = 'new', draft = null, root = null;

  function fresh() { return { supplier: '', date: C.today(), ref: '', loc: 'wh', lines: [], paid: '', method: 'cash', note: '', key: C.uid() + C.uid() }; }
  function total() { return C.r3(draft.lines.reduce(function (t, l) { return t + C.r3(num(l.cost) * num(l.q)); }, 0)); }
  function owed(name) { return C.r3(S.purchases.filter(function (p) { return p.supplierName === name; }).reduce(function (t, p) { return t + Calc.balance(p); }, 0)); }

  /* choose a product from a searchable list */
  function pickProduct() {
    return new Promise(function (res) {
      var chosen = null;
      var m = C.modal({ title: L('اختر المنتج', 'Choose the product'), size: 'md', onClose: function () { res(chosen); },
        body: '<div class="search mb">' + icon('search') + '<input class="input" id="pp-q" type="search" placeholder="' + L('ابحث بالاسم أو الباركود', 'Search by name or barcode') + '"></div><div id="pp-list" class="col" style="gap:6px"></div>' +
          (Store.can('stock') ? '<button type="button" class="btn soft block mt" id="pp-new">' + icon('camera') + L('منتج جديد غير موجود - أضفه بالصورة', 'A new product - add it by photo') + '</button>' : '') });
      function list() {
        var q = C.norm(m.el.querySelector('#pp-q').value);
        var rows = S.products.filter(function (p) { return !q || C.norm([p.name, p.nameEn, p.sku].concat(p.units.map(function (u) { return u.bc; })).join(' ')).indexOf(q) >= 0; }).slice(0, 40);
        m.el.querySelector('#pp-list').innerHTML = rows.length ? rows.map(function (p) {
          return '<button type="button" class="inv-card" data-id="' + esc(p.id) + '" style="padding:8px">' + Media.thumb(p.img, P.name(p), C.catOf(S.settings, p.cat).c) + '<span class="grow"><span class="nm">' + esc(P.name(p)) + '</span><br><span class="meta">' + L('الموجود: ', 'In stock: ') + esc(P.breakdown(p, P.total(p))) + '</span></span></button>';
        }).join('') : '<p class="muted center">' + L('لا توجد نتائج', 'No results') + '</p>';
      }
      list();
      m.el.querySelector('#pp-q').oninput = list;
      m.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-id]');
        if (b) { chosen = Store.product(b.getAttribute('data-id')); m.close(); return; }
        if (e.target.closest('#pp-new')) Shell.pickPhoto(true).then(function (f) { Inventory.form(null, f ? { file: f } : {}).then(function (np) { if (np) { chosen = np; m.close(); } }); });
      });
      setTimeout(function () { m.el.querySelector('#pp-q').focus(); }, 60);
    });
  }
  function addLine(p) {
    var ui = 0; p.units.forEach(function (u, i) { if (u.f > p.units[ui].f) ui = i; });          // suggest the biggest unit (the carton)
    draft.lines.push({ pid: p.id, ui: ui, q: 1, cost: C.r3(num(p.lastCost || p.cost) * p.units[ui].f) || '' });
    draw();
  }

  /* ------------------------------------------------ new receipt */
  function newHtml() {
    if (!Store.can('purchase')) return '<div class="note">' + L('ليست لديك صلاحية استلام البضاعة.', 'You do not have permission to receive goods.') + '</div>';
    var t = total();
    return '<div class="card"><div class="grid g4"><div class="field"><label>' + L('المورد', 'Supplier') + '</label><input class="input" id="u-sup" list="u-sups" value="' + esc(draft.supplier) + '" placeholder="' + L('اسم المورد', 'Supplier name') + '"><datalist id="u-sups">' + S.suppliers.map(function (s) { return '<option value="' + esc(s.name) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label>' + L('تاريخ الاستلام', 'Date received') + '</label><input class="input" type="date" id="u-date" value="' + esc(draft.date) + '"></div>' +
      '<div class="field"><label>' + L('رقم فاتورة المورد (اختياري)', "Supplier's invoice no. (optional)") + '</label><input class="input ltr" id="u-ref" value="' + esc(draft.ref) + '"></div>' +
      '<div class="field"><label>' + L('تُضاف البضاعة إلى', 'Goods go into') + '</label><div class="seg"><button type="button" data-ploc="wh" class="' + (draft.loc === 'wh' ? 'on' : '') + '">' + icon('warehouse', 16) + L('المخزن', 'Warehouse') + '</button><button type="button" data-ploc="shop" class="' + (draft.loc === 'shop' ? 'on' : '') + '">' + icon('store', 16) + L('المحل', 'Shop') + '</button></div></div></div></div>' +
      '<div class="card mt"><h3>' + icon('box') + L('البضاعة المستلمة', 'Goods received') + '</h3>' +
      (draft.lines.length ? '<div class="col">' + draft.lines.map(function (l, i) {
        var p = Store.product(l.pid); if (!p) return '';
        var u = p.units[l.ui] || p.units[0], per = u.f > 0 ? num(l.cost) / u.f : 0;
        return '<div class="section-block" data-i="' + i + '" style="margin:0"><div class="row between"><div class="row">' + Media.thumb(p.img, P.name(p), C.catOf(S.settings, p.cat).c) + '<div><b>' + esc(P.name(p)) + '</b><div class="small muted">' + L('الموجود الآن: ', 'In stock now: ') + esc(P.breakdown(p, P.total(p))) + '</div></div></div>' +
          '<button type="button" class="icon-btn red" data-rm>' + icon('trash', 18) + '</button></div>' +
          '<div class="grid g4 mt"><div class="field"><label>' + L('الوحدة', 'Unit') + '</label><select class="input" data-k="ui">' + p.units.map(function (x, k) { return '<option value="' + k + '"' + (k === l.ui ? ' selected' : '') + '>' + esc(P.unitName(x)) + (x.f > 1 ? ' (' + C.qf(x.f) + ' ' + esc(P.unitName(p.units[0])) + ')' : '') + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>' + L('العدد', 'How many') + '</label><input class="input num" data-k="q" inputmode="decimal" value="' + C.qf(l.q) + '"></div>' +
          '<div class="field"><label>' + L('سعر شراء ', 'Cost of one ') + esc(P.unitName(u)) + '</label><input class="input num" data-k="cost" inputmode="decimal" value="' + (l.cost === '' ? '' : f3(l.cost)) + '" placeholder="0.000"></div>' +
          '<div class="field"><label>' + L('المبلغ', 'Amount') + '</label><div class="input num" style="background:var(--g50);font-weight:800" data-lt>' + f3(num(l.cost) * num(l.q)) + '</div></div></div>' +
          '<p class="small muted mt" data-hint>' + L('يُضاف ', 'Adds ') + '<b>' + C.qf(num(l.q) * u.f) + ' ' + esc(P.unitName(p.units[0])) + '</b>' + (u.f > 1 && per > 0 ? ' · ' + L('تكلفة ', 'cost per ') + esc(P.unitName(p.units[0])) + ': <b class="num">' + (Math.round(per * 100000) / 100000) + '</b>' : '') +
          (function () { var b = p.units[0]; return num(b.r) > 0 && per > 0 ? ' · ' + L('تباع ', 'sold at ') + f3(b.r) + (per > num(b.r) ? ' <b style="color:var(--red)">' + L('(أقل من التكلفة!)', '(below cost!)') + '</b>' : '') : ''; })() + '</p></div>';
      }).join('') + '</div>' : '<div class="empty">' + icon('truck', 44) + '<p>' + L('أضف المنتجات التي استلمتها', 'Add the products you received') + '</p></div>') +
      '<div class="row wrap mt"><button type="button" class="btn primary" id="u-add">' + icon('plus') + L('إضافة منتج', 'Add a product') + '</button>' +
      (Store.can('stock') ? '<button type="button" class="btn soft" id="u-cam">' + icon('camera') + L('منتج جديد بالصورة', 'New product by photo') + '</button>' : '') + '</div></div>' +
      '<div class="card mt"><div class="grid g4"><div class="field"><label>' + L('إجمالي الفاتورة', 'Receipt total') + '</label><div class="input num" style="background:var(--g50);font-weight:800;font-size:18px" id="u-total">' + f3(t) + '</div></div>' +
      '<div class="field"><label>' + L('المدفوع للمورد الآن', 'Paid to supplier now') + '</label><input class="input num" id="u-paid" inputmode="decimal" value="' + esc(draft.paid) + '" placeholder="' + L('فارغ = لم يُدفع (آجل)', 'empty = not paid yet') + '"></div>' +
      '<div class="field"><label>' + L('طريقة الدفع', 'Method') + '</label><select class="input" id="u-method">' + ['cash', 'transfer', 'cheque', 'card'].map(function (x) { return '<option value="' + x + '"' + (draft.method === x ? ' selected' : '') + '>' + esc(C.payName(x)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>' + L('ملاحظة', 'Note') + '</label><input class="input" id="u-note" value="' + esc(draft.note) + '"></div></div>' +
      '<div class="row mt" style="justify-content:flex-end"><button type="button" class="btn ghost" id="u-full">' + L('مدفوع كامل', 'Paid in full') + '</button><button type="button" class="btn primary lg" id="u-save">' + icon('check') + L('حفظ وإضافة إلى المخزون', 'Save & add to stock') + '</button></div></div>';
  }

  /* ------------------------------------------------ history + suppliers */
  function histHtml() {
    if (!Store.sees('cost')) return '<div class="note">' + L('عرض سجل المشتريات يحتاج صلاحية «رؤية سعر الشراء».', 'Seeing past receipts needs the "see purchase price" permission.') + '</div>';
    var list = S.purchases.slice().sort(function (a, b) { return b.no - a.no; });
    if (!list.length) return '<div class="card empty">' + icon('truck', 44) + '<p>' + L('لا توجد مشتريات مسجلة بعد', 'No goods received yet') + '</p></div>';
    var sum = list.reduce(function (t, p) { return t + num(p.total); }, 0), due = list.reduce(function (t, p) { return t + Calc.balance(p); }, 0);
    return '<div class="stats mb"><div class="stat"><span>' + L('عدد الفواتير', 'Receipts') + '</span><b>' + list.length + '</b></div><div class="stat green"><span>' + L('إجمالي المشتريات', 'Total purchases') + '</span><b class="num">' + f3(sum) + '</b></div><div class="stat red"><span>' + L('المستحق للموردين', 'Owed to suppliers') + '</span><b class="num">' + f3(due) + '</b></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الرقم', 'No.') + '</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('المورد', 'Supplier') + '</th><th>' + L('إلى', 'Into') + '</th><th class="t-end">' + L('الإجمالي', 'Total') + '</th><th class="t-end">' + L('المتبقي للمورد', 'Still owed') + '</th><th></th></tr></thead><tbody>' +
      list.map(function (p) {
        var b = Calc.balance(p);
        return '<tr data-pid="' + esc(p.id) + '" style="cursor:pointer"><td class="ltr"><b>' + esc(p.number) + '</b></td><td>' + C.fdate(p.date) + '</td><td>' + esc(p.supplierName || '-') + (p.ref ? '<div class="small muted ltr">' + esc(p.ref) + '</div>' : '') + '</td><td>' + esc(C.locName(p.loc)) + '</td><td class="t-end num"><b>' + f3(p.total) + '</b></td><td class="t-end num">' + (b > 0.0004 ? '<b style="color:var(--red)">' + f3(b) + '</b>' : '<span class="badge ok">' + L('مدفوعة', 'Paid') + '</span>') + '</td><td class="act">' + icon(C.lang === 'ar' ? 'back' : 'next', 18) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function viewPurchase(id) {
    var p = Store.byId(S.purchases, id); if (!p) return;
    var b = Calc.balance(p);
    var m = C.modal({ title: L('استلام بضاعة ', 'Goods received ') + '<span class="ltr">' + esc(p.number) + '</span>', size: 'lg',
      body: '<dl class="kv"><dt>' + L('المورد', 'Supplier') + '</dt><dd>' + esc(p.supplierName || '-') + '</dd><dt>' + L('التاريخ', 'Date') + '</dt><dd>' + C.fdate(p.date) + '</dd><dt>' + L('أُضيفت إلى', 'Added to') + '</dt><dd>' + esc(C.locName(p.loc)) + '</dd><dt>' + L('سجّلها', 'Recorded by') + '</dt><dd>' + esc(p.createdBy || '') + '</dd></dl>' +
        (p.note ? '<div class="note mt">' + esc(p.note) + '</div>' : '') +
        '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>' + L('المنتج', 'Product') + '</th><th>' + L('الوحدة', 'Unit') + '</th><th class="t-end">' + L('العدد', 'Qty') + '</th><th class="t-end">' + L('سعر الشراء', 'Cost') + '</th><th class="t-end">' + L('المبلغ', 'Amount') + '</th></tr></thead><tbody>' +
        p.items.map(function (it) { return '<tr><td>' + esc(it.n) + '</td><td>' + esc(it.unit) + (it.f > 1 ? ' <span class="small muted">×' + C.qf(it.f) + '</span>' : '') + '</td><td class="t-end num">' + C.qf(it.q) + '</td><td class="t-end num">' + f3(it.cost) + '</td><td class="t-end num"><b>' + f3(num(it.cost) * num(it.q)) + '</b></td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td colspan="4">' + L('الإجمالي', 'Total') + '</td><td class="t-end num">' + f3(p.total) + '</td></tr></tfoot></table></div>' +
        (p.payments.length ? '<h4 class="mt mb">' + L('المدفوع للمورد', 'Paid to supplier') + '</h4>' + p.payments.map(function (x) { return '<div class="row between small" style="padding:4px 0;border-bottom:1px solid var(--line)"><span>' + C.fdate(x.date) + ' · ' + esc(C.payName(x.method)) + '</span><b class="num">' + f3(x.amount) + '</b></div>'; }).join('') : '') +
        (b > 0.0004 ? '<div class="note warn mt">' + L('المتبقي للمورد: ', 'Still owed to the supplier: ') + '<b class="num">' + C.money(b) + '</b></div>' : ''),
      foot: (Store.isAdmin() ? '<button type="button" class="btn danger-soft" id="pv-del">' + icon('trash') + L('حذف وإرجاع الكميات', 'Delete & take quantities out') + '</button>' : '') + '<span class="grow"></span>' +
        (b > 0.0004 && Store.can('purchase') ? '<button type="button" class="btn amber" id="pv-pay">' + icon('money') + L('دفع للمورد', 'Pay supplier') + '</button>' : '') });
    var q = function (s) { return m.el.querySelector(s); };
    if (q('#pv-del')) q('#pv-del').onclick = function () {
      C.confirmBox(L('حذف هذا الاستلام؟ ستُخصم كمياته من المخزون.', 'Delete this receipt? Its quantities will be taken out of stock.'), L('حذف', 'Delete'), true).then(function (y) {
        if (y) C.busy(q('#pv-del'), Store.removePurchase(p.id)).then(function () { m.close(); draw(); Shell.refreshNav(); }, function () {});
      });
    };
    if (q('#pv-pay')) q('#pv-pay').onclick = function () {
      var mm = C.modal({ title: L('دفع للمورد', 'Pay supplier'), size: 'sm', body: '<div class="col"><div class="field"><label>' + L('المبلغ', 'Amount') + '</label><input class="input num" id="sp-a" inputmode="decimal" value="' + f3(b) + '"></div><div class="field"><label>' + L('طريقة الدفع', 'Method') + '</label><select class="input" id="sp-m">' + ['cash', 'transfer', 'cheque', 'card'].map(function (x) { return '<option value="' + x + '">' + esc(C.payName(x)) + '</option>'; }).join('') + '</select></div></div>',
        foot: '<button type="button" class="btn primary" id="sp-ok">' + L('حفظ', 'Save') + '</button>' });
      mm.el.querySelector('#sp-ok').onclick = function () {
        var a = num(mm.el.querySelector('#sp-a').value);
        if (a <= 0 || a > b + 0.0005) return C.toast(L('المبلغ غير صحيح', 'The amount is not valid'), 'warn');
        C.busy(mm.el.querySelector('#sp-ok'), Store.touchPurchase(p.id, { amount: a, method: mm.el.querySelector('#sp-m').value, date: C.today() })).then(function () { mm.close(); m.close(); draw(); }, function () {});
      };
    };
  }
  function supHtml() {
    var can = Store.can('purchase');
    return (can ? '<div class="toolbar"><button type="button" class="btn primary" id="s-new">' + icon('plus') + L('مورد جديد', 'New supplier') + '</button></div>' : '') +
      (S.suppliers.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('المورد', 'Supplier') + '</th><th>' + L('الهاتف', 'Phone') + '</th><th>' + L('ملاحظات', 'Notes') + '</th><th class="t-end">' + L('المستحق له', 'We owe') + '</th><th></th></tr></thead><tbody>' +
        S.suppliers.map(function (s) { var o = owed(s.name); return '<tr><td><b>' + esc(s.name) + '</b></td><td class="ltr">' + esc(s.phone || '') + '</td><td class="small">' + esc(s.notes || '') + '</td><td class="t-end num">' + (o > 0 ? '<b style="color:var(--red)">' + f3(o) + '</b>' : '-') + '</td><td class="act">' + (can ? '<button type="button" class="icon-btn sm" data-sedit="' + esc(s.id) + '">' + icon('edit', 18) + '</button>' : '') + (Store.isAdmin() ? '<button type="button" class="icon-btn sm red" data-sdel="' + esc(s.id) + '">' + icon('trash', 18) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="card empty">' + icon('truck', 44) + '<p>' + L('لا يوجد موردون بعد. يُضاف المورد تلقائياً عند كتابة اسمه في استلام البضاعة.', 'No suppliers yet. A supplier is added automatically when you type his name on a goods receipt.') + '</p></div>');
  }
  function supForm(s) {
    var m = C.modal({ title: s ? L('تعديل المورد', 'Edit supplier') : L('مورد جديد', 'New supplier'), size: 'sm',
      body: '<div class="col"><div class="field"><label>' + L('الاسم', 'Name') + '</label><input class="input" id="sf-n" value="' + esc(s ? s.name : '') + '"></div><div class="field"><label>' + L('الهاتف', 'Phone') + '</label><input class="input ltr" id="sf-p" inputmode="tel" value="' + esc(s ? s.phone || '' : '') + '"></div><div class="field"><label>' + L('ملاحظات', 'Notes') + '</label><textarea class="input" id="sf-o">' + esc(s ? s.notes || '' : '') + '</textarea></div></div>',
      foot: '<button type="button" class="btn primary" id="sf-ok">' + L('حفظ', 'Save') + '</button>' });
    m.el.querySelector('#sf-ok').onclick = function () {
      var n = m.el.querySelector('#sf-n').value.trim();
      if (!n) return C.toast(L('اكتب الاسم', 'Type the name'), 'warn');
      C.busy(m.el.querySelector('#sf-ok'), Store.saveSupplier({ id: s ? s.id : C.uid(), name: n, phone: m.el.querySelector('#sf-p').value.trim(), notes: m.el.querySelector('#sf-o').value.trim() })).then(function () { m.close(); draw(); }, function () {});
    };
  }

  function draw() {
    root.innerHTML = '<div class="tabs"><button type="button" data-tab="new" class="' + (tab === 'new' ? 'on' : '') + '">' + L('استلام بضاعة جديدة', 'Receive goods') + '</button><button type="button" data-tab="hist" class="' + (tab === 'hist' ? 'on' : '') + '">' + L('سجل المشتريات', 'Past receipts') + '</button><button type="button" data-tab="sup" class="' + (tab === 'sup' ? 'on' : '') + '">' + L('الموردون', 'Suppliers') + '</button></div>' +
      (tab === 'new' ? newHtml() : tab === 'hist' ? histHtml() : supHtml());
  }
  function read() {
    var g = function (id) { var e = root.querySelector(id); return e ? e.value : null; }, v;
    if ((v = g('#u-sup')) !== null) draft.supplier = v;
    if ((v = g('#u-date')) !== null) draft.date = v;
    if ((v = g('#u-ref')) !== null) draft.ref = v;
    if ((v = g('#u-paid')) !== null) draft.paid = v;
    if ((v = g('#u-method')) !== null) draft.method = v;
    if ((v = g('#u-note')) !== null) draft.note = v;
  }
  function save(btn) {
    read();
    draft.lines = draft.lines.filter(function (l) { return Store.product(l.pid) && num(l.q) > 0; });
    if (!draft.lines.length) return C.toast(L('أضف منتجاً واحداً على الأقل', 'Add at least one product'), 'warn');
    var t = total(), paid = draft.paid.trim() === '' ? 0 : num(draft.paid);
    if (paid > t + 0.0005) return C.toast(L('المدفوع أكبر من الإجمالي', 'Paid is more than the total'), 'warn');
    var name = draft.supplier.trim(), sup = S.suppliers.filter(function (s) { return C.norm(s.name) === C.norm(name); })[0];
    var doc = { supplierId: sup ? sup.id : '', supplierName: name, date: draft.date || C.today(), ref: draft.ref.trim(), loc: draft.loc, note: draft.note.trim(), total: t, clientKey: draft.key,
      payments: paid > 0 ? [{ amount: paid, method: draft.method, date: draft.date || C.today() }] : [],
      items: draft.lines.map(function (l) { var p = Store.product(l.pid), u = p.units[l.ui] || p.units[0]; return { pid: p.id, n: p.name, a: p.nameEn || '', unit: u.n, unitEn: u.e || '', f: u.f, q: num(l.q), cost: num(l.cost) }; }) };
    var pre = !sup && name ? Store.saveSupplier({ id: C.uid(), name: name, phone: '', notes: '' }).then(function (s) { doc.supplierId = s.id; }, function () {}) : Promise.resolve();
    C.busy(btn, pre.then(function () { return Store.createPurchase(doc); })).then(function (p) {
      C.toast(L('تمت إضافة البضاعة إلى المخزون: ', 'Goods added to stock: ') + p.number);
      draft = fresh(); tab = Store.sees('cost') ? 'hist' : 'new'; draw(); Shell.refreshNav();
    }, function () {});
  }
  function bind() {
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-tab]'))) { read(); tab = b.getAttribute('data-tab'); draw(); return; }
      if ((b = e.target.closest('[data-ploc]'))) { read(); draft.loc = b.getAttribute('data-ploc'); draw(); return; }
      if (e.target.closest('#u-add')) { read(); pickProduct().then(function (p) { if (p) addLine(p); }); return; }
      if (e.target.closest('#u-cam')) { read(); Shell.pickPhoto(true).then(function (f) { if (f) Inventory.form(null, { file: f }).then(function (np) { if (np) addLine(np); }); }); return; }
      if (e.target.closest('#u-full')) { read(); draft.paid = f3(total()); draw(); return; }
      if ((b = e.target.closest('#u-save'))) { save(b); return; }
      if ((b = e.target.closest('[data-rm]'))) { read(); draft.lines.splice(+b.closest('[data-i]').getAttribute('data-i'), 1); draw(); return; }
      if ((b = e.target.closest('tr[data-pid]'))) { viewPurchase(b.getAttribute('data-pid')); return; }
      if (e.target.closest('#s-new')) { supForm(null); return; }
      if ((b = e.target.closest('[data-sedit]'))) { supForm(Store.byId(S.suppliers, b.getAttribute('data-sedit'))); return; }
      if ((b = e.target.closest('[data-sdel]'))) {
        var id = b.getAttribute('data-sdel');
        C.confirmBox(L('حذف هذا المورد من القائمة؟ (فواتير الشراء تبقى)', 'Remove this supplier from the list? (receipts stay)'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.removeSupplier(id).then(draw, function (er) { C.toast(C.errText(er), 'err'); }); });
      }
    });
    root.addEventListener('change', function (e) {
      var blk = e.target.closest('[data-i]'), k = e.target.getAttribute('data-k');
      if (!blk || !k) return;
      read();
      var l = draft.lines[+blk.getAttribute('data-i')], p = Store.product(l.pid);
      if (k === 'ui') { var old = p.units[l.ui] || p.units[0]; l.ui = +e.target.value; var nu = p.units[l.ui]; if (num(l.cost) > 0) l.cost = C.r3(num(l.cost) / old.f * nu.f); }
      else l[k] = e.target.value === '' ? '' : num(e.target.value);
      draw();
    });
    root.addEventListener('input', function (e) {
      var blk = e.target.closest('[data-i]'), k = e.target.getAttribute('data-k');
      if (!blk || (k !== 'q' && k !== 'cost')) return;
      var l = draft.lines[+blk.getAttribute('data-i')];
      l[k] = e.target.value === '' ? '' : num(e.target.value);
      blk.querySelector('[data-lt]').textContent = f3(num(l.cost) * num(l.q));
      root.querySelector('#u-total').textContent = f3(total());
    });
  }

  Shell.page('purchases', {
    title: function () { return L('المشتريات واستلام البضاعة', 'Purchases & goods received'); },
    render: function (el) { if (!draft) draft = fresh(); root = document.createElement('div'); el.appendChild(root); bind(); draw(); }
  });
  window.Purchases = { owed: owed };
})();
