/* site.js - the public website. Everything shown comes from the control panel (yourdomain/admin):
   banner, products chosen from the stock list, posts and offers, extra sections, "about", subscribe box, contact form.
   Arabic (default) and English. Visitors' messages and subscriptions go to the panel and ring its bell. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, ROOT = window.ROOT || '';
  var D = null, flt = { cat: '', q: '' };
  var app = document.getElementById('site');
  function T(ar, en) { return C.lang === 'en' && en ? en : (ar || en || ''); }
  function para(s) { return esc(s).replace(/\n/g, '<br>'); }
  function biz() { return D.biz; }
  function waNum() { return C.phoneIntl(biz().whatsapp || biz().phone || ''); }
  function waLink(text) { return 'https://wa.me/' + waNum() + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function catOf(id) { return C.catOf({ cats: biz().cats }, id); }
  function pname(p) { return T(p.name, p.nameEn); }
  function uname(u) { return T(u.n, u.e); }
  function logo(cls) { return biz().logo ? '<img class="' + cls + '" alt="' + esc(T(biz().nameAr, biz().name)) + '" src="' + esc(Media.url(biz().logo)) + '">' : '<span class="' + cls + ' s-mark">أ</span>'; }

  /* ------------------------------------------------ pieces */
  function priceHtml(p) {
    var us = p.units.filter(function (u) { return u.r > 0; });
    if (!us.length) return '<div class="s-price ask">' + L('السعر عند الطلب', 'Price on request') + '</div>';
    var u = us[0];
    return '<div class="s-price"><b>' + C.f3(u.r) + '</b> ' + L('ر.ع', 'OMR') + ' <small>/ ' + esc(uname(u)) + '</small></div>' +
      (us.length > 1 ? '<div class="s-units">' + us.slice(1).map(function (x) { return '<span>' + esc(uname(x)) + (x.f > 1 ? ' (' + C.qf(x.f) + ')' : '') + ': <b>' + C.f3(x.r) + '</b></span>'; }).join('') + '</div>' : '');
  }
  function cardHtml(p) {
    var cat = catOf(p.cat), out = D.site.showStock && p.out;
    return '<article class="s-card' + (out ? ' out' : '') + '" data-p="' + esc(p.id) + '"><button type="button" class="s-pic" data-open aria-label="' + esc(pname(p)) + '">' + Media.thumb(p.img, pname(p), cat.c, 'pic') +
      (p.ws ? '<span class="s-flag">' + L('متوفر بالجملة', 'Wholesale available') + '</span>' : '') + (out ? '<span class="s-flag out">' + L('غير متوفر حالياً', 'Currently unavailable') + '</span>' : '') + '</button>' +
      '<div class="s-body"><span class="s-cat" style="color:' + cat.c + '">' + esc(C.catName(cat)) + '</span><h3>' + esc(pname(p)) + '</h3>' + priceHtml(p) +
      '<div class="s-acts"><a class="s-btn wa" target="_blank" rel="noopener" href="' + esc(waLink(L('مرحباً، أرغب في طلب: ', 'Hello, I would like to order: ') + pname(p))) + '">' + icon('whatsapp', 18) + L('اطلب واتساب', 'Order on WhatsApp') + '</a>' +
      '<button type="button" class="s-btn line" data-ask>' + L('استفسار', 'Enquire') + '</button></div></div></article>';
  }
  function productsHtml() {
    var q = C.norm(flt.q), list = D.products.filter(function (p) { return (!flt.cat || p.cat === flt.cat) && (!q || C.norm(p.name + ' ' + p.nameEn + ' ' + p.desc).indexOf(q) >= 0); }).sort(C.Prod.newestFirst);
    return list.length ? '<div class="s-grid">' + list.map(cardHtml).join('') + '</div>' : '<p class="s-empty">' + L('لا توجد منتجات مطابقة.', 'No matching products.') + '</p>';
  }
  function postHtml(p) {
    return '<article class="s-post" data-post="' + esc(p.id) + '"><button type="button" class="s-pic" data-openpost>' + (p.imgs && p.imgs[0] ? '<img class="pic" loading="lazy" alt="" src="' + esc(Media.url(p.imgs[0])) + '">' : '<span class="pic noimg" style="--tile:#12805e">' + icon('leaf', 40) + '</span>') +
      (p.tag ? '<span class="s-flag amber">' + esc(p.tag) + '</span>' : '') + (p.imgs && p.imgs.length > 1 ? '<span class="s-count">' + icon('image', 14) + p.imgs.length + '</span>' : '') + '</button>' +
      '<div class="s-body"><span class="s-date">' + C.fts(p.ts).slice(0, 10) + '</span><h3>' + esc(T(p.titleAr, p.titleEn)) + '</h3><p class="s-clamp">' + esc(T(p.textAr, p.textEn)) + '</p><button type="button" class="s-more" data-openpost>' + L('اقرأ المزيد', 'Read more') + '</button></div></article>';
  }
  function sectionHtml(s, i) {
    var imgs = s.imgs || [], title = T(s.titleAr, s.titleEn), text = T(s.textAr, s.textEn);
    if (s.layout === 'gallery' || imgs.length > 1) return '<section class="s-sec' + (i % 2 ? ' alt' : '') + '"><div class="s-wrap">' + (title ? '<h2 class="s-h2">' + esc(title) + '</h2>' : '') + (text ? '<p class="s-lead">' + para(text) + '</p>' : '') +
      (imgs.length ? '<div class="s-gallery">' + imgs.map(function (id) { return '<button type="button" data-zoom="' + esc(id) + '"><img loading="lazy" alt="" src="' + esc(Media.url(id)) + '"></button>'; }).join('') + '</div>' : '') + '</div></section>';
    return '<section class="s-sec' + (i % 2 ? ' alt' : '') + '"><div class="s-wrap s-split' + (imgs[0] ? '' : ' noimg') + '"><div>' + (title ? '<h2 class="s-h2 start">' + esc(title) + '</h2>' : '') + '<p class="s-text">' + para(text) + '</p></div>' + (imgs[0] ? '<img class="s-photo" loading="lazy" alt="" src="' + esc(Media.url(imgs[0])) + '">' : '') + '</div></section>';
  }
  function fieldHtml(k, req) {
    var lab = { name: L('الاسم', 'Name'), phone: L('رقم الهاتف', 'Phone number'), email: L('البريد الإلكتروني', 'Email') }[k];
    return '<label class="s-field"><span>' + lab + '</span><input name="' + k + '"' + (k === 'phone' ? ' inputmode="tel" dir="ltr"' : k === 'email' ? ' type="email" dir="ltr"' : '') + (req ? ' required' : '') + ' maxlength="120" autocomplete="' + (k === 'phone' ? 'tel' : k) + '"></label>';
  }

  /* ------------------------------------------------ page */
  function render() {
    var s = D.site, b = biz(), show = s.show, name = T(b.nameAr, b.name);
    var cats = (b.cats || []).filter(function (c) { return D.products.some(function (p) { return p.cat === c.id; }); });
    var posts = D.posts.slice().sort(function (a, c) { return ((c.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (c.ts || 0) - (a.ts || 0); });
    document.title = name + ' - ' + T(b.activityAr, b.activity);
    var nav = (show.products && D.products.length ? '<a href="#products">' + L('المنتجات', 'Products') + '</a>' : '') + (show.posts && posts.length ? '<a href="#posts">' + L('العروض', 'Offers') + '</a>' : '') + (show.about ? '<a href="#about">' + L('من نحن', 'About') + '</a>' : '') + (show.contact ? '<a href="#contact">' + L('تواصل معنا', 'Contact') + '</a>' : '');
    app.innerHTML =
      '<header class="s-top"><div class="s-wrap s-bar"><a class="s-brand" href="#top">' + logo('s-logo') + '<span><b>' + esc(name) + '</b><small>' + esc(L('بهلاء - سلطنة عُمان', 'Bahla - Sultanate of Oman')) + '</small></span></a><nav class="s-nav">' + nav + '</nav>' +
      '<div class="s-right"><a class="s-login" href="' + ROOT + 'login/index.html">' + icon('lock', 17) + '<span>' + L('تسجيل الدخول', 'Sign in') + '</span></a><button type="button" class="s-lang" id="s-lang">' + L('EN', 'ع') + '</button>' + (waNum() ? '<a class="s-btn wa" target="_blank" rel="noopener" href="' + esc(waLink('')) + '">' + icon('whatsapp', 18) + '<span class="hide-s">' + L('واتساب', 'WhatsApp') + '</span></a>' : '') + '</div></div></header>' +

      '<section class="s-hero" id="top"><div class="s-wrap s-hero-in' + (s.hero.img ? '' : ' solo') + '"><div><span class="s-kicker">' + icon('leaf', 16) + esc(L('موردون ووكلاء لشركات عالمية', 'Suppliers & agents for international companies')) + '</span>' +
      '<h1>' + esc(T(s.hero.titleAr, s.hero.titleEn)) + '</h1><p>' + para(T(s.hero.textAr, s.hero.textEn)) + '</p><div class="s-cta">' + (show.products && D.products.length ? '<a class="s-btn amber lg" href="#products">' + icon('box', 20) + L('تصفّح المنتجات', 'Browse products') + '</a>' : '') +
      (waNum() ? '<a class="s-btn glass lg" target="_blank" rel="noopener" href="' + esc(waLink(L('مرحباً، أرغب في الاستفسار عن أسعار الجملة', 'Hello, I would like to ask about wholesale prices'))) + '">' + icon('whatsapp', 20) + L('اطلب أسعار الجملة', 'Ask for wholesale prices') + '</a>' : '') + '</div>' +
      '<ul class="s-points"><li>' + icon('check', 16) + L('جملة ومفرد', 'Wholesale & retail') + '</li><li>' + icon('check', 16) + L('بالحبة والدرزن والكرتون', 'Piece, dozen, carton') + '</li><li>' + icon('pin', 16) + L('سوق بهلاء', 'Bahla Souq') + '</li></ul></div>' +
      (s.hero.img ? '<img class="s-hero-img" alt="" src="' + esc(Media.url(s.hero.img)) + '">' : '') + '</div></section>' +

      (show.features ? '<section class="s-feats"><div class="s-wrap s-feat-grid">' + s.features.filter(function (f) { return f.ar || f.en; }).map(function (f, i) { return '<div class="s-feat">' + icon(['tag', 'star', 'grid', 'whatsapp'][i % 4], 26) + '<b>' + esc(T(f.ar, f.en)) + '</b><span>' + esc(T(f.dAr, f.dEn)) + '</span></div>'; }).join('') + '</div></section>' : '') +

      (show.products && D.products.length ? '<section class="s-sec" id="products"><div class="s-wrap"><h2 class="s-h2">' + esc(T(s.titles.products.ar, s.titles.products.en)) + '</h2>' +
        '<div class="s-tools"><label class="s-search">' + icon('search', 18) + '<input type="search" id="s-q" placeholder="' + L('ابحث عن منتج...', 'Search products...') + '"></label></div>' +
        (show.cats && cats.length > 1 ? '<div class="s-chips" id="s-cats"><button type="button" class="on" data-c="">' + L('الكل', 'All') + '</button>' + cats.map(function (c) { return '<button type="button" data-c="' + esc(c.id) + '">' + esc(C.catName(c)) + '</button>'; }).join('') + '</div>' : '') +
        '<div id="s-products">' + productsHtml() + '</div><p class="s-note">' + icon('tag', 16) + L('لطلبات الجملة والكميات أسعار خاصة - تواصل معنا.', 'Special prices for wholesale and quantity orders - contact us.') + '</p></div></section>' : '') +

      (show.posts && posts.length ? '<section class="s-sec alt" id="posts"><div class="s-wrap"><h2 class="s-h2">' + esc(T(s.titles.posts.ar, s.titles.posts.en)) + '</h2><div class="s-posts">' + posts.map(postHtml).join('') + '</div></div></section>' : '') +

      (show.about ? '<section class="s-sec" id="about"><div class="s-wrap s-split' + (s.about.img ? '' : ' noimg') + '"><div><h2 class="s-h2 start">' + esc(T(s.about.titleAr, s.about.titleEn)) + '</h2><p class="s-text">' + para(T(s.about.textAr, s.about.textEn)) + '</p></div>' + (s.about.img ? '<img class="s-photo" loading="lazy" alt="" src="' + esc(Media.url(s.about.img)) + '">' : '') + '</div></section>' : '') +

      D.sections.map(sectionHtml).join('') +

      (show.subscribe ? '<section class="s-sub"><div class="s-wrap s-sub-in"><div><h2>' + esc(T(s.titles.subscribe.ar, s.titles.subscribe.en)) + '</h2><p>' + esc(T(s.titles.subscribe.tAr, s.titles.subscribe.tEn)) + '</p></div>' +
        '<form id="s-subf" class="s-form row">' + s.subFields.map(function (k) { return fieldHtml(k, true); }).join('') + '<input name="website" class="s-hp" tabindex="-1" autocomplete="off"><button class="s-btn amber lg">' + L('اشترك', 'Subscribe') + '</button></form></div></section>' : '') +

      (show.contact ? '<section class="s-sec" id="contact"><div class="s-wrap"><h2 class="s-h2">' + esc(T(s.titles.contact.ar, s.titles.contact.en)) + '</h2><div class="s-contact"><div class="s-info">' +
        (b.phone ? '<a href="tel:' + esc(b.phone) + '">' + icon('phone', 22) + '<span><b>' + L('اتصل بنا', 'Call us') + '</b><span dir="ltr">' + esc(b.phone) + '</span></span></a>' : '') +
        (waNum() ? '<a target="_blank" rel="noopener" href="' + esc(waLink('')) + '">' + icon('whatsapp', 22) + '<span><b>' + L('واتساب', 'WhatsApp') + '</b><span dir="ltr">' + esc(b.whatsapp || b.phone) + '</span></span></a>' : '') +
        (b.instagram ? '<a target="_blank" rel="noopener" href="https://www.instagram.com/' + encodeURIComponent(String(b.instagram).replace(/^@/, '')) + '">' + icon('instagram', 22) + '<span><b>' + L('إنستغرام', 'Instagram') + '</b><span dir="ltr">@' + esc(String(b.instagram).replace(/^@/, '')) + '</span></span></a>' : '') +
        '<' + (b.map ? 'a target="_blank" rel="noopener" href="' + esc(b.map) + '"' : 'div') + ' class="s-info-row">' + icon('pin', 22) + '<span><b>' + L('العنوان', 'Address') + '</b><span>' + esc(T(b.addrAr, b.addr)) + '</span></span></' + (b.map ? 'a' : 'div') + '>' +
        (T(b.hoursAr, b.hours) ? '<div class="s-info-row">' + icon('clock', 22) + '<span><b>' + L('أوقات العمل', 'Opening hours') + '</b><span>' + esc(T(b.hoursAr, b.hours)) + '</span></span></div>' : '') + '</div>' +
        '<form id="s-msgf" class="s-form card"><h3>' + L('أرسل استفسارك', 'Send your enquiry') + '</h3>' + fieldHtml('name', true) + fieldHtml('phone', true) + '<label class="s-field"><span>' + L('عن أي منتج؟ (اختياري)', 'About which product? (optional)') + '</span><input name="product" maxlength="160"></label>' +
        '<label class="s-field"><span>' + L('رسالتك', 'Your message') + '</span><textarea name="text" rows="4" required maxlength="1500"></textarea></label><input name="website" class="s-hp" tabindex="-1" autocomplete="off"><button class="s-btn green lg">' + icon('send', 18) + L('إرسال', 'Send') + '</button></form></div></div></section>' : '') +

      '<footer class="s-foot"><div class="s-wrap s-foot-in"><div class="s-brand">' + logo('s-logo') + '<span><b>' + esc(name) + '</b><small>' + esc(T(b.activityAr, b.activity)) + '</small></span></div>' +
      '<div class="s-foot-meta">' + (b.cr ? '<span>' + L('السجل التجاري: ', 'C.R. No: ') + '<span dir="ltr">' + esc(b.cr) + '</span></span>' : '') + (T(s.footerAr, s.footerEn) ? '<span>' + esc(T(s.footerAr, s.footerEn)) + '</span>' : '') +
      '</div></div></footer>' +                 // (sign-in is the button in the top bar; nothing about it down here)
      (waNum() ? '<a class="s-fab" target="_blank" rel="noopener" href="' + esc(waLink('')) + '" aria-label="WhatsApp">' + icon('whatsapp', 30) + '</a>' : '');
    bind();
  }

  function openProduct(p) {
    var cat = catOf(p.cat), us = p.units.filter(function (u) { return u.r > 0; });
    C.modal({ title: esc(pname(p)), size: 'lg', body: '<div class="s-detail">' + (p.img ? '<img class="s-dpic" alt="" src="' + esc(Media.url(p.img)) + '">' : '<span class="s-dpic noimg" style="--tile:' + cat.c + '">' + esc(C.initials(pname(p))) + '</span>') +
      '<div><span class="s-cat" style="color:' + cat.c + '">' + esc(C.catName(cat)) + '</span>' + (T(p.desc, p.descEn) ? '<p class="s-text">' + para(T(p.desc, p.descEn)) + '</p>' : '') +
      (us.length ? '<table class="s-ptable"><tr><th>' + L('الوحدة', 'Unit') + '</th><th>' + L('تحتوي', 'Holds') + '</th><th>' + L('السعر', 'Price') + '</th></tr>' + us.map(function (u) { return '<tr><td>' + esc(uname(u)) + '</td><td>' + (u.f > 1 ? C.qf(u.f) + ' ' + esc(uname(p.units[0])) : '-') + '</td><td><b>' + C.f3(u.r) + '</b> ' + L('ر.ع', 'OMR') + '</td></tr>'; }).join('') + '</table>' : '<div class="s-price ask">' + L('السعر عند الطلب', 'Price on request') + '</div>') +
      (p.ws ? '<p class="s-note">' + icon('tag', 16) + L('أسعار خاصة للجملة والكميات.', 'Special prices for wholesale and quantities.') + '</p>' : '') +
      '<div class="s-acts"><a class="s-btn wa lg" target="_blank" rel="noopener" href="' + esc(waLink(L('مرحباً، أرغب في طلب: ', 'Hello, I would like to order: ') + pname(p))) + '">' + icon('whatsapp', 20) + L('اطلب عبر واتساب', 'Order on WhatsApp') + '</a></div></div></div>' });
  }
  function openPost(p) {
    C.modal({ title: esc(T(p.titleAr, p.titleEn)), size: 'lg', body: (p.imgs && p.imgs.length ? '<div class="s-gallery big">' + p.imgs.map(function (id) { return '<img alt="" src="' + esc(Media.url(id)) + '">'; }).join('') + '</div>' : '') + (p.tag ? '<span class="s-flag amber static">' + esc(p.tag) + '</span>' : '') +
      '<p class="s-text">' + para(T(p.textAr, p.textEn)) + '</p>' + (waNum() ? '<div class="s-acts"><a class="s-btn wa lg" target="_blank" rel="noopener" href="' + esc(waLink(L('مرحباً، بخصوص: ', 'Hello, about: ') + T(p.titleAr, p.titleEn))) + '">' + icon('whatsapp', 20) + L('استفسر عبر واتساب', 'Ask on WhatsApp') + '</a></div>' : '') });
  }
  function send(form, action, okMsg) {
    var body = {}, btn = form.querySelector('button');
    [].forEach.call(form.elements, function (i) { if (i.name) body[i.name] = i.value.trim(); });
    btn.disabled = true;
    Store.publicCall(action, body).then(function () { btn.disabled = false; form.reset(); C.toast(okMsg, 'ok', 5000); }, function (e) { btn.disabled = false; C.toast(C.errText(e), 'err'); });
  }
  function bind() {
    document.getElementById('s-lang').onclick = function () { C.setLang(C.lang === 'ar' ? 'en' : 'ar'); };
    app.onclick = function (e) {
      var b, card;
      if ((b = e.target.closest('[data-c]'))) { flt.cat = b.getAttribute('data-c'); [].forEach.call(app.querySelectorAll('#s-cats button'), function (x) { x.classList.toggle('on', x === b); }); app.querySelector('#s-products').innerHTML = productsHtml(); return; }
      if ((card = e.target.closest('[data-p]'))) {
        var p = D.products.filter(function (x) { return x.id === card.getAttribute('data-p'); })[0];
        if (e.target.closest('[data-ask]')) { var f = app.querySelector('#s-msgf'); if (f) { f.product.value = pname(p); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { f.name.focus(); }, 500); } else window.open(waLink(pname(p)), '_blank', 'noopener'); return; }
        if (e.target.closest('[data-open]') || e.target.closest('h3')) openProduct(p);
        return;
      }
      if (e.target.closest('[data-openpost]')) { var id = e.target.closest('[data-post]').getAttribute('data-post'); openPost(D.posts.filter(function (x) { return x.id === id; })[0]); return; }
      if ((b = e.target.closest('[data-zoom]'))) C.modal({ title: '', size: 'xl', body: '<img alt="" style="width:100%;border-radius:12px" src="' + esc(Media.url(b.getAttribute('data-zoom'))) + '">' });
    };
    var q = app.querySelector('#s-q'); if (q) q.oninput = function () { flt.q = q.value; app.querySelector('#s-products').innerHTML = productsHtml(); };
    var sf = app.querySelector('#s-subf'); if (sf) sf.onsubmit = function (e) { e.preventDefault(); send(sf, 'site_subscribe', L('تم اشتراكك، شكراً لك!', 'You are subscribed, thank you!')); };
    var mf = app.querySelector('#s-msgf'); if (mf) mf.onsubmit = function (e) { e.preventDefault(); send(mf, 'site_message', L('وصلت رسالتك، سنتواصل معك قريباً.', 'We received your message and will contact you soon.')); };
  }

  Store.publicCall('site_public').then(function (d) {
    d.site = SiteDefaults.merge(d.site);
    d.biz = Object.assign(C.defaultSettings(), d.biz || {});
    D = d; render();
  }, function () {
    app.innerHTML = '<div class="s-down"><h1>أبراج الصمود</h1><p>' + L('الموقع غير متاح حالياً. حاول بعد قليل.', 'The site is not available right now. Please try again shortly.') + '</p></div>';
  });
})();
