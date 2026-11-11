/* demo-data.js - example data for the DEMO copy only (never part of the real system).
   The products and prices follow what the shop shows on its Instagram account; stock quantities, purchase prices,
   customers, suppliers and bills are invented examples so every screen has something to show. */
(function () {
  'use strict';
  var LOGO = 'de300000000000000001.jpg';                    // a photo name the demo answers with the file img/logo.jpg
  function seed(db) {
    var C = window.Core, now = Math.floor(Date.now() / 1000), today = C.today(), day = function (n) { return C.addDays(today, -n); };
    var U = function (n, e, f, r, w, bc) { return { n: n, e: e, f: f, r: r, w: w, bc: bc || '' }; };
    var docs = db.docs, put = function (col, d) { (docs[col] || (docs[col] = {}))[d.id] = d; return d; };
    var settings = C.defaultSettings();
    settings.logo = LOGO;                                   // the shop's own logo, exactly as on its Instagram account (img/logo.jpg)
    settings.hoursAr ='السبت - الخميس: 8 صباحاً - 1 ظهراً، 4 عصراً - 9 مساءً'; settings.hours = 'Sat - Thu: 8 am - 1 pm, 4 pm - 9 pm';
    put('settings', Object.assign({ id: 'main' }, settings)); docs.settings.main = settings;

    db.users = [{ id: 1, username: 'demo', name: 'صاحب المحل', role: 'admin', perms: [] },
      { id: 2, username: 'salim', name: 'سالم (كاشير المحل)', role: 'staff', perms: ['sell', 'customers'] },
      { id: 3, username: 'khalid', name: 'خالد (أمين المخزن)', role: 'staff', perms: ['sell', 'cost', 'stock', 'purchase', 'customers'] }];
    db.session = null;

    var P = [
      ['honey', 'علب عسل زجاجية', 'Glass honey jars', 'pack', [U('حبة', 'Piece', 1, 0.150, 0, '6291000000011'), U('كرتون', 'Carton', 24, 3.000, 2.700, '6291000000028')], 0.095, 96, 1200, 240, 'علب زجاجية للعسل بغطاء محكم. الكرتون 24 حبة.', 'Glass jars for honey with a tight lid. 24 per carton.'],
      ['tang', 'علب تانج زجاجية', 'Glass Tang jars', 'pack', [U('حبة', 'Piece', 1, 0.200, 0), U('كرتون', 'Carton', 24, 4.500, 4.000)], 0.140, 72, 960, 240, 'علب زجاجية متعددة الاستعمال. الكرتون 24 حبة.', 'Multi-use glass jars. 24 per carton.'],
      ['trap-s', 'مقنصة فئران حديدية - حجم صغير', 'Metal mouse trap cage - small', 'rodent', [U('حبة', 'Piece', 1, 1.200, 1.000), U('درزن', 'Dozen', 12, 13.500, 11.400)], 0.720, 30, 180, 24, 'أداء سريع وفعال، حديد عالي المتانة، سهلة الاستخدام.', 'Fast and effective, strong steel, easy to use.'],
      ['trap-l', 'مقنصة فئران حديدية - حجم كبير', 'Metal mouse trap cage - large', 'rodent', [U('حبة', 'Piece', 1, 1.500, 1.250), U('درزن', 'Dozen', 12, 16.500, 14.400)], 0.900, 22, 144, 24, 'حجم كبير، حديد عالي المتانة.', 'Large size, strong steel.'],
      ['snap', 'مشبك فئران', 'Mouse snap trap', 'rodent', [U('حبة', 'Piece', 1, 0.500, 0.400), U('درزن', 'Dozen', 12, 5.400, 4.500), U('كرتون', 'Carton', 144, 60.000, 50.000)], 0.260, 60, 720, 72, 'استشعار دقيق وأداء سريع.', 'Sensitive trigger, fast action.'],
      ['cleanfly', 'كلين فلاي 200 جرام', 'Clean Fly 200 g', 'pest', [U('علبة', 'Can', 1, 5.500, 4.800), U('كرتون', 'Carton', 24, 126.000, 110.000)], 3.900, 9, 72, 12, 'طُعم للقضاء على الذباب. تجربة عملية ونتائج مميزة.', 'Fly bait granules with proven results.'],
      ['fruitfly', 'مصيدة ذبابة الفاكهة', 'Fruit fly trap', 'pest', [U('حبة', 'Piece', 1, 0.800, 0.650), U('درزن', 'Dozen', 12, 9.000, 7.500)], 0.420, 40, 300, 36, 'لحماية أشجار المانجو والحمضيات والنخيل.', 'Protects mango, citrus and date palm trees.'],
      ['net', 'ستار البعوض', 'Mosquito net', 'house', [U('حبة', 'Piece', 1, 3.500, 3.000), U('كرتون', 'Carton', 20, 64.000, 56.000)], 2.100, 14, 80, 10, '', ''],
      ['rope', 'حبل الليف الطبيعي', 'Natural palm fibre rope', 'agri', [U('ربطة', 'Bundle', 1, 2.000, 1.700)], 1.150, 45, 400, 50, 'جودة عالية وقوة. للديكور وربط الأشجار والصناعات الحرفية.', 'Strong, high quality. For decor, tying trees and crafts.'],
      ['bags', 'أكياس شفط للتمور 20×30 (100 كيس)', 'Vacuum bags for dates 20×30 (100 pcs)', 'dates', [U('ربطة', 'Pack', 1, 3.500, 3.000), U('كرتون', 'Carton', 20, 66.000, 58.000)], 2.200, 25, 200, 20, 'المقاسات المتوفرة: 20/25، 20/30، 25/30 سم.', 'Sizes available: 20/25, 20/30, 25/30 cm.'],
      ['sealer', 'جهاز شفط وتغليف التمور', 'Vacuum sealer for dates', 'dates', [U('حبة', 'Piece', 1, 18.000, 16.000)], 12.500, 4, 20, 3, 'حفظ أطول وجودة أفضل.', 'Longer storage, better quality.'],
      ['uf', 'فلتر UF سعة 3000 لتر في الساعة', 'UF water filter 3000 L/h', 'water', [U('حبة', 'Piece', 1, 35.000, 31.000)], 24.000, 2, 12, 2, 'يصفّي الشوائب والأتربة والصدأ والبكتيريا. ستانلس ستيل SUS 304.', 'Removes sediment, rust and bacteria. Stainless steel SUS 304.'],
      ['gas220', 'غاز الرحلات 220 جرام', 'Camping gas 220 g', 'camp', [U('حبة', 'Piece', 1, 0.350, 0), U('كرتون', 'Carton', 28, 7.500, 6.800)], 0.210, 56, 840, 112, '', ''],
      ['gas450', 'غاز الرحلات 450 جرام', 'Camping gas 450 g', 'camp', [U('حبة', 'Piece', 1, 1.300, 0), U('كرتون', 'Carton', 12, 13.500, 12.300)], 0.950, 0, 0, 24, '', ''],
      ['broom', 'مكنسة تنظيف ملوّنة', 'Coloured cleaning broom', 'clean', [U('حبة', 'Piece', 1, 1.000, 0.800), U('درزن', 'Dozen', 12, 10.800, 9.000)], 0.520, 18, 120, 24, '', ''],
      ['shears', 'مقص تقليم الأشجار', 'Pruning shears', 'tools', [U('حبة', 'Piece', 1, 2.500, 2.100), U('درزن', 'Dozen', 12, 27.000, 24.000)], 1.400, 7, 36, 6, '', '']
    ];
    var prod = {};
    P.forEach(function (x, i) {
      prod[x[0]] = put('products', { id: 'd-' + x[0], name: x[1], nameEn: x[2], cat: x[3], sku: '', units: x[4], cost: x[5], lastCost: x[5], stock: { shop: x[6], wh: x[7] }, minStock: x[8], desc: x[9], descEn: x[10],
        supplier: i % 3 === 0 ? 'مؤسسة الخليج للتوريدات' : i % 3 === 1 ? 'شركة الواحة الزراعية' : 'مصنع الزجاج الحديث', shelf: 'A' + (i % 6 + 1), expiry: x[0] === 'cleanfly' ? C.addDays(today, 40) : '', img: '', site: true, created: now - 86400 * 30, createdBy: 'صاحب المحل' });
    });
    [['s1', 'مؤسسة الخليج للتوريدات', '24400000'], ['s2', 'شركة الواحة الزراعية', '25500000'], ['s3', 'مصنع الزجاج الحديث', '26600000']].forEach(function (s) { put('suppliers', { id: s[0], name: s[1], phone: s[2], notes: '' }); });
    var cust = [['c1', 'مزرعة النخيل - نزوى', '99110011', 'wholesale'], ['c2', 'بقالة الحمراء', '99220022', 'wholesale'], ['c3', 'سعيد الهنائي', '99330033', 'retail'], ['c4', 'محل الريف للعسل', '99440044', 'wholesale']];
    cust.forEach(function (c) { put('customers', { id: c[0], name: c[1], phone: c[2], type: c[3], created: day(20) }); });

    // bills: [days ago, type, customer index (-1 = cash), [[product, unit index, qty]...], paid ratio, seller]
    var bills = [[9, 'wholesale', 0, [['honey', 1, 10], ['bags', 1, 2]], 1, 'صاحب المحل'], [8, 'retail', -1, [['trap-s', 0, 2], ['snap', 0, 4]], 1, 'سالم (كاشير المحل)'], [6, 'wholesale', 1, [['gas220', 1, 6], ['broom', 1, 2]], 0.5, 'صاحب المحل'],
      [5, 'retail', 2, [['cleanfly', 0, 1], ['fruitfly', 0, 3]], 1, 'سالم (كاشير المحل)'], [3, 'wholesale', 3, [['honey', 1, 20], ['tang', 1, 8]], 0, 'خالد (أمين المخزن)'], [2, 'retail', -1, [['rope', 0, 2], ['net', 0, 1]], 1, 'سالم (كاشير المحل)'],
      [1, 'retail', -1, [['uf', 0, 1]], 1, 'صاحب المحل'], [0, 'wholesale', 0, [['snap', 2, 1], ['trap-l', 1, 2]], 1, 'صاحب المحل'], [0, 'retail', -1, [['honey', 0, 6], ['shears', 0, 1]], 1, 'سالم (كاشير المحل)']];
    bills.forEach(function (b, i) {
      var n = i + 1, items = b[3].map(function (l) { var p = prod[l[0]], u = p.units[l[1]]; return { pid: p.id, n: p.name, a: p.nameEn, unit: u.n, unitEn: u.e, f: u.f, q: l[2], price: b[1] === 'wholesale' ? (u.w || u.r) : (u.r || u.w), cost: Math.round(p.cost * u.f * 1e5) / 1e5 }; });
      var t = C.Calc.totals(items, 0, 0), c = b[2] >= 0 ? cust[b[2]] : null, paid = C.r3(t.total * b[4]);
      put('invoices', { id: String(n), no: n, number: 'INV-' + String(n).padStart(5, '0'), type: b[1], loc: b[1] === 'wholesale' ? 'wh' : 'shop', date: day(b[0]), time: ['09:15', '10:40', '11:05', '17:20', '18:45'][i % 5],
        customerId: c ? c[0] : '', customerName: c ? c[1] : '', customerPhone: c ? c[2] : '', customerVat: '', note: '', items: items, sub: t.sub, discount: 0, vat: 0, vatPct: 0, total: t.total,
        payments: paid > 0 ? [{ amount: paid, method: i % 4 === 2 ? 'transfer' : 'cash', date: day(b[0]), by: b[5] }] : [], void: false, created: now - b[0] * 86400 - 3600, createdBy: b[5] });
    });
    db.meta.counter = bills.length;
    var pu = [[12, 's3', 'مصنع الزجاج الحديث', [['honey', 1, 50, 2.280], ['tang', 1, 40, 3.360]], 1], [7, 's2', 'شركة الواحة الزراعية', [['cleanfly', 1, 3, 93.600], ['fruitfly', 1, 20, 5.040]], 0.4]];
    pu.forEach(function (x, i) {
      var n = i + 1, items = x[3].map(function (l) { var p = prod[l[0]], u = p.units[l[1]]; return { pid: p.id, n: p.name, a: p.nameEn, unit: u.n, unitEn: u.e, f: u.f, q: l[2], cost: l[3] }; });
      var total = C.r3(items.reduce(function (t, it) { return t + it.cost * it.q; }, 0)), paid = C.r3(total * x[4]);
      put('purchases', { id: 'p' + n, no: n, number: 'PUR-' + String(n).padStart(5, '0'), date: day(x[0]), supplierId: x[1], supplierName: x[2], loc: 'wh', ref: 'S-' + (1040 + i), note: '', items: items, total: total, payments: [{ amount: paid, method: 'transfer', date: day(x[0]), by: 'صاحب المحل' }], created: now - x[0] * 86400, createdBy: 'خالد (أمين المخزن)' });
    });
    db.meta.pcounter = pu.length;
    [[10, 'إيجار', 'إيجار المحل والمخزن', 250], [6, 'نقل وشحن', 'شحن بضاعة من مسقط', 35], [4, 'كهرباء وماء', 'فاتورة الشهر', 42.5], [1, 'رواتب', 'سلفة موظف', 60]].forEach(function (e, i) { put('expenses', { id: 'e' + i, date: day(e[0]), cat: e[1], title: e[2], amount: e[3], method: 'cash', createdBy: 'صاحب المحل', created: now }); });
    put('reminders', { id: 'r1', text: 'طلب كراتين غاز 450 جرام من المورد قبل موسم الشتاء', due: C.addDays(today, 2), done: false, by: 'صاحب المحل', created: today });
    put('moves', { id: 'm1', ts: now - 86400 * 2, pid: prod.honey.id, name: prod.honey.name, type: 'transfer', loc: 'wh', to: 'shop', qty: 96, before: 1296, after: 1200, reason: 'تعبئة رف المحل', by: 'خالد (أمين المخزن)' });
    db.log = [{ ts: now - 86400 * 2, user: 'خالد (أمين المخزن)', type: 'stock_transfer', ref: prod.honey.name, detail: '1296 > 1200 (wh > shop)' }, { ts: now - 86400 * 7, user: 'خالد (أمين المخزن)', type: 'purchase_add', ref: 'PUR-00002', detail: '381.6' }];

    // the website
    docs.site = { main: window.SiteDefaults ? window.SiteDefaults.get() : {} };
    [['po1', 'علب العسل والتانج متوفرة الآن', 'Honey and Tang jars now in stock', 'علب العسل: الكرتون 24 حبة بـ 3 ريال\nعلب تانج زجاجية: الكرتون 24 حبة بـ 4.500 ريال\nيوجد سعر خاص للجملة.', 'Honey jars: carton of 24 for OMR 3\nGlass Tang jars: carton of 24 for OMR 4.500\nSpecial wholesale price available.', 'الكرتون من 3 ريال', 1, true],
      ['po2', 'أهلاً وسهلاً بالشتاء - غاز الرحلات', 'Welcome winter - camping gas', '220 جرام: كرتون 28 حبة بـ 7.500 ريال\n450 جرام: كرتون 12 حبة بـ 13.500 ريال\nللكميات أسعار خاصة.', '220 g: carton of 28 for OMR 7.500\n450 g: carton of 12 for OMR 13.500\nSpecial prices for quantities.', 'عرض الشتاء', 3, false],
      ['po3', 'حبل الليف الطبيعي', 'Natural palm fibre rope', 'جودة عالية وقوة. استخدامات متعددة للديكور وربط الأشجار والصناعات الحرفية والريفية.\nسعر الربطة: 2 ريال، وسعر مميز للجملة.', 'Strong and high quality, for decor, tying trees and crafts.\nOMR 2 per bundle, with a special wholesale price.', '2 ريال للربطة', 6, false]
    ].forEach(function (p) { put('posts', { id: p[0], titleAr: p[1], titleEn: p[2], textAr: p[3], textEn: p[4], tag: p[5], imgs: [], ts: now - p[6] * 86400, pinned: p[7], hidden: false, by: 'صاحب المحل' }); });
    put('sections', { id: 'se1', titleAr: 'نبيع بالجملة للمحلات والمزارع', titleEn: 'Wholesale for shops and farms', textAr: 'هل لديك محل أو مزرعة؟ نوفّر لك الكميات بأسعار الجملة مع إمكانية الشحن إلى ولايات السلطنة. أرسل لنا قائمة طلبك عبر واتساب ونجهّزها لك.', textEn: 'Do you run a shop or a farm? We supply quantities at wholesale prices and can ship across Oman. Send us your list on WhatsApp and we will prepare it.', imgs: [], order: 1, layout: 'side', hidden: false, ts: now });
    put('messages', { id: 'ms1', ts: now - 5400, read: false, name: 'ناصر العبري', phone: '99887766', email: '', text: 'السلام عليكم، كم سعر كرتون علب العسل لو أخذت 50 كرتون؟ وهل يوجد توصيل إلى عبري؟', product: 'علب عسل زجاجية' });
    put('messages', { id: 'ms2', ts: now - 86400 * 2, read: true, name: 'أم محمد', phone: '99665544', email: '', text: 'هل أكياس الشفط مقاس 25/30 متوفرة؟', product: '' });
    [['sb1', 'حمد الشكيلي', '99001122'], ['sb2', 'مزرعة الوادي', '99003344'], ['sb3', 'يوسف البوسعيدي', '99005566']].forEach(function (s, i) { put('subscribers', { id: s[0], name: s[1], phone: s[2], email: '', ts: now - (i + 1) * 86400 * 3 }); });
  }
  var media = {}; media[LOGO] = 'img/logo.jpg';
  window.ABRAJ_DEMO = { seed: seed, media: media };
})();
