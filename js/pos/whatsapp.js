/* whatsapp.js - send a bill to the customer on WhatsApp.
   The window has TWO send buttons:
     1. "Send text message"  - the customer's chat opens with the bill already written as text: press Send.
     2. "Send the PDF"       - the bill as an A4 PDF file (made in the browser, js/pos/billcanvas.js).
   and, on a computer, ONE choice made beforehand and remembered by that computer (Settings holds the default):
     "WhatsApp app"  - the WhatsApp program installed on the computer   (whatsapp://send?phone=...)
     "WhatsApp Web"  - WhatsApp inside the browser                      (https://web.whatsapp.com/send?phone=...)
   Both buttons use the chosen one and go straight to the customer's chat (the number typed in the window).
   On a phone / tablet there is nothing to choose: the WhatsApp app of the phone is used (https://wa.me/...).

   The PDF: WhatsApp gives a web page no way to place a FILE into a chat (only its paid Business API can), so:
     computer -> the PDF is saved to Downloads and the customer's chat opens in the chosen WhatsApp: drag the file into
                 the chat (or paperclip -> Document) and press Send.
     phone    -> the share menu opens with the real PDF file: choose WhatsApp, then the customer.
   The message goes out from the WhatsApp account signed in on that device (the shop's own number). Nothing is sent by the server.
   Also here: the camera barcode scanner used by the selling screen and the product form. */
