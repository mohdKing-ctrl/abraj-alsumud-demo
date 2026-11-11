/* more.js - three smaller pages of the point of sale:
     customers  - the list, what each one owes, his statement of account, WhatsApp reminder
     expenses   - rent, salaries, transport... (they are taken off the profit in the reports)
     reminders  - automatic alerts (low stock, expiry dates, customers who owe, suppliers to pay) + the owner's own notes */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, Calc = C.Calc, num = C.num, f3 = C.f3;

  /* ================================================== customers */
  var cq = '', croot = null;
  function custInvoices(c) {
    var key = C.phoneKey(c.phone);
    return S.invoices.filter(function (i) { return i.customerId === c.id || (!i.customerId && ((c.name && C.norm(i.customerName) === C.norm(c.name)) || (key.length >= 8 && C.phoneKey(i.customerPhone) === key))); });
  }
  function custStats(c) {
    var list = custInvoices(c).filter(function (i) { return !i.void; });
    return { n: list.length, total: C.r3(list.reduce(function (t, i) { return t + num(i.total); }, 0)), due: C.r3(list.reduce(function (t, i) { return t + Calc.balance(i); }, 0)) };
  }
  function custList() {
    var q = C.norm(cq), pq = C.phoneKey(cq);
    var rows = S.customers.map(function (c) { return { c: c, s: custStats(c) }; }).filter(function (r) { return !q || C.norm(r.c.name).indexOf(q) >= 0 || (pq.length >= 3 && C.phoneKey(r.c.phone).indexOf(pq) >= 0); })
      .sort(function (a, b) { return b.s.due - a.s.due || String(a.c.name).localeCompare(String(b.c.name), 'ar'); });
    if (!S.customers.length) return '<div class="card empty">' + icon('users', 44) + '<p>' + L('لا يوجد عملاء بعد. يُحفظ العميل تلقائياً عند كتابة اسمه في الفاتورة.', 'No customers yet. A customer is saved automatically when you type his name on a bill.') + '</p></div>';
    var due = rows.reduce(function (t, r) { return t + r.s.due; }, 0);
    return '<div class="stats mb"><div class="stat"><span>' + L('عدد العملاء', 'Customers') + '</span><b>' + S.customers.length + '</b></div><div class="stat red"><span>' + L('إجمالي الديون على العملاء', 'Total owed by customers') + '</span><b class="num">' + f3(due) + '</b></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('العميل', 'Customer') + '</th><th>' + L('الهاتف', 'Phone') + '</th><th>' + L('النوع', 'Type') + '</th><th class="t-end">' + L('الفواتير', 'Bills') + '</th><th class="t-end">' + L('إجمالي مشترياته', 'Total bought') + '</th><th class="t-end">' + L('عليه', 'Owes') + '</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-cid="' + esc(r.c.id) + '" style="cursor:pointer"><td><b>' + esc(r.c.name) + '</b></td><td class="ltr">' + esc(r.c.phone || '') + '</td><td><span class="badge ' + (r.c.type === 'wholesale' ? 'warn' : 'info') + '">' + (r.c.type === 'wholesale' ? L('جملة', 'Wholesale') : L('تجزئة', 'Retail')) + '</span></td><td class="t-end">' + r.s.n + '</td><td class="t-end num">' + f3(r.s.total) + '</td><td class="t-end num">' + (r.s.due > 0.0004 ? '<b style="color:var(--red)">' + f3(r.s.due) + '</b>' : '-') + '</td><td class="act">' + icon(C.lang === 'ar' ? 'back' : 'next', 18) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function custDraw() {
    croot.innerHTML = '<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" id="c-q" type="search" placeholder="' + L('ابحث بالاسم أو الهاتف', 'Search by name or phone') + '" value="' + esc(cq) + '"></div>' +
      (Store.can('customers') ? '<button type="button" class="btn primary" id="c-new">' + icon('plus') + L('عميل جديد', 'New customer') + '</button>' : '') + '<button type="button" class="btn ghost" id="c-xl">' + icon('download') + 'Excel</button></div><div id="c-list">' + custList() + '</div>';
  }
  function custForm(c) {
    var m = C.modal({ title: c ? L('تعديل العميل', 'Edit customer') : L('عميل جديد', 'New customer'), size: 'md',
      body: '<div class="grid g2"><div class="field"><label>' + L('الاسم *', 'Name *') + '</label><input class="input" id="cf-n" value="' + esc(c ? c.name : '') + '"></div><div class="field"><label>' + L('الهاتف / واتساب', 'Phone / WhatsApp') + '</label><input class="input ltr" id="cf-p" inputmode="tel" value="' + esc(c ? c.phone || '' : '') + '"></div>' +
        '<div class="field"><label>' + L('نوع العميل', 'Customer type') + '</label><select class="input" id="cf-t"><option value="retail">' + L('تجزئة', 'Retail') + '</option><option value="wholesale"' + (c && c.type === 'wholesale' ? ' selected' : '') + '>' + L('جملة', 'Wholesale') + '</option></select></div>' +
        '<div class="field"><label>' + L('الرقم الضريبي (للشركات)', 'VAT number (companies)') + '</label><input class="input ltr" id="cf-v" value="' + esc(c ? c.vatNo || '' : '') + '"></div>' +
        '<div class="field span2"><label>' + L('العنوان', 'Address') + '</label><input class="input" id="cf-a" value="' + esc(c ? c.addr || '' : '') + '"></div><div class="field span2"><label>' + L('ملاحظات', 'Notes') + '</label><textarea class="input" id="cf-o">' + esc(c ? c.notes || '' : '') + '</textarea></div></div>',
      foot: '<button type="button" class="btn primary" id="cf-ok">' + L('حفظ', 'Save') + '</button>' });
    var q = function (s) { return m.el.querySelector(s); };
    q('#cf-ok').onclick = function () {
      var n = q('#cf-n').value.trim();
      if (!n) return C.toast(L('اكتب الاسم', 'Type the name'), 'warn');
      C.busy(q('#cf-ok'), Store.saveCustomer(Object.assign({}, c || {}, { id: c ? c.id : C.uid(), name: n, phone: q('#cf-p').value.trim(), type: q('#cf-t').value, vatNo: q('#cf-v').value.trim(), addr: q('#cf-a').value.trim(), notes: q('#cf-o').value.trim(), created: c ? c.created : C.today() })))
        .then(function () { m.close(); if (croot && croot.isConnected) custDraw(); }, function () {});
    };
  }
  function statementText(c, list, st) {
    var ar = C.lang === 'ar', lines = ['*' + (ar ? S.settings.nameAr : S.settings.name) + '*', (ar ? 'كشف حساب: ' : 'Statement: ') + c.name, '--------------------'];
    list.filter(function (i) { return !i.void && Calc.balance(i) > 0.0004; }).forEach(function (i) { lines.push(i.number + ' · ' + C.fdate(i.date) + ' · ' + (ar ? 'المتبقي ' : 'balance ') + f3(Calc.balance(i))); });
    lines.push('--------------------', '*' + (ar ? 'إجمالي المستحق: ' : 'Total due: ') + f3(st.due) + (ar ? ' ر.ع' : ' OMR') + '*');
    return lines.join('\n');
  }
  function custView(id) {
    var c = Store.byId(S.customers, id); if (!c) return;
    var list = custInvoices(c).sort(function (a, b) { return b.no - a.no; }), st = custStats(c);
    var m = C.modal({ title: icon('users') + ' ' + esc(c.name), size: 'lg',
      body: '<div class="stats mb"><div class="stat"><span>' + L('الفواتير', 'Bills') + '</span><b>' + st.n + '</b></div><div class="stat green"><span>' + L('إجمالي مشترياته', 'Total bought') + '</span><b class="num">' + f3(st.total) + '</b></div><div class="stat red"><span>' + L('المتبقي عليه', 'Owes') + '</span><b class="num">' + f3(st.due) + '</b></div></div>' +
        '<dl class="kv mb">' + (c.phone ? '<dt>' + L('الهاتف', 'Phone') + '</dt><dd class="ltr">' + esc(c.phone) + '</dd>' : '') + (c.addr ? '<dt>' + L('العنوان', 'Address') + '</dt><dd>' + esc(c.addr) + '</dd>' : '') + (c.vatNo ? '<dt>' + L('الرقم الضريبي', 'VAT number') + '</dt><dd class="ltr">' + esc(c.vatNo) + '</dd>' : '') + (c.notes ? '<dt>' + L('ملاحظات', 'Notes') + '</dt><dd>' + esc(c.notes) + '</dd>' : '') + '</dl>' +
        '<h4 class="mb">' + L('كشف الحساب', 'Statement of account') + '</h4>' +
        (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الفاتورة', 'Bill') + '</th><th>' + L('التاريخ', 'Date') + '</th><th class="t-end">' + L('الإجمالي', 'Total') + '</th><th class="t-end">' + L('المدفوع', 'Paid') + '</th><th class="t-end">' + L('المتبقي', 'Balance') + '</th><th></th></tr></thead><tbody>' +
          list.map(function (i) { var b = Calc.balance(i); return '<tr><td class="ltr"><button type="button" class="link" data-inv="' + esc(i.id) + '">' + esc(i.number) + '</button>' + (i.void ? ' <span class="badge bad">' + L('ملغاة', 'Void') + '</span>' : '') + '</td><td>' + C.fdate(i.date) + '</td><td class="t-end num">' + f3(i.total) + '</td><td class="t-end num">' + f3(Calc.paid(i)) + '</td><td class="t-end num">' + (b > 0.0004 ? '<b style="color:var(--red)">' + f3(b) + '</b>' : '-') + '</td><td class="act">' + (b > 0.0004 && Store.can('sell') ? '<button type="button" class="btn sm amber" data-pay="' + esc(i.id) + '">' + L('استلام', 'Receive') + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="muted">' + L('لا توجد فواتير لهذا العميل.', 'No bills for this customer.') + '</p>'),
      foot: (Store.isAdmin() ? '<button type="button" class="btn danger-soft" id="cv-del">' + icon('trash') + '</button>' : '') + (Store.can('customers') ? '<button type="button" class="btn ghost" id="cv-edit">' + icon('edit') + L('تعديل', 'Edit') + '</button>' : '') + '<span class="grow"></span>' +
        (st.due > 0.0004 && c.phone ? '<button type="button" class="btn wa" id="cv-wa">' + icon('whatsapp') + L('إرسال كشف الحساب', 'Send statement') + '</button>' : '') });
    var q = function (s) { return m.el.querySelector(s); };
    m.el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-inv]'))) { m.close(); Invoices.view(b.getAttribute('data-inv')); }
      if ((b = e.target.closest('[data-pay]'))) { m.close(); Invoices.pay(Store.byId(S.invoices, b.getAttribute('data-pay')), function () { if (croot && croot.isConnected) custDraw(); custView(id); }); }
    });
    if (q('#cv-edit')) q('#cv-edit').onclick = function () { m.close(); custForm(c); };
    if (q('#cv-wa')) q('#cv-wa').onclick = function () { WhatsApp.text(c.phone, statementText(c, list, st)); };
    if (q('#cv-del')) q('#cv-del').onclick = function () {
      C.confirmBox(L('حذف العميل من القائمة؟ (فواتيره تبقى)', 'Remove the customer from the list? (his bills stay)'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.removeCustomer(c.id).then(function () { m.close(); custDraw(); }, function (er) { C.toast(C.errText(er), 'err'); }); });
    };
  }
  Shell.page('customers', {
    title: function () { return L('العملاء', 'Customers'); },
    render: function (el) {
      croot = document.createElement('div'); el.appendChild(croot); custDraw();
      croot.addEventListener('click', function (e) {
        var b;
        if (e.target.closest('#c-new')) return custForm(null);
        if (e.target.closest('#c-xl')) {
          var M = XLSX.S.MONEY, rows = [[L('العميل', 'Customer'), L('الهاتف', 'Phone'), L('النوع', 'Type'), L('الفواتير', 'Bills'), L('إجمالي مشترياته', 'Total bought'), L('عليه', 'Owes')]];
          S.customers.forEach(function (c) { var s = custStats(c); rows.push([c.name, c.phone || '', c.type === 'wholesale' ? L('جملة', 'Wholesale') : L('تجزئة', 'Retail'), s.n, { v: s.total, s: M }, { v: s.due, s: M }]); });
          return Shell.excel('Abraj-Alsumud_Customers', L('العملاء', 'Customers'), rows, [28, 16, 10, 10, 16, 14]);
        }
        if ((b = e.target.closest('tr[data-cid]'))) custView(b.getAttribute('data-cid'));
      });
      croot.addEventListener('input', function (e) { if (e.target.id === 'c-q') { cq = e.target.value; croot.querySelector('#c-list').innerHTML = custList(); } });
    }
  });

  /* ================================================== expenses */
  var emonth = '', eroot = null;
  function expDraw() {
    if (!emonth) emonth = C.today().slice(0, 7);
    var list = S.expenses.filter(function (x) { return emonth === 'all' || String(x.date).slice(0, 7) === emonth; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var total = list.reduce(function (t, x) { return t + num(x.amount); }, 0), by = {};
    list.forEach(function (x) { by[x.cat || '-'] = (by[x.cat || '-'] || 0) + num(x.amount); });
    eroot.innerHTML = '<div class="toolbar"><input class="input" type="month" id="e-m" style="width:auto" value="' + (emonth === 'all' ? '' : esc(emonth)) + '"><button type="button" class="chip' + (emonth === 'all' ? ' on' : '') + '" id="e-all">' + L('كل الفترات', 'All time') + '</button><span class="grow"></span>' +
      (Store.can('expenses') ? '<button type="button" class="btn primary" id="e-new">' + icon('plus') + L('مصروف جديد', 'New expense') + '</button>' : '') + '<button type="button" class="btn ghost" id="e-xl">' + icon('download') + 'Excel</button></div>' +
      '<div class="stats mb"><div class="stat red"><span>' + L('إجمالي المصروفات', 'Total expenses') + '</span><b class="num">' + f3(total) + '</b></div>' + Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 3).map(function (k) { return '<div class="stat"><span>' + esc(k) + '</span><b class="num">' + f3(by[k]) + '</b></div>'; }).join('') + '</div>' +
      (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('التاريخ', 'Date') + '</th><th>' + L('البند', 'Category') + '</th><th>' + L('الوصف', 'Description') + '</th><th>' + L('الدفع', 'Paid by') + '</th><th class="t-end">' + L('المبلغ', 'Amount') + '</th><th>' + L('سجّله', 'By') + '</th><th></th></tr></thead><tbody>' +
        list.map(function (x) { return '<tr><td class="nowrap">' + C.fdate(x.date) + '</td><td><span class="badge">' + esc(x.cat || '-') + '</span></td><td>' + esc(x.title || '') + '</td><td>' + esc(C.payName(x.method || 'cash')) + '</td><td class="t-end num"><b>' + f3(x.amount) + '</b></td><td class="small">' + esc(x.createdBy || '') + '</td><td class="act">' + (Store.can('expenses') ? '<button type="button" class="icon-btn sm" data-eedit="' + esc(x.id) + '">' + icon('edit', 18) + '</button><button type="button" class="icon-btn sm red" data-edel="' + esc(x.id) + '">' + icon('trash', 18) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="card empty">' + icon('wallet', 44) + '<p>' + L('لا توجد مصروفات في هذه الفترة', 'No expenses in this period') + '</p></div>');
  }
  function expForm(x) {
    var cats = S.settings.expCats || [];
    var m = C.modal({ title: x ? L('تعديل المصروف', 'Edit expense') : L('مصروف جديد', 'New expense'), size: 'md',
      body: '<div class="grid g2"><div class="field"><label>' + L('البند', 'Category') + '</label><input class="input" id="ef-c" list="ef-cats" value="' + esc(x ? x.cat || '' : '') + '"><datalist id="ef-cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field"><label>' + L('المبلغ *', 'Amount *') + '</label><input class="input num" id="ef-a" inputmode="decimal" value="' + (x ? f3(x.amount) : '') + '"></div>' +
        '<div class="field"><label>' + L('التاريخ', 'Date') + '</label><input class="input" type="date" id="ef-d" value="' + esc(x ? x.date : C.today()) + '"></div>' +
        '<div class="field"><label>' + L('طريقة الدفع', 'Method') + '</label><select class="input" id="ef-m">' + ['cash', 'transfer', 'card', 'cheque'].map(function (k) { return '<option value="' + k + '"' + (x && x.method === k ? ' selected' : '') + '>' + esc(C.payName(k)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field span2"><label>' + L('الوصف', 'Description') + '</label><input class="input" id="ef-t" maxlength="200" value="' + esc(x ? x.title || '' : '') + '"></div></div>',
      foot: '<button type="button" class="btn primary" id="ef-ok">' + L('حفظ', 'Save') + '</button>' });
    var q = function (s) { return m.el.querySelector(s); };
    q('#ef-ok').onclick = function () {
      var a = num(q('#ef-a').value);
      if (a <= 0) return C.toast(L('اكتب المبلغ', 'Type the amount'), 'warn');
      C.busy(q('#ef-ok'), Store.saveExpense(Object.assign({}, x || {}, { id: x ? x.id : C.uid(), cat: q('#ef-c').value.trim() || L('أخرى', 'Other'), amount: a, date: q('#ef-d').value || C.today(), method: q('#ef-m').value, title: q('#ef-t').value.trim() }))).then(function () { m.close(); expDraw(); }, function () {});
    };
  }
  Shell.page('expenses', {
    title: function () { return L('المصروفات', 'Expenses'); },
    render: function (el) {
      eroot = document.createElement('div'); el.appendChild(eroot); expDraw();
      eroot.addEventListener('click', function (e) {
        var b;
        if (e.target.closest('#e-new')) return expForm(null);
        if (e.target.closest('#e-all')) { emonth = 'all'; return expDraw(); }
        if (e.target.closest('#e-xl')) {
          var rows = [[L('التاريخ', 'Date'), L('البند', 'Category'), L('الوصف', 'Description'), L('الدفع', 'Paid by'), L('المبلغ', 'Amount'), L('سجّله', 'By')]];
          S.expenses.filter(function (x) { return emonth === 'all' || String(x.date).slice(0, 7) === emonth; }).forEach(function (x) { rows.push([C.fdate(x.date), x.cat, x.title, C.payName(x.method || 'cash'), { v: num(x.amount), s: XLSX.S.MONEY }, x.createdBy || '']); });
          return Shell.excel('Abraj-Alsumud_Expenses', L('المصروفات', 'Expenses'), rows, [12, 18, 40, 14, 12, 16]);
        }
        if ((b = e.target.closest('[data-eedit]'))) return expForm(Store.byId(S.expenses, b.getAttribute('data-eedit')));
        if ((b = e.target.closest('[data-edel]'))) { var id = b.getAttribute('data-edel'); C.confirmBox(L('حذف هذا المصروف؟', 'Delete this expense?'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.removeExpense(id).then(expDraw, function (er) { C.toast(C.errText(er), 'err'); }); }); }
      });
      eroot.addEventListener('change', function (e) { if (e.target.id === 'e-m' && e.target.value) { emonth = e.target.value; expDraw(); } });
    }
  });

  /* ================================================== reminders */
  var rroot = null;
  function alerts() {
    var t = C.today(), soon = C.addDays(t, 60);
    return {
      out: S.products.filter(function (p) { return !p.archived && P.out(p); }),
      low: S.products.filter(function (p) { return !p.archived && !P.out(p) && P.low(p); }),
      exp: S.products.filter(function (p) { return p.expiry && p.expiry <= soon && P.total(p) > 0; }).sort(function (a, b) { return String(a.expiry).localeCompare(String(b.expiry)); }),
      debts: S.customers.map(function (c) { return { c: c, s: custStats(c) }; }).filter(function (r) { return r.s.due > 0.0004; }).sort(function (a, b) { return b.s.due - a.s.due; }),
      sup: Store.sees('cost') ? S.purchases.filter(function (p) { return Calc.balance(p) > 0.0004; }) : [],
      mine: S.reminders.filter(function (r) { return !r.done; }).sort(function (a, b) { return String(a.due || '9999').localeCompare(String(b.due || '9999')); })
    };
  }
  function alertCount() { var a = alerts(), t = C.today(); return a.out.length + a.low.length + a.exp.length + a.mine.filter(function (r) { return !r.due || r.due <= t; }).length; }
  function remDraw() {
    var a = alerts(), t = C.today();
    var block = function (title, ic, cls, rows, empty) { return '<div class="card"><h3>' + icon(ic) + title + ' <span class="badge ' + cls + '">' + rows.length + '</span></h3>' + (rows.length ? '<div class="col" style="gap:6px">' + rows.slice(0, 30).join('') + '</div>' + (rows.length > 30 ? '<p class="small muted mt">+' + (rows.length - 30) + '</p>' : '') : '<p class="muted small">' + empty + '</p>') + '</div>'; };
    var prow = function (p, extra) { return '<button type="button" class="inv-card" data-id="' + esc(p.id) + '" style="padding:8px">' + Media.thumb(p.img, P.name(p), C.catOf(S.settings, p.cat).c) + '<span class="grow"><span class="nm">' + esc(P.name(p)) + '</span><br><span class="meta">' + extra + '</span></span></button>'; };
    rroot.innerHTML = '<div class="card mb"><h3>' + icon('bell') + L('تذكيراتي', 'My reminders') + '</h3>' +
      '<form id="r-f" class="row wrap mb"><input class="input grow" id="r-t" placeholder="' + L('اكتب تذكيراً... (مثال: طلب كرتون علب العسل من المورد)', 'Type a reminder... (e.g. order honey jars from the supplier)') + '" maxlength="200" style="flex:1 1 240px"><input class="input" type="date" id="r-d" style="width:auto"><button class="btn primary">' + icon('plus') + L('إضافة', 'Add') + '</button></form>' +
      (a.mine.length ? a.mine.map(function (r) { var late = r.due && r.due <= t; return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><button type="button" class="icon-btn sm" data-rdone="' + esc(r.id) + '" title="' + L('تم', 'Done') + '" style="border:2px solid var(--g500);border-radius:50%"></button><span class="grow">' + esc(r.text) + (r.due ? ' <span class="badge ' + (late ? 'bad' : '') + '">' + C.fdate(r.due) + '</span>' : '') + '<span class="small muted"> · ' + esc(r.by || '') + '</span></span><button type="button" class="icon-btn sm red" data-rdel="' + esc(r.id) + '">' + icon('trash', 17) + '</button></div>'; }).join('') : '<p class="muted small">' + L('لا توجد تذكيرات.', 'No reminders.') + '</p>') + '</div>' +
      '<div class="grid g2">' +
      block(L('منتجات نافدة', 'Out of stock'), 'alert', 'bad', a.out.map(function (p) { return prow(p, L('الكمية: 0', 'Quantity: 0') + (p.supplier ? ' · ' + esc(p.supplier) : '')); }), L('لا توجد منتجات نافدة.', 'Nothing is out of stock.')) +
      block(L('كمية منخفضة', 'Low stock'), 'box', 'warn', a.low.map(function (p) { return prow(p, L('المتبقي: ', 'Left: ') + esc(P.breakdown(p, P.total(p))) + ' · ' + L('حد التنبيه ', 'alert at ') + C.qf(p.minStock)); }), L('كل الكميات فوق حد التنبيه.', 'All quantities are above their alert level.')) +
      block(L('قريبة الانتهاء (60 يوماً)', 'Expiring soon (60 days)'), 'clock', 'warn', a.exp.map(function (p) { return prow(p, (p.expiry < t ? '<b style="color:var(--red)">' + L('منتهي: ', 'Expired: ') + '</b>' : L('ينتهي: ', 'Expires: ')) + C.fdate(p.expiry) + ' · ' + esc(P.breakdown(p, P.total(p)))); }), L('لا توجد منتجات قريبة الانتهاء.', 'Nothing is close to expiry.')) +
      block(L('عملاء عليهم مبالغ', 'Customers who owe'), 'users', 'bad', a.debts.map(function (r) { return '<button type="button" class="inv-card" data-cust="' + esc(r.c.name) + '" style="padding:10px"><span class="grow"><span class="nm">' + esc(r.c.name) + '</span> <span class="meta ltr">' + esc(r.c.phone || '') + '</span></span><b class="num" style="color:var(--red)">' + f3(r.s.due) + '</b></button>'; }), L('لا توجد ديون على العملاء.', 'No customer owes anything.')) +
      (Store.sees('cost') ? block(L('مستحقات للموردين', 'To pay suppliers'), 'truck', 'warn', a.sup.map(function (p) { return '<div class="row between" style="padding:6px 2px"><span>' + esc(p.supplierName || '-') + ' <span class="small muted ltr">' + esc(p.number) + '</span></span><b class="num">' + f3(Calc.balance(p)) + '</b></div>'; }), L('لا توجد مبالغ مستحقة للموردين.', 'Nothing is owed to suppliers.')) : '') + '</div>';
  }
  Shell.page('reminders', {
    title: function () { return L('التنبيهات والتذكيرات', 'Alerts & reminders'); },
    render: function (el) {
      rroot = document.createElement('div'); el.appendChild(rroot); remDraw();
      rroot.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = rroot.querySelector('#r-t').value.trim();
        if (!t) return;
        Store.saveReminder({ id: C.uid(), text: t, due: rroot.querySelector('#r-d').value, done: false, by: S.user.name, created: C.today() }).then(function () { remDraw(); Shell.refreshNav(); }, function (er) { C.toast(C.errText(er), 'err'); });
      });
      rroot.addEventListener('click', function (e) {
        var b;
        if ((b = e.target.closest('[data-rdone]'))) { var r = Store.byId(S.reminders, b.getAttribute('data-rdone')); return Store.saveReminder(Object.assign({}, r, { done: true })).then(function () { remDraw(); Shell.refreshNav(); }, function (er) { C.toast(C.errText(er), 'err'); }); }
        if ((b = e.target.closest('[data-rdel]'))) return Store.removeReminder(b.getAttribute('data-rdel')).then(function () { remDraw(); Shell.refreshNav(); }, function (er) { C.toast(C.errText(er), 'err'); });
        if ((b = e.target.closest('[data-id]'))) return Inventory.details(b.getAttribute('data-id'));
        if ((b = e.target.closest('[data-cust]'))) Shell.go('invoices', { customer: b.getAttribute('data-cust'), unpaid: true });
      });
    }
  });
  window.Alerts = { count: alertCount, custStats: custStats };
})();
