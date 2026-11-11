/* admin/app.js - the website control panel (yourdomain/admin, same account as the point of sale).
   Pages: home (numbers + photo storage), site content (every text and picture of every section, Arabic and English),
   posts, extra sections, which products appear on the site, messages from visitors, subscribers, site settings. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, S = Store.s, P = C.Prod, ROOT = window.ROOT || '';
  var can = function () { return Store.can('site'); };
  var site = function () { return SiteDefaults.merge(S.site); };

  /* ------------------------------------------------ small form pieces */
  /* an Arabic + English pair of inputs */
  function bi(label, name, ar, en, area) {
    var tag = function (lang, val, ph) { return area ? '<textarea class="input' + (lang === 'en' ? ' ltr' : '') + '" name="' + name + lang + '" rows="' + area + '" placeholder="' + ph + '">' + esc(val || '') + '</textarea>' : '<input class="input' + (lang === 'en' ? ' ltr' : '') + '" name="' + name + lang + '" value="' + esc(val || '') + '" placeholder="' + ph + '">'; };
    return '<div class="grid g2"><div class="field"><label>' + label + ' - ' + L('عربي', 'Arabic') + '</label>' + tag('Ar', ar, 'عربي') + '</div><div class="field"><label>' + label + ' - English</label>' + tag('En', en, 'English') + '</div></div>';
  }
  /* photos of a post / section: list with remove buttons and an "add" tile. state = { imgs: [...], fresh: [...] } */
  function imgList(state, max) {
    return '<div class="img-list" data-imgs>' + state.imgs.map(function (id, i) { return '<div class="im"><img alt="" src="' + esc(Media.url(id, true)) + '"><button type="button" data-imrm="' + i + '" aria-label="remove">' + icon('x', 14) + '</button></div>'; }).join('') +
      (state.imgs.length < (max || 8) ? '<button type="button" class="add" data-imadd title="' + L('إضافة صورة', 'Add a photo') + '">' + icon('camera', 26) + '</button>' : '') + '</div>';
  }
  function bindImgs(el, state, preset, max) {
    el.addEventListener('click', function (e) {
      var b, box = el.querySelector('[data-imgs]');
      var redraw = function () { box.outerHTML = imgList(state, max); };
      if ((b = e.target.closest('[data-imrm]'))) {
        var id = state.imgs.splice(+b.getAttribute('data-imrm'), 1)[0];
        if (state.fresh.indexOf(id) >= 0) { Media.del([id]); state.fresh.splice(state.fresh.indexOf(id), 1); }
        redraw(); return;
      }
      if (e.target.closest('[data-imadd]')) {
        Shell.pickPhoto(false).then(function (f) {
          if (!f) return;
          C.toast(L('جارٍ تصغير الصورة ورفعها...', 'Shrinking and uploading the photo...'), 'ok', 1500);
          Media.upload(f, 'site', preset || 'post').then(function (id) {
            state.imgs.push(id); state.fresh.push(id); redraw();
            var i = Media.info || {}; C.toast(L('تم رفع الصورة: ', 'Photo uploaded: ') + C.bytes(i.before) + ' → ' + C.bytes(i.after));
          }, function (er) { C.toast(C.errText(er), 'err'); });
        });
      }
    });
  }
  var saveRow = function (label) { return can() ? '<div class="row mt" style="justify-content:flex-end"><button class="btn primary lg">' + icon('check') + (label || L('حفظ ونشر', 'Save & publish')) + '</button></div>' : ''; };
  function page(id, title, render) {
    Shell.page(id, { title: function () { return title; }, render: function (el, arg) { var root = document.createElement('div'); el.appendChild(root); render(root, arg); } });
  }

  /* ================================================== home */
  page('home', L('لوحة تحكم الموقع', 'Website panel'), function (root) {
    var onSite = S.products.filter(function (p) { return p.site; }).length;
    root.innerHTML = '<div class="stats mb"><button type="button" class="stat" data-go="messages" style="text-align:start"><span>' + icon('msg', 16) + L('رسائل جديدة', 'New messages') + '</span><b style="color:' + (S.unread ? 'var(--red)' : 'inherit') + '">' + S.unread + '</b><small>' + L('من ', 'of ') + S.messages.length + '</small></button>' +
      '<button type="button" class="stat" data-go="subscribers" style="text-align:start"><span>' + icon('users', 16) + L('المشتركون', 'Subscribers') + '</span><b>' + S.subscribers.length + '</b></button>' +
      '<button type="button" class="stat" data-go="posts" style="text-align:start"><span>' + icon('file', 16) + L('المنشورات', 'Posts') + '</span><b>' + S.posts.length + '</b></button>' +
      '<button type="button" class="stat" data-go="catalog" style="text-align:start"><span>' + icon('box', 16) + L('منتجات معروضة في الموقع', 'Products on the site') + '</span><b>' + onSite + '</b><small>' + L('من ', 'of ') + S.products.length + '</small></button></div>' +
      '<h3 class="mb">' + L('مساحة الصور المستخدمة', 'Photo storage used') + '</h3><div class="rings mb">' + Media.ring('site', L('صور الموقع الإلكتروني', 'Website photos')) + Media.ring('pos', L('صور المنتجات - نظام البيع', 'Product photos - point of sale')) + '</div>' +
      '<div class="note mb">' + icon('image', 18) + '<span>' + L('كل صورة تُصغَّر تلقائياً قبل الرفع ليبقى الموقع سريعاً. عند امتلاء مساحة الموقع يمكنك النشر بدون صور، أو حذف منشورات قديمة لتفريغ مساحة.', 'Every photo is shrunk automatically before upload so the site stays fast. When the website room is full you can still publish without photos, or delete old posts to free room.') + '</span></div>' +
      '<div class="card"><h3>' + icon('star') + L('ماذا تريد أن تفعل؟', 'What would you like to do?') + '</h3><div class="row wrap">' +
      '<button type="button" class="btn primary" data-go="posts">' + icon('plus') + L('نشر منشور أو عرض جديد', 'Publish a post or offer') + '</button><button type="button" class="btn soft" data-go="content">' + icon('edit') + L('تعديل نصوص وصور الموقع', 'Edit site texts & pictures') + '</button>' +
      '<button type="button" class="btn soft" data-go="sections">' + icon('grid') + L('إضافة قسم جديد', 'Add a new section') + '</button><button type="button" class="btn soft" data-go="catalog">' + icon('box') + L('اختيار المنتجات المعروضة', 'Choose products shown') + '</button>' +
      '<a class="btn ghost" href="' + ROOT + 'index.html" target="_blank" rel="noopener">' + icon('eye') + L('عرض الموقع', 'View the website') + '</a></div></div>';
  });

  /* ================================================== site content */
  page('content', L('محتوى الموقع', 'Site content'), function (root) {
    var s = site(), hero = { imgs: s.hero.img ? [s.hero.img] : [], fresh: [] }, about = { imgs: s.about.img ? [s.about.img] : [], fresh: [] };
    var sw = function (key, label) { return '<label class="switch"><input type="checkbox" name="show_' + key + '"' + (s.show[key] ? ' checked' : '') + '><i></i><span>' + label + '</span></label>'; };
    root.innerHTML = '<form id="cf" class="col">' +
      '<div class="note">' + icon('edit', 18) + '<span>' + L('كل نص وصورة في الموقع يمكن تغييره من هنا، بالعربية والإنجليزية. اترك الخانة الإنجليزية فارغة ليظهر النص العربي في النسختين.', 'Every text and picture on the site can be changed here, in Arabic and English. Leave the English box empty to show the Arabic text in both versions.') + '</span></div>' +
      '<div class="section-block"><h4>' + icon('home', 18) + L('الواجهة الرئيسية (أعلى الصفحة)', 'Main banner (top of the page)') + '</h4><div class="col">' + bi(L('العنوان الكبير', 'Big title'), 'heroTitle', s.hero.titleAr, s.hero.titleEn) + bi(L('النص تحت العنوان', 'Text under the title'), 'heroText', s.hero.textAr, s.hero.textEn, 3) +
      '<div class="field"><label>' + L('صورة الواجهة (اختياري)', 'Banner picture (optional)') + '</label><div id="c-hero">' + imgList(hero, 1) + '</div></div></div></div>' +
      '<div class="section-block"><h4>' + icon('leaf', 18) + L('قسم «من نحن»', '"About us" section') + ' ' + sw('about', L('ظاهر', 'Shown')) + '</h4><div class="col">' + bi(L('العنوان', 'Title'), 'aboutTitle', s.about.titleAr, s.about.titleEn) + bi(L('النص', 'Text'), 'aboutText', s.about.textAr, s.about.textEn, 5) +
      '<div class="field"><label>' + L('صورة القسم (اختياري)', 'Section picture (optional)') + '</label><div id="c-about">' + imgList(about, 1) + '</div></div></div></div>' +
      '<div class="section-block"><h4>' + icon('star', 18) + L('مميزاتنا (4 بطاقات)', 'Why us (4 cards)') + ' ' + sw('features', L('ظاهر', 'Shown')) + '</h4><div class="col">' +
      [0, 1, 2, 3].map(function (i) { var f = s.features[i] || {}; return '<div class="card flat" style="padding:10px"><b class="small muted">' + L('البطاقة ', 'Card ') + (i + 1) + '</b>' + bi(L('العنوان', 'Title'), 'f' + i + 't', f.ar, f.en) + '<div class="mt"></div>' + bi(L('الوصف', 'Description'), 'f' + i + 'd', f.dAr, f.dEn) + '</div>'; }).join('') + '</div></div>' +
      '<div class="section-block"><h4>' + icon('box', 18) + L('قسم المنتجات', 'Products section') + ' ' + sw('products', L('ظاهر', 'Shown')) + ' ' + sw('cats', L('إظهار شريط التصنيفات', 'Show category bar')) + '</h4>' + bi(L('عنوان القسم', 'Section title'), 'tProducts', s.titles.products.ar, s.titles.products.en) + '</div>' +
      '<div class="section-block"><h4>' + icon('file', 18) + L('قسم المنشورات والعروض', 'Posts & offers section') + ' ' + sw('posts', L('ظاهر', 'Shown')) + '</h4>' + bi(L('عنوان القسم', 'Section title'), 'tPosts', s.titles.posts.ar, s.titles.posts.en) + '</div>' +
      '<div class="section-block"><h4>' + icon('mail', 18) + L('قسم الاشتراك', 'Subscribe section') + ' ' + sw('subscribe', L('ظاهر', 'Shown')) + '</h4><div class="col">' + bi(L('العنوان', 'Title'), 'tSub', s.titles.subscribe.ar, s.titles.subscribe.en) + bi(L('النص', 'Text'), 'tSubT', s.titles.subscribe.tAr, s.titles.subscribe.tEn, 2) + '</div></div>' +
      '<div class="section-block"><h4>' + icon('phone', 18) + L('قسم «تواصل معنا»', '"Contact us" section') + ' ' + sw('contact', L('ظاهر', 'Shown')) + '</h4><div class="col">' + bi(L('العنوان', 'Title'), 'tContact', s.titles.contact.ar, s.titles.contact.en) +
      '<p class="small muted">' + L('الهاتف والعنوان وواتساب وإنستغرام وأوقات العمل تؤخذ من «الإعدادات ← بيانات المحل» في نظام البيع.', 'Phone, address, WhatsApp, Instagram and opening hours come from "Settings → Shop details" in the point of sale.') + '</p>' + bi(L('سطر أسفل الموقع (اختياري)', 'Footer line (optional)'), 'footer', s.footerAr, s.footerEn) + '</div></div>' +
      saveRow() + '</form>';
    bindImgs(root.querySelector('#c-hero'), hero, 'banner', 1); bindImgs(root.querySelector('#c-about'), about, 'post', 1);
    var f = root.querySelector('#cf');
    if (!can()) [].forEach.call(f.elements, function (i) { i.disabled = true; });
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = function (n) { return f[n].value.trim(); }, cur = site();
      var doc = Object.assign({}, cur, {
        hero: { titleAr: v('heroTitleAr'), titleEn: v('heroTitleEn'), textAr: v('heroTextAr'), textEn: v('heroTextEn'), img: hero.imgs[0] || '' },
        about: { titleAr: v('aboutTitleAr'), titleEn: v('aboutTitleEn'), textAr: v('aboutTextAr'), textEn: v('aboutTextEn'), img: about.imgs[0] || '' },
        features: [0, 1, 2, 3].map(function (i) { return { ar: v('f' + i + 'tAr'), en: v('f' + i + 'tEn'), dAr: v('f' + i + 'dAr'), dEn: v('f' + i + 'dEn') }; }),
        titles: { products: { ar: v('tProductsAr'), en: v('tProductsEn') }, posts: { ar: v('tPostsAr'), en: v('tPostsEn') }, subscribe: { ar: v('tSubAr'), en: v('tSubEn'), tAr: v('tSubTAr'), tEn: v('tSubTEn') }, contact: { ar: v('tContactAr'), en: v('tContactEn') } },
        footerAr: v('footerAr'), footerEn: v('footerEn'), show: {}
      });
      ['cats', 'products', 'about', 'features', 'posts', 'subscribe', 'contact'].forEach(function (k) { doc.show[k] = f['show_' + k].checked; });
      C.busy(f.querySelector('button.primary'), Store.saveSite(doc)).then(function () { hero.fresh = []; about.fresh = []; C.toast(L('تم الحفظ والنشر في الموقع', 'Saved and published on the site')); }, function () {});
    };
  });

  /* ================================================== posts + extra sections (same editor) */
  function itemForm(kind, item, done) {
    var isPost = kind === 'post', st = { imgs: (item && item.imgs ? item.imgs.slice() : []), fresh: [] }, saved = false;
    var m = C.modal({ title: item ? L('تعديل', 'Edit') : (isPost ? L('منشور جديد', 'New post') : L('قسم جديد', 'New section')), size: 'lg', sticky: true,
      onClose: function () { if (!saved && st.fresh.length) Media.del(st.fresh); },
      body: '<form id="pf2" class="col">' + bi(L('العنوان', 'Title'), 'title', item && item.titleAr, item && item.titleEn) + bi(L('النص', 'Text'), 'text', item && item.textAr, item && item.textEn, 6) +
        '<div class="field"><label>' + L('الصور (حتى 8)', 'Photos (up to 8)') + '</label><div id="p-imgs">' + imgList(st, 8) + '</div><span class="hint">' + L('تُصغَّر كل صورة تلقائياً قبل الرفع.', 'Each photo is shrunk automatically before upload.') + '</span></div>' +
        (isPost ? '<div class="grid g2"><div class="field"><label>' + L('السعر أو العرض (اختياري)', 'Price or offer (optional)') + '</label><input class="input" name="tag" maxlength="60" value="' + esc(item ? item.tag || '' : '') + '" placeholder="' + L('مثال: 3 ريال للكرتون', 'e.g. OMR 3 per carton') + '"></div><div class="field" style="justify-content:flex-end"><label class="switch"><input type="checkbox" name="pinned"' + (item && item.pinned ? ' checked' : '') + '><i></i><span>' + L('تثبيت في أول القائمة', 'Pin to the top') + '</span></label></div></div>'
          : '<div class="grid g2"><div class="field"><label>' + L('الترتيب في الصفحة', 'Order on the page') + '</label><input class="input num" name="order" inputmode="numeric" value="' + (item ? item.order || 0 : S.sections.length + 1) + '"></div><div class="field"><label>' + L('شكل القسم', 'Section layout') + '</label><select class="input" name="layout"><option value="side">' + L('نص بجانب صورة', 'Text beside a picture') + '</option><option value="gallery"' + (item && item.layout === 'gallery' ? ' selected' : '') + '>' + L('نص ثم معرض صور', 'Text, then a photo gallery') + '</option></select></div></div>') +
        '<label class="switch"><input type="checkbox" name="hidden"' + (item && item.hidden ? ' checked' : '') + '><i></i><span>' + L('إخفاء من الموقع (مسودة)', 'Hide from the site (draft)') + '</span></label></form>',
      foot: '<button type="button" class="btn ghost" id="p-x">' + L('إلغاء', 'Cancel') + '</button><button type="button" class="btn primary lg" id="p-ok">' + icon('check') + L('حفظ ونشر', 'Save & publish') + '</button>' });
    var f = m.el.querySelector('#pf2');
    bindImgs(m.el.querySelector('#p-imgs'), st, 'post', 8);
    m.el.querySelector('#p-x').onclick = function () { m.close(); };
    m.el.querySelector('#p-ok').onclick = function () {
      var doc = Object.assign({}, item || {}, { id: item ? item.id : C.uid(), titleAr: f.titleAr.value.trim(), titleEn: f.titleEn.value.trim(), textAr: f.textAr.value.trim(), textEn: f.textEn.value.trim(), imgs: st.imgs, hidden: f.hidden.checked });
      if (!doc.titleAr && !doc.textAr && !doc.imgs.length) return C.toast(L('اكتب عنواناً أو نصاً أو أضف صورة', 'Type a title or text, or add a photo'), 'warn');
      if (isPost) { doc.tag = f.tag.value.trim(); doc.pinned = f.pinned.checked; if (!item) { doc.ts = Math.floor(Date.now() / 1000); doc.by = S.user.name; } }
      else { doc.order = C.num(f.order.value); doc.layout = f.layout.value; }
      C.busy(m.el.querySelector('#p-ok'), isPost ? Store.savePost(doc) : Store.saveSection(doc)).then(function () { saved = true; m.close(); C.toast(L('تم النشر', 'Published')); done(); }, function () {});
    };
  }
  function itemsPage(kind) {
    var isPost = kind === 'post';
    return function (root) {
      function draw() {
        var list = (isPost ? S.posts : S.sections).slice().sort(function (a, b) { return isPost ? ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.ts || 0) - (a.ts || 0) : (a.order || 0) - (b.order || 0); });
        root.innerHTML = '<div class="view-head"><h2>' + (isPost ? L('المنشورات والعروض', 'Posts & offers') : L('أقسام إضافية في الموقع', 'Extra site sections')) + '</h2>' + (can() ? '<button type="button" class="btn primary lg" id="it-new">' + icon('plus') + (isPost ? L('منشور جديد', 'New post') : L('قسم جديد', 'New section')) + '</button>' : '') + '</div>' +
          '<p class="muted small mb">' + (isPost ? L('انشر عروضك ومنتجاتك الجديدة بالصور والنص. تظهر في قسم «جديدنا وعروضنا» في الموقع، الأحدث أولاً.', 'Publish your offers and new products with photos and text. They appear in the "News & offers" section, newest first.') : L('أضف أي قسم تريده في الصفحة الرئيسية: خدمة، ماركة توزعها، معرض صور، سياسة التوصيل... بعنوان ونص وصور.', 'Add any section you want on the home page: a service, a brand you distribute, a gallery, delivery policy... with a title, text and photos.')) + '</p>' +
          '<div class="mb">' + Media.ring('site', L('مساحة صور الموقع', 'Website photo storage'), { small: true }) + '</div>' +
          (list.length ? '<div class="col">' + list.map(function (p) {
            return '<div class="post-row">' + (p.imgs && p.imgs[0] ? '<img class="pic" alt="" src="' + esc(Media.url(p.imgs[0], true)) + '">' : '<span class="pic noimg" style="display:grid;--tile:#12805e">' + icon(isPost ? 'file' : 'grid', 30) + '</span>') +
              '<div class="grow"><b>' + esc(p.titleAr || p.titleEn || L('(بدون عنوان)', '(no title)')) + '</b> ' + (p.hidden ? '<span class="badge warn">' + L('مخفي', 'Hidden') + '</span>' : '<span class="badge ok">' + L('منشور', 'Published') + '</span>') + (p.pinned ? ' <span class="badge info">' + L('مثبّت', 'Pinned') + '</span>' : '') + (p.tag ? ' <span class="badge">' + esc(p.tag) + '</span>' : '') +
              '<p class="small muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(p.textAr || p.textEn || '') + '</p><span class="small muted">' + (isPost ? C.fts(p.ts) + (p.by ? ' · ' + esc(p.by) : '') : L('الترتيب: ', 'Order: ') + (p.order || 0)) + ' · ' + (p.imgs ? p.imgs.length : 0) + ' ' + L('صور', 'photos') + '</span></div>' +
              (can() ? '<div class="col" style="gap:4px"><button type="button" class="icon-btn" data-edit="' + esc(p.id) + '">' + icon('edit') + '</button><button type="button" class="icon-btn red" data-del="' + esc(p.id) + '">' + icon('trash') + '</button></div>' : '') + '</div>';
          }).join('') + '</div>' : '<div class="card empty">' + icon(isPost ? 'file' : 'grid', 44) + '<p>' + (isPost ? L('لا توجد منشورات بعد', 'No posts yet') : L('لا توجد أقسام إضافية بعد', 'No extra sections yet')) + '</p></div>');
      }
      draw();
      root.addEventListener('click', function (e) {
        var b, list = isPost ? S.posts : S.sections;
        if (e.target.closest('#it-new')) return itemForm(kind, null, draw);
        if ((b = e.target.closest('[data-edit]'))) return itemForm(kind, Store.byId(list, b.getAttribute('data-edit')), draw);
        if ((b = e.target.closest('[data-del]'))) { var id = b.getAttribute('data-del'); C.confirmBox(L('حذف نهائي مع صوره؟', 'Delete for good, with its photos?'), L('حذف', 'Delete'), true).then(function (y) { if (y) (isPost ? Store.removePost(id) : Store.removeSection(id)).then(draw, function (er) { C.toast(C.errText(er), 'err'); }); }); }
      });
    };
  }
  page('posts', L('المنشورات', 'Posts'), itemsPage('post'));
  page('sections', L('أقسام إضافية', 'Extra sections'), itemsPage('section'));

  /* ================================================== products shown on the site */
  page('catalog', L('منتجات الموقع', 'Site products'), function (root) {
    var q = '';
    function rows() {
      var n = C.norm(q), list = S.products.filter(function (p) { return !n || C.norm(p.name + ' ' + (p.nameEn || '')).indexOf(n) >= 0; }).sort(function (a, b) { return (b.site ? 1 : 0) - (a.site ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'ar'); });
      if (!S.products.length) return '<div class="card empty">' + icon('box', 44) + '<p>' + L('لا توجد منتجات. أضفها من «المخزون» في نظام البيع ثم اختر ما يظهر هنا.', 'No products. Add them under "Stock" in the point of sale, then choose here what appears.') + '</p></div>';
      return '<div class="col" style="gap:8px">' + list.map(function (p) {
        var su = P.saleUnits(p, 'retail')[0];
        return '<div class="post-row" style="align-items:center">' + Media.thumb(p.img, P.name(p), C.catOf(S.settings, p.cat).c, 'thumb lg') + '<div class="grow"><b>' + esc(p.name) + '</b><div class="small muted">' + esc(C.catName(C.catOf(S.settings, p.cat))) + (su ? ' · ' + C.f3(su.price) + ' / ' + esc(P.unitName(su.u)) : '') + (p.img ? '' : ' · <span style="color:var(--amber-ink)">' + L('بدون صورة', 'no photo') + '</span>') + '</div>' +
          (p.desc ? '<div class="small" style="display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">' + esc(p.desc) + '</div>' : '') + '</div>' +
          (can() ? '<button type="button" class="icon-btn" data-desc="' + esc(p.id) + '" title="' + L('وصف المنتج في الموقع', 'Site description') + '">' + icon('edit') + '</button>' : '') +
          '<label class="switch"><input type="checkbox" data-site="' + esc(p.id) + '"' + (p.site ? ' checked' : '') + (can() ? '' : ' disabled') + '><i></i></label></div>';
      }).join('') + '</div>';
    }
    function draw() {
      var s = site();
      root.innerHTML = '<div class="card mb"><div class="row wrap"><label class="switch"><input type="checkbox" id="cg-price"' + (s.showPrices ? ' checked' : '') + (can() ? '' : ' disabled') + '><i></i><span>' + L('إظهار أسعار التجزئة في الموقع', 'Show retail prices on the site') + '</span></label>' +
        '<label class="switch"><input type="checkbox" id="cg-stock"' + (s.showStock ? ' checked' : '') + (can() ? '' : ' disabled') + '><i></i><span>' + L('إظهار «غير متوفر حالياً» للمنتج النافد', 'Show "currently unavailable" on sold-out products') + '</span></label></div>' +
        '<p class="small muted mt">' + L('أسعار الجملة وسعر الشراء لا تظهر في الموقع أبداً؛ تظهر فقط عبارة «أسعار خاصة للجملة».', 'Wholesale and purchase prices never appear on the site; only the words "special wholesale prices".') + '</p></div>' +
        '<div class="toolbar"><div class="search">' + icon('search') + '<input class="input" id="cg-q" type="search" placeholder="' + L('ابحث عن منتج', 'Search products') + '" value="' + esc(q) + '"></div><span class="badge ok">' + S.products.filter(function (p) { return p.site; }).length + ' ' + L('معروض', 'shown') + '</span>' +
        (can() ? '<button type="button" class="btn soft sm" id="cg-all">' + L('عرض الكل', 'Show all') + '</button><button type="button" class="btn ghost sm" id="cg-none">' + L('إخفاء الكل', 'Hide all') + '</button>' : '') + '</div><div id="cg-list">' + rows() + '</div>';
    }
    draw();
    root.addEventListener('input', function (e) { if (e.target.id === 'cg-q') { q = e.target.value; root.querySelector('#cg-list').innerHTML = rows(); } });
    root.addEventListener('change', function (e) {
      var t = e.target, id = t.getAttribute('data-site');
      if (id) return Store.productSite(id, t.checked).then(function () { C.toast(t.checked ? L('يظهر الآن في الموقع', 'Now shown on the site') : L('أُخفي من الموقع', 'Hidden from the site')); }, function (er) { t.checked = !t.checked; C.toast(C.errText(er), 'err'); });
      if (t.id === 'cg-price' || t.id === 'cg-stock') Store.saveSite(Object.assign({}, site(), { showPrices: root.querySelector('#cg-price').checked, showStock: root.querySelector('#cg-stock').checked })).then(function () { C.toast(L('تم الحفظ', 'Saved')); }, function (er) { C.toast(C.errText(er), 'err'); });
    });
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('#cg-all') || e.target.closest('#cg-none')) {
        var on = !!e.target.closest('#cg-all'), list = S.products.filter(function (p) { return !!p.site !== on; });
        return list.reduce(function (pr, p) { return pr.then(function () { return Store.productSite(p.id, on); }); }, Promise.resolve()).then(draw, function (er) { C.toast(C.errText(er), 'err'); draw(); });
      }
      if ((b = e.target.closest('[data-desc]'))) {
        var p = Store.product(b.getAttribute('data-desc'));
        var m = C.modal({ title: esc(p.name), size: 'md', body: '<div class="col"><div class="field"><label>' + L('وصف المنتج في الموقع - عربي', 'Site description - Arabic') + '</label><textarea class="input" id="ds-a" rows="4">' + esc(p.desc || '') + '</textarea></div><div class="field"><label>Site description - English</label><textarea class="input ltr" id="ds-e" rows="4">' + esc(p.descEn || '') + '</textarea></div><p class="small muted">' + L('لتغيير الصورة أو السعر افتح المنتج من «المخزون» في نظام البيع.', 'To change the photo or price open the product under "Stock" in the point of sale.') + '</p></div>', foot: '<button type="button" class="btn primary" id="ds-ok">' + L('حفظ', 'Save') + '</button>' });
        m.el.querySelector('#ds-ok').onclick = function () { C.busy(m.el.querySelector('#ds-ok'), Store.productSite(p.id, p.site, { desc: m.el.querySelector('#ds-a').value.trim(), descEn: m.el.querySelector('#ds-e').value.trim() })).then(function () { m.close(); draw(); }, function () {}); };
      }
    });
  });

  /* ================================================== messages */
  page('messages', L('رسائل الزوار', 'Visitor messages'), function (root) {
    function draw() {
      var list = S.messages.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      root.innerHTML = '<div class="view-head"><h2>' + L('الرسائل والاستفسارات', 'Messages & enquiries') + ' <span class="badge ' + (S.unread ? 'bad' : 'ok') + '">' + S.unread + ' ' + L('جديدة', 'new') + '</span></h2>' + (can() && S.unread ? '<button type="button" class="btn soft" id="m-all">' + icon('check') + L('تعليم الكل كمقروء', 'Mark all as read') + '</button>' : '') + '</div>' +
        (list.length ? '<div class="col">' + list.map(function (m) {
          var reply = L('مرحباً ', 'Hello ') + m.name + L('، معك أبراج الصمود بخصوص استفسارك', ', this is Abraj Alsumud about your enquiry') + (m.product ? L(' عن: ', ' on: ') + m.product : '') + '.';
          return '<div class="msg' + (m.read ? '' : ' unread') + '"><div class="row between wrap"><b>' + esc(m.name) + (m.read ? '' : ' <span class="badge bad">' + L('جديدة', 'New') + '</span>') + '</b><span class="small muted">' + C.fts(m.ts) + '</span></div>' +
            '<div class="small muted">' + (m.phone ? '<span class="ltr">' + esc(m.phone) + '</span> ' : '') + (m.email ? '<span class="ltr">' + esc(m.email) + '</span>' : '') + '</div>' + (m.product ? '<span class="badge info mt">' + icon('box', 13) + esc(m.product) + '</span>' : '') +
            '<p class="t">' + esc(m.text) + '</p><div class="row wrap">' + (m.phone ? '<a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/' + C.phoneIntl(m.phone) + '?text=' + encodeURIComponent(reply) + '">' + icon('whatsapp', 16) + L('رد عبر واتساب', 'Reply on WhatsApp') + '</a><a class="btn ghost sm" href="tel:' + esc(m.phone) + '">' + icon('phone', 16) + L('اتصال', 'Call') + '</a>' : '') +
            (m.email ? '<a class="btn ghost sm" href="mailto:' + esc(m.email) + '">' + icon('mail', 16) + L('بريد', 'Email') + '</a>' : '') + '<span class="grow"></span>' +
            (can() ? (m.read ? '' : '<button type="button" class="btn soft sm" data-read="' + esc(m.id) + '">' + L('تمت القراءة', 'Mark read') + '</button>') + '<button type="button" class="icon-btn sm red" data-del="' + esc(m.id) + '">' + icon('trash', 18) + '</button>' : '') + '</div></div>';
        }).join('') + '</div>' : '<div class="card empty">' + icon('msg', 44) + '<p>' + L('لا توجد رسائل بعد. عندما يرسل زائر استفساراً من الموقع يظهر هنا مع تنبيه على الجرس.', 'No messages yet. When a visitor sends an enquiry from the site it appears here, with an alert on the bell.') + '</p></div>');
      Shell.bell(); Shell.refreshNav();
    }
    draw();
    root.addEventListener('click', function (e) {
      var b, fail = function (er) { C.toast(C.errText(er), 'err'); };
      if ((b = e.target.closest('[data-read]'))) return Store.saveMessage(Object.assign({}, Store.byId(S.messages, b.getAttribute('data-read')), { read: true })).then(draw, fail);
      if ((b = e.target.closest('[data-del]'))) { var id = b.getAttribute('data-del'); return C.confirmBox(L('حذف هذه الرسالة؟', 'Delete this message?'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.removeMessages([id]).then(draw, fail); }); }
      if (e.target.closest('#m-all')) S.messages.filter(function (m) { return !m.read; }).reduce(function (pr, m) { return pr.then(function () { return Store.saveMessage(Object.assign({}, m, { read: true })); }); }, Promise.resolve()).then(draw, fail);
    });
  });

  /* ================================================== subscribers */
  page('subscribers', L('المشتركون', 'Subscribers'), function (root) {
    function draw() {
      var list = S.subscribers.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }), s = site();
      root.innerHTML = '<div class="card mb"><h3>' + icon('gear') + L('بيانات التسجيل المطلوبة من المشترك', 'Details asked from a subscriber') + '</h3><div class="row wrap" id="sb-fields">' +
        [['name', L('الاسم', 'Name')], ['phone', L('رقم الهاتف', 'Phone number')], ['email', L('البريد الإلكتروني', 'Email')]].map(function (x) { return '<label class="check" style="flex:1 1 150px"><input type="checkbox" value="' + x[0] + '"' + (s.subFields.indexOf(x[0]) >= 0 ? ' checked' : '') + (can() ? '' : ' disabled') + '><span><b>' + x[1] + '</b></span></label>'; }).join('') + '</div>' +
        '<p class="small muted mt">' + L('اختر ما تريد: الاسم أو الهاتف أو البريد أو الثلاثة معاً.', 'Choose what you want: the name, the phone, the email, or all three.') + '</p></div>' +
        '<div class="view-head"><h2>' + L('قائمة المشتركين', 'Subscriber list') + ' <span class="badge ok">' + list.length + '</span></h2><button type="button" class="btn ghost" id="sb-xl">' + icon('download') + 'Excel</button></div>' +
        (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + L('الاسم', 'Name') + '</th><th>' + L('الهاتف', 'Phone') + '</th><th>' + L('البريد', 'Email') + '</th><th>' + L('تاريخ الاشتراك', 'Subscribed') + '</th><th></th></tr></thead><tbody>' +
          list.map(function (x) { return '<tr><td><b>' + esc(x.name || '-') + '</b></td><td class="ltr">' + esc(x.phone || '') + '</td><td class="ltr">' + esc(x.email || '') + '</td><td class="small">' + C.fts(x.ts) + '</td><td class="act">' + (x.phone ? '<a class="icon-btn sm" style="color:#1fa855" target="_blank" rel="noopener" href="https://wa.me/' + C.phoneIntl(x.phone) + '">' + icon('whatsapp', 18) + '</a>' : '') + (can() ? '<button type="button" class="icon-btn sm red" data-del="' + esc(x.id) + '">' + icon('trash', 18) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<div class="card empty">' + icon('users', 44) + '<p>' + L('لا يوجد مشتركون بعد.', 'No subscribers yet.') + '</p></div>');
    }
    draw();
    root.addEventListener('change', function (e) {
      if (!e.target.closest('#sb-fields')) return;
      var f = [].map.call(root.querySelectorAll('#sb-fields input:checked'), function (i) { return i.value; });
      if (!f.length) { e.target.checked = true; return C.toast(L('اختر خانة واحدة على الأقل', 'Choose at least one field'), 'warn'); }
      Store.saveSite(Object.assign({}, site(), { subFields: f })).then(function () { C.toast(L('تم الحفظ', 'Saved')); }, function (er) { C.toast(C.errText(er), 'err'); });
    });
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('#sb-xl')) { var rows = [[L('الاسم', 'Name'), L('الهاتف', 'Phone'), L('البريد', 'Email'), L('تاريخ الاشتراك', 'Subscribed')]]; S.subscribers.forEach(function (x) { rows.push([x.name || '', x.phone || '', x.email || '', C.fts(x.ts)]); }); return Shell.excel('Abraj-Alsumud_Subscribers', L('المشتركون', 'Subscribers'), rows, [26, 18, 30, 20]); }
      if ((b = e.target.closest('[data-del]'))) { var id = b.getAttribute('data-del'); C.confirmBox(L('حذف هذا المشترك؟', 'Delete this subscriber?'), L('حذف', 'Delete'), true).then(function (y) { if (y) Store.removeSubscribers([id]).then(draw, function (er) { C.toast(C.errText(er), 'err'); }); }); }
    });
  });

  /* ------------------------------------------------ start */
  function nav() {
    return [{ id: 'home', icon: 'home', label: L('الرئيسية', 'Home') }, { id: 'posts', icon: 'file', label: L('المنشورات والعروض', 'Posts & offers'), short: L('المنشورات', 'Posts') },
      { id: 'messages', icon: 'msg', label: L('الرسائل', 'Messages'), count: function () { return S.unread; } }, { id: 'content', icon: 'edit', label: L('محتوى الموقع', 'Site content'), short: L('المحتوى', 'Content') },
      { id: 'sections', icon: 'grid', label: L('أقسام إضافية', 'Extra sections') }, { id: 'catalog', icon: 'box', label: L('منتجات الموقع', 'Site products') }, { id: 'subscribers', icon: 'users', label: L('المشتركون', 'Subscribers') }];
  }
  Store.boot('admin').then(function (state) {
    if (state !== 'ready') { location.replace(ROOT + 'login/index.html?next=admin'); return; }
    document.title = L(S.settings.nameAr || 'أبراج الصمود', S.settings.name || 'Abraj Alsumud') + ' - ' + L('لوحة الموقع', 'Website panel');
    Shell.mount({ app: 'admin', nav: nav, home: function () { return 'home'; } });
    // new messages arriving while the panel is open
    var known = S.unread;
    setInterval(function () { if (document.hidden) return; Store.poll().then(function () { if (S.unread > known) { C.toast(L('وصلت رسالة جديدة من الموقع', 'A new message arrived from the website'), 'warn', 6000); Store.loadSite().then(function () { Shell.bell(); Shell.refreshNav(); if (Shell.current === 'messages' || Shell.current === 'home') Shell.refresh(); }); } known = S.unread; }, function () {}); }, 45000);
  }, function (e) {
    var noPerm = e && (e.code === 'no_permission' || e.code === 'feature_off');
    document.getElementById('app').innerHTML = '<div style="max-width:520px;margin:12vh auto;padding:24px" class="card"><h2 class="mb">' + (noPerm ? L('لا تملك صلاحية إدارة الموقع', 'You may not manage the website') : L('تعذّر تشغيل اللوحة', 'The panel could not start')) + '</h2><div class="note bad mb">' + esc(C.errText(e)) + '</div><a class="btn primary" href="' + ROOT + 'pos/index.html">' + L('الذهاب إلى نظام البيع', 'Go to the point of sale') + '</a></div>';
  });
})();
