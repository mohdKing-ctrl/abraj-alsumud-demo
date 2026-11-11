/* invoices.js - the list of sales bills: search, filters, open a bill, print in any size, WhatsApp,
   receive a later payment, edit, void (goods go back to stock), delete (owner), Excel export. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, Calc = C.Calc, num = C.num, f3 = C.f3;
  var flt = { q: '', range: 'month', from: '', to: '', type: '', st: '' }, root = null;

  function rangeDates() {
    var t = C.today();
    if (flt.range === 'today') return [t, t];
    if (flt.range === 'week') return [C.addDays(t, -6), t];
    if (flt.range === 'month') return [t.slice(0, 8) + '01', t];
    if (flt.range === 'custom') return [flt.from || '0000-00-00', flt.to || '9999-99-99'];
    return ['0000-00-00', '9999-99-99'];
  }
  function status(inv) {
    if (inv.void) return ['void', L('ملغاة', 'Void'), 'bad'];
    var b = Calc.balance(inv);
    if (b <= 0.0004) return ['paid', L('مدفوعة', 'Paid'), 'ok'];
    return Calc.paid(inv) > 0 ? ['part', L('مدفوعة جزئياً', 'Part paid'), 'warn'] : ['due', L('آجلة', 'Credit'), 'warn'];
  }
  function matches() {
    var r = rangeDates(), q = C.norm(flt.q), pq = C.phoneKey(flt.q);
    return S.invoices.filter(function (i) {
      if (i.date < r[0] || i.date > r[1]) return false;
      if (flt.type && i.type !== flt.type) return false;
      var st = status(i)[0];
      if (flt.st === 'unpaid' && !(st === 'part' || st === 'due')) return false;
      if (flt.st === 'paid' && st !== 'paid') return false;
      if (flt.st === 'void' && st !== 'void') return false;
      if (!q) return true;
      return C.norm(i.number + ' ' + i.customerName + ' ' + i.createdBy).indexOf(q) >= 0 || (pq.length >= 3 && C.phoneKey(i.customerPhone).indexOf(pq) >= 0);
    }).sort(function (a, b) { return b.no - a.no; });
  }
  function listHtml() {
    var list = matches(), live = list.filter(function (i) { return !i.void; });
    var sum = function (fn) { return live.reduce(function (t, i) { return t + fn(i); }, 0); };
    var stats = '<div class="stats mb"><div class="stat"><span>' + L('عدد الفواتير', 'Bills') + '</span><b>' + live.length + '</b></div>' +
      '<div class="stat green"><span>' + L('إجمالي المبيعات', 'Total sales') + '</span><b class="num">' + f3(sum(function (i) { return num(i.total); })) + '</b></div>' +
      '<div class="stat"><span>' + L('المحصّل', 'Collected') + '</span><b class="num">' + f3(sum(Calc.paid)) + '</b></div>' +
      '<div class="stat red"><span>' + L('المتبقي على العملاء', 'Outstanding') + '</span><b class="num">' + f3(sum(Calc.balance)) + '</b></div></div>';
    if (!list.length) return stats + '<div class="card empty">' + icon('receipt', 44) + '<p>' + L('لا توجد فواتير في هذه الفترة', 'No bills in this period') + '</p></div>';
    return stats + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الرقم', 'No.') + '</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('العميل', 'Customer') + '</th><th>' + L('النوع', 'Type') + '</th><th class="t-end">' + L('الإجمالي', 'Total') + '</th><th class="t-end">' + L('المتبقي', 'Balance') + '</th><th>' + L('الحالة', 'Status') + '</th><th></th></tr></thead><tbody>' +
      list.slice(0, 400).map(function (i) {
        var st = status(i);
        return '<tr data-id="' + esc(i.id) + '" style="cursor:pointer"><td class="ltr"><b>' + esc(i.number) + '</b></td><td class="nowrap">' + C.fdate(i.date) + ' <span class="small muted">' + esc(i.time || '') + '</span></td>' +
          '<td>' + esc(i.customerName || L('عميل نقدي', 'Cash customer')) + (i.customerPhone ? '<div class="small muted ltr">' + esc(i.customerPhone) + '</div>' : '') + '</td>' +
          '<td><span class="badge ' + (i.type === 'wholesale' ? 'warn' : 'info') + '">' + (i.type === 'wholesale' ? L('جملة', 'Wholesale') : L('تجزئة', 'Retail')) + '</span></td>' +
          '<td class="t-end num"><b>' + f3(i.total) + '</b></td><td class="t-end num">' + (Calc.balance(i) > 0.0004 ? '<b style="color:var(--red)">' + f3(Calc.balance(i)) + '</b>' : '-') + '</td>' +
          '<td><span class="badge ' + st[2] + '">' + st[1] + '</span></td>' +
          '<td class="act"><button type="button" class="icon-btn sm" data-print title="' + L('طباعة', 'Print') + '">' + icon('print', 18) + '</button><button type="button" class="icon-btn sm" data-wa title="WhatsApp" style="color:#1fa855">' + icon('whatsapp', 18) + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (list.length > 400 ? '<p class="muted small center mt">' + L('تُعرض أول 400 فاتورة. ضيّق الفترة أو استخدم البحث.', 'Showing the first 400 bills. Narrow the period or use the search.') + '</p>' : '');
  }
  function draw() {
    root.innerHTML = '<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" id="v-q" type="search" placeholder="' + L('رقم الفاتورة، اسم العميل، الهاتف', 'Bill no., customer name, phone') + '" value="' + esc(flt.q) + '"></div>' +
      '<select class="input" id="v-type" style="width:auto"><option value="">' + L('تجزئة وجملة', 'Retail & wholesale') + '</option><option value="retail"' + (flt.type === 'retail' ? ' selected' : '') + '>' + L('تجزئة', 'Retail') + '</option><option value="wholesale"' + (flt.type === 'wholesale' ? ' selected' : '') + '>' + L('جملة', 'Wholesale') + '</option></select>' +
      '<select class="input" id="v-st" style="width:auto"><option value="">' + L('كل الحالات', 'Any status') + '</option><option value="unpaid"' + (flt.st === 'unpaid' ? ' selected' : '') + '>' + L('غير مدفوعة', 'Unpaid') + '</option><option value="paid"' + (flt.st === 'paid' ? ' selected' : '') + '>' + L('مدفوعة', 'Paid') + '</option><option value="void"' + (flt.st === 'void' ? ' selected' : '') + '>' + L('ملغاة', 'Void') + '</option></select>' +
      '<button type="button" class="btn ghost" id="v-xl">' + icon('download') + 'Excel</button></div>' +
      '<div class="row wrap mb"><div class="chips" id="v-range">' + [['today', L('اليوم', 'Today')], ['week', L('7 أيام', '7 days')], ['month', L('هذا الشهر', 'This month')], ['all', L('الكل', 'All')], ['custom', L('فترة محددة', 'Custom')]].map(function (x) { return '<button type="button" class="chip' + (flt.range === x[0] ? ' on' : '') + '" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (flt.range === 'custom' ? '<input type="date" class="input" id="v-from" style="width:auto" value="' + esc(flt.from) + '"><span>-</span><input type="date" class="input" id="v-to" style="width:auto" value="' + esc(flt.to) + '">' : '') + '</div>' +
      '<div id="v-list">' + listHtml() + '</div>';
  }
  function exportXl() {
    var M = XLSX.S.MONEY, cost = Store.sees('cost');
    var rows = [[L('الرقم', 'No.'), L('التاريخ', 'Date'), L('الوقت', 'Time'), L('العميل', 'Customer'), L('الهاتف', 'Phone'), L('النوع', 'Type'), L('من', 'From'), L('المجموع', 'Sub-total'), L('الخصم', 'Discount'), L('الضريبة', 'VAT'), L('الإجمالي', 'Total'), L('المدفوع', 'Paid'), L('المتبقي', 'Balance')]
      .concat(cost ? [L('التكلفة', 'Cost'), L('الربح', 'Profit')] : []).concat([L('الحالة', 'Status'), L('البائع', 'Seller'), L('الأصناف', 'Items')])];
    matches().forEach(function (i) {
      rows.push([i.number, C.fdate(i.date), i.time, i.customerName, i.customerPhone, i.type === 'wholesale' ? L('جملة', 'Wholesale') : L('تجزئة', 'Retail'), C.locName(i.loc), { v: num(i.sub), s: M }, { v: num(i.discount), s: M }, { v: num(i.vat), s: M }, { v: num(i.total), s: M }, { v: Calc.paid(i), s: M }, { v: Calc.balance(i), s: M }]
        .concat(cost ? [{ v: i.void ? 0 : Calc.cost(i), s: M }, { v: i.void ? 0 : Calc.profit(i), s: M }] : [])
        .concat([status(i)[1], i.createdBy, i.items.map(function (it) { return it.n + ' ' + C.qf(it.q) + ' ' + it.unit; }).join(' | ')]));
    });
    Shell.excel('Abraj-Alsumud_Invoices', L('الفواتير', 'Invoices'), rows, [13, 12, 8, 24, 14, 10, 10, 11, 10, 10, 12, 12, 12].concat(cost ? [12, 12] : []).concat([14, 16, 70]));
  }

  /* ------------------------------------------------ one bill */
  function view(id) {
    var inv = Store.byId(S.invoices, id);
    if (!inv) return;
    var st = status(inv), bal = Calc.balance(inv), cost = Store.sees('cost'), canEdit = Store.can('edit_inv') && !inv.void, canPay = (Store.can('sell') || Store.can('edit_inv')) && bal > 0.0004 && !inv.void;
    var m = C.modal({ title: L('فاتورة ', 'Bill ') + '<span class="ltr">' + esc(inv.number) + '</span> <span class="badge ' + st[2] + '">' + st[1] + '</span>', size: 'lg',
      body: '<div class="grid g2"><dl class="kv"><dt>' + L('التاريخ', 'Date') + '</dt><dd>' + C.fdate(inv.date) + ' ' + esc(inv.time || '') + '</dd><dt>' + L('العميل', 'Customer') + '</dt><dd>' + esc(inv.customerName || L('عميل نقدي', 'Cash customer')) + '</dd>' +
        (inv.customerPhone ? '<dt>' + L('الهاتف', 'Phone') + '</dt><dd class="ltr">' + esc(inv.customerPhone) + '</dd>' : '') + '</dl>' +
        '<dl class="kv"><dt>' + L('نوع البيع', 'Sale type') + '</dt><dd>' + (inv.type === 'wholesale' ? L('جملة', 'Wholesale') : L('تجزئة', 'Retail')) + '</dd><dt>' + L('خرجت من', 'Taken from') + '</dt><dd>' + esc(C.locName(inv.loc)) + '</dd><dt>' + L('البائع', 'Seller') + '</dt><dd>' + esc(inv.createdBy || '') + '</dd></dl></div>' +
        (inv.void ? '<div class="note bad mt">' + icon('alert', 18) + '<span>' + L('ملغاة بواسطة ', 'Voided by ') + esc(inv.voidedBy || '') + ' - ' + C.fts(inv.voidedAt) + (inv.voidReason ? ' - ' + esc(inv.voidReason) : '') + '</span></div>' : '') +
        (inv.note ? '<div class="note mt">' + esc(inv.note) + '</div>' : '') +
        '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>#</th><th>' + L('الصنف', 'Item') + '</th><th>' + L('الوحدة', 'Unit') + '</th><th class="t-end">' + L('الكمية', 'Qty') + '</th><th class="t-end">' + L('السعر', 'Price') + '</th><th class="t-end">' + L('المبلغ', 'Amount') + '</th>' + (cost ? '<th class="t-end">' + L('الربح', 'Profit') + '</th>' : '') + '</tr></thead><tbody>' +
        inv.items.map(function (it, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(C.lang === 'en' && it.a ? it.a : it.n) + '</td><td>' + esc(C.lang === 'en' && it.unitEn ? it.unitEn : it.unit) + (it.f > 1 ? ' <span class="small muted">×' + C.qf(it.f) + '</span>' : '') + '</td><td class="t-end num">' + C.qf(it.q) + '</td><td class="t-end num">' + f3(it.price) + '</td><td class="t-end num"><b>' + f3(Calc.line(it)) + '</b></td>' +
            (cost ? '<td class="t-end num">' + f3((num(it.price) - num(it.cost)) * num(it.q)) + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="grid g2 mt"><div>' + (inv.payments.length ? '<h4 class="mb">' + L('الدفعات', 'Payments') + '</h4>' + inv.payments.map(function (p) { return '<div class="row between small" style="padding:4px 0;border-bottom:1px solid var(--line)"><span>' + C.fdate(p.date) + ' · ' + esc(C.payName(p.method)) + (p.by ? ' · ' + esc(p.by) : '') + '</span><b class="num">' + f3(p.amount) + '</b></div>'; }).join('') : '') +
        (inv.edits && inv.edits.length ? '<p class="small muted mt">' + icon('history', 14) + ' ' + L('عُدّلت ', 'Edited ') + inv.edits.length + L(' مرة، آخرها بواسطة ', ' time(s), last by ') + esc(inv.edits[inv.edits.length - 1].by) + ' - ' + C.fts(inv.edits[inv.edits.length - 1].ts) + '</p>' : '') + '</div>' +
        '<dl class="kv"><dt>' + L('المجموع', 'Sub-total') + '</dt><dd class="num">' + f3(inv.sub) + '</dd>' + (inv.discount > 0 ? '<dt>' + L('الخصم', 'Discount') + '</dt><dd class="num">-' + f3(inv.discount) + '</dd>' : '') +
        (inv.vat > 0 ? '<dt>' + L('الضريبة ', 'VAT ') + inv.vatPct + '%</dt><dd class="num">' + f3(inv.vat) + '</dd>' : '') +
        '<dt style="font-size:17px;color:var(--ink)"><b>' + L('الإجمالي', 'Total') + '</b></dt><dd class="num" style="font-size:19px;color:var(--g700)">' + C.money(inv.total) + '</dd>' +
        '<dt>' + L('المدفوع', 'Paid') + '</dt><dd class="num">' + f3(Calc.paid(inv)) + '</dd>' + (bal > 0.0004 ? '<dt style="color:var(--red)">' + L('المتبقي', 'Balance') + '</dt><dd class="num" style="color:var(--red)">' + f3(bal) + '</dd>' : '') +
        (cost && !inv.void ? '<dt>' + L('ربح الفاتورة', 'Bill profit') + '</dt><dd class="num">' + f3(Calc.profit(inv)) + '</dd>' : '') + '</dl></div>',
      foot: (Store.isAdmin() ? '<button type="button" class="btn danger-soft" id="b-del" title="' + L('حذف نهائي', 'Delete for good') + '">' + icon('trash') + '</button>' : '') +
        (canEdit ? '<button type="button" class="btn ghost" id="b-void">' + L('إلغاء الفاتورة', 'Void') + '</button><button type="button" class="btn ghost" id="b-edit">' + icon('edit') + L('تعديل', 'Edit') + '</button>' : '') +
        '<span class="grow"></span>' + (canPay ? '<button type="button" class="btn amber" id="b-pay">' + icon('money') + L('استلام دفعة', 'Receive payment') + '</button>' : '') +
        '<select class="input" id="b-size" style="width:auto">' + Print.sizeOptions(Print.size()) + '</select><button type="button" class="btn ghost" id="b-print">' + icon('print') + L('طباعة', 'Print') + '</button>' +
        '<button type="button" class="btn wa" id="b-wa">' + icon('whatsapp') + L('واتساب', 'WhatsApp') + '</button>' });
    var q = function (s) { return m.el.querySelector(s); }, on = function (s, fn) { var e = q(s); if (e) e.onclick = fn; };
    on('#b-print', function () { Print.size(q('#b-size').value); Print.run(inv, q('#b-size').value); });
    on('#b-wa', function () { m.close(); WhatsApp.open(inv); });
    on('#b-edit', function () { m.close(); Sell.edit(inv); });
    on('#b-pay', function () { m.close(); pay(inv); });
    on('#b-void', function () {
      var mm = C.modal({ title: L('إلغاء الفاتورة ', 'Void bill ') + esc(inv.number), size: 'sm', body: '<p class="mb">' + L('تبقى الفاتورة في القائمة بعلامة «ملغاة» وتعود البضاعة إلى المخزون.', 'The bill stays in the list marked VOID and the goods go back to stock.') + '</p><div class="field"><label>' + L('السبب', 'Reason') + '</label><input class="input" id="vr" maxlength="200"></div>',
        foot: '<button type="button" class="btn danger" id="vok">' + L('إلغاء الفاتورة', 'Void the bill') + '</button>' });
      mm.el.querySelector('#vok').onclick = function () {
        C.busy(mm.el.querySelector('#vok'), Store.voidInvoice(inv.id, mm.el.querySelector('#vr').value.trim())).then(function () { mm.close(); m.close(); C.toast(L('تم إلغاء الفاتورة', 'Bill voided')); draw(); }, function () {});
      };
    });
    on('#b-del', function () {
      C.confirmBox(L('حذف الفاتورة ', 'Delete bill ') + inv.number + L(' نهائياً؟ رقمها لن يُستخدم مرة أخرى', ' for good? Its number is never used again') + (inv.void ? '.' : L('، وتعود بضاعتها إلى المخزون.', ', and its goods go back to stock.')), L('حذف نهائي', 'Delete'), true).then(function (y) {
        if (y) C.busy(q('#b-del'), Store.removeInvoices([inv.id])).then(function () { m.close(); C.toast(L('تم الحذف', 'Deleted')); draw(); }, function () {});
      });
    });
  }
  function pay(inv, after) {
    var bal = Calc.balance(inv);
    var m = C.modal({ title: L('استلام دفعة - ', 'Receive payment - ') + '<span class="ltr">' + esc(inv.number) + '</span>', size: 'sm',
      body: '<div class="col"><div class="note warn">' + L('المتبقي على العميل: ', 'Balance: ') + '<b class="num">' + C.money(bal) + '</b></div>' +
        '<div class="field"><label>' + L('المبلغ المستلم', 'Amount received') + '</label><input class="input num" id="p-a" inputmode="decimal" value="' + f3(bal) + '"></div>' +
        '<div class="field"><label>' + L('طريقة الدفع', 'Method') + '</label><select class="input" id="p-m">' + ['cash', 'card', 'transfer', 'cheque'].map(function (x) { return '<option value="' + x + '">' + esc(C.payName(x)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>' + L('التاريخ', 'Date') + '</label><input class="input" type="date" id="p-d" value="' + C.today() + '"></div></div>',
      foot: '<button type="button" class="btn primary lg" id="p-ok">' + icon('check') + L('حفظ الدفعة', 'Save payment') + '</button>' });
    m.el.querySelector('#p-ok').onclick = function () {
      var a = num(m.el.querySelector('#p-a').value);
      if (a <= 0 || a > bal + 0.0005) return C.toast(L('المبلغ يجب أن يكون بين 0 والمتبقي', 'The amount must be between 0 and the balance'), 'warn');
      C.busy(m.el.querySelector('#p-ok'), Store.touchInvoice(inv.id, { payment: { amount: a, method: m.el.querySelector('#p-m').value, date: m.el.querySelector('#p-d').value || C.today() } })).then(function () {
        m.close(); C.toast(L('تم تسجيل الدفعة', 'Payment saved'));
        if (after) after(); else if (root && root.isConnected) draw();
      }, function () {});
    };
  }

  function bind() {
    root.addEventListener('click', function (e) {
      var b, row = e.target.closest('tr[data-id]');
      if ((b = e.target.closest('[data-r]'))) { flt.range = b.getAttribute('data-r'); draw(); return; }
      if (e.target.closest('#v-xl')) { exportXl(); return; }
      if (!row) return;
      var inv = Store.byId(S.invoices, row.getAttribute('data-id'));
      if (e.target.closest('[data-print]')) { Print.run(inv, Print.size()); return; }
      if (e.target.closest('[data-wa]')) { WhatsApp.open(inv); return; }
      view(inv.id);
    });
    root.addEventListener('input', function (e) { if (e.target.id === 'v-q') { flt.q = e.target.value; root.querySelector('#v-list').innerHTML = listHtml(); } });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'v-type') flt.type = t.value; else if (t.id === 'v-st') flt.st = t.value; else if (t.id === 'v-from') flt.from = t.value; else if (t.id === 'v-to') flt.to = t.value; else return;
      root.querySelector('#v-list').innerHTML = listHtml();
    });
  }

  Shell.page('invoices', {
    title: function () { return L('الفواتير', 'Invoices'); },
    render: function (el, arg) {
      root = document.createElement('div'); el.appendChild(root); bind();
      if (arg && arg.customer) { flt.q = arg.customer; flt.range = 'all'; flt.st = arg.unpaid ? 'unpaid' : ''; }
      draw();
      if (arg && arg.open) view(arg.open);
    }
  });
  window.Invoices = { view: view, pay: pay, status: status };
})();
