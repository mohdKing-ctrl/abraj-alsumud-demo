/* suppliers.js - the suppliers / agents the shop works with, and the goods handed to them to sell for the shop.
   For every supplier: contact details, what is owed to him from purchases, a sign-in password for HIS OWN page
   (yourdomain/supplier), the goods he holds (given / sold / remaining) and every change he or the shop made.
   The owner hands goods out (they leave the stock), takes returns back (they come back), and corrects mistakes;
   the supplier reports what he sold from his page. Nothing is ever overwritten: every change is a line in the log. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, num = C.num, f3 = C.f3;
  var root = null, tab = 'list', q = '';
  var TYPES = { give: ['تسليم بضاعة', 'Goods handed over'], sell: ['بيع', 'Sold'], fix: ['تصحيح', 'Correction'], 'return': ['استرجاع', 'Returned'] };
  function tname(t) { var x = TYPES[t] || [t, t]; return L(x[0], x[1]); }
  function allocsOf(sid) { return S.consign.filter(function (a) { return a.supplierId === sid; }); }
  function remaining(a) { return C.r3(num(a.given) - num(a.sold)); }
  function sums(sid) { var g = 0, s = 0; allocsOf(sid).forEach(function (a) { g += num(a.given); s += num(a.sold); }); return { given: C.r3(g), sold: C.r3(s), left: C.r3(g - s) }; }
  function hasAccount(sid) { return !!(S.supplierAccounts && S.supplierAccounts[sid]); }
  function owed(name) { return window.Purchases ? Purchases.owed(name) : 0; }
  function moveRow(m, withSup) {
    var who = m.byRole === 'supplier' ? '<span class="badge warn">' + L('المورد', 'Supplier') + '</span> ' : '';
    var qty = m.type === 'give' ? '+' + C.qf(m.qty) + (m.count && m.unit && m.f > 1 ? ' (' + C.qf(m.count) + ' ' + esc(m.unit) + ')' : '') : m.type === 'sell' ? '-' + C.qf(m.qty) : m.type === 'return' ? '-' + C.qf(m.qty) : (num(m.qty) >= 0 ? '+' : '') + C.qf(m.qty);
    return '<tr><td class="nowrap small">' + C.fts(m.ts) + '</td>' + (withSup ? '<td>' + esc(m.supplierName || '') + '</td>' : '') + '<td>' + esc(m.name || '') + '</td><td><span class="badge ' + (m.type === 'sell' ? 'ok' : m.type === 'fix' ? 'bad' : m.type === 'return' ? 'warn' : 'info') + '">' + tname(m.type) + '</span></td>' +
      '<td class="num" style="font-weight:800;color:' + (m.type === 'give' ? 'var(--g700)' : 'var(--red)') + '">' + qty + '</td><td class="num">' + C.qf(m.remainingAfter) + '</td><td class="small">' + who + esc(m.by || '') + '</td><td class="small">' + esc(m.note || '') + '</td></tr>';
  }
  function movesTable(list, withSup) {
    if (!list.length) return '<p class="muted small">' + L('لا توجد حركات بعد.', 'No activity yet.') + '</p>';
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الوقت', 'When') + '</th>' + (withSup ? '<th>' + L('المورد', 'Supplier') + '</th>' : '') + '<th>' + L('المنتج', 'Product') + '</th><th>' + L('الحركة', 'Action') + '</th><th>' + L('الكمية', 'Qty') + '</th><th>' + L('المتبقي بعدها', 'Left after') + '</th><th>' + L('بواسطة', 'By') + '</th><th>' + L('ملاحظة', 'Note') + '</th></tr></thead><tbody>' +
      list.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 300).map(function (m) { return moveRow(m, withSup); }).join('') + '</tbody></table></div>';
  }

  /* ------------------------------------------------ list */
  function listHtml() {
    var n = C.norm(q), list = S.suppliers.filter(function (s) { return !n || C.norm(s.name + ' ' + (s.phone || '')).indexOf(n) >= 0; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ar'); });
    if (!S.suppliers.length) return '<div class="card empty">' + icon('truck', 44) + '<p>' + L('لا يوجد موردون بعد. أضف المورد، ثم سلّمه البضاعة التي يبيعها لك، وأعطه كلمة مرور ليتابع كمياته من صفحته.', 'No suppliers yet. Add one, hand him the goods he sells for you, and give him a password to follow his quantities from his own page.') + '</p></div>';
    return '<div class="inv-grid">' + list.map(function (s) {
      var t = sums(s.id), o = owed(s.name), al = allocsOf(s.id).length;
      return '<button type="button" class="inv-card" data-sup="' + esc(s.id) + '" style="flex-direction:column;align-items:stretch;gap:6px"><span class="row between"><span class="nm">' + esc(s.name) + '</span>' + (hasAccount(s.id) ? '<span class="badge ok">' + icon('lock', 12) + L('له دخول', 'Has sign-in') + '</span>' : '<span class="badge">' + L('بلا دخول', 'No sign-in') + '</span>') + '</span>' +
        (s.phone ? '<span class="meta ltr">' + esc(s.phone) + '</span>' : '') +
        '<span class="loc-boxes" style="gap:6px"><span class="loc-box" style="padding:6px"><span>' + L('سُلّم', 'Given') + '</span><b class="num" style="font-size:15px">' + C.qf(t.given) + '</b></span><span class="loc-box" style="padding:6px"><span>' + L('باع', 'Sold') + '</span><b class="num" style="font-size:15px">' + C.qf(t.sold) + '</b></span><span class="loc-box total" style="padding:6px"><span>' + L('عنده', 'Holds') + '</span><b class="num" style="font-size:15px">' + C.qf(t.left) + '</b></span></span>' +
        '<span class="meta">' + al + ' ' + L('صنف', 'products') + (o > 0 ? ' · ' + L('مستحق له من المشتريات: ', 'owed from purchases: ') + '<b style="color:var(--red)">' + f3(o) + '</b>' : '') + '</span></button>';
    }).join('') + '</div>';
  }
  function draw() {
    var can = Store.can('purchase');
    var tot = { given: 0, sold: 0, left: 0 }; S.suppliers.forEach(function (s) { var t = sums(s.id); tot.given += t.given; tot.sold += t.sold; tot.left += t.left; });
    var recent = S.cmoves.filter(function (m) { return m.byRole === 'supplier' && m.ts > Date.now() / 1000 - 7 * 86400; }).length;
    root.innerHTML = '<div class="view-head"><h2>' + L('الموردون والبضاعة المسلّمة لهم', 'Suppliers & goods handed to them') + '</h2>' + (can ? '<button type="button" class="btn primary lg" id="sp-new">' + icon('plus') + L('مورد جديد', 'New supplier') + '</button>' : '') + '</div>' +
      '<div class="stats mb"><div class="stat"><span>' + icon('truck', 16) + L('الموردون', 'Suppliers') + '</span><b>' + S.suppliers.length + '</b></div><div class="stat"><span>' + L('بضاعة مسلّمة (قطعة)', 'Goods handed (pieces)') + '</span><b class="num">' + C.qf(tot.given) + '</b></div><div class="stat green"><span>' + L('باعوا', 'They sold') + '</span><b class="num">' + C.qf(tot.sold) + '</b></div><div class="stat amber"><span>' + L('ما زال عندهم', 'Still with them') + '</span><b class="num">' + C.qf(tot.left) + '</b></div></div>' +
      '<div class="tabs"><button type="button" data-tab="list" class="' + (tab === 'list' ? 'on' : '') + '">' + L('الموردون', 'Suppliers') + '</button><button type="button" data-tab="log" class="' + (tab === 'log' ? 'on' : '') + '">' + L('سجل حركات الموردين', 'Supplier activity log') + (recent ? ' <span class="badge warn">' + recent + '</span>' : '') + '</button></div>' +
      (tab === 'list' ? '<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" id="sp-q" type="search" placeholder="' + L('ابحث بالاسم أو الهاتف', 'Search by name or phone') + '" value="' + esc(q) + '"></div></div><div id="sp-list">' + listHtml() + '</div>'
        : '<p class="small muted mb">' + L('كل ما فعله أي مورد من صفحته (بيع أو تصحيح) وكل ما سلّمته أو استرجعته أنت، بالوقت والاسم. لا يُحذف شيء من هذا السجل.', 'Everything any supplier did from his page (sales, corrections) and everything you handed over or took back, with time and name. Nothing is ever removed from this log.') + '</p>' + movesTable(S.cmoves, true));
  }

  /* ------------------------------------------------ one supplier */
  function detail(sid) {
    var s = Store.byId(S.suppliers, sid); if (!s) return;
    var can = Store.can('purchase'), adm = Store.isAdmin(), t = sums(sid), als = allocsOf(sid).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    var m = C.modal({ title: icon('truck') + ' ' + esc(s.name), size: 'xl',
      body: '<div class="row wrap mb"><span class="badge ' + (hasAccount(sid) ? 'ok' : '') + '">' + icon('lock', 13) + (hasAccount(sid) ? L('له كلمة مرور لصفحته', 'Has a password for his page') : L('ليس له دخول بعد', 'No sign-in yet')) + '</span>' + (s.phone ? '<span class="badge ltr">' + esc(s.phone) + '</span>' : '') + (s.notes ? '<span class="small muted">' + esc(s.notes) + '</span>' : '') + '</div>' +
        '<div class="loc-boxes mb"><div class="loc-box"><span>' + L('سُلّم له', 'Given') + '</span><b class="num">' + C.qf(t.given) + '</b></div><div class="loc-box"><span>' + L('باع', 'Sold') + '</span><b class="num">' + C.qf(t.sold) + '</b></div><div class="loc-box total"><span>' + L('ما زال عنده', 'Still holds') + '</span><b class="num">' + C.qf(t.left) + '</b></div></div>' +
        '<h4 class="mb">' + L('البضاعة عنده', 'Goods he holds') + '</h4>' +
        (als.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('المنتج', 'Product') + '</th><th>' + L('سُلّم', 'Given') + '</th><th>' + L('باع', 'Sold') + '</th><th>' + L('المتبقي عنده', 'Remaining') + '</th><th>' + L('آخر تحديث', 'Last update') + '</th><th></th></tr></thead><tbody>' +
          als.map(function (a) { return '<tr><td><b>' + esc(a.name) + '</b> <span class="small muted">' + esc(a.unit || '') + '</span></td><td class="num">' + C.qf(a.given) + '</td><td class="num">' + C.qf(a.sold) + '</td><td class="num"><b>' + C.qf(remaining(a)) + '</b></td><td class="small">' + C.fts(a.updated || a.created) + '</td><td class="act">' + (can ? '<button type="button" class="btn sm ghost" data-ret="' + esc(a.id) + '">' + L('استرجاع', 'Take back') + '</button><button type="button" class="btn sm ghost" data-fix="' + esc(a.id) + '">' + L('تصحيح', 'Correct') + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="muted small">' + L('لم تُسلَّم له بضاعة بعد.', 'No goods handed over yet.') + '</p>') +
        '<h4 class="mt2 mb">' + L('سجل حركاته', 'His activity') + '</h4>' + movesTable(S.cmoves.filter(function (x) { return x.supplierId === sid; }), false),
      foot: (adm ? '<button type="button" class="btn danger-soft" id="sd-del">' + icon('trash') + '</button>' : '') + (can ? '<button type="button" class="btn ghost" id="sd-edit">' + icon('edit') + L('بياناته', 'Details') + '</button>' : '') +
        (adm ? '<button type="button" class="btn ghost" id="sd-pass">' + icon('lock') + (hasAccount(sid) ? L('كلمة مرور جديدة', 'New password') : L('إنشاء دخول له', 'Give him a sign-in')) + '</button>' : '') + '<span class="grow"></span>' +
        (can ? '<button type="button" class="btn primary lg" id="sd-give">' + icon('box') + L('تسليم بضاعة', 'Hand over goods') + '</button>' : '') });
    var qs = function (x) { return m.el.querySelector(x); }, on = function (x, fn) { var e = qs(x); if (e) e.onclick = fn; }, again = function () { m.close(); draw(); detail(sid); };
    on('#sd-give', function () { give(s, again); });
    on('#sd-edit', function () { m.close(); form(s); });
    on('#sd-pass', function () { passForm(s, again); });
    on('#sd-del', function () {
      C.confirmBox(L('حذف المورد «', 'Delete supplier "') + s.name + L('»؟ يبقى سجل حركاته وفواتير الشراء كما هي.', '"? His activity log and purchase receipts stay as they are.'), L('حذف', 'Delete'), true).then(function (y) {
        if (y) Store.removeSupplier(s.id).then(function () { m.close(); draw(); }, function (er) { C.toast(C.errText(er), 'err'); });
      });
    });
    m.el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-ret]'))) takeBack(Store.byId(S.consign, b.getAttribute('data-ret')), again);
      if ((b = e.target.closest('[data-fix]'))) fix(Store.byId(S.consign, b.getAttribute('data-fix')), again);
    });
  }
  function form(s) {
    var m = C.modal({ title: s ? L('بيانات المورد', 'Supplier details') : L('مورد جديد', 'New supplier'), size: 'md',
      body: '<div class="col"><div class="field"><label>' + L('الاسم *', 'Name *') + '</label><input class="input" id="sf-n" value="' + esc(s ? s.name : '') + '"></div><div class="field"><label>' + L('الهاتف / واتساب', 'Phone / WhatsApp') + '</label><input class="input ltr" id="sf-p" inputmode="tel" value="' + esc(s ? s.phone || '' : '') + '"></div><div class="field"><label>' + L('ملاحظات', 'Notes') + '</label><textarea class="input" id="sf-o">' + esc(s ? s.notes || '' : '') + '</textarea></div>' +
        (!s && Store.isAdmin() ? '<div class="field"><label>' + L('كلمة مرور لصفحته (اختياري، 8 خانات أو أكثر)', 'Password for his page (optional, 8+ characters)') + '</label><input class="input ltr" id="sf-pw" type="text" autocomplete="off"><span class="hint">' + L('يدخل بها وحدها من زر «تسجيل الدخول» ويرى فقط البضاعة التي سلّمتها له. يمكنك إضافتها لاحقاً.', 'He signs in with it alone from the "Sign in" button and sees only the goods you handed him. You can add it later.') + '</span></div>' : '') + '</div>',
      foot: '<button type="button" class="btn primary" id="sf-ok">' + L('حفظ', 'Save') + '</button>' });
    m.el.querySelector('#sf-ok').onclick = function () {
      var n = m.el.querySelector('#sf-n').value.trim(), pwEl = m.el.querySelector('#sf-pw'), pw = pwEl ? pwEl.value : '';
      if (!n) return C.toast(L('اكتب الاسم', 'Type the name'), 'warn');
      if (pw && pw.length < 8) return C.toast(C.errText({ code: 'password_short' }), 'warn');
      var doc = { id: s ? s.id : C.uid(), name: n, phone: m.el.querySelector('#sf-p').value.trim(), notes: m.el.querySelector('#sf-o').value.trim() };
      var job = Store.saveSupplier(doc).then(function () { return pw ? Store.supplierAccount(doc.id, pw) : null; });
      C.busy(m.el.querySelector('#sf-ok'), job).then(function () { m.close(); C.toast(L('تم الحفظ', 'Saved')); draw(); if (!s) detail(doc.id); }, function () {});
    };
  }
  function passForm(s, done) {
    var m = C.modal({ title: L('كلمة مرور صفحة المورد: ', "Supplier page password: ") + esc(s.name), size: 'sm',
      body: '<div class="col"><p class="small muted">' + L('يدخل المورد بهذه الكلمة وحدها من زر «تسجيل الدخول» في الموقع، ويرى صفحته فقط: البضاعة التي عنده، ويسجّل ما باعه. لا يرى شيئاً آخر من النظام.', 'The supplier signs in with this password alone from the website\'s "Sign in" button and sees only his page: the goods he holds and what he sold. Nothing else of the system.') + '</p><div class="field"><label>' + L('كلمة المرور (8 خانات أو أكثر)', 'Password (8+ characters)') + '</label><input class="input ltr" id="sp-pw" type="text" autocomplete="off"></div></div>',
      foot: '<button type="button" class="btn primary" id="sp-ok">' + icon('check') + L('حفظ', 'Save') + '</button>' });
    m.el.querySelector('#sp-ok').onclick = function () {
      C.busy(m.el.querySelector('#sp-ok'), Store.supplierAccount(s.id, m.el.querySelector('#sp-pw').value)).then(function () { m.close(); C.toast(L('تم. أعطه كلمة المرور ورابط الموقع.', 'Done. Give him the password and the site address.')); done(); }, function () {});
    };
  }
  function give(s, done) {
    var picked = null, ui = 0;
    var m = C.modal({ title: L('تسليم بضاعة إلى ', 'Hand over goods to ') + esc(s.name), size: 'md', sticky: true,
      body: '<div class="col"><div class="field"><label>' + L('المنتج', 'Product') + '</label><div class="search">' + icon('search') + '<input class="input" id="g-q" placeholder="' + L('ابحث بالاسم أو الباركود', 'Search by name or barcode') + '"></div><div id="g-list" class="col mt" style="gap:6px;max-height:220px;overflow:auto"></div></div>' +
        '<div id="g-pick" class="hide"><div class="note mb" id="g-chosen"></div><div class="grid g3 keep"><div class="field"><label>' + L('الوحدة', 'Unit') + '</label><select class="input" id="g-u"></select></div><div class="field"><label>' + L('العدد', 'How many') + '</label><input class="input num" id="g-n" inputmode="decimal" value="1"></div><div class="field"><label>' + L('تخرج من', 'Taken from') + '</label><select class="input" id="g-loc"><option value="wh">' + L('المخزن', 'Warehouse') + '</option><option value="shop">' + L('المحل', 'Shop') + '</option></select></div></div><p class="small muted" id="g-hint"></p><div class="field"><label>' + L('ملاحظة (اختياري)', 'Note (optional)') + '</label><input class="input" id="g-note" maxlength="200"></div></div></div>',
      foot: '<button type="button" class="btn ghost" id="g-x">' + L('إلغاء', 'Cancel') + '</button><button type="button" class="btn primary lg" id="g-ok" disabled>' + icon('check') + L('تسليم', 'Hand over') + '</button>' });
    var qs = function (x) { return m.el.querySelector(x); };
    function list() {
      var n = C.norm(qs('#g-q').value);
      var rows = S.products.filter(function (p) { return !n || C.norm([p.name, p.nameEn, p.sku].concat(p.units.map(function (u) { return u.bc; })).join(' ')).indexOf(n) >= 0; }).sort(P.newestFirst).slice(0, 30);
      qs('#g-list').innerHTML = rows.map(function (p) { return '<button type="button" class="inv-card" data-id="' + esc(p.id) + '" style="padding:6px 8px">' + Media.thumb(p.img, P.name(p), C.catOf(S.settings, p.cat).c) + '<span class="grow"><span class="nm">' + esc(P.name(p)) + '</span><br><span class="meta">' + L('المحل: ', 'Shop: ') + C.qf(P.at(p, 'shop')) + ' · ' + L('المخزن: ', 'Warehouse: ') + C.qf(P.at(p, 'wh')) + '</span></span></button>'; }).join('') || '<p class="muted small">' + L('لا توجد نتائج', 'No results') + '</p>';
    }
    function hint() { if (!picked) return; var u = picked.units[+qs('#g-u').value] || picked.units[0], n = num(qs('#g-n').value), loc = qs('#g-loc').value; qs('#g-hint').textContent = L('سيُسلَّم ', 'Hands over ') + C.qf(n * u.f) + ' ' + P.unitName(picked.units[0]) + L(' · الموجود في ', ' · now in ') + C.locName(loc) + ': ' + C.qf(P.at(picked, loc)) + (n * u.f > P.at(picked, loc) ? ' ' + L('(أكثر من الموجود!)', '(more than there is!)') : ''); qs('#g-ok').disabled = !(n > 0); }
    list(); qs('#g-q').oninput = list;
    qs('#g-list').onclick = function (e) {
      var b = e.target.closest('[data-id]'); if (!b) return;
      picked = Store.product(b.getAttribute('data-id')); ui = 0; picked.units.forEach(function (u, i) { if (u.f > picked.units[ui].f) ui = i; });
      qs('#g-pick').classList.remove('hide'); qs('#g-chosen').innerHTML = icon('box', 18) + '<span><b>' + esc(P.name(picked)) + '</b></span>';
      qs('#g-u').innerHTML = picked.units.map(function (u, i) { return '<option value="' + i + '"' + (i === ui ? ' selected' : '') + '>' + esc(P.unitName(u)) + (u.f > 1 ? ' (' + C.qf(u.f) + ')' : '') + '</option>'; }).join('');
      hint(); qs('#g-n').focus();
    };
    m.el.addEventListener('input', hint); m.el.addEventListener('change', hint);
    qs('#g-x').onclick = function () { m.close(); };
    qs('#g-ok').onclick = function () {
      var u = picked.units[+qs('#g-u').value] || picked.units[0], n = num(qs('#g-n').value);
      if (!picked || n <= 0) return;
      C.busy(qs('#g-ok'), Store.consignGive({ supplierId: s.id, pid: picked.id, qty: n, f: u.f, unit: u.n, loc: qs('#g-loc').value, note: qs('#g-note').value.trim() })).then(function () { m.close(); C.toast(L('تم التسليم وخُصمت الكمية من المخزون', 'Handed over; the quantity left the stock')); done(); }, function () {});
    };
  }
  function takeBack(a, done) {
    if (!a) return;
    var m = C.modal({ title: L('استرجاع من ', 'Take back from ') + esc(a.supplierName) + ': ' + esc(a.name), size: 'sm',
      body: '<div class="col"><div class="note">' + L('المتبقي عنده: ', 'He still holds: ') + '<b class="num">' + C.qf(remaining(a)) + '</b> ' + esc(a.unit || '') + '</div><div class="grid g2 keep"><div class="field"><label>' + L('الكمية المسترجعة', 'Quantity back') + '</label><input class="input num" id="r-n" inputmode="decimal"></div><div class="field"><label>' + L('تعود إلى', 'Goes into') + '</label><select class="input" id="r-loc"><option value="wh">' + L('المخزن', 'Warehouse') + '</option><option value="shop">' + L('المحل', 'Shop') + '</option></select></div></div><div class="field"><label>' + L('ملاحظة', 'Note') + '</label><input class="input" id="r-note" maxlength="200"></div></div>',
      foot: '<button type="button" class="btn primary" id="r-ok">' + icon('check') + L('استرجاع', 'Take back') + '</button>' });
    m.el.querySelector('#r-ok').onclick = function () {
      var n = num(m.el.querySelector('#r-n').value); if (n <= 0) return C.toast(L('اكتب الكمية', 'Type the quantity'), 'warn');
      C.busy(m.el.querySelector('#r-ok'), Store.consignReturn({ allocId: a.id, qty: n, loc: m.el.querySelector('#r-loc').value, note: m.el.querySelector('#r-note').value.trim() })).then(function () { m.close(); C.toast(L('رجعت الكمية إلى المخزون', 'Back in stock')); done(); }, function () {});
    };
  }
  function fix(a, done) {
    if (!a) return;
    var m = C.modal({ title: L('تصحيح الكمية عند ', 'Correct the quantity with ') + esc(a.supplierName), size: 'sm',
      body: '<div class="col"><div class="note">' + esc(a.name) + ' · ' + L('المسجّل عنده الآن: ', 'Recorded with him now: ') + '<b class="num">' + C.qf(remaining(a)) + '</b></div><div class="field"><label>' + L('الكمية الصحيحة الموجودة عنده فعلاً', 'The quantity he really has') + '</label><input class="input num" id="f-n" inputmode="decimal" value="' + C.qf(remaining(a)) + '"></div><div class="field"><label>' + L('سبب التصحيح *', 'Reason *') + '</label><input class="input" id="f-note" maxlength="300"></div></div>',
      foot: '<button type="button" class="btn primary" id="f-ok">' + icon('check') + L('حفظ التصحيح', 'Save correction') + '</button>' });
    m.el.querySelector('#f-ok').onclick = function () {
      var note = m.el.querySelector('#f-note').value.trim(); if (!note) return C.toast(L('اكتب سبب التصحيح', 'Type the reason'), 'warn');
      C.busy(m.el.querySelector('#f-ok'), Store.consignReport({ allocId: a.id, type: 'fix', qty: num(m.el.querySelector('#f-n').value), note: note })).then(function () { m.close(); done(); }, function () {});
    };
  }

  Shell.page('suppliers', {
    title: function () { return L('الموردون', 'Suppliers'); },
    render: function (el, arg) {
      root = document.createElement('div'); el.appendChild(root); if (arg && arg.tab) tab = arg.tab; draw();
      root.addEventListener('click', function (e) {
        var b;
        if (e.target.closest('#sp-new')) return form(null);
        if ((b = e.target.closest('[data-tab]'))) { tab = b.getAttribute('data-tab'); return draw(); }
        if ((b = e.target.closest('[data-sup]'))) detail(b.getAttribute('data-sup'));
      });
      root.addEventListener('input', function (e) { if (e.target.id === 'sp-q') { q = e.target.value; root.querySelector('#sp-list').innerHTML = listHtml(); } });
      if (arg && arg.open) detail(arg.open);
    }
  });
  window.Suppliers = { detail: detail, form: form, tname: tname };
})();