(function () {
  'use strict';
  var C = window.Core, L = C.L, esc = C.esc, icon = C.icon, f3 = C.f3, Calc = C.Calc, S = Store.s;
  var CH_KEY = 'abraj_wa_channel';

  function message(inv) {
    var s = S.settings, ar = C.lang === 'ar', paid = Calc.paid(inv), bal = Calc.balance(inv), lines = [];
    lines.push('*' + (ar ? s.nameAr || s.name : s.name) + '*');
    lines.push((ar ? 'فاتورة رقم: ' : 'Invoice no: ') + inv.number + (inv.void ? (ar ? ' (ملغاة)' : ' (VOID)') : ''));
    lines.push((ar ? 'التاريخ: ' : 'Date: ') + C.fdate(inv.date) + ' ' + (inv.time || ''));
    if (inv.customerName) lines.push((ar ? 'العميل: ' : 'Customer: ') + inv.customerName);
    lines.push('--------------------');
    inv.items.forEach(function (it, i) {
      lines.push((i + 1) + '. ' + (ar || !it.a ? it.n : it.a) + '\n   ' + C.qf(it.q) + ' ' + (ar || !it.unitEn ? it.unit : it.unitEn) + ' × ' + f3(it.price) + ' = ' + f3(Calc.line(it)));
    });
    lines.push('--------------------');
    if (inv.discount > 0 || inv.vat > 0) lines.push((ar ? 'المجموع: ' : 'Sub-total: ') + f3(inv.sub));
    if (inv.discount > 0) lines.push((ar ? 'الخصم: ' : 'Discount: ') + '-' + f3(inv.discount));
    if (inv.vat > 0) lines.push((ar ? 'ضريبة القيمة المضافة ' : 'VAT ') + inv.vatPct + '%: ' + f3(inv.vat));
    lines.push('*' + (ar ? 'الإجمالي: ' : 'Total: ') + f3(inv.total) + (ar ? ' ر.ع' : ' OMR') + '*');
    lines.push((ar ? 'المدفوع: ' : 'Paid: ') + f3(paid));
    if (bal > 0.0004) lines.push((ar ? 'المتبقي: ' : 'Balance due: ') + f3(bal));
    lines.push('');
    lines.push(ar ? (s.footerAr || 'شكراً لتعاملكم معنا') : (s.footer || 'Thank you'));
    if (s.phone) lines.push((ar ? 'للتواصل: ' : 'Contact: ') + s.phone);
    return lines.join('\n');
  }

  /* ------------------------------------------------ where WhatsApp opens */
  function isMobile() {
    var ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);     // (an iPad calls itself a Mac)
  }
  /* 'app' | 'web' : what this computer uses. Chosen once in the window (or the default from Settings) and remembered. */
  function channel(v) {
    try {
      if (v !== undefined) { localStorage.setItem(CH_KEY, v === 'app' ? 'app' : 'web'); return v; }
      var s = localStorage.getItem(CH_KEY);
      if (s === 'app' || s === 'web') return s;
    } catch (e) { /* private mode */ }
    return S.settings.waChannel === 'app' ? 'app' : 'web';
  }
  function kindNow() { return isMobile() ? 'phone' : channel(); }
  function chatUrl(kind, phone, text) {
    var n = C.phoneIntl(phone), msg = text ? encodeURIComponent(text) : '';
    var q = [n ? 'phone=' + n : '', msg ? 'text=' + msg : ''].filter(Boolean).join('&');
    // without a number WhatsApp opens its own contact list (phone: wa.me/?text=..., web: web.whatsapp.com/send?text=..., app: whatsapp://send?text=...)
    if (kind === 'app') return 'whatsapp://send' + (q ? '?' + q : '');
    if (kind === 'web') return 'https://web.whatsapp.com/send' + (q ? '?' + q : '');
    return 'https://wa.me/' + (n ? n : '') + (msg ? '?text=' + msg : '');
  }
  /* go to the chat. Returns false when a pop-up blocker stopped WhatsApp Web (the caller then shows a link to press). */
  function openChat(kind, phone, text) {
    var url = chatUrl(kind, phone, text);
    if (kind === 'app') {                                   // hand the chat to the WhatsApp program: no new page is opened
      var a = document.createElement('a');
      a.href = url; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      return true;
    }
    // WhatsApp Web keeps to ONE browser tab (it complains when it is open in two), so the same tab is used again each time
    var w = window.open(url, kind === 'web' ? 'abraj_whatsapp_web' : '_blank');
    return !!w;
  }
  /* the size of the PDF that is sent (A4 / 80 mm / 58 mm): remembered by the device, starts as its print size */
  function pdfSize(v) {
    try {
      if (v !== undefined) { localStorage.setItem('abraj_wa_size', v); return v; }
      var s = localStorage.getItem('abraj_wa_size');
      if (Print.SIZES[s]) return s;
    } catch (e) { /* private mode */ }
    return Print.size();
  }
  function channelName(k) { return k === 'app' ? L('تطبيق واتساب', 'WhatsApp app') : L('واتساب ويب', 'WhatsApp Web'); }

  function open(inv) {
    var pdf = null, pdfErr = false, mob = isMobile(), size = pdfSize(), run = 0;
    var seg = function () {
      var c = channel();
      return '<div class="field" id="w-chbox"><label>' + L('الإرسال على هذا الكمبيوتر عن طريق', 'On this computer, send with') + '</label><div class="seg" id="w-ch" style="align-self:flex-start">' +
        ['app', 'web'].map(function (k) { return '<button type="button" data-ch="' + k + '" class="' + (c === k ? 'on' : '') + '">' + icon(k === 'app' ? 'whatsapp' : 'globe', 17) + channelName(k) + '</button>'; }).join('') + '</div>' +
        '<span class="hint" id="w-chhint"></span></div>';
    };
    var m = C.modal({ title: icon('whatsapp') + ' ' + L('إرسال الفاتورة عبر واتساب', 'Send the bill on WhatsApp') + ' <span class="ltr muted small">' + esc(inv.number) + '</span>', size: 'md',
      body: '<div class="col">' + (mob ? '' : seg()) +
        '<div class="field"><label>' + L('رقم واتساب العميل', "Customer's WhatsApp number") + '</label><input class="input ltr" id="w-ph" inputmode="tel" value="' + esc(inv.customerPhone || '') + '" placeholder="9xxxxxxx"><span class="hint">' + L('اختياري: 8 أرقام (أو رقم دولي يبدأ بـ +) ليفتح على محادثته مباشرة. اتركه فارغاً فيفتح واتساب وتختار العميل أو تكتب رقمه هناك.', 'Optional: 8 digits (or an international number starting with +) to land on his chat. Leave it empty and WhatsApp opens for you to pick the customer or type his number there.') + '</span></div>' +
        '<div class="field"><label>' + L('نص الرسالة (يمكنك تعديله)', 'Message text (you can edit it)') + '</label><textarea class="input" id="w-msg" rows="8" style="min-height:150px;font-size:14px">' + esc(message(inv)) + '</textarea></div>' +
        '<div class="field"><label>' + L('مقاس ملف PDF المرسل', 'Size of the PDF that is sent') + '</label><div class="seg" id="w-size" style="align-self:flex-start;flex-wrap:wrap">' + ['a4', '80', '58'].map(function (k) { return '<button type="button" data-sz="' + k + '" class="' + (size === k ? 'on' : '') + '">' + esc(L(Print.SIZES[k][0], Print.SIZES[k][1])) + '</button>'; }).join('') + '</div></div>' +
        '<div class="grid g2 keep"><button type="button" class="btn wa lg" id="w-text">' + icon('msg') + L('إرسال رسالة نصية', 'Send text message') + '</button>' +
        '<button type="button" class="btn wa lg busy" id="w-pdf" disabled>' + icon('file') + L('إرسال PDF', 'Send the PDF') + '</button></div>' +
        '<div id="w-help" class="note ok hide"></div>' +
        '<div class="row between wrap"><button type="button" class="link small" id="w-dl">' + L('تنزيل ملف PDF فقط', 'Only download the PDF') + '</button><button type="button" class="link small" id="w-copy">' + L('نسخ نص الرسالة', 'Copy the message') + '</button></div></div>' });
    var q = function (s) { return m.el.querySelector(s); };
    var pdfBtn = q('#w-pdf'), help = q('#w-help');
    // the PDF is prepared as soon as the window opens (and again when another size is chosen), so the button answers at once
    function prepare() {
      var my = ++run;
      pdf = null; pdfErr = false; pdfBtn.disabled = true; pdfBtn.classList.add('busy');
      Pdf.make(inv, size).then(function (r) { if (my === run) pdf = r; }, function () { if (my === run) pdfErr = true; }).then(function () { if (m.closed || my !== run) return; pdfBtn.disabled = false; pdfBtn.classList.remove('busy'); });
    }
    prepare();
    q('#w-size').onclick = function (e) {
      var b = e.target.closest('[data-sz]'); if (!b) return;
      size = pdfSize(b.getAttribute('data-sz'));
      [].forEach.call(q('#w-size').children, function (x) { x.classList.toggle('on', x === b); });
      help.classList.add('hide'); prepare();
    };

    function hint() {
      var h = q('#w-chhint'); if (!h) return;
      h.textContent = channel() === 'app' ? L('يفتح برنامج واتساب المثبّت على هذا الكمبيوتر مباشرة على محادثة العميل. (يُحفظ اختيارك لهذا الجهاز)', "Opens the WhatsApp program installed on this computer, straight on the customer's chat. (Your choice is remembered on this device)")
        : L('يفتح واتساب ويب في المتصفح مباشرة على محادثة العميل. (يُحفظ اختيارك لهذا الجهاز)', "Opens WhatsApp Web in the browser, straight on the customer's chat. (Your choice is remembered on this device)");
    }
    hint();
    if (q('#w-ch')) q('#w-ch').onclick = function (e) {
      var b = e.target.closest('[data-ch]'); if (!b) return;
      channel(b.getAttribute('data-ch'));
      [].forEach.call(q('#w-ch').children, function (x) { x.classList.toggle('on', x === b); });
      hint(); help.classList.add('hide');
    };

    /* the customer's number: needed to land in HIS chat. A number typed here is saved into the bill for next time. */
    /* The customer's number is optional: with it WhatsApp opens straight on his chat; without it WhatsApp opens and the
       customer is chosen (or his number typed) inside WhatsApp itself. A typed number is saved into the bill for next time. */
    function phone() {
      var ph = q('#w-ph').value.trim();
      if (ph !== '' && C.phoneIntl(ph).length < 8) { C.toast(L('الرقم غير صحيح. اتركه فارغاً لتختار العميل داخل واتساب، أو اكتب 8 أرقام.', 'The number is not valid. Leave it empty to pick the customer inside WhatsApp, or type 8 digits.'), 'warn', 6000); q('#w-ph').classList.add('err'); q('#w-ph').focus(); return null; }
      q('#w-ph').classList.remove('err');
      if (ph === '') return '';
      if (ph !== (inv.customerPhone || '') && !inv.void && (Store.can('sell') || Store.can('edit_inv'))) Store.touchInvoice(inv.id, { phone: ph }).then(function (d) { inv = d; }, function () {});
      return ph;
    }
    function say(html, kind) { help.className = 'note ' + (kind || 'ok'); help.innerHTML = html; }
    function blocked(kind, ph, text) {
      say(icon('alert', 18) + '<span>' + L('منع المتصفح فتح واتساب ويب. ', 'The browser blocked WhatsApp Web. ') + '<a class="link" target="abraj_whatsapp_web" href="' + esc(chatUrl(kind, ph, text)) + '">' + L('اضغط هنا لفتح محادثة العميل', "Press here to open the customer's chat") + '</a></span>', 'warn');
    }

    q('#w-text').onclick = function () {
      var ph = phone(); if (ph === null) return;
      var txt = q('#w-msg').value.trim();
      if (!txt) return C.toast(L('نص الرسالة فارغ', 'The message is empty'), 'warn');
      var kind = kindNow();
      if (!openChat(kind, ph, txt)) return blocked(kind, ph, txt);
      if (!ph) say(icon('check', 18) + '<span>' + L('فُتح واتساب والرسالة جاهزة. اختر العميل من القائمة (أو ابحث برقمه) ثم اضغط إرسال.', 'WhatsApp opened with the message ready. Pick the customer from the list (or search his number), then press Send.') + '</span>');
      else say(icon('check', 18) + '<span>' + (mob ? L('فُتحت محادثة العميل والرسالة مكتوبة. اضغط إرسال.', "The customer's chat is open with the message typed. Press Send.")
        : L('فُتحت محادثة العميل في ', "The customer's chat opened in ") + '<b>' + channelName(kind) + '</b>' + L(' والرسالة مكتوبة وجاهزة. اضغط إرسال فقط.', ' with the message typed and ready. Just press Send.')) + '</span>');
    };

    pdfBtn.onclick = function () {
      if (pdfErr || !pdf) return C.toast(L('تعذّر إنشاء ملف PDF على هذا الجهاز', 'The PDF could not be made on this device'), 'err');
      var ph = phone(); if (ph === null) return;
      // phone / tablet: the share menu carries the real PDF file into WhatsApp
      if (mob && Pdf.canShare(pdf)) {
        Pdf.share(pdf).then(function (r) {
          if (r === 'shared') say(icon('check', 18) + '<span>' + L('اختر «واتساب» ثم العميل واضغط إرسال', 'Choose "WhatsApp", then the customer, and press Send') + (ph ? ': <b class="ltr">' + esc(ph) + '</b>' : '') + '</span>');
          else if (r === 'unsupported') viaDownload(ph);
        });
        return;
      }
      viaDownload(ph);
    };
    /* computer: save the PDF, go to the customer's chat in the chosen WhatsApp; the file is dropped into the chat */
    function viaDownload(ph) {
      var kind = kindNow();
      Pdf.download(pdf);
      var steps = '<span>' + L('تم حفظ الملف ', 'The file ') + '<b class="ltr">' + esc(pdf.name) + '</b>' + (ph ? L(' في «التنزيلات» وفُتحت محادثة العميل في ', " was saved to Downloads and the customer's chat opened in ") : L(' في «التنزيلات» وفُتح ', ' was saved to Downloads and ')) + '<b>' + (mob ? 'WhatsApp' : channelName(kind)) + '</b>' + (ph ? '' : L('. افتح محادثة العميل (أو ابحث برقمه)', ' opened. Open the customer\'s chat (or search his number)')) + '.<br><b>' +
        L('اسحب الملف إلى المحادثة', 'Drag the file into the chat') + '</b>' + L(' (أو اضغط 📎 ثم «مستند» واختره) ثم اضغط إرسال.', ' (or press 📎, then "Document", and pick it), then press Send.') + '</span>';
      // the web tab must open while the click is fresh; the program is started a moment later so the download is not interrupted
      if (kind === 'app') { setTimeout(function () { openChat(kind, ph, ''); }, 600); say(icon('file', 18) + steps); }
      else if (openChat(kind, ph, '')) say(icon('file', 18) + steps);
      else blocked(kind, ph, '');
    }
    q('#w-dl').onclick = function () { if (pdf) Pdf.download(pdf); else C.toast(L('لحظة، الملف قيد التجهيز', 'One moment, the file is being prepared'), 'warn'); };
    q('#w-copy').onclick = function () {
      var t = q('#w-msg');
      (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(function () { C.toast(L('تم النسخ', 'Copied')); }, function () { t.select(); document.execCommand('copy'); C.toast(L('تم النسخ', 'Copied')); });
    };
  }

  /* a short text (statement of account, reminder) to a number, in the WhatsApp this device uses */
  function text(phone, msg) { openChat(kindNow(), phone, msg); }
  function waUrl(phone, msg) { return chatUrl('phone', phone, msg); }

  /* ------------------------------------------------ barcode scanning with the phone camera */
  var Scanner = {
    supported: function () { return 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
    open: function (cb) {
      var stream = null, stop = false, det;
      try { det = new window.BarcodeDetector(); } catch (e) { return C.toast(L('المسح بالكاميرا غير مدعوم على هذا الجهاز', 'Camera scanning is not supported on this device'), 'warn'); }
      var m = C.modal({ title: L('وجّه الكاميرا نحو الباركود', 'Point the camera at the barcode'), size: 'sm', body: '<video id="sc-v" playsinline muted style="width:100%;border-radius:12px;background:#000;aspect-ratio:4/3;object-fit:cover"></video>',
        onClose: function () { stop = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } });
      var v = m.el.querySelector('#sc-v');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
        stream = s; if (stop) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        v.srcObject = s; v.play();
        (function tick() {
          if (stop) return;
          det.detect(v).then(function (codes) {
            if (codes && codes[0] && codes[0].rawValue) { var code = codes[0].rawValue; m.close(); cb(code); }
            else setTimeout(tick, 250);
          }, function () { setTimeout(tick, 400); });
        })();
      }, function () { m.close(); C.toast(L('لم يُسمح باستخدام الكاميرا', 'Camera access was not allowed'), 'err'); });
    }
  };

  window.WhatsApp = { open: open, message: message, text: text, url: waUrl };
  window.Scanner = Scanner;
})();
