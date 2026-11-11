/* shell.js - the frame shared by the point of sale and the website control panel:
   side menu, top bar, page switching, language button, sign-out, the button that jumps between the two systems,
   the view-only / demo banners and the one-minute check for new website messages. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, ROOT = window.ROOT || '';
  var cfg = null, pages = {}, current = '', pollTimer = null;

  function page(name, def) { pages[name] = def; }

  function brand() {
    return '<div class="brand"><div class="brand-mark">' + (S.settings.logo ? '<img alt="" src="' + esc(Media.url(S.settings.logo, true)) + '">' : 'أ') + '</div>' +
      '<div><b>' + esc(L(S.settings.nameAr || 'أبراج الصمود', S.settings.name || 'Abraj Alsumud')) + '</b><small>' + esc(cfg.app === 'pos' ? L('نظام البيع', 'Point of sale') : L('لوحة تحكم الموقع', 'Website panel')) + '</small></div></div>';
  }
  function navHtml() {
    return cfg.nav().map(function (n) {
      if (n === '-') return '<div class="nav-sep"></div>';
      var cnt = n.count ? n.count() : 0;
      return '<button type="button" class="nav-item' + (n.id === current ? ' on' : '') + '" data-go="' + n.id + '">' + icon(n.icon) + '<span>' + esc(n.label) + '</span>' +
        (cnt ? '<span class="count">' + cnt + '</span>' : '') + '</button>';
    }).join('');
  }
  function tabbarHtml() {
    var items = cfg.nav().filter(function (n) { return n !== '-'; }).slice(0, 4);
    return items.map(function (n) {
      var cnt = n.count ? n.count() : 0;
      return '<button type="button" class="' + (n.id === current ? 'on' : '') + '" data-go="' + n.id + '">' + icon(n.icon, 22) + '<span>' + esc(n.short || n.label) + '</span>' + (cnt ? '<span class="count">' + cnt + '</span>' : '') + '</button>';
    }).join('') + '<button type="button" data-menu>' + icon('menu', 22) + '<span>' + L('المزيد', 'More') + '</span></button>';
  }
  function otherApp() {
    if (!S.features.website) return '';
    if (cfg.app === 'pos' && !Store.sees('site')) return '';
    var toSite = cfg.app === 'pos';
    return '<a class="switch-app" href="' + ROOT + (toSite ? 'admin' : 'pos') + '/index.html">' + icon(toSite ? 'globe' : 'cart') + (toSite ? L('الانتقال إلى لوحة الموقع', 'Go to website panel') : L('الانتقال إلى نظام البيع', 'Go to point of sale')) + '</a>';
  }
  function roleName() {
    var r = S.user.role;
    return r === 'admin' ? L('صاحب المحل', 'Owner') : r === 'viewer' ? L('دعم - عرض فقط', 'Support - view only') : L('موظف', 'Worker');
  }

  function mount(config) {
    cfg = config;
    var root = document.getElementById('app');
    root.className = 'shell';
    root.innerHTML =
      '<aside class="side" id="side">' + brand() + '<nav class="nav" id="nav"></nav>' +
      '<div class="side-foot">' + otherApp() +
      (cfg.app === 'admin' ? '<a class="nav-item" href="' + ROOT + 'index.html" target="_blank" rel="noopener">' + icon('eye') + '<span>' + L('عرض الموقع', 'View website') + '</span></a>' : '') +
      '<div class="me">' + icon('users') + '<div class="grow"><b>' + esc(S.user.name) + '</b>' + esc(roleName()) + '</div>' +
      '<button type="button" class="icon-btn" id="logout" title="' + L('تسجيل الخروج', 'Sign out') + '">' + icon('logout') + '</button></div></div></aside>' +
      '<div class="main">' +
      (Store.isViewer() ? '<div class="banner view">' + icon('eye', 18) + L('حساب للعرض فقط: ترى كل شيء ولا يمكنك تغيير أي شيء.', 'View-only account: you can see everything and change nothing.') + '</div>' : '') +
      (Store.demo ? '<div class="banner demo">' + icon('star', 18) + '<span class="hide-m">' + L('نسخة تجريبية ببيانات مثال - كل ما تجرّبه يُحفظ في متصفحك أنت فقط.', 'Demo copy with example data - everything you try is saved in your own browser only.') + '</span><span class="only-m">' + L('نسخة تجريبية ببيانات مثال', 'Demo copy, example data') + '</span>' +
        '<button type="button" class="btn ghost" id="demo-reset">' + icon('refresh', 16) + L('إعادة ضبط التجربة', 'Reset demo') + '</button></div>' : '') +
      '<header class="top"><button type="button" class="icon-btn only-m" data-menu aria-label="menu">' + icon('menu') + '</button><h1 id="title"></h1>' +
      '<span id="top-extra" class="row"></span>' +
      (S.features.website && Store.sees('site') ? '<a class="icon-btn bell" id="bell" href="' + ROOT + 'admin/index.html#messages" title="' + L('رسائل الموقع', 'Website messages') + '">' + icon('bell') + '<span class="dot hide" id="bell-dot"></span></a>' : '') +
      '<button type="button" class="lang" id="lang">' + L('EN', 'ع') + '</button></header>' +
      '<div class="view" id="view"></div></div>' +
      '<nav class="tabbar" id="tabbar"></nav>';

    root.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]');
      if (g) { go(g.getAttribute('data-go')); closeSide(); return; }
      if (e.target.closest('[data-menu]')) openSide();
    });
    document.getElementById('lang').onclick = function () { C.setLang(C.lang === 'ar' ? 'en' : 'ar'); };
    document.getElementById('logout').onclick = function () {
      Store.logout().then(function () { location.href = ROOT + 'login/index.html'; }, function () { location.href = ROOT + 'login/index.html'; });
    };
    var rs = document.getElementById('demo-reset');
    if (rs) rs.onclick = function () {
      C.confirmBox(L('إرجاع النسخة التجريبية إلى بيانات المثال الأصلية؟', 'Put the demo back to its original example data?'), L('إعادة ضبط', 'Reset')).then(function (y) {
        if (y) window.LocalBackend.reset().then(function () { location.reload(); });
      });
    };
    // how tall the notice strips above the top bar are (view-only / demo): the selling screen's bill panel leaves room for them
    var measure = function () { var h = 0; [].forEach.call(root.querySelectorAll('.banner'), function (b) { h += b.offsetHeight; }); document.documentElement.style.setProperty('--ban', h + 'px'); };
    measure(); window.addEventListener('resize', measure);
    Store.hooks.authLost = function () { location.href = ROOT + 'login/index.html'; };
    window.addEventListener('hashchange', function () { var h = location.hash.slice(1).split('/')[0]; if (h && h !== current && pages[h]) go(h); });
    var first = location.hash.slice(1).split('/')[0];
    go(pages[first] && allowed(first) ? first : cfg.home());
    bell();
    clearInterval(pollTimer);
    pollTimer = setInterval(function () { if (!document.hidden) Store.poll().then(function () { bell(); refreshNav(); }, function () {}); }, 60000);
  }
  function allowed(id) { return cfg.nav().some(function (n) { return n !== '-' && n.id === id; }); }
  function openSide() {
    var s = document.getElementById('side');
    s.classList.add('open');
    var sh = document.createElement('div'); sh.className = 'side-shade'; sh.id = 'side-shade'; sh.onclick = closeSide;
    document.body.appendChild(sh);
  }
  function closeSide() {
    document.getElementById('side').classList.remove('open');
    var sh = document.getElementById('side-shade'); if (sh) sh.remove();
  }
  function bell() {
    var d = document.getElementById('bell-dot');
    if (!d) return;
    d.textContent = S.unread > 99 ? '99+' : String(S.unread);
    d.classList.toggle('hide', !S.unread);
  }
  function refreshNav() {
    document.getElementById('nav').innerHTML = navHtml();
    document.getElementById('tabbar').innerHTML = tabbarHtml();
  }
  function go(name, arg) {
    if (!pages[name] || !allowed(name)) name = cfg.home();
    current = name;
    if (location.hash.slice(1).split('/')[0] !== name) history.replaceState(null, '', '#' + name);
    document.getElementById('title').textContent = pages[name].title();
    document.getElementById('top-extra').innerHTML = '';
    refreshNav();
    var v = document.getElementById('view');
    v.innerHTML = '';
    window.scrollTo(0, 0);
    try { pages[name].render(v, arg); }
    catch (e) { console.error(e); v.innerHTML = '<div class="note bad">' + esc(L('تعذّر عرض هذه الصفحة.', 'This page could not be shown.')) + ' ' + esc(e.message) + '</div>'; }
  }
  /* draw the current page again (after a save) */
  function refresh(arg) { if (current) go(current, arg); }

  /* On a phone every table is shown as a stack of cards (css/app.css): each cell then needs the name of its column.
     This copies the column titles onto the cells of every table the pages draw, whenever something is drawn. */
  function labelTables() {
    [].forEach.call(document.querySelectorAll('table.tbl'), function (t) {
      var heads = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      if (!heads.length) return;
      [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
        if (tr._lab) return;
        tr._lab = 1;
        [].forEach.call(tr.children, function (td, i) { if (heads[i]) td.setAttribute('data-l', heads[i]); });
      });
    });
  }
  var labelPending = 0;
  if (window.MutationObserver) new MutationObserver(function () {
    if (labelPending) return;
    labelPending = requestAnimationFrame(function () { labelPending = 0; labelTables(); });
  }).observe(document.body, { childList: true, subtree: true });

  /* a "choose photo / take photo" input that works on phones (opens the camera) and computers */
  function pickPhoto(camera) {
    return new Promise(function (res) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      if (camera) inp.setAttribute('capture', 'environment');
      inp.style.display = 'none';
      inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); res(f || null); };
      document.body.appendChild(inp);
      inp.click();
    });
  }
  /* Excel export helper: rows = [[...]], first row is the header */
  function excel(file, sheetName, rows, widths) {
    var H = XLSX.S.HEAD;
    var out = rows.map(function (r, i) { return i === 0 ? r.map(function (c) { return { v: c, s: H }; }) : r; });
    XLSX.save(file + '_' + C.today() + '.xlsx', [{ name: sheetName, rows: out, cols: widths, rtl: C.lang === 'ar', headerRows: 1 }]);
  }

  window.Shell = { page: page, mount: mount, go: go, refresh: refresh, refreshNav: refreshNav, bell: bell, pickPhoto: pickPhoto, excel: excel,
    get current() { return current; }, setExtra: function (html) { document.getElementById('top-extra').innerHTML = html; } };
})();
