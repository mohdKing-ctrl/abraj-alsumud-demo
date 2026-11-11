/* reports.js - sales, retail against wholesale, what was collected, cost of goods, expenses and the profit & loss,
   per day, per category, best-selling products, per worker and per payment method. Excel export. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, Calc = C.Calc, num = C.num, f3 = C.f3;
  var range = 'month', from = '', to = '', root = null;

  function dates() {
    var t = C.today(), y = C.addDays(t, -1);
    if (range === 'today') return [t, t];
    if (range === 'yesterday') return [y, y];
    if (range === 'week') return [C.addDays(t, -6), t];
    if (range === 'month') return [t.slice(0, 8) + '01', t];
    if (range === 'last') { var d = new Date(t.slice(0, 8) + '01T12:00:00'); d.setDate(0); var e = C.ymd(d); return [e.slice(0, 8) + '01', e]; }
    if (range === 'year') return [t.slice(0, 4) + '-01-01', t];
    if (range === 'custom') return [from || '0000-00-00', to || '9999-99-99'];
    return ['0000-00-00', '9999-99-99'];
  }
  function build() {
    var r = dates(), cost = Store.sees('cost');
    var inv = S.invoices.filter(function (i) { return !i.void && i.date >= r[0] && i.date <= r[1]; });
    var d = { n: inv.length, net: 0, vat: 0, total: 0, disc: 0, retail: 0, wholesale: 0, cogs: 0, due: 0, days: {}, cats: {}, prods: {}, sellers: {}, methods: {}, collected: 0, expenses: 0, expCats: {} };
    inv.forEach(function (i) {
      var net = num(i.sub) - num(i.discount), c = Calc.cost(i), ratio = num(i.sub) > 0 ? net / num(i.sub) : 1;
      d.net += net; d.vat += num(i.vat); d.total += num(i.total); d.disc += num(i.discount); d[i.type === 'wholesale' ? 'wholesale' : 'retail'] += net; d.cogs += c; d.due += Calc.balance(i);
      var day = d.days[i.date] || (d.days[i.date] = { n: 0, net: 0, cogs: 0 }); day.n++; day.net += net; day.cogs += c;
      var s = d.sellers[i.createdBy || '-'] || (d.sellers[i.createdBy || '-'] = { n: 0, net: 0 }); s.n++; s.net += net;
      i.items.forEach(function (it) {
        var p = it.pid ? Store.product(it.pid) : null, amount = Calc.line(it) * ratio, ic = num(it.cost) * num(it.q);
        var key = it.pid || ('~' + it.n), pr = d.prods[key] || (d.prods[key] = { n: p ? C.Prod.name(p) : it.n, q: 0, unit: p ? C.Prod.unitName(p.units[0]) : it.unit, net: 0, cogs: 0 });
        pr.q += num(it.q) * num(it.f || 1); pr.net += amount; pr.cogs += ic;
        var cid = p ? p.cat : 'other', ct = d.cats[cid] || (d.cats[cid] = { net: 0, cogs: 0 }); ct.net += amount; ct.cogs += ic;
      });
    });
    // money that actually came in during the period (also payments for older bills)
    S.invoices.forEach(function (i) { if (i.void) return; (i.payments || []).forEach(function (p) { if (p.date >= r[0] && p.date <= r[1]) { d.collected += num(p.amount); d.methods[p.method] = (d.methods[p.method] || 0) + num(p.amount); } }); });
    S.expenses.forEach(function (x) { if (x.date >= r[0] && x.date <= r[1]) { d.expenses += num(x.amount); d.expCats[x.cat || '-'] = (d.expCats[x.cat || '-'] || 0) + num(x.amount); } });
    d.gross = d.net - d.cogs; d.profit = d.gross - d.expenses; d.cost = cost; d.range = r;
    return d;
  }
  function table(head, rows, empty) {
    if (!rows.length) return '<p class="muted small">' + empty + '</p>';
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head.map(function (h, i) { return '<th' + (i ? ' class="t-end"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i ? ' class="t-end num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function draw() {
    var d = build(), cost = d.cost, none = L('لا توجد بيانات في هذه الفترة.', 'No data in this period.');
    var days = Object.keys(d.days).sort().reverse(), prods = Object.keys(d.prods).map(function (k) { return d.prods[k]; }).sort(function (a, b) { return b.net - a.net; });
    var share = function (v) { return d.net > 0 ? Math.round(v / d.net * 100) : 0; };
    root.innerHTML = '<div class="row wrap mb"><div class="chips">' + [['today', L('اليوم', 'Today')], ['yesterday', L('أمس', 'Yesterday')], ['week', L('7 أيام', '7 days')], ['month', L('هذا الشهر', 'This month')], ['last', L('الشهر الماضي', 'Last month')], ['year', L('هذه السنة', 'This year')], ['all', L('الكل', 'All')], ['custom', L('فترة محددة', 'Custom')]].map(function (x) { return '<button type="button" class="chip' + (range === x[0] ? ' on' : '') + '" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (range === 'custom' ? '<input type="date" class="input" id="rp-from" style="width:auto" value="' + esc(from) + '"><span>-</span><input type="date" class="input" id="rp-to" style="width:auto" value="' + esc(to) + '">' : '') +
      '<span class="grow"></span><button type="button" class="btn ghost" id="rp-xl">' + icon('download') + 'Excel</button></div>' +
      '<div class="stats mb"><div class="stat green"><span>' + icon('cart', 16) + L('المبيعات (بدون الضريبة)', 'Sales (before VAT)') + '</span><b class="num">' + f3(d.net) + '</b><small>' + d.n + ' ' + L('فاتورة', 'bills') + (d.disc > 0 ? ' · ' + L('خصومات ', 'discounts ') + f3(d.disc) : '') + '</small></div>' +
      '<div class="stat"><span>' + L('تجزئة', 'Retail') + '</span><b class="num">' + f3(d.retail) + '</b><small>' + share(d.retail) + '%</small></div>' +
      '<div class="stat amber"><span>' + L('جملة', 'Wholesale') + '</span><b class="num">' + f3(d.wholesale) + '</b><small>' + share(d.wholesale) + '%</small></div>' +
      '<div class="stat"><span>' + icon('money', 16) + L('المحصّل نقداً وغيره', 'Money collected') + '</span><b class="num">' + f3(d.collected) + '</b></div>' +
      '<div class="stat red"><span>' + L('آجل لم يُحصّل', 'Credit not collected') + '</span><b class="num">' + f3(d.due) + '</b></div>' +
      (d.vat > 0 ? '<div class="stat"><span>' + L('ضريبة القيمة المضافة', 'VAT collected') + '</span><b class="num">' + f3(d.vat) + '</b></div>' : '') + '</div>' +
      (cost ? '<div class="card mb"><h3>' + icon('chart') + L('الأرباح والخسائر', 'Profit & loss') + '</h3><dl class="kv" style="max-width:520px;font-size:16px">' +
        '<dt>' + L('المبيعات', 'Sales') + '</dt><dd class="num">' + f3(d.net) + '</dd><dt>' + L('تكلفة البضاعة المباعة', 'Cost of goods sold') + '</dt><dd class="num">- ' + f3(d.cogs) + '</dd>' +
        '<dt><b>' + L('مجمل الربح', 'Gross profit') + '</b></dt><dd class="num">' + f3(d.gross) + (d.net > 0 ? ' <span class="small muted">(' + Math.round(d.gross / d.net * 100) + '%)</span>' : '') + '</dd>' +
        '<dt>' + L('المصروفات', 'Expenses') + '</dt><dd class="num">- ' + f3(d.expenses) + '</dd>' +
        '<dt style="font-size:18px;color:var(--ink)"><b>' + L('صافي الربح', 'Net profit') + '</b></dt><dd class="num" style="font-size:22px;color:' + (d.profit < 0 ? 'var(--red)' : 'var(--g700)') + '">' + C.money(d.profit) + '</dd></dl></div>' : '') +
      '<div class="grid g2"><div class="card"><h3>' + L('الأكثر مبيعاً', 'Best sellers') + '</h3>' + table([L('المنتج', 'Product'), L('الكمية', 'Qty'), L('المبيعات', 'Sales')].concat(cost ? [L('الربح', 'Profit')] : []), prods.slice(0, 15).map(function (p) { return [esc(p.n), C.qf(p.q) + ' <span class="small muted">' + esc(p.unit || '') + '</span>', f3(p.net)].concat(cost ? [f3(p.net - p.cogs)] : []); }), none) + '</div>' +
      '<div class="card"><h3>' + L('حسب التصنيف', 'By category') + '</h3>' + table([L('التصنيف', 'Category'), L('المبيعات', 'Sales'), '%'].concat(cost ? [L('الربح', 'Profit')] : []), Object.keys(d.cats).sort(function (a, b) { return d.cats[b].net - d.cats[a].net; }).map(function (k) { return [esc(C.catName(C.catOf(S.settings, k))), f3(d.cats[k].net), share(d.cats[k].net) + '%'].concat(cost ? [f3(d.cats[k].net - d.cats[k].cogs)] : []); }), none) + '</div>' +
      '<div class="card"><h3>' + L('حسب اليوم', 'Per day') + '</h3>' + table([L('اليوم', 'Day'), L('الفواتير', 'Bills'), L('المبيعات', 'Sales')].concat(cost ? [L('مجمل الربح', 'Gross profit')] : []), days.slice(0, 62).map(function (k) { return [C.fdate(k), d.days[k].n, f3(d.days[k].net)].concat(cost ? [f3(d.days[k].net - d.days[k].cogs)] : []); }), none) + '</div>' +
      '<div class="col"><div class="card"><h3>' + L('حسب الموظف', 'By worker') + '</h3>' + table([L('الموظف', 'Worker'), L('الفواتير', 'Bills'), L('المبيعات', 'Sales')], Object.keys(d.sellers).sort(function (a, b) { return d.sellers[b].net - d.sellers[a].net; }).map(function (k) { return [esc(k), d.sellers[k].n, f3(d.sellers[k].net)]; }), none) + '</div>' +
      '<div class="card"><h3>' + L('طرق الدفع (المحصّل)', 'Payment methods (collected)') + '</h3>' + table([L('الطريقة', 'Method'), L('المبلغ', 'Amount')], Object.keys(d.methods).map(function (k) { return [esc(C.payName(k)), f3(d.methods[k])]; }), none) + '</div>' +
      '<div class="card"><h3>' + L('المصروفات حسب البند', 'Expenses by category') + '</h3>' + table([L('البند', 'Category'), L('المبلغ', 'Amount')], Object.keys(d.expCats).sort(function (a, b) { return d.expCats[b] - d.expCats[a]; }).map(function (k) { return [esc(k), f3(d.expCats[k])]; }), none) + '</div></div></div>';
  }
  function exportXl() {
    var d = build(), H = XLSX.S.HEAD, M = XLSX.S.MONEY, B = XLSX.S.MONEY_B, T = XLSX.S.TITLE, rtl = C.lang === 'ar', cost = d.cost;
    var hd = function (a) { return a.map(function (c) { return { v: c, s: H }; }); };
    var sum = [[{ v: L('تقرير أبراج الصمود', 'Abraj Alsumud report'), s: T }], [L('الفترة', 'Period'), C.fdate(d.range[0]) + ' - ' + C.fdate(d.range[1])], [],
      [L('المبيعات (بدون الضريبة)', 'Sales (before VAT)'), { v: C.r3(d.net), s: M }], [L('تجزئة', 'Retail'), { v: C.r3(d.retail), s: M }], [L('جملة', 'Wholesale'), { v: C.r3(d.wholesale), s: M }],
      [L('عدد الفواتير', 'Bills'), d.n], [L('ضريبة القيمة المضافة', 'VAT'), { v: C.r3(d.vat), s: M }], [L('المحصّل', 'Collected'), { v: C.r3(d.collected), s: M }], [L('آجل لم يُحصّل', 'Credit not collected'), { v: C.r3(d.due), s: M }]];
    if (cost) sum.push([], [L('تكلفة البضاعة المباعة', 'Cost of goods sold'), { v: C.r3(d.cogs), s: M }], [L('مجمل الربح', 'Gross profit'), { v: C.r3(d.gross), s: M }], [L('المصروفات', 'Expenses'), { v: C.r3(d.expenses), s: M }], [L('صافي الربح', 'Net profit'), { v: C.r3(d.profit), s: B }]);
    var prods = [hd([L('المنتج', 'Product'), L('الكمية', 'Qty'), L('الوحدة', 'Unit'), L('المبيعات', 'Sales')].concat(cost ? [L('التكلفة', 'Cost'), L('الربح', 'Profit')] : []))];
    Object.keys(d.prods).map(function (k) { return d.prods[k]; }).sort(function (a, b) { return b.net - a.net; }).forEach(function (p) { prods.push([p.n, C.r3(p.q), p.unit || '', { v: C.r3(p.net), s: M }].concat(cost ? [{ v: C.r3(p.cogs), s: M }, { v: C.r3(p.net - p.cogs), s: M }] : [])); });
    var days = [hd([L('اليوم', 'Day'), L('الفواتير', 'Bills'), L('المبيعات', 'Sales')].concat(cost ? [L('مجمل الربح', 'Gross profit')] : []))];
    Object.keys(d.days).sort().forEach(function (k) { days.push([C.fdate(k), d.days[k].n, { v: C.r3(d.days[k].net), s: M }].concat(cost ? [{ v: C.r3(d.days[k].net - d.days[k].cogs), s: M }] : [])); });
    XLSX.save('Abraj-Alsumud_Report_' + C.today() + '.xlsx', [{ name: L('الملخص', 'Summary'), rows: sum, cols: [34, 22], rtl: rtl }, { name: L('المنتجات', 'Products'), rows: prods, cols: [34, 12, 12, 14, 14, 14], rtl: rtl, headerRows: 1 }, { name: L('الأيام', 'Days'), rows: days, cols: [14, 10, 14, 14], rtl: rtl, headerRows: 1 }]);
  }
  Shell.page('reports', {
    title: function () { return L('التقارير', 'Reports'); },
    render: function (el) {
      root = document.createElement('div'); el.appendChild(root); draw();
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-r]');
        if (b) { range = b.getAttribute('data-r'); draw(); }
        else if (e.target.closest('#rp-xl')) exportXl();
      });
      root.addEventListener('change', function (e) { if (e.target.id === 'rp-from') { from = e.target.value; draw(); } if (e.target.id === 'rp-to') { to = e.target.value; draw(); } });
    }
  });
})();
