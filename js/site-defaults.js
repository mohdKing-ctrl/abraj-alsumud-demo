/* site-defaults.js - the website's starting texts (used until the owner writes his own in the website panel),
   shared by the public website and the control panel. Everything here can be changed from the panel. */
(function () {
  'use strict';
  function defaults() {
    return {
      showPrices: true, showStock: true, subFields: ['name', 'phone'],
      show: { cats: true, products: true, about: true, features: true, posts: true, subscribe: true, contact: true },
      hero: {
        titleAr: 'كل ما تحتاجه مزرعتك وبيتك.. بالجملة والمفرد', titleEn: 'Everything your farm and home need - wholesale and retail',
        textAr: 'أبراج الصمود: موردون ووكلاء لشركات عالمية. مواد زراعية ومبيدات حشرية، مواد منزلية واستهلاكية، وعلب التعبئة ومستلزمات التمور - من سوق بهلاء إلى كل أنحاء السلطنة.',
        textEn: 'Abraj Alsumud: suppliers and agents for international companies. Agricultural supplies and pesticides, household and consumer goods, jars and dates supplies - from Bahla Souq to all of Oman.',
        img: ''
      },
      about: {
        titleAr: 'من نحن', titleEn: 'About us',
        textAr: 'نحن في أبراج الصمود نوفّر للمزارع وصاحب المحل وربّ البيت ما يحتاجه في مكان واحد: مبيدات ومكافحة حشرات وقوارض، أدوات زراعية، أدوات تنظيف، علب زجاجية للعسل والتانج، أكياس وأجهزة شفط للتمور، فلاتر مياه، ومستلزمات الرحلات. نبيع بالحبة وبالكرتون، ولطلبات الجملة أسعار خاصة.',
        textEn: 'At Abraj Alsumud the farmer, the shop owner and the family find what they need in one place: pesticides and pest control, farm tools, cleaning tools, glass jars for honey, vacuum bags and sealers for dates, water filters and camping supplies. We sell by the piece and by the carton, with special prices for wholesale orders.',
        img: ''
      },
      features: [
        { ar: 'جملة ومفرد', en: 'Wholesale & retail', dAr: 'بالحبة أو الدرزن أو الكرتون، وأسعار خاصة للكميات.', dEn: 'By the piece, dozen or carton, with special prices for quantities.' },
        { ar: 'وكلاء لشركات عالمية', en: 'Agents for international brands', dAr: 'منتجات أصلية من مصادرها.', dEn: 'Genuine products from their sources.' },
        { ar: 'تشكيلة واسعة', en: 'A wide range', dAr: 'زراعي، منزلي، تعبئة وتغليف، ومستلزمات التمور.', dEn: 'Farm, household, packaging and dates supplies.' },
        { ar: 'تواصل سريع', en: 'Quick contact', dAr: 'اطلب أو استفسر عبر واتساب مباشرة.', dEn: 'Order or ask directly on WhatsApp.' }
      ],
      titles: {
        products: { ar: 'منتجاتنا', en: 'Our products' }, posts: { ar: 'جديدنا وعروضنا', en: 'News & offers' },
        subscribe: { ar: 'اشترك ليصلك جديد العروض', en: 'Subscribe for new offers', tAr: 'اترك بياناتك ونخبرك بالعروض والمنتجات الجديدة أولاً بأول.', tEn: 'Leave your details and we will tell you about new offers and products first.' },
        contact: { ar: 'تواصل معنا', en: 'Contact us' }
      },
      footerAr: '', footerEn: ''
    };
  }
  /* the owner's saved website settings laid over the starting ones */
  function merge(site) {
    var d = defaults(), s = site || {}, k;
    for (k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) {
        var sub = {}, j;
        for (j in d[k]) sub[j] = d[k][j];
        for (j in s[k]) sub[j] = (s[k][j] && typeof s[k][j] === 'object' && !Array.isArray(s[k][j]) && d[k][j] && typeof d[k][j] === 'object') ? Object.assign({}, d[k][j], s[k][j]) : s[k][j];
        d[k] = sub;
      } else d[k] = s[k];
    }
    return d;
  }
  window.SiteDefaults = { get: defaults, merge: merge };
})();
