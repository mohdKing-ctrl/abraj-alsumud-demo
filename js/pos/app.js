/* app.js - starts the point of sale: checks the sign-in, loads the data, builds the menu from what this user may do. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, S = Store.s, ROOT = window.ROOT || '';

  function nav() {
    var n = [];
    if (Store.can('sell') || Store.isViewer()) n.push({ id: 'sell', icon: 'cart', label: L('نقطة البيع', 'Point of sale'), short: L('البيع', 'Sell') });
    n.push({ id: 'invoices', icon: 'receipt', label: L('الفواتير', 'Invoices') });
    n.push({ id: 'inventory', icon: 'box', label: L('المخزون', 'Stock') });
    if (Store.sees('purchase')) n.push({ id: 'purchases', icon: 'truck', label: L('المشتريات', 'Purchases') });
    n.push({ id: 'customers', icon: 'users', label: L('العملاء', 'Customers') });
    if (Store.sees('expenses')) n.push({ id: 'expenses', icon: 'wallet', label: L('المصروفات', 'Expenses') });
    n.push({ id: 'reminders', icon: 'bell', label: L('التنبيهات', 'Alerts'), count: function () { return window.Alerts ? Alerts.count() : 0; } });
    if (Store.sees('reports')) n.push({ id: 'reports', icon: 'chart', label: L('التقارير', 'Reports') });
    n.push('-');
    n.push({ id: 'settings', icon: 'gear', label: L('الإعدادات', 'Settings') });
    return n;
  }

  Store.boot('pos').then(function (state) {
    if (state !== 'ready') { location.replace(ROOT + 'login/index.html?next=pos'); return; }
    document.title = L(S.settings.nameAr || 'أبراج الصمود', S.settings.name || 'Abraj Alsumud') + ' - ' + L('نظام البيع', 'Point of sale');
    Shell.mount({ app: 'pos', nav: nav, home: function () { return Store.can('sell') || Store.isViewer() ? 'sell' : 'inventory'; } });
  }, function (e) {
    document.getElementById('app').innerHTML = '<div style="max-width:520px;margin:12vh auto;padding:24px" class="card"><h2 class="mb">' + L('تعذّر تشغيل النظام', 'The system could not start') + '</h2><div class="note bad mb">' + C.esc(C.errText(e)) + '</div>' +
      '<p class="muted small mb">' + L('لم يُحفظ ولم يُفقد أي شيء. تحقق من الإنترنت ثم أعد المحاولة.', 'Nothing was saved and nothing was lost. Check the internet and try again.') + '</p><button class="btn primary" onclick="location.reload()">' + L('إعادة المحاولة', 'Try again') + '</button></div>';
  });
})();
