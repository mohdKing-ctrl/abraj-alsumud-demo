/* login.js - the sign-in page (yourdomain/login): sign in, first-run account creation, and the choice
   between the point of sale and the website control panel. One account opens both. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, ROOT = window.ROOT || '';
  var root = document.getElementById('auth');
  var next = (/[?&]next=(pos|admin)/.exec(location.search) || [])[1] || '';

  function art() {
    return '<div class="auth-art">' +
      '<div class="auth-logo">' + (S.settings.logo ? '<img alt="" src="' + esc(Media.url(S.settings.logo)) + '">' : 'أ') + '</div>' +
      '<h1>' + L('أبراج الصمود', 'Abraj Alsumud') + '</h1>' +
      '<p>' + L('نظام البيع بالجملة والتجزئة ولوحة تحكم الموقع الإلكتروني - حساب واحد للاثنين.', 'Wholesale & retail point of sale and the website control panel - one account for both.') + '</p>' +
      '<ul><li>' + icon('cart') + L('بيع بالحبة والدرزن والكرتون', 'Sell by piece, dozen and carton') + '</li>' +
      '<li>' + icon('box') + L('مخزون المحل والمخزن لحظة بلحظة', 'Shop and warehouse stock, live') + '</li>' +
      '<li>' + icon('camera') + L('صوّر المنتج وسجّله في ثوانٍ', 'Snap a product and register it in seconds') + '</li>' +
      '<li>' + icon('globe') + L('موقعك الإلكتروني تديره بنفسك', 'Your website, managed by you') + '</li></ul></div>';
  }
  function shell(inner) {
    root.innerHTML = art() + '<div class="auth-form"><div class="auth-box">' + inner +
      '<div class="row between mt"><a class="link small" href="' + ROOT + 'index.html">' + L('العودة إلى الموقع', 'Back to the website') + '</a>' +
      '<button type="button" class="link small" id="lang">' + L('English', 'العربية') + '</button></div></div></div>';
    document.getElementById('lang').onclick = function () { C.setLang(C.lang === 'ar' ? 'en' : 'ar'); };
  }
  function go(where) { location.href = ROOT + where + '/index.html'; }

  function showLogin() {
    shell('<h2>' + L('تسجيل الدخول', 'Sign in') + '</h2>' +
      (Store.demo ? '<div class="note warn">' + icon('star', 18) + '<span>' + L('نسخة تجريبية: اضغط «دخول» مباشرة، لا تحتاج كلمة مرور.', 'Demo copy: just press "Sign in", no password needed.') + '</span></div>' : '') +
      '<form id="f" class="col" autocomplete="on">' +
      '<div class="field"><label for="u">' + L('اسم المستخدم', 'Username') + '</label><input class="input ltr" id="u" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required' + (Store.demo ? ' value="demo"' : '') + '></div>' +
      '<div class="field"><label for="p">' + L('كلمة المرور', 'Password') + '</label><input class="input ltr" id="p" name="password" type="password" autocomplete="current-password"' + (Store.demo ? ' value="demo-demo"' : ' required') + '></div>' +
      '<button class="btn primary lg block" id="go">' + icon('lock') + L('دخول', 'Sign in') + '</button></form>');
    var f = document.getElementById('f');
    f.onsubmit = function (e) {
      e.preventDefault();
      C.busy(document.getElementById('go'), Store.login(f.u.value, f.p.value)).then(afterLogin, function () {});
    };
    if (!Store.demo) f.u.focus();
  }

  function showSetup() {
    shell('<h2>' + L('إعداد النظام لأول مرة', 'First-time setup') + '</h2>' +
      '<p class="muted small">' + L('هذه الشاشة تظهر مرة واحدة فقط. أنشئ حساب صاحب المحل، ويمكن إضافة حساب دعم للعرض فقط.', 'This screen appears only once. Create the owner account; a view-only support account is optional.') + '</p>' +
      '<form id="f" class="col" autocomplete="off">' +
      '<div class="section-block"><h4>' + icon('users', 18) + L('حساب صاحب المحل (تحكم كامل)', 'Owner account (full control)') + '</h4><div class="col">' +
      '<div class="field"><label>' + L('الاسم', 'Name') + '</label><input class="input" name="name" required></div>' +
      '<div class="field"><label>' + L('اسم المستخدم', 'Username') + '</label><input class="input ltr" name="username" autocapitalize="none" required pattern="[a-z0-9._-]{3,32}"></div>' +
      '<div class="field"><label>' + L('كلمة المرور (8 خانات أو أكثر)', 'Password (8+ characters)') + '</label><input class="input ltr" name="password" type="password" autocomplete="new-password" required minlength="8"></div>' +
      '</div></div>' +
      '<div class="section-block"><h4>' + icon('eye', 18) + L('حساب الدعم - للعرض فقط (اختياري)', 'Support account - view only (optional)') + '</h4><div class="col">' +
      '<div class="field"><label>' + L('اسم المستخدم', 'Username') + '</label><input class="input ltr" name="vuser" autocapitalize="none" pattern="[a-z0-9._-]{3,32}"></div>' +
      '<div class="field"><label>' + L('كلمة المرور', 'Password') + '</label><input class="input ltr" name="vpass" type="password" autocomplete="new-password" minlength="8"></div>' +
      '</div></div>' +
      '<button class="btn primary lg block" id="go">' + L('إنشاء الحسابات والدخول', 'Create accounts and sign in') + '</button></form>');
    var f = document.getElementById('f');
    f.onsubmit = function (e) {
      e.preventDefault();
      var body = { name: f.name.value.trim(), username: f.username.value.trim().toLowerCase(), password: f.password.value };
      if (f.vuser.value.trim()) body.viewer = { username: f.vuser.value.trim().toLowerCase(), password: f.vpass.value, name: 'Support' };
      C.busy(document.getElementById('go'), Store.setup(body)).then(afterLogin, function () {});
    };
  }

  function afterLogin() {
    var site = !!S.features.website && Store.sees('site');
    if (next === 'admin' && site) return go('admin');
    if (next === 'pos' || !site) return go('pos');
    showChoice();
  }
  function showChoice() {
    shell('<h2>' + L('أهلاً، ', 'Welcome, ') + esc(S.user.name) + '</h2><p class="muted">' + L('إلى أين تريد الذهاب؟ يمكنك التنقل بينهما بزر واحد في أي وقت.', 'Where would you like to go? You can switch between them with one button at any time.') + '</p>' +
      '<div class="choose"><a href="' + ROOT + 'pos/index.html">' + icon('cart', 34) + L('نظام البيع', 'Point of sale') + '<small>' + L('الفواتير والمخزون والتقارير', 'Bills, stock, reports') + '</small></a>' +
      '<a href="' + ROOT + 'admin/index.html">' + icon('globe', 34) + L('لوحة الموقع', 'Website panel') + '<small>' + L('المنشورات والصور والرسائل', 'Posts, photos, messages') + '</small></a></div>' +
      '<button type="button" class="btn ghost" id="out">' + icon('logout') + L('تسجيل الخروج', 'Sign out') + '</button>');
    document.getElementById('out').onclick = function () { Store.logout().then(showLogin, showLogin); };
  }

  /* the shop's logo and name for this screen (public details only; the screen works without them) */
  function brandInfo() {
    return Store.publicCall('site_public').then(function (d) { if (d && d.biz) ['logo', 'name', 'nameAr'].forEach(function (k) { if (d.biz[k]) S.settings[k] = d.biz[k]; }); }, function () {});
  }
  Store.boot('none').then(function (state) { return brandInfo().then(function () { return state; }); }).then(function (state) {
    if (state === 'setup') return showSetup();
    if (state === 'login') return showLogin();
    afterLogin();
  }, function (e) {
    shell('<h2>' + L('تعذّر تشغيل النظام', 'The system could not start') + '</h2><div class="note bad">' + esc(C.errText(e)) + '</div>' +
      '<p class="muted small">' + L('تأكد أن الاستضافة تعمل بـ PHP 8.1 أو أحدث مع pdo_sqlite. لم يُحفظ ولم يُفقد أي شيء.', 'Check that the hosting runs PHP 8.1+ with pdo_sqlite. Nothing was saved and nothing was lost.') + '</p>' +
      '<button class="btn primary" onclick="location.reload()">' + L('إعادة المحاولة', 'Try again') + '</button>');
  });
})();
