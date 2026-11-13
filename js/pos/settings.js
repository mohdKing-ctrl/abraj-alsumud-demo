/* settings.js - the shop's details and logo, bill options (VAT, numbering, print size), the lists (categories, units,
   expense categories), workers and what each may do, the change log, photo storage, subscription, where the data is
   kept, backup / restore, and the signed-in user's own password. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, num = C.num;
  var tab = '', root = null;

  var PERMS = [
    ['sell', L('البيع وإنشاء الفواتير', 'Sell and make bills'), L('فتح شاشة البيع، استلام الدفعات، إرسال واتساب', 'Selling screen, receive payments, WhatsApp')],
    ['cost', L('رؤية سعر الشراء والأرباح', 'See purchase prices and profit'), L('يرى تكلفة كل منتج وربح الفاتورة', 'Sees what each product cost and the bill profit')],
    ['discount', L('الخصم وتغيير السعر', 'Discount and change prices'), L('يعدّل سعر الصنف في الفاتورة ويعطي خصماً', 'Changes a line price and gives discounts')],
    ['stock', L('إضافة وتعديل المنتجات والكميات', 'Add / edit products and quantities'), L('تصوير المنتجات، الجرد، النقل بين المحل والمخزن', 'Product photos, stock count, shop ⇄ warehouse moves')],
    ['purchase', L('استلام البضاعة والموردون', 'Receive goods and suppliers'), L('تسجيل المشتريات ودفعات الموردين', 'Record purchases and supplier payments')],
    ['customers', L('إدارة العملاء', 'Manage customers'), L('إضافة وتعديل بيانات العملاء', 'Add and edit customers')],
    ['edit_inv', L('تعديل وإلغاء الفواتير', 'Edit and void bills'), L('كل تعديل يُسجَّل في سجل التعديلات', 'Every change is written to the change log')],
    ['expenses', L('المصروفات', 'Expenses'), L('تسجيل وتعديل المصروفات', 'Record and edit expenses')],
    ['reports', L('التقارير', 'Reports'), L('تقارير المبيعات (والأرباح إن كانت لديه صلاحية سعر الشراء)', 'Sales reports (and profit if he may see purchase prices)')],
    ['site', L('إدارة الموقع الإلكتروني', 'Manage the website'), L('المنشورات، الصور، الرسائل، المشتركون', 'Posts, photos, messages, subscribers')]
  ];
  var LOGT = { invoice_edit: ['تعديل فاتورة', 'Bill edited'], invoice_void: ['إلغاء فاتورة', 'Bill voided'], invoice_del: ['حذف فاتورة', 'Bill deleted'], product_add: ['إضافة منتج', 'Product added'], product_edit: ['تعديل منتج', 'Product edited'], product_del: ['حذف منتج', 'Product deleted'],
    purchase_add: ['استلام بضاعة', 'Goods received'], purchase_del: ['حذف استلام', 'Receipt deleted'], stock_add: ['إضافة كمية', 'Quantity added'], stock_remove: ['إنقاص كمية', 'Quantity removed'], stock_count: ['جرد', 'Stock count'], stock_transfer: ['نقل', 'Transfer'],
    expense_edit: ['تعديل مصروف', 'Expense edited'], expense_del: ['حذف مصروف', 'Expense deleted'], settings: ['تغيير الإعدادات', 'Settings changed'], user_add: ['إضافة موظف', 'Worker added'], user_del: ['حذف موظف', 'Worker deleted'], user_perms: ['تغيير صلاحيات', 'Permissions changed'], restore: ['استرجاع نسخة احتياطية', 'Backup restored'] };

  function tabs() {
    var t = [];
    if (Store.isAdmin() || Store.isViewer()) t.push(['shop', L('بيانات المحل', 'Shop details')], ['bills', L('الفواتير والطباعة', 'Bills & printing')], ['lists', L('التصنيفات والوحدات', 'Categories & units')], ['workers', L('الموظفون والصلاحيات', 'Workers & permissions')], ['log', L('سجل التعديلات', 'Change log')]);
    t.push(['storage', L('مساحة الصور', 'Photo storage')]);
    if (Store.isAdmin() || Store.isViewer()) t.push(['data', L('الاشتراك والبيانات', 'Subscription & data')]);
    t.push(['me', L('حسابي', 'My account')]);
    return t;
  }
  var field = function (label, name, val, attr, hint) { return '<div class="field"><label>' + label + '</label><input class="input" name="' + name + '" value="' + esc(val === undefined || val === null ? '' : val) + '" ' + (attr || '') + '>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; };
  var saveBtn = function () { return Store.isAdmin() ? '<div class="row mt" style="justify-content:flex-end"><button class="btn primary lg">' + icon('check') + L('حفظ', 'Save') + '</button></div>' : ''; };

  function shopHtml() {
    var s = S.settings;
    return '<form class="card" data-form="shop"><h3>' + icon('store') + L('بيانات المحل (تظهر في الفواتير والموقع)', 'Shop details (shown on bills and the website)') + '</h3>' +
      '<div class="row wrap mb"><div class="brand-mark" style="width:86px;height:86px;border:1px solid var(--line);font-size:30px">' + (s.logo ? '<img alt="" src="' + esc(Media.url(s.logo)) + '">' : 'أ') + '</div><div class="col" style="gap:6px"><b>' + L('شعار المحل', 'Shop logo') + '</b><span class="small muted">' + L('يُستخدم كما هو في الفواتير والموقع وشاشة الدخول.', 'Used exactly as it is on bills, the website and the sign-in screen.') + '</span>' +
      (Store.isAdmin() ? '<div class="row"><button type="button" class="btn soft sm" id="st-logo">' + icon('image', 16) + L('رفع الشعار', 'Upload logo') + '</button>' + (s.logo ? '<button type="button" class="btn danger-soft sm" id="st-logo-rm">' + L('إزالة', 'Remove') + '</button>' : '') + '</div>' : '') + '</div></div>' +
      '<div class="grid g2">' + field(L('اسم المحل بالعربية', 'Shop name (Arabic)'), 'nameAr', s.nameAr) + field(L('اسم المحل بالإنجليزية', 'Shop name (English)'), 'name', s.name, 'dir="ltr"') +
      field(L('النشاط بالعربية', 'Activity (Arabic)'), 'activityAr', s.activityAr) + field(L('النشاط بالإنجليزية', 'Activity (English)'), 'activity', s.activity, 'dir="ltr"') +
      field(L('العنوان بالعربية', 'Address (Arabic)'), 'addrAr', s.addrAr) + field(L('العنوان بالإنجليزية', 'Address (English)'), 'addr', s.addr, 'dir="ltr"') +
      field(L('الهاتف', 'Phone'), 'phone', s.phone, 'dir="ltr" inputmode="tel"') + field(L('رقم واتساب المحل', 'Shop WhatsApp number'), 'whatsapp', s.whatsapp, 'dir="ltr" inputmode="tel"') +
      field(L('البريد الإلكتروني', 'Email'), 'email', s.email, 'dir="ltr"') + field(L('حساب إنستغرام', 'Instagram account'), 'instagram', s.instagram, 'dir="ltr"') +
      field(L('رقم السجل التجاري', 'Commercial registration (C.R.) no.'), 'cr', s.cr, 'dir="ltr"', L('يُطبع على كل فاتورة', 'Printed on every bill')) + field(L('بيانات البنك (اختياري)', 'Bank details (optional)'), 'bank', s.bank) +
      field(L('أوقات العمل بالعربية', 'Opening hours (Arabic)'), 'hoursAr', s.hoursAr) + field(L('أوقات العمل بالإنجليزية', 'Opening hours (English)'), 'hours', s.hours, 'dir="ltr"') +
      '<div class="span2">' + field(L('رابط الموقع على خرائط جوجل (اختياري)', 'Google Maps link (optional)'), 'map', s.map, 'dir="ltr"') + '</div></div>' + saveBtn() + '</form>';
  }
  function billsHtml() {
    var s = S.settings;
    return '<form class="card" data-form="bills"><h3>' + icon('receipt') + L('الفواتير والطباعة', 'Bills & printing') + '</h3><div class="grid g2">' +
      field(L('بادئة رقم الفاتورة', 'Bill number prefix'), 'prefix', s.prefix, 'dir="ltr" maxlength="8"', 'INV-00001') +
      '<div class="field"><label>' + L('مقاس الطباعة الافتراضي', 'Default print size') + '</label><select class="input" name="printSize">' + Print.sizeOptions(s.printSize) + '</select><span class="hint">' + L('كل جهاز يتذكر المقاس الذي يختاره من شاشة البيع.', 'Each device remembers the size chosen on the selling screen.') + '</span></div>' +
      '<div class="field"><label>' + L('البيع يخرج افتراضياً من', 'Sales are taken by default from') + '</label><select class="input" name="defLoc"><option value="shop">' + L('المحل', 'Shop') + '</option><option value="wh"' + (s.defLoc === 'wh' ? ' selected' : '') + '>' + L('المخزن', 'Warehouse') + '</option></select></div>' +
      '<div class="field"><label>' + L('واتساب على الكمبيوتر يفتح في', 'On a computer, WhatsApp opens in') + '</label><select class="input" name="waChannel"><option value="web">' + L('واتساب ويب (داخل المتصفح)', 'WhatsApp Web (in the browser)') + '</option><option value="app"' + (s.waChannel === 'app' ? ' selected' : '') + '>' + L('تطبيق واتساب المثبّت على الكمبيوتر', 'The WhatsApp app installed on the computer') + '</option></select><span class="hint">' + L('كل كمبيوتر يتذكر ما يُختار في نافذة الإرسال. على الجوال يُستخدم تطبيق واتساب دائماً.', 'Each computer remembers what is chosen in the send window. A phone always uses its WhatsApp app.') + '</span></div>' +
      '<div class="field" style="justify-content:flex-end"><label class="switch"><input type="checkbox" name="blockNegative"' + (s.blockNegative ? ' checked' : '') + '><i></i><span>' + L('منع البيع إذا كانت الكمية غير متوفرة', 'Block a sale when the quantity is not available') + '</span></label></div>' +
      field(L('عبارة أسفل الفاتورة (عربي)', 'Bill footer (Arabic)'), 'footerAr', s.footerAr) + field(L('عبارة أسفل الفاتورة (إنجليزي)', 'Bill footer (English)'), 'footer', s.footer, 'dir="ltr"') +
      '<div class="span2">' + field(L('الشروط (سطر واحد، اختياري)', 'Terms (one line, optional)'), 'terms', s.terms, '', L('مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام', 'e.g. goods are not returned after 3 days')) + '</div></div>' +
      '<div class="section-block mt"><h4>' + L('ضريبة القيمة المضافة', 'VAT') + '</h4><label class="switch mb"><input type="checkbox" name="vatOn"' + (s.vatOn ? ' checked' : '') + '><i></i><span>' + L('المحل مسجّل في ضريبة القيمة المضافة', 'The shop is VAT registered') + '</span></label>' +
      '<div class="grid g2">' + field(L('الرقم الضريبي', 'VAT number (VATIN)'), 'vatNo', s.vatNo, 'dir="ltr"') + field(L('نسبة الضريبة %', 'VAT rate %'), 'vatPct', s.vatPct, 'dir="ltr" inputmode="decimal"') + '</div>' +
      '<p class="small muted mt">' + L('إذا كان المحل غير مسجّل تُطبع الفاتورة بعنوان «فاتورة» بدون ضريبة، وهذا هو الصحيح.', 'If the shop is not registered the bill prints as a plain "Invoice" with no VAT, which is correct.') + '</p></div>' + saveBtn() + '</form>';
  }
  function listsHtml() {
    var s = S.settings, adm = Store.isAdmin();
    return '<div class="card mb"><h3>' + icon('tag') + L('تصنيفات المنتجات', 'Product categories') + '</h3><div class="col" id="l-cats">' + s.cats.map(function (c, i) {
      var used = S.products.filter(function (p) { return p.cat === c.id; }).length;
      return '<div class="row" data-ci="' + i + '"><input type="color" value="' + esc(c.c || '#64736c') + '" data-k="c" style="width:42px;height:42px;border:1px solid var(--line2);border-radius:10px;padding:2px;background:#fff"' + (adm ? '' : ' disabled') + '><input class="input" data-k="ar" value="' + esc(c.ar) + '" placeholder="' + L('الاسم بالعربية', 'Arabic name') + '"' + (adm ? '' : ' disabled') + '><input class="input ltr" data-k="en" value="' + esc(c.en || '') + '" placeholder="English name"' + (adm ? '' : ' disabled') + '><span class="badge">' + used + '</span>' + (adm ? '<button type="button" class="icon-btn red" data-crm="' + i + '"' + (used ? ' disabled title="' + L('مستخدم في منتجات', 'Used by products') + '" style="opacity:.3"' : '') + '>' + icon('trash', 18) + '</button>' : '') + '</div>';
    }).join('') + '</div>' + (adm ? '<div class="row mt"><button type="button" class="btn soft" id="l-cadd">' + icon('plus') + L('تصنيف جديد', 'New category') + '</button><span class="grow"></span><button type="button" class="btn primary" id="l-csave">' + L('حفظ التصنيفات', 'Save categories') + '</button></div>' : '') + '</div>' +
      '<div class="card mb"><h3>' + icon('box') + L('أسماء الوحدات المقترحة', 'Suggested unit names') + '</h3><p class="small muted mb">' + L('تظهر كاقتراحات عند إضافة منتج. «العدد المعتاد» هو كم حبة في الوحدة غالباً (يمكن تغييره لكل منتج).', 'Offered as suggestions when adding a product. "Usual count" is how many pieces the unit usually holds (changeable per product).') + '</p><div class="col" id="l-units">' + s.units.map(function (u, i) {
        return '<div class="row" data-ui="' + i + '"><input class="input" data-k="n" value="' + esc(u.n) + '" placeholder="' + L('عربي', 'Arabic') + '"' + (adm ? '' : ' disabled') + '><input class="input ltr" data-k="e" value="' + esc(u.e || '') + '" placeholder="English"' + (adm ? '' : ' disabled') + '><input class="input num" data-k="f" value="' + C.qf(u.f || 1) + '" style="width:90px" inputmode="decimal" title="' + L('العدد المعتاد', 'Usual count') + '"' + (adm ? '' : ' disabled') + '>' + (adm ? '<button type="button" class="icon-btn red" data-urm="' + i + '">' + icon('trash', 18) + '</button>' : '') + '</div>';
      }).join('') + '</div>' + (adm ? '<div class="row mt"><button type="button" class="btn soft" id="l-uadd">' + icon('plus') + L('وحدة جديدة', 'New unit') + '</button><span class="grow"></span><button type="button" class="btn primary" id="l-usave">' + L('حفظ الوحدات', 'Save units') + '</button></div>' : '') + '</div>' +
      '<form class="card" data-form="exp"><h3>' + icon('wallet') + L('بنود المصروفات', 'Expense categories') + '</h3><div class="field"><textarea class="input" name="expCats" rows="4"' + (adm ? '' : ' disabled') + '>' + esc((s.expCats || []).join('\n')) + '</textarea><span class="hint">' + L('بند في كل سطر', 'One category per line') + '</span></div>' + saveBtn() + '</form>';
  }
  function permChecks(sel) {
    return '<div class="grid g2">' + PERMS.filter(function (p) { return p[0] !== 'site' || S.features.website; }).map(function (p) { return '<label class="check"><input type="checkbox" value="' + p[0] + '"' + (sel.indexOf(p[0]) >= 0 ? ' checked' : '') + '><span><b>' + p[1] + '</b><span>' + p[2] + '</span></span></label>'; }).join('') + '</div>';
  }
  function workersHtml(el) {
    el.innerHTML = '<div class="card"><p class="muted">' + L('جارٍ التحميل...', 'Loading...') + '</p></div>';
    Store.users().then(function (r) {
      var staff = r.users.filter(function (u) { return u.role === 'staff' || u.role === 'admin'; }).length - 1, adm = Store.isAdmin(), max = r.max_staff || 0; staff = { length: Math.max(0, staff) };
      el.innerHTML = '<div class="card"><div class="row between wrap mb"><h3 style="margin:0">' + icon('users') + L('الموظفون', 'Workers') + ' <span class="badge ' + (max && staff.length >= max ? 'bad' : 'ok') + '">' + staff.length + ' / ' + max + '</span></h3>' +
        (adm && S.features.staff_accounts && (!max || staff.length < max) ? '<button type="button" class="btn primary" id="w-add">' + icon('plus') + L('موظف أو شريك جديد', 'New worker or partner') + '</button>' : '') + '</div>' +
        '<p class="small muted mb">' + L('كل موظف يدخل بكلمة مروره الخاصة فقط (بلا اسم مستخدم)، ويرى فقط ما تسمح له به. باقتك تسمح بـ ', 'Each worker signs in with his own password only (no username) and sees only what you allow. Your plan allows ') + max + L(' موظفاً.', ' workers.') + '</p>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الاسم', 'Name') + '</th><th>' + L('الدور', 'Role') + '</th><th>' + L('الصلاحيات', 'Permissions') + '</th><th></th></tr></thead><tbody>' +
        r.users.map(function (u) {
          var role = u.role === 'admin' ? '<span class="badge ok">' + L('مدير - صلاحية كاملة', 'Admin - full control') + '</span>' : u.role === 'viewer' ? '<span class="badge info">' + L('دعم - عرض فقط', 'Support - view only') + '</span>' : u.role === 'supplier' ? '<span class="badge warn">' + L('مورد - صفحته فقط', 'Supplier - his page only') + '</span>' : '<span class="badge">' + L('موظف', 'Worker') + '</span>';
          var mine = u.id === S.user.id, canTouch = adm && !mine && u.role !== 'viewer';
          return '<tr><td><b>' + esc(u.name) + '</b></td><td>' + role + '</td><td class="small">' + (u.role === 'staff' ? (u.perms.length ? u.perms.map(function (k) { var p = PERMS.filter(function (x) { return x[0] === k; })[0]; return '<span class="badge" style="margin:1px">' + (p ? p[1] : k) + '</span>'; }).join(' ') : L('لا شيء (عرض المخزون فقط)', 'None (sees stock only)')) : (u.role === 'admin' ? L('كل شيء', 'Everything') : u.role === 'supplier' ? L('يرى بضاعته ويسجّل ما باعه', 'Sees his goods, records what he sold') : L('يرى كل شيء ولا يغيّر شيئاً', 'Sees everything, changes nothing'))) + '</td>' +
            '<td class="act">' + (canTouch ? (u.role === 'staff' ? '<button type="button" class="icon-btn sm" data-wedit="' + u.id + '" title="' + L('تعديل الصلاحيات', 'Edit permissions') + '">' + icon('edit', 18) + '</button>' : '') + (u.role !== 'supplier' ? '<button type="button" class="icon-btn sm" data-wpass="' + u.id + '" title="' + L('كلمة مرور جديدة', 'New password') + '">' + icon('lock', 18) + '</button>' : '') + '<button type="button" class="icon-btn sm red" data-wdel="' + u.id + '">' + icon('trash', 18) + '</button>' : '') + (mine ? '<span class="small muted">' + L('أنت', 'you') + '</span>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      el.onclick = function (e) {
        var b, find = function (id) { return r.users.filter(function (u) { return u.id === +id; })[0]; };
        if (e.target.closest('#w-add')) return workerForm(null, el);
        if ((b = e.target.closest('[data-wedit]'))) return workerForm(find(b.getAttribute('data-wedit')), el);
        if ((b = e.target.closest('[data-wpass]'))) return passForm(find(b.getAttribute('data-wpass')));
        if ((b = e.target.closest('[data-wdel]'))) { var u = find(b.getAttribute('data-wdel')); C.confirmBox(L('حذف حساب «', 'Delete the account of "') + u.name + L('»؟ يخرج من النظام فوراً وتبقى سجلاته.', '"? Signed out at once; the records stay.'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.delUser(u.id).then(function () { workersHtml(el); }, function (er) { C.toast(C.errText(er), 'err'); }); }); }
      };
    }, function (e) { el.innerHTML = '<div class="note bad">' + esc(C.errText(e)) + '</div>'; });
  }
  function workerForm(u, el) {
    var m = C.modal({ title: u ? L('صلاحيات الموظف: ', 'Worker permissions: ') + esc(u.name) : L('موظف أو شريك جديد', 'New worker or partner'), size: 'lg',
      body: '<div class="col">' + (u ? '' : '<div class="seg" id="wf-role" style="align-self:flex-start"><button type="button" data-r="staff" class="on">' + icon('users', 16) + L('موظف بصلاحيات محددة', 'Worker with chosen permissions') + '</button><button type="button" data-r="admin">' + icon('star', 16) + L('شريك - مدير بصلاحية كاملة', 'Partner - admin with full control') + '</button></div>') +
        '<div class="grid g3"><div class="field"><label>' + L('الاسم', 'Name') + '</label><input class="input" id="wf-n" value="' + esc(u ? u.name : '') + '"></div>' +
        (u ? '' : '<div class="field span2"><label>' + L('كلمة المرور الخاصة به (8 خانات أو أكثر)', 'His own password (8+ characters)') + '</label><input class="input ltr" id="wf-p" type="text" autocomplete="off"><span class="hint">' + L('الموظف يدخل بكلمة المرور وحدها بلا اسم مستخدم، لذلك يجب أن تختلف عن كلمات مرور الحسابات الأخرى.', 'The worker signs in with the password alone (no username), so it must differ from every other account\'s password.') + '</span></div>') + '</div>' +
        '<div id="wf-permbox"><h4>' + L('ماذا يستطيع هذا الموظف؟', 'What may this worker do?') + '</h4><div id="wf-perms">' + permChecks(u ? u.perms : ['sell']) + '</div>' +
        '<p class="small muted">' + L('موظف بصلاحية «البيع» فقط: يصنع الفواتير ويحفظها ويطبعها ويرسلها، ويرى المنتجات والكميات، ولا يستطيع تعديل فاتورة محفوظة ولا الإعدادات ولا المخزون.', 'A worker with "Sell" only: makes, saves, prints and sends bills, sees products and quantities; cannot edit a saved bill, the settings or the stock.') + '</p></div>' +
        '<div id="wf-adminnote" class="note warn hide">' + icon('alert', 18) + '<span>' + L('الشريك المدير يستطيع كل ما تستطيعه أنت: الأسعار، الحذف، الإعدادات، الموظفون، النسخ الاحتياطي. لا يمكنه حذف حسابك أنت.', 'A partner admin can do everything you can: prices, deletions, settings, workers, backups. He cannot delete your account.') + '</span></div>' +
        '<p class="small muted">' + L('كل الموظفين يستطيعون رؤية المنتجات والكميات المتبقية والأسعار. بدون صلاحية «رؤية سعر الشراء» لا يظهر له سعر الشراء ولا الأرباح.', 'Every worker can see products, remaining quantities and selling prices. Without "see purchase prices" he sees no cost and no profit.') + '</p></div>',
      foot: '<button type="button" class="btn primary lg" id="wf-ok">' + icon('check') + L('حفظ', 'Save') + '</button>' });
    var q = function (s) { return m.el.querySelector(s); }, role = 'staff';
    if (q('#wf-role')) q('#wf-role').onclick = function (e) { var b = e.target.closest('[data-r]'); if (!b) return; role = b.getAttribute('data-r'); [].forEach.call(q('#wf-role').children, function (x) { x.classList.toggle('on', x === b); }); q('#wf-permbox').classList.toggle('hide', role === 'admin'); q('#wf-adminnote').classList.toggle('hide', role !== 'admin'); };
    q('#wf-ok').onclick = function () {
      var perms = [].map.call(m.el.querySelectorAll('#wf-perms input:checked'), function (i) { return i.value; }), name = q('#wf-n').value.trim();
      if (!name) return C.toast(L('اكتب اسم الموظف', "Type the worker's name"), 'warn');
      var job = u ? Store.updateUser({ id: u.id, name: name, perms: perms }) : Store.addUser({ name: name, username: '', password: q('#wf-p').value, perms: perms, role: role });
      C.busy(q('#wf-ok'), job).then(function () { m.close(); C.toast(L('تم الحفظ', 'Saved')); workersHtml(el); }, function () {});
    };
  }
  function passForm(u) {
    var self = !u;
    var m = C.modal({ title: self ? L('تغيير كلمة المرور', 'Change password') : L('كلمة مرور جديدة لـ ', 'New password for ') + esc(u.name), size: 'sm',
      body: '<div class="col">' + (self ? '<div class="field"><label>' + L('كلمة المرور الحالية', 'Current password') + '</label><input class="input ltr" id="pw-o" type="password" autocomplete="current-password"></div>' : '') +
        '<div class="field"><label>' + L('كلمة المرور الجديدة (8 خانات أو أكثر)', 'New password (8+ characters)') + '</label><input class="input ltr" id="pw-n" type="' + (self ? 'password' : 'text') + '" autocomplete="new-password"></div></div>',
      foot: '<button type="button" class="btn primary" id="pw-ok">' + L('حفظ', 'Save') + '</button>' });
    m.el.querySelector('#pw-ok').onclick = function () {
      var body = { password: m.el.querySelector('#pw-n').value };
      if (self) body.old = m.el.querySelector('#pw-o').value; else body.id = u.id;
      C.busy(m.el.querySelector('#pw-ok'), Store.setPassword(body)).then(function () { m.close(); C.toast(L('تم تغيير كلمة المرور', 'Password changed')); }, function () {});
    };
  }
  function logHtml(el) {
    el.innerHTML = '<div class="card"><p class="muted">' + L('جارٍ التحميل...', 'Loading...') + '</p></div>';
    Store.log().then(function (rows) {
      el.innerHTML = '<div class="card"><h3>' + icon('history') + L('سجل التعديلات', 'Change log') + '</h3><p class="small muted mb">' + L('كل تعديل أو حذف مهم يُسجَّل هنا تلقائياً مع اسم من قام به ووقته، ولا يمكن مسحه.', 'Every important change or deletion is written here automatically with who did it and when. It cannot be erased.') + '</p>' +
        (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الوقت', 'When') + '</th><th>' + L('المستخدم', 'User') + '</th><th>' + L('العملية', 'Action') + '</th><th>' + L('على', 'On') + '</th><th>' + L('التفاصيل', 'Details') + '</th></tr></thead><tbody>' +
          rows.map(function (r) { var t = LOGT[r.type] || [r.type, r.type]; return '<tr><td class="nowrap small">' + C.fts(r.ts) + '</td><td>' + esc(r.user) + '</td><td><span class="badge">' + L(t[0], t[1]) + '</span></td><td>' + esc(r.ref) + '</td><td class="small ltr">' + esc(r.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="muted">' + L('لا توجد تعديلات مسجلة بعد.', 'No changes recorded yet.') + '</p>') + '</div>';
    }, function (e) { el.innerHTML = '<div class="note bad">' + esc(C.errText(e)) + '</div>'; });
  }
  function storageHtml() {
    var noPhoto = S.products.filter(function (p) { return !p.img; }).length;
    return '<div class="rings mb">' + Media.ring('pos', L('صور المنتجات - نظام البيع', 'Product photos - point of sale')) + (S.features.website ? Media.ring('site', L('صور الموقع الإلكتروني', 'Website photos')) : '') + '</div>' +
      '<div class="card"><h3>' + icon('image') + L('كيف تعمل مساحة الصور؟', 'How does photo storage work?') + '</h3><ul style="padding-inline-start:20px;line-height:2">' +
      '<li>' + L('كل صورة تُصغَّر تلقائياً قبل الرفع (صورة الجوال 4-8 ميجابايت تصبح 40-110 كيلوبايت) حتى يبقى النظام سريعاً.', 'Every photo is shrunk automatically before upload (a 4-8 MB phone photo becomes 40-110 KB) so the system stays fast.') + '</li>' +
      '<li>' + L('لكل نظام مساحته: صور المنتجات لها حدّها، وصور الموقع لها حدّها.', 'Each side has its own room: product photos have their limit, website photos have theirs.') + '</li>' +
      '<li>' + L('عند امتلاء المساحة يرفض النظام الصور الجديدة فقط. يمكنك دائماً إضافة منتجات بدون صورة.', 'When the room is full the system refuses new photos only. You can always add products without a photo.') + '</li>' +
      '<li>' + L('لتفريغ مساحة: احذف المنتجات التي لا تحتاجها، أو أزل صورها من «تعديل المنتج».', 'To free room: delete products you no longer need, or remove their photos in "Edit product".') + '</li></ul>' +
      '<p class="mt">' + L('منتجات بدون صورة: ', 'Products without a photo: ') + '<b>' + noPhoto + '</b> ' + L('من ', 'of ') + S.products.length + '</p></div>';
  }
  function subCard() {
    var sub = window.SUBSCRIPTION || {}, end = sub.end ? new Date(sub.end) : null, start = sub.start ? new Date(sub.start) : null;
    if (!end) return '';
    var days = Math.ceil((end - new Date()) / 86400000), total = start ? Math.max(1, (end - start) / 86400000) : 365, pct = Math.max(0, Math.min(100, 100 - days / total * 100));
    return '<div class="card mb"><h3>' + icon('clock') + L('الاشتراك - الباقة الرابعة (نقاط بيع + موقع)', 'Subscription - Plan 4 (point of sale + website)') + '</h3><div class="row between wrap"><div><b style="font-size:26px;color:' + (days < 30 ? 'var(--red)' : 'var(--g700)') + '">' + (days >= 0 ? days : 0) + '</b> ' + L('يوماً متبقياً', 'days left') + '</div>' +
      '<div class="small muted">' + L('من ', 'From ') + (start ? C.fdate(C.ymd(start)) : '') + L(' إلى ', ' to ') + C.fdate(C.ymd(end)) + '</div></div><div class="bar mt"><i style="width:' + pct + '%"></i></div>' +
      (days < 30 ? '<p class="ring-msg mt">' + L('الاشتراك قارب على الانتهاء. تواصل مع عُمان فلك للتجديد.', 'The subscription is about to end. Contact Oman Falak to renew.') + '</p>' : '') + '</div>';
  }
  function dataHtml(el) {
    el.innerHTML = subCard() + '<div class="card mb" id="d-health"><h3>' + icon('lock') + L('أين تُحفظ بياناتك؟', 'Where is your data kept?') + '</h3><p class="muted">' + L('جارٍ الفحص...', 'Checking...') + '</p></div>' +
      '<div class="card"><h3>' + icon('download') + L('النسخة الاحتياطية', 'Backup') + '</h3><p class="small muted mb">' + L('نزّل نسخة من كل بياناتك (منتجات، فواتير، عملاء، مشتريات، مصروفات) واحتفظ بها. السيرفر يحفظ أيضاً نسخة يومية لآخر 30 يوماً. الصور لا تدخل في هذا الملف.', 'Download a copy of all your data (products, bills, customers, purchases, expenses) and keep it. The server also keeps a daily copy for the last 30 days. Photos are not inside this file.') + '</p>' +
      '<div class="row wrap"><button type="button" class="btn primary" id="d-backup">' + icon('download') + L('تنزيل نسخة احتياطية', 'Download backup') + '</button>' + (Store.isAdmin() ? '<button type="button" class="btn ghost" id="d-restore">' + L('استرجاع من ملف', 'Restore from file') + '</button>' : '') + '</div></div>';
    Store.health().then(function (h) {
      var safe = h.kind === 'outside' || h.kind === 'custom';
      el.querySelector('#d-health').innerHTML = '<h3>' + icon('lock') + L('أين تُحفظ بياناتك؟', 'Where is your data kept?') + '</h3>' +
        '<div class="note ' + (h.kind === 'browser' ? 'warn' : safe ? 'ok' : 'warn') + ' mb">' + icon(safe ? 'check' : 'alert', 18) + '<span>' + (h.kind === 'browser' ? L('نسخة تعمل داخل المتصفح فقط (تجريبية / محلية).', 'A browser-only copy (demo / local).') : safe ? L('مجلد آمن خارج الموقع: لا يتأثر بالتحديثات ولا بتغيير الدومين.', 'Safe folder outside the website: untouched by updates or a change of domain.') : L('داخل مجلد الموقع (محمي). يُفضَّل المجلد الآمن خارج الموقع.', 'Inside the website folder (protected). The safe folder outside the website is preferred.')) + '</span></div>' +
        '<dl class="kv"><dt>' + L('يمكن الحفظ', 'Can save') + '</dt><dd>' + (h.writable ? L('نعم', 'Yes') : L('لا!', 'No!')) + '</dd><dt>' + L('حفظ الصور', 'Photos can be saved') + '</dt><dd>' + (h.media_writable ? L('نعم', 'Yes') : L('لا!', 'No!')) + '</dd><dt>' + L('حجم قاعدة البيانات', 'Database size') + '</dt><dd class="ltr">' + C.bytes(h.db_bytes) + '</dd><dt>' + L('الفواتير / المنتجات', 'Bills / products') + '</dt><dd>' + h.invoices + ' / ' + h.products + '</dd>' +
        '<dt>' + L('النسخ اليومية المحفوظة', 'Daily copies kept') + '</dt><dd>' + h.backups + (h.last_backup ? ' (' + L('آخرها ', 'last ') + C.fdate(h.last_backup) + ')' : '') + '</dd><dt>PHP / SQLite</dt><dd class="ltr">' + esc(h.php) + ' / ' + esc(h.sqlite) + '</dd></dl>';
    }, function (e) { el.querySelector('#d-health').insertAdjacentHTML('beforeend', '<div class="note bad">' + esc(C.errText(e)) + '</div>'); });
    el.onclick = function (e) {
      if (e.target.closest('#d-backup')) {
        var blob = new Blob([JSON.stringify(Store.exportAll())], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'abraj-alsumud-backup-' + C.today() + '.json'; document.body.appendChild(a); a.click(); a.remove();
      }
      if (e.target.closest('#d-restore')) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          var fr = new FileReader();
          fr.onload = function () {
            var data; try { data = JSON.parse(String(fr.result)); } catch (x) { return C.toast(C.errText({ code: 'bad_backup' }), 'err'); }
            C.confirmBox(L('استرجاع هذه النسخة سيستبدل كل البيانات الحالية (منتجات، فواتير، عملاء...). هل أنت متأكد؟', 'Restoring this copy replaces ALL current data (products, bills, customers...). Are you sure?'), L('استرجاع', 'Restore'), true).then(function (y) {
              if (y) Store.restore(data).then(function () { C.toast(L('تم الاسترجاع', 'Restored')); Shell.refresh(); }, function (er) { C.toast(C.errText(er), 'err'); });
            });
          };
          fr.readAsText(f);
        };
        inp.click();
      }
    };
  }
  function meHtml() {
    return '<div class="card"><h3>' + icon('users') + esc(S.user.name) + '</h3><dl class="kv mb" style="max-width:420px"><dt>' + L('الدور', 'Role') + '</dt><dd>' + (Store.isAdmin() ? L('صاحب المحل', 'Owner') : Store.isViewer() ? L('دعم - عرض فقط', 'Support - view only') : L('موظف', 'Worker')) + '</dd></dl>' +
      '<div class="row wrap">' + (Store.isViewer() || Store.demo ? '' : '<button type="button" class="btn primary" id="me-pass">' + icon('lock') + L('تغيير كلمة المرور', 'Change password') + '</button>') +
      '<button type="button" class="btn ghost" id="me-lang">' + icon('globe') + L('English', 'العربية') + '</button></div></div>';
  }

  function draw() {
    var ts = tabs();
    if (!ts.some(function (t) { return t[0] === tab; })) tab = ts[0][0];
    root.innerHTML = '<div class="tabs">' + ts.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="st-body"></div>';
    var el = root.querySelector('#st-body');
    if (tab === 'shop') el.innerHTML = shopHtml();
    else if (tab === 'bills') el.innerHTML = billsHtml();
    else if (tab === 'lists') el.innerHTML = listsHtml();
    else if (tab === 'workers') workersHtml(el);
    else if (tab === 'log') logHtml(el);
    else if (tab === 'storage') el.innerHTML = storageHtml();
    else if (tab === 'data') dataHtml(el);
    else el.innerHTML = meHtml();
    if (!Store.isAdmin()) [].forEach.call(el.querySelectorAll('form input, form select, form textarea'), function (i) { i.disabled = true; });
  }
  function readList(sel, attr, keys) {
    return [].map.call(root.querySelectorAll(sel + ' [' + attr + ']'), function (row) { var o = {}; keys.forEach(function (k) { o[k] = row.querySelector('[data-k="' + k + '"]').value.trim(); }); return o; });
  }
  function bind() {
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-tab]'))) { tab = b.getAttribute('data-tab'); draw(); return; }
      if (e.target.closest('#st-logo')) { Shell.pickPhoto(false).then(function (f) { if (!f) return; Media.upload(f, 'pos', 'logo').then(function (id) { return Store.saveSettings({ logo: id }); }).then(function () { C.toast(L('تم حفظ الشعار', 'Logo saved')); draw(); }, function (er) { C.toast(C.errText(er), 'err'); }); }); return; }
      if (e.target.closest('#st-logo-rm')) { Store.saveSettings({ logo: '' }).then(draw, function (er) { C.toast(C.errText(er), 'err'); }); return; }
      if (e.target.closest('#l-cadd')) { S.settings.cats = readCats().concat([{ id: 'c' + C.uid().slice(0, 6), ar: '', en: '', c: '#12805e' }]); draw(); return; }
      if ((b = e.target.closest('[data-crm]')) && !b.disabled) { var cs = readCats(); cs.splice(+b.getAttribute('data-crm'), 1); S.settings.cats = cs; draw(); return; }
      if ((b = e.target.closest('#l-csave'))) { var cats = readCats().filter(function (c) { return c.ar; }); C.busy(b, Store.saveSettings({ cats: cats })).then(function () { C.toast(L('تم الحفظ', 'Saved')); draw(); }, function () {}); return; }
      if (e.target.closest('#l-uadd')) { S.settings.units = readUnits().concat([{ n: '', e: '', f: 1 }]); draw(); return; }
      if ((b = e.target.closest('[data-urm]'))) { var us = readUnits(); us.splice(+b.getAttribute('data-urm'), 1); S.settings.units = us; draw(); return; }
      if ((b = e.target.closest('#l-usave'))) { C.busy(b, Store.saveSettings({ units: readUnits().filter(function (u) { return u.n; }) })).then(function () { C.toast(L('تم الحفظ', 'Saved')); draw(); }, function () {}); return; }
      if (e.target.closest('#me-pass')) { passForm(null); return; }
      if (e.target.closest('#me-lang')) C.setLang(C.lang === 'ar' ? 'en' : 'ar');
    });
    root.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, kind = f.getAttribute('data-form'), patch = {};
      [].forEach.call(f.elements, function (i) { if (!i.name) return; patch[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
      if (kind === 'bills') { patch.vatPct = num(patch.vatPct); patch.prefix = (patch.prefix || 'INV').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'INV'; if (patch.vatOn && !patch.vatNo) return C.toast(L('اكتب الرقم الضريبي', 'Type the VAT number'), 'warn'); }
      if (kind === 'exp') patch = { expCats: patch.expCats.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) };
      C.busy(f.querySelector('button.primary'), Store.saveSettings(patch)).then(function () { C.toast(L('تم الحفظ', 'Saved')); if (kind === 'shop') location.reload(); }, function () {});
    });
  }
  function readCats() { var old = S.settings.cats; return readList('#l-cats', 'data-ci', ['c', 'ar', 'en']).map(function (c, i) { return { id: old[i] ? old[i].id : 'c' + C.uid().slice(0, 6), ar: c.ar, en: c.en, c: c.c }; }); }
  function readUnits() { return readList('#l-units', 'data-ui', ['n', 'e', 'f']).map(function (u) { return { n: u.n, e: u.e, f: num(u.f) || 1 }; }); }

  Shell.page('settings', {
    title: function () { return L('الإعدادات', 'Settings'); },
    render: function (el, arg) { if (arg && arg.tab) tab = arg.tab; root = document.createElement('div'); el.appendChild(root); bind(); draw(); }
  });
})();
