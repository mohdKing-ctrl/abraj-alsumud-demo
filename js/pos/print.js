/* print.js - a bill on paper, in three sizes: A4 sheet, 80 mm receipt roll, 58 mm receipt roll.
   Every device remembers the size it prints on; Settings holds the default for a device that never chose.
   The A4 bill is bilingual (English / Arabic) and follows the Omani rules: company name, C.R. number, and - only when the
   business is VAT registered - the words "Tax Invoice", the VAT number and the VAT amount. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, f3 = C.f3, Calc = C.Calc, S = Store.s;
  var SIZES = { a4: ['ورقة A4', 'A4 sheet'], '80': ['إيصال 80 ملم', 'Receipt 80 mm'], '58': ['إيصال 58 ملم', 'Receipt 58 mm'] };
  var PAYM = { cash: ['Cash', 'نقداً'], card: ['Card', 'بطاقة'], transfer: ['Bank transfer', 'تحويل بنكي'], cheque: ['Cheque', 'شيك'] };

  function size(v) {
    try {
      if (v !== undefined) { localStorage.setItem('abraj_print', v); return v; }
      var s = localStorage.getItem('abraj_print');
      if (SIZES[s]) return s;
    } catch (e) { /* private mode */ }
    return SIZES[S.settings.printSize] ? S.settings.printSize : 'a4';
  }
  function sizeOptions(cur) {
    return Object.keys(SIZES).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(L(SIZES[k][0], SIZES[k][1])) + '</option>'; }).join('');
  }
  function docType(inv) {
    return inv.vatPct > 0 ? ['TAX INVOICE', 'فاتورة ضريبية'] : ['INVOICE', 'فاتورة'];
  }
  function saleType(inv) { return inv.type === 'wholesale' ? ['Wholesale', 'جملة'] : ['Retail', 'تجزئة']; }
  function logoUrl() { return S.settings.logo ? Media.url(S.settings.logo) : ''; }
  function unitText(it) { return (it.unitEn && it.unitEn !== it.unit ? it.unitEn + ' / ' : '') + (it.unit || ''); }

  var CSS = '' +
    '.pa{font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;color:#111;font-size:10.5pt;line-height:1.45;direction:ltr}' +
    '.pa *{box-sizing:border-box}.pa .ar{direction:rtl;unicode-bidi:isolate}' +
    '.pa-head{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;border-bottom:3px solid #0e6b4f;padding-bottom:9px}' +
    '.pa-head h1{font-size:15pt;color:#0b4d3a;line-height:1.25}.pa-head p{font-size:9pt;color:#444}.pa-head .r{text-align:right}' +
    '.pa-head img{max-width:34mm;max-height:26mm;object-fit:contain}' +
    '.pa-title{text-align:center;margin:10px 0 8px}.pa-title b{font-size:15pt;color:#0b4d3a;letter-spacing:.5px}.pa-title span{display:block;font-size:11pt;color:#555;font-weight:700}' +
    '.pa-void{display:inline-block;border:3px solid #d43d51;color:#d43d51;font-weight:800;font-size:15pt;padding:2px 14px;border-radius:8px;transform:rotate(-6deg);margin-top:6px}' +
    '.pa-boxes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}' +
    '.pa-box{border:1px solid #b9d0c5;border-radius:6px;padding:7px 10px}' +
    '.pa-box h4{display:flex;justify-content:space-between;font-size:9pt;color:#0b4d3a;border-bottom:1px solid #dbe8e1;padding-bottom:3px;margin-bottom:4px}' +
    '.pa-kv{display:flex;justify-content:space-between;gap:10px;font-size:10pt;padding:1.5px 0}.pa-kv span{color:#555}.pa-kv b{text-align:right}' +
    '.pa-tbl{width:100%;border-collapse:collapse;font-size:10pt}' +
    '.pa-tbl th{background:#0e6b4f;color:#fff;font-size:9pt;padding:6px 7px;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pa-tbl td{border:1px solid #c9dad1;padding:5px 7px;vertical-align:top}.pa-tbl .c{text-align:center}.pa-tbl .e{text-align:right;white-space:nowrap}' +
    '.pa-tbl td small{display:block;color:#555;font-size:9pt}.pa-tbl tr{break-inside:avoid}' +
    '.pa-bottom{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;margin-top:10px;break-inside:avoid}' +
    '.pa-tot .pa-kv{border-bottom:1px dotted #c9dad1;padding:4px 0;font-size:10.5pt}' +
    '.pa-grand{display:flex;justify-content:space-between;background:#0e6b4f;color:#fff;font-weight:800;font-size:13pt;padding:7px 10px;border-radius:5px;margin:5px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pa-note{border:1px dashed #b9d0c5;border-radius:6px;padding:6px 10px;font-size:9.5pt;margin-bottom:8px}' +
    '.pa-sign{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:34px;font-size:9.5pt;color:#444;text-align:center;break-inside:avoid}.pa-sign div{border-top:1px solid #555;padding-top:4px}' +
    '.pa-foot{text-align:center;color:#555;font-size:9pt;border-top:1px solid #dbe8e1;margin-top:14px;padding-top:6px}' +
    /* receipt rolls */
    '.rc{font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;color:#000;font-size:9.5pt;line-height:1.4;width:100%}' +
    '.rc.n58{font-size:8.5pt}.rc *{box-sizing:border-box}.rc .c{text-align:center}' +
    '.rc h1{font-size:13pt;text-align:center;line-height:1.25}.rc.n58 h1{font-size:11.5pt}' +
    '.rc img{display:block;margin:0 auto 3px;max-width:30mm;max-height:22mm;object-fit:contain}' +
    '.rc hr{border:0;border-top:1px dashed #000;margin:5px 0}' +
    '.rc .kv{display:flex;justify-content:space-between;gap:8px}.rc .kv b{direction:ltr;unicode-bidi:isolate}' +
    '.rc .it{padding:3px 0;border-bottom:1px dotted #999}.rc .it b{display:block}' +
    '.rc .big{font-size:12.5pt;font-weight:800}.rc .tt{font-weight:800;font-size:11pt;text-align:center;margin:3px 0}' +
    '.rc .void{border:2px solid #000;text-align:center;font-weight:800;padding:2px;margin:4px 0}';

  /* ------------------------------------------------ A4 */
  function a4(inv) {
    var s = S.settings, dt = docType(inv), st = saleType(inv), tax = inv.vatPct > 0, paid = Calc.paid(inv), bal = Calc.balance(inv), logo = logoUrl();
    var kv = function (en, ar, v, ltr) { return v === '' || v === null || v === undefined ? '' : '<div class="pa-kv"><span>' + en + ' / <span class="ar">' + ar + '</span></span><b' + (ltr ? ' dir="ltr"' : ' class="ar"') + '>' + esc(v) + '</b></div>'; };
    return '<div class="pa">' +
      '<div class="pa-head"><div><h1>' + esc(s.name) + '</h1><p>' + esc(s.activity) + '</p><p>' + esc(s.addr) + '</p><p>Tel: ' + esc(s.phone) + (s.email ? ' | ' + esc(s.email) : '') + '</p>' +
      (s.cr ? '<p>C.R. No: <b>' + esc(s.cr) + '</b></p>' : '') + (tax && s.vatNo ? '<p>VATIN: <b>' + esc(s.vatNo) + '</b></p>' : '') + '</div>' +
      '<div>' + (logo ? '<img alt="" src="' + esc(logo) + '">' : '') + '</div>' +
      '<div class="r ar"><h1>' + esc(s.nameAr || s.name) + '</h1><p>' + esc(s.activityAr) + '</p><p>' + esc(s.addrAr) + '</p><p>هاتف: <span dir="ltr">' + esc(s.phone) + '</span></p>' +
      (s.cr ? '<p>السجل التجاري: <b dir="ltr">' + esc(s.cr) + '</b></p>' : '') + (tax && s.vatNo ? '<p>الرقم الضريبي: <b dir="ltr">' + esc(s.vatNo) + '</b></p>' : '') + '</div></div>' +
      '<div class="pa-title"><b>' + dt[0] + '</b><span class="ar">' + dt[1] + '</span>' + (inv.void ? '<div class="pa-void">VOID / ملغاة</div>' : '') + '</div>' +
      '<div class="pa-boxes"><div class="pa-box"><h4><span>CUSTOMER</span><span class="ar">العميل</span></h4>' +
      kv('Name', 'الاسم', inv.customerName || 'Cash customer / عميل نقدي') + kv('Phone', 'الهاتف', inv.customerPhone, true) + kv('Customer VATIN', 'الرقم الضريبي للعميل', inv.customerVat, true) + '</div>' +
      '<div class="pa-box"><h4><span>INVOICE</span><span class="ar">الفاتورة</span></h4>' +
      kv('Invoice No', 'رقم الفاتورة', inv.number, true) + kv('Date', 'التاريخ', C.fdate(inv.date) + ' ' + (inv.time || ''), true) +
      kv('Sale type', 'نوع البيع', st[0] + ' / ' + st[1]) + kv('Prepared by', 'أعدّها', inv.createdBy) + '</div></div>' +
      (inv.note ? '<div class="pa-note"><b>Note / <span class="ar">ملاحظة</span>:</b> <span class="ar">' + esc(inv.note) + '</span></div>' : '') +
      '<table class="pa-tbl"><thead><tr><th class="c" style="width:8mm">#</th><th>Description / <span class="ar">الوصف</span></th><th class="c" style="width:28mm">Unit / <span class="ar">الوحدة</span></th>' +
      '<th class="c" style="width:20mm">Qty / <span class="ar">الكمية</span></th><th class="e" style="width:24mm">Price / <span class="ar">السعر</span></th><th class="e" style="width:30mm">Amount / <span class="ar">المبلغ</span></th></tr></thead><tbody>' +
      inv.items.map(function (it, i) {
        return '<tr><td class="c">' + (i + 1) + '</td><td><span class="ar">' + esc(it.n) + '</span>' + (it.a && it.a !== it.n ? '<small>' + esc(it.a) + '</small>' : '') + '</td><td class="c ar">' + esc(unitText(it)) + (it.f > 1 ? '<small dir="ltr">×' + C.qf(it.f) + '</small>' : '') + '</td>' +
          '<td class="c">' + C.qf(it.q) + '</td><td class="e">' + f3(it.price) + '</td><td class="e">' + f3(Calc.line(it)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="pa-bottom"><div>' +
      (s.bank ? '<div class="pa-note"><b>Bank / <span class="ar">البنك</span>:</b> ' + esc(s.bank) + '</div>' : '') +
      (inv.payments && inv.payments.length ? '<div class="pa-box"><h4><span>PAYMENTS RECEIVED</span><span class="ar">الدفعات المستلمة</span></h4>' + inv.payments.map(function (p) {
        var n = PAYM[p.method] || [p.method, p.method];
        return '<div class="pa-kv"><span>' + C.fdate(p.date) + ' · ' + n[0] + ' / <span class="ar">' + n[1] + '</span></span><b dir="ltr">' + f3(p.amount) + '</b></div>';
      }).join('') + '</div>' : '') + '</div>' +
      '<div class="pa-tot">' + kv('Sub-total', 'المجموع', f3(inv.sub), true) + (inv.discount > 0 ? kv('Discount', 'الخصم', '-' + f3(inv.discount), true) : '') +
      (tax ? kv('Taxable amount', 'المبلغ الخاضع للضريبة', f3(inv.sub - inv.discount), true) + kv('VAT ' + inv.vatPct + '%', 'ضريبة القيمة المضافة', f3(inv.vat), true) : '') +
      '<div class="pa-grand"><span>TOTAL / <span class="ar">الإجمالي</span> (OMR)</span><span>' + f3(inv.total) + '</span></div>' +
      kv('Paid', 'المدفوع', f3(paid), true) + (bal > 0.0004 ? '<div class="pa-kv" style="color:#b00020"><span style="color:#b00020">Balance due / <span class="ar">المتبقي</span></span><b dir="ltr">' + f3(bal) + '</b></div>' : '') + '</div></div>' +
      '<div class="pa-sign"><div>Prepared by / <span class="ar">أعدّها</span></div><div>Customer signature / <span class="ar">توقيع العميل</span></div><div>Stamp / <span class="ar">الختم</span></div></div>' +
      '<div class="pa-foot"><span class="ar">' + esc(s.footerAr) + '</span>' + (s.footer ? ' · ' + esc(s.footer) : '') + (s.terms ? '<br><span class="ar">' + esc(s.terms) + '</span>' : '') + '</div></div>';
  }

  /* ------------------------------------------------ receipt roll (80 mm / 58 mm) */
  /* the words of a receipt, in the language of the screen */
  function rw() {
    return { tel: L('هاتف', 'Tel'), cr: L('س.ت', 'C.R.'), vatin: L('الرقم الضريبي', 'VATIN'), no: L('رقم الفاتورة', 'Invoice No'), date: L('التاريخ', 'Date'), type: L('نوع البيع', 'Sale type'),
      wholesale: L('جملة', 'Wholesale'), retail: L('تجزئة', 'Retail'), customer: L('العميل', 'Customer'), phone: L('الهاتف', 'Phone'), seller: L('البائع', 'Served by'),
      sub: L('المجموع', 'Sub-total'), disc: L('الخصم', 'Discount'), vat: L('الضريبة', 'VAT'), total: L('الإجمالي (ر.ع)', 'TOTAL (OMR)'), paid: L('المدفوع', 'Paid'), bal: L('المتبقي', 'Balance due'),
      voided: L('ملغاة', 'VOID'), note: L('ملاحظة', 'Note') };
  }
  function receipt(inv, narrow) {
    var s = S.settings, dt = docType(inv), tax = inv.vatPct > 0, paid = Calc.paid(inv), bal = Calc.balance(inv), logo = logoUrl(), ar = C.lang === 'ar', w = rw();
    var kv = function (k, v) { return '<div class="kv"><span>' + k + '</span><b>' + esc(v) + '</b></div>'; };
    return '<div class="rc' + (narrow ? ' n58' : '') + '" dir="' + (ar ? 'rtl' : 'ltr') + '">' + (logo ? '<img alt="" src="' + esc(logo) + '">' : '') +
      '<h1>' + esc(ar ? s.nameAr || s.name : s.name || s.nameAr) + '</h1><div class="c">' + esc(ar ? s.name : s.nameAr) + '</div><div class="c">' + esc(ar ? s.addrAr : s.addr) + '</div>' +
      '<div class="c">' + w.tel + ': <span dir="ltr">' + esc(s.phone) + '</span></div>' + (s.cr ? '<div class="c">' + w.cr + ': <span dir="ltr">' + esc(s.cr) + '</span></div>' : '') +
      (tax && s.vatNo ? '<div class="c">' + w.vatin + ': <span dir="ltr">' + esc(s.vatNo) + '</span></div>' : '') +
      '<hr><div class="tt">' + (ar ? dt[1] : dt[0]) + '</div>' + (inv.void ? '<div class="void">' + w.voided + '</div>' : '') +
      kv(w.no, inv.number) + kv(w.date, C.fdate(inv.date) + ' ' + (inv.time || '')) + kv(w.type, inv.type === 'wholesale' ? w.wholesale : w.retail) +
      (inv.customerName ? kv(w.customer, inv.customerName) : '') + (inv.customerPhone ? kv(w.phone, inv.customerPhone) : '') + (inv.createdBy ? kv(w.seller, inv.createdBy) : '') + '<hr>' +
      inv.items.map(function (it) {
        return '<div class="it"><b>' + esc(ar || !it.a ? it.n : it.a) + '</b><div class="kv"><span><span dir="ltr">' + C.qf(it.q) + '</span> ' + esc(ar || !it.unitEn ? it.unit || '' : it.unitEn) + ' × <span dir="ltr">' + f3(it.price) + '</span></span><b>' + f3(Calc.line(it)) + '</b></div></div>';
      }).join('') + '<hr>' +
      kv(w.sub, f3(inv.sub)) + (inv.discount > 0 ? kv(w.disc, '-' + f3(inv.discount)) : '') + (tax ? kv(w.vat + ' ' + inv.vatPct + '%', f3(inv.vat)) : '') +
      '<div class="kv big"><span>' + w.total + '</span><b>' + f3(inv.total) + '</b></div>' + kv(w.paid, f3(paid)) + (bal > 0.0004 ? kv(w.bal, f3(bal)) : '') +
      (inv.note ? '<hr><div>' + esc(inv.note) + '</div>' : '') +
      '<hr><div class="c">' + esc(ar ? s.footerAr || s.footer : s.footer || s.footerAr) + '</div></div>';
  }

  function html(inv, sz) { return sz === 'a4' ? a4(inv) : receipt(inv, sz === '58'); }

  /* put ready-made HTML on paper (also used by reports and statements) */
  function paper(inner, sz) {
    var area = document.getElementById('print-area');
    if (!area) { area = document.createElement('div'); area.id = 'print-area'; document.body.appendChild(area); }
    var page = sz === '80' ? '@page{size:80mm auto;margin:3mm}' : sz === '58' ? '@page{size:58mm auto;margin:2mm}' : '@page{size:A4;margin:11mm}';
    area.innerHTML = '<style>' + page + CSS + '</style>' + inner;
    var imgs = [].slice.call(area.querySelectorAll('img')), left = imgs.filter(function (i) { return !i.complete; }).length, fired = false;
    var go = function () { if (fired) return; fired = true; setTimeout(function () { window.print(); }, 150); };
    if (!left) return go();
    imgs.forEach(function (i) { if (!i.complete) i.onload = i.onerror = function () { if (--left <= 0) go(); }; });
    setTimeout(go, 2500);                                    // never wait for a slow logo for ever
  }
  function run(inv, sz) { paper(html(inv, sz || size()), sz || size()); }

  window.Print = { size: size, sizeOptions: sizeOptions, SIZES: SIZES, PAYM: PAYM, docType: docType, saleType: saleType, html: html, run: run, paper: paper, unitText: unitText, words: rw };
})();
