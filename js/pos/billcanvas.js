/* billcanvas.js - draws the A4 bill straight onto canvas pages (for the PDF file that is sent on WhatsApp).
   Every line of text is handed to the browser as ONE whole string, so the browser itself shapes the Arabic and orders
   mixed Arabic / English correctly - the same engine that draws the screen. The layout follows the printed A4 bill
   (js/pos/print.js), page by page, cutting only between rows; the table header repeats on the next page. */
(function () {
  'use strict';
  var C = window.Core, Calc = C.Calc, f3 = C.f3;
  var W = 794, H = 1123, MX = 36, MY = 30, CW = W - 2 * MX;       // A4 at 96 dpi, content width 722
  var FONT = '"Tajawal","Segoe UI",Tahoma,Arial,sans-serif';
  var PX = function (pt) { return pt * 96 / 72; };
  var GREEN = '#0e6b4f', DARK = '#0b4d3a', LINE = '#c9dad1', INK = '#111';
  var AR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
  var STRONG = /[A-Za-z֐-ࣿיִ-﷿ﹰ-﻿]/;
  var mc = document.createElement('canvas').getContext('2d');       // for measuring only

  function rtlOf(s) { var m = String(s).match(STRONG); return !!m && AR.test(m[0]); }
  var forceDir = null;
  function setup(c, s, weight, px) { c.font = weight + ' ' + px + 'px ' + FONT; c.direction = forceDir || (rtlOf(s) ? 'rtl' : 'ltr'); }
  function wid(s, weight, px) { setup(mc, s, weight, px); return mc.measureText(s).width; }
  function wrap(s, maxW, weight, px) {
    var out = [];
    String(s === null || s === undefined ? '' : s).split(/\r?\n/).forEach(function (para) {
      var line = '';
      para.split(' ').forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (wid(t, weight, px) <= maxW || !line) {
          if (!line && wid(w, weight, px) > maxW) {
            var part = '';
            Array.from(w).forEach(function (ch) { if (wid(part + ch, weight, px) > maxW && part) { out.push(part); part = ch; } else part += ch; });
            line = part;
          } else line = t;
        } else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function text(c, s, x, y, o) {
    if (s === '' || s === null || s === undefined) return;
    setup(c, s, o.weight || '400', o.px);
    c.fillStyle = o.color || INK; c.textAlign = o.align || 'left'; c.textBaseline = 'middle';
    c.fillText(String(s), x, y + (o.lh || o.px * 1.45) / 2);
  }
  function round(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
  function hline(c, x, y, w, color, dash) { c.save(); c.strokeStyle = color; c.lineWidth = 1; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(x, y + 0.5); c.lineTo(x + w, y + 0.5); c.stroke(); c.restore(); }

  /* a "label / value" row (label left in grey, value right in bold) */
  function kv(en, ar, val, w, o) {
    o = o || {};
    var px = PX(o.pt || 10), lh = px * 1.45, label = en + ' / ' + ar;
    var lw = wid(label, '400', px), avail = Math.max(w - lw - 12, w * 0.35), fd = o.ltr ? 'ltr' : null;
    forceDir = fd; var lines = wrap(val, avail, '700', px); forceDir = null;
    var h = Math.max(1, lines.length) * lh + 3;
    return { h: h, draw: function (c, x, y) {
      text(c, label, x, y + 1.5, { px: px, color: o.color || '#555', lh: lh });
      forceDir = fd; lines.forEach(function (ln, i) { text(c, ln, x + w, y + 1.5 + i * lh, { px: px, weight: '700', color: o.color || INK, align: 'right', lh: lh }); }); forceDir = null;
      if (o.line) hline(c, x, y + h - 1, w, LINE, [1, 2]);
    } };
  }
  function stackH(parts) { return parts.reduce(function (t, p) { return t + p.h; }, 0); }
  function drawStack(c, parts, x, y) { parts.forEach(function (p) { p.draw(c, x, y); y += p.h; }); }
  function box(titleEn, titleAr, rows, w, minH) {
    var tpx = PX(9), th = tpx * 1.45 + 7, inner = w - 20, h = Math.max(7 + th + stackH(rows) + 7, minH || 0);
    return { h: h, draw: function (c, x, y) {
      c.save(); c.strokeStyle = '#b9d0c5'; c.lineWidth = 1; round(c, x + 0.5, y + 0.5, w - 1, h - 1, 6); c.stroke(); c.restore();
      text(c, titleEn, x + 10, y + 7, { px: tpx, weight: '800', color: DARK });
      text(c, titleAr, x + w - 10, y + 7, { px: tpx, weight: '800', color: DARK, align: 'right' });
      hline(c, x + 10, y + 7 + tpx * 1.45 + 2, inner, '#dbe8e1');
      drawStack(c, rows, x + 10, y + 7 + th);
    } };
  }
  function noteBox(str, w) {
    var px = PX(9.5), lh = px * 1.45, lines = wrap(str, w - 22, '400', px), h = lines.length * lh + 14;
    return { h: h + 8, draw: function (c, x, y) {
      c.save(); c.strokeStyle = '#b9d0c5'; c.lineWidth = 1; c.setLineDash([3, 3]); round(c, x + 0.5, y + 0.5, w - 1, h - 1, 6); c.stroke(); c.restore();
      lines.forEach(function (l, i) { var r = rtlOf(l); text(c, l, r ? x + w - 10 : x + 10, y + 7 + i * lh, { px: px, color: '#333', lh: lh, align: r ? 'right' : 'left' }); });
    } };
  }

  function header(inv, s, tax, logo) {
    var LW = logo ? 118 : 0, LH = logo ? Math.min(92, Math.round(LW * logo.height / logo.width)) : 0;
    if (logo && LH === 92) LW = Math.round(92 * logo.width / logo.height);
    var colW = (CW - LW - 28) / 2, sm = PX(9.5), smLh = sm * 1.45;
    function lines(list) {
      var out = [];
      list.forEach(function (it) {
        if (!it.t) return;
        if (it.big) { var bp = PX(15); [PX(15), PX(13.5), PX(12)].some(function (p) { bp = p; return wid(it.t, '800', p) <= colW; }); wrap(it.t, colW, '800', bp).forEach(function (ln) { out.push({ t: ln, px: bp, w: '800', color: DARK, lh: bp * 1.25 }); }); return; }
        wrap(it.t, colW, it.b ? '700' : '400', sm).forEach(function (ln) { out.push({ t: ln, px: sm, w: it.b ? '700' : '400', color: '#444', lh: smLh }); });
      });
      return out;
    }
    var LL = lines([{ t: s.name, big: true }, { t: s.activity }, { t: s.addr }, { t: 'Tel: ' + (s.phone || '') + (s.email ? '  |  ' + s.email : '') },
      { t: s.cr ? 'C.R. No: ' + s.cr : '', b: true }, { t: tax && s.vatNo ? 'VATIN: ' + s.vatNo : '', b: true }]);
    var RL = lines([{ t: s.nameAr || s.name, big: true }, { t: s.activityAr }, { t: s.addrAr }, { t: 'هاتف: ' + (s.phone || '') },
      { t: s.cr ? 'السجل التجاري: ' + s.cr : '', b: true }, { t: tax && s.vatNo ? 'الرقم الضريبي: ' + s.vatNo : '', b: true }]);
    var sum = function (a) { return a.reduce(function (t, l) { return t + l.lh; }, 0); }, body = Math.max(sum(LL), sum(RL), LH), h = body + 10 + 3;
    return { h: h + 4, draw: function (c, x, y) {
      var yy = y; LL.forEach(function (l) { text(c, l.t, x, yy, { px: l.px, weight: l.w, color: l.color, lh: l.lh }); yy += l.lh; });
      yy = y; RL.forEach(function (l) { text(c, l.t, x + CW, yy, { px: l.px, weight: l.w, color: l.color, lh: l.lh, align: 'right' }); yy += l.lh; });
      if (logo) c.drawImage(logo, x + CW / 2 - LW / 2, y + (body - LH) / 2, LW, LH);
      rect(c, x, y + h - 3, CW, 3, GREEN);
    } };
  }

  function blocks(inv, s, logo) {
    var tax = inv.vatPct > 0, paid = Calc.paid(inv), bal = Calc.balance(inv), dt = Print.docType(inv), st = Print.saleType(inv), out = [];
    var gap = function (n) { out.push({ h: n, draw: function () {} }); };
    out.push(header(inv, s, tax, logo));
    var th = 12 + PX(15) * 1.45 + PX(11) * 1.45 + 8 + (inv.void ? 46 : 0);
    out.push({ h: th, draw: function (c, x, y) {
      text(c, dt[0], x + CW / 2, y + 12, { px: PX(15), weight: '800', color: DARK, align: 'center' });
      text(c, dt[1], x + CW / 2, y + 12 + PX(15) * 1.45, { px: PX(11), weight: '700', color: '#555', align: 'center' });
      if (inv.void) {
        c.save(); c.translate(x + CW / 2, y + th - 24); c.rotate(-6 * Math.PI / 180);
        var t = 'VOID / ملغاة', tw = wid(t, '800', PX(18)) + 28;
        c.strokeStyle = '#d43d51'; c.lineWidth = 3; round(c, -tw / 2, -18, tw, 36, 8); c.stroke();
        text(c, t, 0, -18, { px: PX(18), weight: '800', color: '#d43d51', align: 'center', lh: 36 }); c.restore();
      }
    } });

    var half = (CW - 10) / 2, inner = half - 20;
    var cust = [kv('Name', 'الاسم', inv.customerName || 'Cash customer / عميل نقدي', inner)];
    if (inv.customerPhone) cust.push(kv('Phone', 'الهاتف', inv.customerPhone, inner, { ltr: true }));
    if (inv.customerVat) cust.push(kv('Customer VATIN', 'الرقم الضريبي للعميل', inv.customerVat, inner, { ltr: true }));
    var info = [kv('Invoice No', 'رقم الفاتورة', inv.number || '', inner, { ltr: true }), kv('Date', 'التاريخ', C.fdate(inv.date) + ' ' + (inv.time || ''), inner, { ltr: true }),
      kv('Sale type', 'نوع البيع', st[0] + ' / ' + st[1], inner)];
    if (inv.createdBy) info.push(kv('Prepared by', 'أعدّها', inv.createdBy, inner));
    var mh = Math.max(box('', '', cust, half).h, box('', '', info, half).h);
    var bc = box('CUSTOMER', 'العميل', cust, half, mh), bi = box('INVOICE', 'الفاتورة', info, half, mh);
    out.push({ h: mh + 10, draw: function (c, x, y) { bc.draw(c, x, y); bi.draw(c, x + half + 10, y); } });
    if (inv.note) out.push(noteBox('Note / ملاحظة: ' + inv.note, CW));

    var cols = [30, 0, 104, 70, 92, 116]; cols[1] = CW - cols[0] - cols[2] - cols[3] - cols[4] - cols[5];
    var xs = []; cols.reduce(function (a, w, i) { xs[i] = a; return a + w; }, 0);
    var hpx = PX(9), thH = hpx * 1.45 + 14;
    var head = { table: 'head', h: thH, draw: function (c, x, y) {
      rect(c, x, y, CW, thH, GREEN);
      var hy = y + 7, o = { px: hpx, weight: '800', color: '#fff' };
      text(c, '#', x + xs[0] + cols[0] / 2, hy, Object.assign({ align: 'center' }, o));
      text(c, 'Description / الوصف', x + xs[1] + 7, hy, o);
      text(c, 'Unit / الوحدة', x + xs[2] + cols[2] / 2, hy, Object.assign({ align: 'center' }, o));
      text(c, 'Qty / الكمية', x + xs[3] + cols[3] / 2, hy, Object.assign({ align: 'center' }, o));
      text(c, 'Price / السعر', x + xs[4] + cols[4] - 7, hy, Object.assign({ align: 'right' }, o));
      text(c, 'Amount / المبلغ', x + xs[5] + cols[5] - 7, hy, Object.assign({ align: 'right' }, o));
    } };
    out.push(head);
    var tpx = PX(10), tlh = tpx * 1.45, apx = PX(9), alh = apx * 1.45;
    inv.items.forEach(function (it, i) {
      var nameL = wrap(it.n || it.a || '', cols[1] - 14, '400', tpx);
      var enL = it.a && it.a !== it.n ? wrap(it.a, cols[1] - 14, '400', apx) : [];
      var unitL = wrap(Print.unitText(it), cols[2] - 12, '400', apx), packs = it.f > 1 ? '×' + C.qf(it.f) : '';     // 'x24' on its own line, so it never lands between the English and Arabic unit names
      var rh = Math.max(nameL.length * tlh + enL.length * alh, (unitL.length + (packs ? 1 : 0)) * alh, tlh) + 11;
      out.push({ table: 'row', h: rh, draw: function (c, x, y) {
        c.save(); c.strokeStyle = LINE; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, CW - 1, rh - 1);
        xs.slice(1).forEach(function (cx) { c.beginPath(); c.moveTo(x + cx + 0.5, y); c.lineTo(x + cx + 0.5, y + rh); c.stroke(); });
        c.restore();
        text(c, String(i + 1), x + xs[0] + cols[0] / 2, y + 5, { px: tpx, align: 'center' });
        nameL.forEach(function (ln, k) { var r = rtlOf(ln); text(c, ln, r ? x + xs[1] + cols[1] - 7 : x + xs[1] + 7, y + 5 + k * tlh, { px: tpx, align: r ? 'right' : 'left' }); });
        enL.forEach(function (ln, k) { text(c, ln, x + xs[1] + 7, y + 5 + nameL.length * tlh + k * alh, { px: apx, color: '#555', lh: alh }); });
        unitL.forEach(function (ln, k) { text(c, ln, x + xs[2] + cols[2] / 2, y + 5 + k * alh, { px: apx, align: 'center', lh: alh }); });
        if (packs) { forceDir = 'ltr'; text(c, packs, x + xs[2] + cols[2] / 2, y + 5 + unitL.length * alh, { px: apx, align: 'center', lh: alh, color: '#555' }); forceDir = null; }
        text(c, C.qf(it.q), x + xs[3] + cols[3] / 2, y + 5, { px: tpx, align: 'center' });
        text(c, f3(it.price), x + xs[4] + cols[4] - 7, y + 5, { px: tpx, align: 'right' });
        text(c, f3(Calc.line(it)), x + xs[5] + cols[5] - 7, y + 5, { px: tpx, align: 'right' });
      } });
    });
    gap(10);

    var lw = (CW - 14) * 1.1 / 2.1, rw = CW - 14 - lw, left = [], right = [];
    if (s.bank) left.push(noteBox('Bank / البنك: ' + s.bank, lw));
    if (inv.payments && inv.payments.length) {
      var pm = inv.payments.map(function (p) {
        var n = Print.PAYM[p.method] || [p.method, p.method], label = C.fdate(p.date) + ' · ' + n[0] + ' / ' + n[1], px = PX(10), lh = px * 1.45;
        return { h: lh + 3, draw: function (c, x, y) { text(c, label, x, y + 1.5, { px: px, color: '#555', lh: lh }); text(c, f3(p.amount), x + lw - 20, y + 1.5, { px: px, weight: '700', align: 'right', lh: lh }); } };
      });
      left.push(box('PAYMENTS RECEIVED', 'الدفعات المستلمة', pm, lw));
    }
    var tr = function (en, ar, val, red) { var r = kv(en, ar, val, rw, { pt: 10.5, line: true, ltr: true, color: red ? '#b00020' : null }); r.h += 3; return r; };
    right.push(tr('Sub-total', 'المجموع', f3(inv.sub)));
    if (inv.discount > 0) right.push(tr('Discount', 'الخصم', '-' + f3(inv.discount)));
    if (tax) { right.push(tr('Taxable amount', 'المبلغ الخاضع للضريبة', f3(inv.sub - inv.discount))); right.push(tr('VAT ' + inv.vatPct + '%', 'ضريبة القيمة المضافة', f3(inv.vat))); }
    var gpx = PX(13), gh = gpx * 1.45 + 14;
    right.push({ h: gh + 10, draw: function (c, x, y) {
      c.fillStyle = GREEN; round(c, x, y + 5, rw, gh, 5); c.fill();
      text(c, 'TOTAL / الإجمالي (OMR)', x + 10, y + 12, { px: gpx, weight: '800', color: '#fff' });
      text(c, f3(inv.total), x + rw - 10, y + 12, { px: gpx, weight: '800', color: '#fff', align: 'right' });
    } });
    right.push(tr('Paid', 'المدفوع', f3(paid)));
    if (bal > 0.0004) right.push(tr('Balance due', 'المتبقي', f3(bal), true));
    out.push({ h: Math.max(stackH(left), stackH(right)) + 4, draw: function (c, x, y) { drawStack(c, left, x, y); drawStack(c, right, x + lw + 14, y); } });

    var sw = (CW - 52) / 3, spx = PX(9.5), sg = ['Prepared by / أعدّها', 'Customer signature / توقيع العميل', 'Stamp / الختم'];
    var fpx = PX(9), flh = fpx * 1.45, fl = wrap([s.footerAr, s.footer].filter(Boolean).join(' · ') + (s.terms ? '\n' + s.terms : ''), CW, '400', fpx), sgH = 34 + spx * 1.45 + 5;
    out.push({ h: sgH + 22 + fl.length * flh + 6, draw: function (c, x, y) {
      sg.forEach(function (g, i) { var sx = x + i * (sw + 26); rect(c, sx, y + 34, sw, 1, '#555'); text(c, g, sx + sw / 2, y + 38, { px: spx, color: '#444', align: 'center' }); });
      hline(c, x, y + sgH + 16, CW, '#dbe8e1');
      fl.forEach(function (ln, i) { text(c, ln, x + CW / 2, y + sgH + 22 + i * flh, { px: fpx, color: '#555', align: 'center', lh: flh }); });
    } });
    return out;
  }

  /* put the blocks on A4 pages and paint them. Resolves to an array of canvases. */
  function render(inv, noLogo, scale) {
    var s = Store.s.settings; scale = scale || 2;
    var fonts = document.fonts && document.fonts.load ? Promise.all(['400', '500', '700', '800'].map(function (w) { return document.fonts.load(w + ' 14px Tajawal', 'ابجد abc 123'); })).catch(function () {}) : Promise.resolve();
    var logoP = new Promise(function (ok) {
      if (noLogo || !s.logo) return ok(null);
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
      im.src = Media.url(s.logo);
    });
    return Promise.all([fonts, logoP]).then(function (r) {
      var list = blocks(inv, s, r[1]), pages = [], cur = [], y = MY, limit = H - 16, head = list.filter(function (b) { return b.table === 'head'; })[0];
      list.forEach(function (b) {
        if (y + b.h > limit && cur.length) {
          pages.push(cur); cur = []; y = MY;
          if (b.table === 'row' && head) { cur.push({ b: head, y: y }); y += head.h; }
        }
        cur.push({ b: b, y: y }); y += b.h;
      });
      pages.push(cur);
      return pages.map(function (items) {
        var cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
        var c = cv.getContext('2d'); c.scale(scale, scale); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
        items.forEach(function (it) { it.b.draw(c, MX, it.y); });
        return cv;
      });
    });
  }

  /* ------------------------------------------------ the receipt-roll bill (80 mm / 58 mm) as ONE long page.
     Same words and order as the printed receipt (js/pos/print.js), in the language of the screen. */
  function renderReceipt(inv, narrow, noLogo, scale) {
    var s = Store.s.settings, ar = C.lang === 'ar', w = Print.words(), dt = Print.docType(inv), tax = inv.vatPct > 0; scale = scale || 3;
    var Wmm = narrow ? 58 : 80, WP = Math.round(Wmm * 96 / 25.4), M = narrow ? 9 : 13, CWr = WP - 2 * M;
    var base = narrow ? 11 : 12.5, lh = base * 1.5, ops = [];
    var startX = ar ? M + CWr : M, endX = ar ? M : M + CWr, startAl = ar ? 'right' : 'left', endAl = ar ? 'left' : 'right';
    var centre = function (str, px, weight, color) {
      if (!str) return;
      wrap(str, CWr, weight || '400', px).forEach(function (ln) { ops.push({ h: px * 1.45, draw: function (c, y) { text(c, ln, M + CWr / 2, y, { px: px, weight: weight || '400', align: 'center', color: color || '#000' }); } }); });
    };
    var rule = function () { ops.push({ h: 11, draw: function (c, y) { hline(c, M, y + 5, CWr, '#000', [3, 3]); } }); };
    var row = function (label, value, o) {
      o = o || {};
      var px = o.px || base, wt = o.bold ? '800' : '400', lw = wid(label, wt, px), room = Math.max(CWr - lw - 10, CWr * 0.4);
      var lines = wrap(String(value), room, '700', px), hh = px * 1.5;
      ops.push({ h: Math.max(1, lines.length) * hh, draw: function (c, y) {
        text(c, label, startX, y, { px: px, weight: wt, align: startAl, lh: hh, color: o.color || '#000' });
        lines.forEach(function (ln, i) { text(c, ln, endX, y + i * hh, { px: px, weight: o.bold ? '800' : '700', align: endAl, lh: hh, color: o.color || '#000' }); });
      } });
    };
    var fonts = document.fonts && document.fonts.load ? Promise.all(['400', '700', '800'].map(function (x) { return document.fonts.load(x + ' 14px Tajawal', 'ابجد abc 123'); })).catch(function () {}) : Promise.resolve();
    var logoP = new Promise(function (ok) {
      if (noLogo || !s.logo) return ok(null);
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
      im.src = Media.url(s.logo);
    });
    return Promise.all([fonts, logoP]).then(function (r) {
      var logo = r[1];
      if (logo) { var lw2 = Math.min(narrow ? 78 : 104, CWr), lh2 = Math.round(lw2 * logo.height / logo.width); ops.push({ h: lh2 + 6, draw: function (c, y) { c.drawImage(logo, M + (CWr - lw2) / 2, y, lw2, lh2); } }); }
      centre(ar ? s.nameAr || s.name : s.name || s.nameAr, narrow ? 15 : 17, '800');
      centre(ar ? s.name : s.nameAr, base, '700');
      centre(ar ? s.addrAr : s.addr, base - 1);
      centre(w.tel + ': ' + (s.phone || ''), base - 1);
      if (s.cr) centre(w.cr + ': ' + s.cr, base - 1);
      if (tax && s.vatNo) centre(w.vatin + ': ' + s.vatNo, base - 1);
      rule();
      centre(ar ? dt[1] : dt[0], base + 2.5, '800');
      if (inv.void) centre(w.voided, base + 3, '800', '#d43d51');
      row(w.no, inv.number || ''); row(w.date, C.fdate(inv.date) + ' ' + (inv.time || '')); row(w.type, inv.type === 'wholesale' ? w.wholesale : w.retail);
      if (inv.customerName) row(w.customer, inv.customerName);
      if (inv.customerPhone) row(w.phone, inv.customerPhone);
      if (inv.createdBy) row(w.seller, inv.createdBy);
      rule();
      inv.items.forEach(function (it) {
        var name = ar || !it.a ? it.n : it.a, unit = ar || !it.unitEn ? it.unit || '' : it.unitEn;
        wrap(name, CWr, '700', base).forEach(function (ln) { ops.push({ h: lh, draw: function (c, y) { text(c, ln, startX, y, { px: base, weight: '700', align: startAl, lh: lh }); } }); });
        var qty = C.qf(it.q) + ' ' + unit + ' × ' + f3(it.price);
        ops.push({ h: lh + 5, draw: function (c, y) {
          text(c, qty, startX, y, { px: base - 0.5, align: startAl, lh: lh, color: '#333' });
          text(c, f3(Calc.line(it)), endX, y, { px: base, weight: '700', align: endAl, lh: lh });
          hline(c, M, y + lh + 2, CWr, '#999', [1, 2]);
        } });
      });
      ops.push({ h: 4, draw: function () {} });
      row(w.sub, f3(inv.sub));
      if (inv.discount > 0) row(w.disc, '-' + f3(inv.discount));
      if (tax) row(w.vat + ' ' + inv.vatPct + '%', f3(inv.vat));
      row(w.total, f3(inv.total), { px: base + 3.5, bold: true });
      row(w.paid, f3(Calc.paid(inv)));
      if (Calc.balance(inv) > 0.0004) row(w.bal, f3(Calc.balance(inv)), { color: '#b00020', bold: true });
      if (inv.note) { rule(); wrap(inv.note, CWr, '400', base).forEach(function (ln) { ops.push({ h: lh, draw: function (c, y) { var rt = rtlOf(ln); text(c, ln, rt ? M + CWr : M, y, { px: base, align: rt ? 'right' : 'left', lh: lh }); } }); }); }
      rule();
      centre(ar ? s.footerAr || s.footer : s.footer || s.footerAr, base);
      var HP = Math.ceil(ops.reduce(function (t, o) { return t + o.h; }, 0) + 2 * M + 4);
      var cv = document.createElement('canvas'); cv.width = Math.round(WP * scale); cv.height = Math.round(HP * scale);
      var c = cv.getContext('2d'); c.scale(scale, scale); c.fillStyle = '#fff'; c.fillRect(0, 0, WP, HP);
      var y = M; ops.forEach(function (o) { o.draw(c, y); y += o.h; });
      cv._pt = [WP * 72 / 96, HP * 72 / 96];                  // the page size of this receipt, in PDF points
      return [cv];
    });
  }

  /* ------------------------------------------------ the PDF file: one full-page JPEG per page, written by hand (no library) */
  function jpegBytes(canvas) {
    var bin = atob(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function pdfFrom(list) {
    var enc = new TextEncoder(), chunks = [], pos = 0, offs = {};
    function push(u) { chunks.push(u); pos += u.length; }
    function str(s) { push(enc.encode(s)); }
    function begin(n) { offs[n] = pos; str(n + ' 0 obj\n'); }
    var n = list.length;
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    begin(1); str('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    var kids = []; for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    begin(2); str('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\nendobj\n');
    list.forEach(function (p, i) {
      var page = 3 + i * 3, content = page + 1, img = page + 2, pw = p.pw.toFixed(2), ph = p.ph.toFixed(2), cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
      begin(page); str('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + img + ' 0 R >> >> /Contents ' + content + ' 0 R >>\nendobj\n');
      begin(content); str('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream\nendobj\n');
      begin(img); str('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length + ' >>\nstream\n');
      push(p.bytes); str('\nendstream\nendobj\n');
    });
    var total = 3 + n * 3, xref = pos;
    str('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (var k = 1; k < total; k++) str(String(offs[k]).padStart(10, '0') + ' 00000 n \n');
    str('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  }
  /* size: 'a4' (default) | '80' | '58' */
  function build(inv, size, noLogo) {
    var job = size === '80' || size === '58' ? renderReceipt(inv, size === '58', noLogo) : render(inv, noLogo);
    return job.then(function (canvases) {
      var list = canvases.map(function (cv) { return { bytes: jpegBytes(cv), w: cv.width, h: cv.height, pw: cv._pt ? cv._pt[0] : 595.28, ph: cv._pt ? cv._pt[1] : 841.89 }; });
      var blob = pdfFrom(list), name = (String(inv.number || 'invoice').replace(/[^A-Za-z0-9_-]/g, '') || 'invoice') + '.pdf', file = null;
      try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) { /* old browser: download only */ }
      return { blob: blob, name: name, file: file, pages: list.length, size: size || 'a4' };
    });
  }
  /* If the browser refuses to export the picture because of the logo, the PDF is made again without it. */
  function make(inv, size) { return build(inv, size, false).catch(function () { return build(inv, size, true); }); }
  function download(r) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(r.blob); a.download = r.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function canShare(r) { try { return !!(r && r.file && navigator.canShare && navigator.canShare({ files: [r.file] })); } catch (e) { return false; } }
  function share(r) {
    if (!canShare(r)) return Promise.resolve('unsupported');
    return navigator.share({ files: [r.file] }).then(function () { return 'shared'; }, function (e) { return e && e.name === 'AbortError' ? 'cancel' : 'unsupported'; });
  }

  window.Pdf = { make: make, download: download, share: share, canShare: canShare, render: render, renderReceipt: renderReceipt };
})();
