/* core.js - small helpers shared by the point of sale, the website control panel, the login page and the public website:
   language (Arabic / English), money and dates, icons, toasts, windows (modals), bill arithmetic and product helpers. */
(function () {
  'use strict';

  /* ------------------------------------------------ language */
  var LANG = 'ar';
  try { LANG = localStorage.getItem('abraj_lang') === 'en' ? 'en' : 'ar'; } catch (e) { /* private mode */ }
  function L(ar, en) { return LANG === 'ar' ? ar : (en === undefined ? ar : en); }
  function applyLang() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  }
  function setLang(l) {
    try { localStorage.setItem('abraj_lang', l === 'en' ? 'en' : 'ar'); } catch (e) { /* ignore */ }
    location.reload();
  }
  applyLang();

  /* ------------------------------------------------ text / numbers / dates */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normDigits(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/٫/g, '.').replace(/٬/g, '');
  }
  function num(v) { var n = parseFloat(normDigits(v).replace(/,/g, '').trim()); return isFinite(n) ? n : 0; }
  function r3(n) { return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000; }
  function f3(n) { return r3(n || 0).toFixed(3); }
  function money(n) { return LANG === 'ar' ? f3(n) + ' ر.ع' : 'OMR ' + f3(n); }
  function qf(n) { return String(Math.round((Number(n) || 0) * 1000) / 1000); }          // a quantity: 12, 1.5, 0.25
  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function today() { return ymd(new Date()); }
  function nowTime() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fdate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function fts(ts) { if (!ts) return ''; var d = new Date(ts * 1000); return fdate(ymd(d)) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function uid() {
    var a = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
    return s;
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; }
  function bytes(n) {
    n = Number(n) || 0;
    if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }
  /* 9407 8883 / +968 94078883 / Arabic digits -> 96894078883 (Oman numbers are 8 digits; other countries start with + or 00) */
  function phoneIntl(s) {
    var raw = normDigits(s).trim(), plus = /^(\+|00)/.test(raw), d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (/^00/.test(raw)) d = d.slice(2);
    if (!plus && d.length === 8) d = '968' + d;
    return d;
  }
  function phoneKey(s) { var d = normDigits(s).replace(/\D/g, ''); return d.length > 8 && d.indexOf('968') === 0 ? d.slice(3) : d; }
  function norm(s) {                                   // for searching: no diacritics, the alef / ya / ta-marbuta variants treated alike
    return normDigits(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  }

  /* ------------------------------------------------ icons (inline, no image files) */
  var IC = {
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6"/>',
    receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500"/><path d="M16 4.800a3.400 3.400 0 0 1 0 6.400M18.500 14.800c1.700.800 2.700 2.500 3 5.200"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.2"/>',
    bell: '<path d="M6 16V10a6 6 0 1 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.500a7.700 7.700 0 0 0 0-3l2-1.500-2-3.400-2.300.900a7.700 7.700 0 0 0-2.600-1.500L14 2.500h-4l-.500 2.500a7.700 7.700 0 0 0-2.600 1.500l-2.300-.900-2 3.400 2 1.500a7.700 7.700 0 0 0 0 3l-2 1.500 2 3.400 2.300-.900a7.700 7.700 0 0 0 2.600 1.500l.500 2.500h4l.500-2.500a7.700 7.700 0 0 0 2.600-1.500l2.300.900 2-3.400z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.800 3 2.800 15 0 18M12 3c-2.800 3-2.800 15 0 18"/>',
    camera: '<path d="M3 8h3.500l1.500-2.500h8L17.500 8H21v11H3z"/><circle cx="12" cy="13" r="3.600"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m20 20-4.300-4.300"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>',
    print: '<path d="M7 8V3h10v5"/><path d="M5 17H3V8h18v9h-2"/><path d="M7 14h10v7H7z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    swap: '<path d="M4 8h14l-3.500-3.500M20 16H6l3.500 3.500"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>',
    eye: '<path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/>',
    image: '<path d="M3 5h18v14H3z"/><circle cx="8.500" cy="10" r="1.700"/><path d="m4 18 5.500-5 3.500 3 3-2.500 4.500 4.500"/>',
    download: '<path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14"/>',
    barcode: '<path d="M4 6v12M7 6v12M10.500 6v12M13 6v12M16.500 6v12M20 6v12"/>',
    phone: '<path d="M5 3h4l1.500 5-2 1.500a12 12 0 0 0 6 6l1.500-2 5 1.500v4a1 1 0 0 1-1 1A17 17 0 0 1 4 4a1 1 0 0 1 1-1z"/>',
    pin: '<path d="M12 21s-6.500-6.200-6.500-11a6.500 6.500 0 0 1 13 0c0 4.800-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/>',
    mail: '<path d="M3 5h18v14H3z"/><path d="m3.500 6 8.500 7 8.500-7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    store: '<path d="M3 9l1.500-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8M10 20v-5h4v5"/>',
    warehouse: '<path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-8h10v8M7 15h10"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 17.500v.500"/>',
    money: '<path d="M2 7h20v10H2z"/><circle cx="12" cy="12" r="2.600"/><path d="M5.500 10v4M18.500 10v4"/>',
    file: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>',
    msg: '<path d="M4 4h16v12H9l-5 4z"/>',
    star: '<path d="m12 3 2.700 5.600 6.100.900-4.400 4.300 1 6.100-5.400-2.900-5.400 2.900 1-6.100L3.200 9.500l6.100-.900z"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.500" cy="7.500" r="1.400"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.500l3.500 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.500" cy="6" r="1"/><circle cx="3.500" cy="12" r="1"/><circle cx="3.500" cy="18" r="1"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
    copy: '<path d="M9 9h11v12H9z"/><path d="M5 15H4V3h11v2"/>',
    leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
    send: '<path d="M21 3 3 10.500l7 2.500 2.500 7z"/><path d="M21 3 10 13"/>',
    lock: '<path d="M5 11h14v10H5z"/><path d="M8 11V7.500a4 4 0 0 1 8 0V11"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.300 5.700"/><path d="M20 4v7h-7"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.300-5.700L4 8.500"/><path d="M4 4v4.500h4.500M12 8v4.500l3 1.800"/>'
  };
  var WA = '<path fill="currentColor" stroke="none" d="M12 2a9.900 9.900 0 0 0-8.500 15l-1.400 5 5.200-1.400A9.900 9.900 0 1 0 12 2zm0 1.800a8.100 8.100 0 1 1-4.200 15l-.300-.200-3 .800.800-2.900-.200-.300A8.100 8.100 0 0 1 12 3.800zM8.700 7.200c-.200 0-.500 0-.700.300-.300.300-1 1-1 2.300s1 2.700 1.200 2.900c.100.200 2 3.100 4.900 4.300 2.400 1 2.900.800 3.400.700.500 0 1.700-.700 1.900-1.300.200-.700.200-1.200.200-1.300-.100-.200-.300-.200-.600-.400l-1.900-.900c-.300-.100-.500-.200-.700.100l-.900 1.100c-.200.200-.300.200-.600.100-.300-.200-1.200-.500-2.300-1.400-.900-.800-1.400-1.700-1.600-2-.200-.300 0-.500.100-.600l.400-.500c.200-.200.200-.300.300-.500.100-.200 0-.400 0-.500l-.900-2.100c-.200-.500-.400-.500-.600-.500z"/>';
  var IG = '<rect x="3.500" y="3.500" width="17" height="17" rx="4.500"/><circle cx="12" cy="12" r="3.800"/><circle cx="17" cy="7" r=".800" fill="currentColor"/>';
  function icon(name, size) {
    var body = name === 'whatsapp' ? WA : name === 'instagram' ? IG : (IC[name] || '');
    return '<svg class="ic" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ------------------------------------------------ toasts and windows */
  function toast(msg, kind, ms) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, ms || (kind === 'err' ? 5200 : 2800));
  }
  var openModals = [];
  /* modal({title, body, foot, size:'sm|md|lg|xl', onClose}) -> {el, body, close} */
  function modal(o) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = '<div class="modal ' + (o.size || 'md') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + (o.title || '') + '</h3><button type="button" class="icon-btn" data-x aria-label="' + L('إغلاق', 'Close') + '">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add('has-modal');
    var m = { el: wrap, body: wrap.querySelector('.modal-body'), closed: false, close: function () {
      if (m.closed) return; m.closed = true;
      wrap.remove(); openModals = openModals.filter(function (x) { return x !== m; });
      if (!openModals.length) document.body.classList.remove('has-modal');
      if (o.onClose) o.onClose();
    } };
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap && !o.sticky) m.close(); });
    wrap.querySelector('[data-x]').addEventListener('click', m.close);
    openModals.push(m);
    return m;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) openModals[openModals.length - 1].close();
  });
  function confirmBox(msg, okLabel, danger) {
    return new Promise(function (res) {
      var done = false;
      var m = modal({ title: L('تأكيد', 'Confirm'), size: 'sm', body: '<p class="confirm-text">' + esc(msg) + '</p>',
        foot: '<button type="button" class="btn ghost" data-no>' + L('إلغاء', 'Cancel') + '</button><button type="button" class="btn ' + (danger ? 'danger' : 'primary') + '" data-yes>' + esc(okLabel || L('نعم', 'Yes')) + '</button>',
        onClose: function () { if (!done) res(false); } });
      m.el.querySelector('[data-no]').onclick = function () { m.close(); };
      m.el.querySelector('[data-yes]').onclick = function () { done = true; m.close(); res(true); };
      m.el.querySelector('[data-yes]').focus();
    });
  }
  /* run a save: disables the button while it runs, shows the server's error as a message */
  function busy(btn, promise) {
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    return promise.then(function (r) { if (btn) { btn.disabled = false; btn.classList.remove('busy'); } return r; },
      function (e) { if (btn) { btn.disabled = false; btn.classList.remove('busy'); } toast(errText(e), 'err'); throw e; });
  }

  var ERR = {
    network: ['تعذّر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.', 'No connection. Check the internet and try again.'],
    no_api: ['تعذّر الوصول إلى برنامج السيرفر. لم يُحفظ شيء.', 'Cannot reach the server program. Nothing was saved.'],
    not_logged_in: ['انتهت الجلسة. سجّل الدخول من جديد.', 'Your session ended. Please sign in again.'],
    bad_login: ['اسم المستخدم أو كلمة المرور غير صحيحة.', 'Wrong username or password.'],
    too_many_attempts: ['محاولات كثيرة. انتظر 15 دقيقة ثم حاول.', 'Too many attempts. Wait 15 minutes.'],
    read_only: ['هذا الحساب للعرض فقط ولا يمكنه تغيير أي شيء.', 'This account is view-only and cannot change anything.'],
    admin_only: ['هذه العملية لصاحب المحل فقط.', 'Only the owner can do this.'],
    no_permission: ['ليست لديك صلاحية لهذه العملية. اطلبها من صاحب المحل.', 'You do not have permission for this. Ask the owner.'],
    storage_full: ['امتلأت مساحة الصور المسموحة. احذف المنتجات أو الصور التي لا تحتاجها ثم حاول مرة أخرى. يمكنك حفظ المنتج بدون صورة.', 'The photo storage is full. Delete products or photos you no longer need, then try again. You can still save without a photo.'],
    image_too_large: ['الصورة كبيرة جداً.', 'The photo is too large.'],
    bad_image: ['ملف الصورة غير صالح.', 'This photo file is not valid.'],
    bad_totals: ['مجموع الفاتورة غير متطابق. حدّث الصفحة وحاول مرة أخرى.', 'The bill totals do not match. Refresh and try again.'],
    overpaid: ['المبلغ المدفوع أكبر من المتبقي.', 'The payment is more than the balance.'],
    credit_needs_customer: ['البيع الآجل يحتاج اسم العميل.', 'A credit sale needs the customer name.'],
    staff_limit: ['وصلت للحد الأقصى من الموظفين في باقتك.', 'You reached the worker limit of your plan.'],
    username_taken: ['اسم المستخدم مستعمل.', 'This username is taken.'],
    bad_username: ['اسم المستخدم: حروف إنجليزية صغيرة وأرقام فقط (3 إلى 32).', 'Username: small English letters and digits only (3-32).'],
    password_short: ['كلمة المرور 8 خانات على الأقل.', 'The password needs at least 8 characters.'],
    missing_name: ['اكتب الاسم.', 'Please type the name.'],
    missing_phone: ['اكتب رقم الهاتف.', 'Please type the phone number.'],
    missing_email: ['اكتب البريد الإلكتروني.', 'Please type the email.'],
    missing_text: ['اكتب رسالتك.', 'Please type your message.'],
    bad_phone: ['رقم الهاتف غير صحيح.', 'The phone number is not valid.'],
    bad_email: ['البريد الإلكتروني غير صحيح.', 'The email is not valid.'],
    too_many: ['محاولات كثيرة. حاول لاحقاً.', 'Too many tries. Please try later.'],
    not_enough_stock: ['الكمية المطلوبة أكبر من الموجود.', 'Not enough quantity in that place.'],
    is_void: ['هذه الفاتورة ملغاة.', 'This bill is void.'],
    not_found: ['السجل غير موجود (ربما حُذف من جهاز آخر).', 'Record not found (maybe deleted on another device).'],
    bad_backup: ['ملف النسخة الاحتياطية غير صالح.', 'This backup file is not valid.'],
    demo_limit: ['هذه نسخة تجريبية: هذه العملية متاحة في النظام الحقيقي فقط.', 'This is a demo: this action works in the real system only.'],
    storage_browser: ['امتلأت ذاكرة المتصفح.', 'The browser storage is full.']
  };
  function errText(e) {
    var c = e && (e.code || e.message);
    if (ERR[c]) return L(ERR[c][0], ERR[c][1]);
    return L('حدث خطأ', 'Something went wrong') + (c ? ' (' + c + ')' : '');
  }

  /* ------------------------------------------------ bill arithmetic (the server repeats exactly this) */
  var Calc = {
    line: function (it) { return r3(num(it.price) * num(it.q)); },
    totals: function (items, discount, vatPct) {
      var sub = r3(items.reduce(function (t, it) { return t + Calc.line(it); }, 0));
      var disc = r3(Math.min(Math.max(num(discount), 0), sub));
      var vat = r3((sub - disc) * num(vatPct) / 100);
      return { sub: sub, discount: disc, vat: vat, total: r3(sub - disc + vat) };
    },
    paid: function (d) { return r3((d.payments || []).reduce(function (t, p) { return t + num(p.amount); }, 0)); },
    balance: function (d) { return d.void ? 0 : r3(Math.max(0, num(d.total) - Calc.paid(d))); },
    cost: function (inv) { return r3((inv.items || []).reduce(function (t, it) { return t + num(it.cost) * num(it.q); }, 0)); },
    profit: function (inv) { return r3(num(inv.sub) - num(inv.discount) - Calc.cost(inv)); }
  };

  /* ------------------------------------------------ products */
  var Prod = {
    name: function (p) { return LANG === 'en' && p.nameEn ? p.nameEn : (p.name || p.nameEn || ''); },
    unitName: function (u) { return LANG === 'en' && u.e ? u.e : (u.n || u.e || ''); },
    total: function (p) { var s = p.stock || {}; return r3(num(s.shop) + num(s.wh)); },
    at: function (p, loc) { return r3(num((p.stock || {})[loc])); },
    /* 53 pieces of a product sold by carton of 24 -> "2 كرتون + 5 حبة" */
    breakdown: function (p, qty) {
      var units = (p.units || []).slice().sort(function (a, b) { return b.f - a.f; }), base = (p.units || [])[0] || { n: '', e: '', f: 1 };
      var neg = qty < 0, rest = Math.abs(r3(qty)), parts = [];
      units.forEach(function (u) {
        if (u.f <= 1) return;
        var n = Math.floor(rest / u.f + 1e-9);
        if (n > 0) { parts.push(qf(n) + ' ' + Prod.unitName(u)); rest = r3(rest - n * u.f); }
      });
      if (rest > 0 || !parts.length) parts.push(qf(rest) + ' ' + Prod.unitName(base));
      return (neg ? '-' : '') + parts.join(' + ');
    },
    /* the units a product can be sold in for this kind of sale, each with its price */
    saleUnits: function (p, type) {
      return (p.units || []).map(function (u, i) {
        var price = type === 'wholesale' ? (num(u.w) || num(u.r)) : (num(u.r) || num(u.w));
        return { i: i, u: u, price: price };
      }).filter(function (x) { return x.price > 0; });
    },
    low: function (p) { return num(p.minStock) > 0 && Prod.total(p) <= num(p.minStock); },
    out: function (p) { return Prod.total(p) <= 0; }
  };

  var CATS = [
    { id: 'agri', ar: 'مواد زراعية', en: 'Agricultural supplies', c: '#2e9e5b' },
    { id: 'pest', ar: 'مبيدات ومكافحة الحشرات', en: 'Pesticides & insect control', c: '#d9822b' },
    { id: 'rodent', ar: 'مكافحة القوارض', en: 'Rodent control', c: '#7a6a58' },
    { id: 'tools', ar: 'أدوات زراعية', en: 'Farm & garden tools', c: '#3f8fbf' },
    { id: 'house', ar: 'مواد منزلية واستهلاكية', en: 'Household & consumer goods', c: '#8a63c9' },
    { id: 'clean', ar: 'أدوات تنظيف', en: 'Cleaning tools', c: '#18a7a0' },
    { id: 'pack', ar: 'علب وتعبئة وتغليف', en: 'Jars & packaging', c: '#c9a227' },
    { id: 'dates', ar: 'مستلزمات التمور', en: 'Dates supplies', c: '#a0562b' },
    { id: 'water', ar: 'فلاتر ومعدات المياه', en: 'Water filters & equipment', c: '#2f7fd6' },
    { id: 'camp', ar: 'مستلزمات الرحلات والشتاء', en: 'Camping & winter', c: '#d2553f' },
    { id: 'other', ar: 'أخرى', en: 'Other', c: '#64736c' }
  ];
  var UNITS = [
    { n: 'حبة', e: 'Piece', f: 1 }, { n: 'درزن', e: 'Dozen', f: 12 }, { n: 'كرتون', e: 'Carton', f: 24 }, { n: 'صندوق', e: 'Box', f: 12 },
    { n: 'شدة', e: 'Pack', f: 6 }, { n: 'ربطة', e: 'Bundle', f: 10 }, { n: 'كيس', e: 'Bag', f: 1 }, { n: 'علبة', e: 'Can', f: 1 },
    { n: 'كيلو', e: 'Kg', f: 1 }, { n: 'لتر', e: 'Litre', f: 1 }, { n: 'متر', e: 'Metre', f: 1 }, { n: 'طقم', e: 'Set', f: 1 }, { n: 'جالون', e: 'Gallon', f: 1 }
  ];
  function defaultSettings() {
    return {
      name: 'Abraj Alsumud', nameAr: 'أبراج الصمود',
      activity: 'Suppliers & agents - agricultural supplies, pesticides, household & consumer goods',
      activityAr: 'موردون ووكلاء لشركات عالمية - مواد زراعية ومبيدات حشرية، مواد منزلية واستهلاكية',
      addr: 'Bahla Souq, Wilayat Bahla, Ad Dakhiliyah, Sultanate of Oman', addrAr: 'سوق بهلاء، ولاية بهلاء، محافظة الداخلية، سلطنة عُمان',
      phone: '94078883', whatsapp: '94078883', email: '', instagram: 'abraj_alsumud', map: '', hours: '', hoursAr: '',
      cr: '', vatOn: false, vatNo: '', vatPct: 5, prefix: 'INV', logo: '',
      footer: 'Thank you for your business', footerAr: 'شكراً لتعاملكم معنا', terms: '', bank: '',
      printSize: 'a4', blockNegative: false, defLoc: 'shop', waChannel: 'web',
      cats: CATS.map(function (c) { return { id: c.id, ar: c.ar, en: c.en, c: c.c }; }),
      units: UNITS.map(function (u) { return { n: u.n, e: u.e, f: u.f }; }),
      expCats: ['إيجار', 'رواتب', 'كهرباء وماء', 'نقل وشحن', 'صيانة', 'وقود', 'أخرى']
    };
  }
  function catOf(settings, id) {
    var list = (settings && settings.cats) || CATS, i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { id: id || 'other', ar: 'أخرى', en: 'Other', c: '#64736c' };
  }
  function catName(c) { return LANG === 'en' && c.en ? c.en : (c.ar || c.en || ''); }

  var PAY = { cash: ['نقداً', 'Cash'], card: ['بطاقة', 'Card'], transfer: ['تحويل بنكي', 'Bank transfer'], cheque: ['شيك', 'Cheque'] };
  function payName(m) { var p = PAY[m] || [m, m]; return L(p[0], p[1]); }
  var LOC = { shop: ['المحل', 'Shop'], wh: ['المخزن', 'Warehouse'] };
  function locName(l) { var p = LOC[l] || [l, l]; return L(p[0], p[1]); }

  /* a coloured tile with the first letters, shown where a product has no photo */
  function initials(s) {
    var w = String(s || '').trim().split(/\s+/).filter(Boolean);
    return ((w[0] || '').charAt(0) + (w[1] || '').charAt(0)) || '؟';
  }

  window.Core = {
    get lang() { return LANG; }, L: L, setLang: setLang, esc: esc, normDigits: normDigits, num: num, r3: r3, f3: f3, money: money, qf: qf,
    today: today, nowTime: nowTime, fdate: fdate, fts: fts, ymd: ymd, addDays: addDays, uid: uid, debounce: debounce, bytes: bytes,
    phoneIntl: phoneIntl, phoneKey: phoneKey, norm: norm, icon: icon, toast: toast, modal: modal, confirmBox: confirmBox, busy: busy, errText: errText,
    Calc: Calc, Prod: Prod, CATS: CATS, UNITS: UNITS, PAY: PAY, LOC: LOC, defaultSettings: defaultSettings, catOf: catOf, catName: catName, payName: payName, locName: locName, initials: initials
  };
  window.L = L; window.esc = esc;
})();
