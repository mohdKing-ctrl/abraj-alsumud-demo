/* supplier.js - the SUPPLIER'S own page (yourdomain/supplier). He signs in with the password the shop gave him and sees
   only this: the goods the shop handed him to sell, how many he reported sold, how many he still holds, and his history.
   Two things he can do: "I sold N" and "correct the remaining amount" (with a reason). Every change is kept and the shop
   owner sees it at once on his Suppliers page. The supplier never reaches the point of sale or the website panel. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, num = C.num, ROOT = window.ROOT || '';
  var D = null, app = document.getElementById('app');
  var TYPES = { give: ['تسليم من المحل', 'Handed over by the shop'], sell: ['بعتُ', 'I sold'], fix: ['تصحيح', 'Correction'], 'return': ['استرجاع إلى المحل', 'Returned to the shop'] };
  function remaining(a) { return C.r3(num(a.given) - num(a.sold)); }

  function render() {
    var sup = D.supplier, shop = D.shop, als = D.allocs.slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    var g = 0, s = 0; als.forEach(function (a) { g += num(a.given); s += num(a.sold); });
    document.title = esc(sup.name) + ' - ' + L(shop.nameAr || shop.name, shop.name || shop.nameAr);
    app.innerHTML = '<header class="top" style="position:sticky;top:0"><div class="brand-mark" style="width:38px;height:38px;border:1px solid var(--line);font-size:16px">' + (shop.logo ? '<img alt="" src="' + esc(Media.url(shop.logo, true)) + '">' : 'أ') + '</div><h1>' + esc(L(shop.nameAr || shop.name, shop.name || shop.nameAr)) + '</h1>' +
      '<button type="button" class="lang" id="s-lang">' + L('EN', 'ع') + '</button><button type="button" class="icon-btn" id="s-out" title="' + L('خروج', 'Sign out') + '">' + icon('logout') + '</button></header>' +
      '<div class="view" style="max-width:900px;margin:0 auto;padding-bottom:40px">' +
      (Store.demo ? '<div class="banner demo" style="border-radius:12px;margin-bottom:12px">' + icon('star', 18) + L('نسخة تجريبية - ما تجرّبه يُحفظ في متصفحك فقط.', 'Demo - what you try is saved in your own browser only.') + '</div>' : '') +
      '<div class="card mb"><div class="row between wrap"><div><h2 style="font-size:20px">' + icon('truck') + ' ' + esc(sup.name) + '</h2><p class="muted small">' + L('البضاعة التي سلّمها لك المحل لتبيعها. سجّل هنا ما بعته أولاً بأول، فيعرف المحل كم بقي عندك.', 'The goods the shop handed you to sell. Record what you sell as you go, so the shop knows how much you still hold.') + '</p></div></div>' +
      '<div class="loc-boxes mt"><div class="loc-box"><span>' + L('سُلّم لك', 'Given to you') + '</span><b class="num">' + C.qf(g) + '</b></div><div class="loc-box"><span>' + L('بعتَ', 'You sold') + '</span><b class="num">' + C.qf(s) + '</b></div><div class="loc-box total"><span>' + L('عندك الآن', 'You hold now') + '</span><b class="num">' + C.qf(g - s) + '</b></div></div></div>' +
      '<h3 class="mb">' + L('البضاعة عندك', 'Goods you hold') + '</h3>' +
      (als.length ? '<div class="col">' + als.map(function (a) {
        var left = remaining(a);
        return '<div class="card" data-a="' + esc(a.id) + '" style="padding:14px"><div class="row between wrap"><div><b style="font-size:16px">' + esc(C.lang === 'en' && a.nameEn ? a.nameEn : a.name) + '</b><div class="small muted">' + L('الوحدة: ', 'Unit: ') + esc(a.unit || '') + ' · ' + L('سُلّم ', 'given ') + C.qf(a.given) + ' · ' + L('بعت ', 'sold ') + C.qf(a.sold) + '</div></div>' +
          '<div class="loc-box total" style="min-width:110px"><span>' + L('المتبقي عندك', 'Remaining') + '</span><b class="num">' + C.qf(left) + '</b></div></div>' +
          '<div class="row wrap mt"><button type="button" class="btn primary" data-sell="' + esc(a.id) + '"' + (left <= 0 ? ' disabled' : '') + '>' + icon('cart') + L('بعتُ كمية', 'I sold some') + '</button><button type="button" class="btn ghost" data-fix="' + esc(a.id) + '">' + icon('edit') + L('تصحيح الكمية', 'Correct the amount') + '</button></div></div>';
      }).join('') + '</div>' : '<div class="card empty">' + icon('box', 44) + '<p>' + L('لم يسلّمك المحل بضاعة بعد.', 'The shop has not handed you goods yet.') + '</p></div>') +
      '<h3 class="mt2 mb">' + L('سجل حركاتك', 'Your history') + '</h3>' +
      (D.moves.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الوقت', 'When') + '</th><th>' + L('المنتج', 'Product') + '</th><th>' + L('الحركة', 'Action') + '</th><th>' + L('الكمية', 'Qty') + '</th><th>' + L('المتبقي بعدها', 'Left after') + '</th><th>' + L('ملاحظة', 'Note') + '</th></tr></thead><tbody>' +
        D.moves.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 200).map(function (m) { var t = TYPES[m.type] || [m.type, m.type]; return '<tr><td class="nowrap small">' + C.fts(m.ts) + '</td><td>' + esc(m.name) + '</td><td><span class="badge ' + (m.type === 'sell' ? 'ok' : m.type === 'give' ? 'info' : 'warn') + '">' + L(t[0], t[1]) + (m.byRole !== 'supplier' ? ' · ' + esc(m.by) : '') + '</span></td><td class="num" style="font-weight:800">' + (m.type === 'give' ? '+' : m.type === 'fix' ? (num(m.qty) >= 0 ? '+' : '') : '-') + C.qf(Math.abs(num(m.qty))) + '</td><td class="num">' + C.qf(m.remainingAfter) + '</td><td class="small">' + esc(m.note || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted small">' + L('لا توجد حركات بعد.', 'No activity yet.') + '</p>') +
      (shop.whatsapp || shop.phone ? '<p class="center mt2"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/' + C.phoneIntl(shop.whatsapp || shop.phone) + '">' + icon('whatsapp') + L('مراسلة المحل على واتساب', 'Message the shop on WhatsApp') + '</a></p>' : '') + '</div>';
    document.getElementById('s-lang').onclick = function () { C.setLang(C.lang === 'ar' ? 'en' : 'ar'); };
    document.getElementById('s-out').onclick = function () { Store.logout().then(function () { location.href = ROOT + 'login/index.html'; }, function () { location.href = ROOT + 'login/index.html'; }); };
    app.onclick = function (e) {
      var b;
      if ((b = e.target.closest('[data-sell]'))) sell(D.allocs.filter(function (a) { return a.id === b.getAttribute('data-sell'); })[0]);
      if ((b = e.target.closest('[data-fix]'))) fix(D.allocs.filter(function (a) { return a.id === b.getAttribute('data-fix'); })[0]);
    };
  }
  function reload() { return Store.call('supplier_load').then(function (d) { D = d; render(); }); }
  function sell(a) {
    var m = C.modal({ title: L('بعتُ من: ', 'I sold from: ') + esc(a.name), size: 'sm',
      body: '<div class="col"><div class="note">' + L('المتبقي عندك: ', 'You hold: ') + '<b class="num">' + C.qf(remaining(a)) + '</b> ' + esc(a.unit || '') + '</div><div class="field"><label>' + L('الكمية التي بعتها', 'Quantity you sold') + '</label><input class="input num" id="q" inputmode="decimal" style="font-size:22px;min-height:54px"></div><div class="field"><label>' + L('ملاحظة (اختياري)', 'Note (optional)') + '</label><input class="input" id="n" maxlength="200"></div></div>',
      foot: '<button type="button" class="btn primary lg" id="ok">' + icon('check') + L('تسجيل البيع', 'Record the sale') + '</button>' });
    setTimeout(function () { m.el.querySelector('#q').focus(); }, 60);
    m.el.querySelector('#ok').onclick = function () {
      var n = num(m.el.querySelector('#q').value);
      if (n <= 0) return C.toast(L('اكتب الكمية', 'Type the quantity'), 'warn');
      if (n > remaining(a) + 0.0005) return C.toast(L('أكثر من المتبقي عندك. إن كان الرقم المسجّل خطأ استخدم «تصحيح الكمية».', 'More than you hold. If the recorded number is wrong use "Correct the amount".'), 'warn', 6000);
      C.busy(m.el.querySelector('#ok'), Store.call('consign_report', { allocId: a.id, type: 'sell', qty: n, note: m.el.querySelector('#n').value.trim() })).then(function () { m.close(); C.toast(L('سُجّل البيع', 'Sale recorded')); reload(); }, function () {});
    };
  }
  function fix(a) {
    var m = C.modal({ title: L('تصحيح الكمية: ', 'Correct the amount: ') + esc(a.name), size: 'sm',
      body: '<div class="col"><p class="small muted">' + L('إن أخطأت في رقم سابق، اكتب الكمية الصحيحة الموجودة عندك الآن مع السبب. يبقى التعديل مسجّلاً ويراه المحل.', 'If an earlier number was wrong, type the quantity you really have now, with the reason. The change stays on record and the shop sees it.') + '</p><div class="field"><label>' + L('الكمية الموجودة عندك فعلاً', 'Quantity you really have') + '</label><input class="input num" id="q" inputmode="decimal" value="' + C.qf(remaining(a)) + '" style="font-size:22px;min-height:54px"></div><div class="field"><label>' + L('السبب *', 'Reason *') + '</label><input class="input" id="n" maxlength="300"></div></div>',
      foot: '<button type="button" class="btn primary lg" id="ok">' + icon('check') + L('حفظ التصحيح', 'Save correction') + '</button>' });
    m.el.querySelector('#ok').onclick = function () {
      var note = m.el.querySelector('#n').value.trim();
      if (!note) return C.toast(L('اكتب السبب', 'Type the reason'), 'warn');
      C.busy(m.el.querySelector('#ok'), Store.call('consign_report', { allocId: a.id, type: 'fix', qty: num(m.el.querySelector('#q').value), note: note })).then(function () { m.close(); C.toast(L('تم التصحيح', 'Corrected')); reload(); }, function () {});
    };
  }

  Store.boot('none').then(function (state) {
    if (state !== 'ready') { location.replace(ROOT + 'login/index.html?next=supplier'); return; }
    if (Store.s.user.role !== 'supplier') { location.replace(ROOT + (Store.s.user.role === 'viewer' || Store.sees('sell') || Store.isAdmin() ? 'pos' : 'login') + '/index.html'); return; }
    Store.hooks.authLost = function () { location.href = ROOT + 'login/index.html'; };
    return reload();
  }).catch(function (e) {
    app.innerHTML = '<div style="max-width:520px;margin:12vh auto;padding:24px" class="card"><h2 class="mb">' + L('تعذّر فتح الصفحة', 'The page could not open') + '</h2><div class="note bad mb">' + esc(C.errText(e)) + '</div><button class="btn primary" onclick="location.reload()">' + L('إعادة المحاولة', 'Try again') + '</button></div>';
  });
})();
