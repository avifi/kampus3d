/* Kampus 3D: pembuat kode QR tanpa pustaka luar (mode byte UTF-8, koreksi galat tingkat M, versi 1-40).
   Algoritme mengikuti ISO/IEC 18004 (struktur mengacu pada implementasi Project Nayuki, lisensi MIT).
   Juga berisi jendela pratinjau, unduh PNG, dan cetak label untuk ditempel di pintu ruang. */
(function (global) {
  'use strict';

  /* ---------- encoder ---------- */
  // Indeks = versi. Hanya tingkat M (bit format 0).
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
    26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16,
    17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var FORMAT_BITS_M = 0;

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) { r -= 36; }
    }
    return r;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) { res.push(0); }
    res.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) { res[j] ^= res[j + 1]; }
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ res.shift();
      res.push(0);
      div.forEach(function (c, i) { res[i] ^= gfMul(c, f); });
    });
    return res;
  }

  function utf8(text) {
    var s = unescape(encodeURIComponent(String(text)));
    var out = [];
    for (var i = 0; i < s.length; i++) { out.push(s.charCodeAt(i)); }
    return out;
  }

  function encode(text) {
    var bytes = utf8(text);
    var ver = 0;
    for (var v = 1; v <= 40; v++) {
      var cc = v < 10 ? 8 : 16;
      if (4 + cc + bytes.length * 8 <= dataCodewords(v) * 8) { ver = v; break; }
    }
    if (!ver) { throw new Error('Teks terlalu panjang untuk kode QR.'); }

    // aliran bit
    var bits = [];
    var put = function (val, len) { for (var i = len - 1; i >= 0; i--) { bits.push((val >>> i) & 1); } };
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) { put(pad, 8); }
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) { byte = (byte << 1) | bits[i + j]; }
      data.push(byte);
    }

    // koreksi galat dan penyisipan blok
    var nb = NUM_BLOCKS[ver];
    var eccLen = ECC_PER_BLOCK[ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb;
    var shortLen = Math.floor(raw / nb);
    var div = rsDivisor(eccLen);
    var blocks = [];
    for (var b = 0, k = 0; b < nb; b++) {
      var dat = data.slice(k, k + shortLen - eccLen + (b < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (b < nShort) { dat.push(0); }
      blocks.push(dat.concat(ecc));
    }
    var cw = [];
    for (var c = 0; c < blocks[0].length; c++) {
      for (var bl = 0; bl < blocks.length; bl++) {
        if (c !== shortLen - eccLen || bl >= nShort) { cw.push(blocks[bl][c]); }
      }
    }

    // matriks
    var size = ver * 4 + 17;
    var mod = [];
    var fn = [];
    for (var y = 0; y < size; y++) {
      mod.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    var setF = function (x, yy, dark) { mod[yy][x] = dark; fn[yy][x] = true; };

    for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
    var finder = function (cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy));
          var xx = cx + dx, yy = cy + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) { setF(xx, yy, d !== 2 && d !== 4); }
        }
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      for (var p = size - 7; align.length < na - 1; p -= step) { align.unshift(p); }
      align.unshift(6);
    }
    for (var ai = 0; ai < align.length; ai++) {
      for (var aj = 0; aj < align.length; aj++) {
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === align.length - 1) || (ai === align.length - 1 && aj === 0)) { continue; }
        for (var ady = -2; ady <= 2; ady++) {
          for (var adx = -2; adx <= 2; adx++) {
            setF(align[ai] + adx, align[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
          }
        }
      }
    }

    var bit = function (v2, i2) { return ((v2 >>> i2) & 1) !== 0; };
    var drawFormat = function (mask) {
      var d = (FORMAT_BITS_M << 3) | mask;
      var rem = d;
      for (var i3 = 0; i3 < 10; i3++) { rem = (rem << 1) ^ ((rem >>> 9) * 0x537); }
      var fb = ((d << 10) | rem) ^ 0x5412;
      for (var a = 0; a <= 5; a++) { setF(8, a, bit(fb, a)); }
      setF(8, 7, bit(fb, 6));
      setF(8, 8, bit(fb, 7));
      setF(7, 8, bit(fb, 8));
      for (var a2 = 9; a2 < 15; a2++) { setF(14 - a2, 8, bit(fb, a2)); }
      for (var a3 = 0; a3 < 8; a3++) { setF(size - 1 - a3, 8, bit(fb, a3)); }
      for (var a4 = 8; a4 < 15; a4++) { setF(8, size - 15 + a4, bit(fb, a4)); }
      setF(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      var vr = ver;
      for (var q = 0; q < 12; q++) { vr = (vr << 1) ^ ((vr >>> 11) * 0x1F25); }
      var vb = (ver << 12) | vr;
      for (var s = 0; s < 18; s++) {
        var aa = size - 11 + s % 3, bb = Math.floor(s / 3);
        setF(aa, bb, bit(vb, s));
        setF(bb, aa, bit(vb, s));
      }
    }

    // kode data, zig-zag dua kolom
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) { right = 5; }
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var up = ((right + 1) & 2) === 0;
          var yy2 = up ? size - 1 - vert : vert;
          if (!fn[yy2][x] && bi < cw.length * 8) {
            mod[yy2][x] = bit(cw[bi >>> 3], 7 - (bi & 7));
            bi++;
          }
        }
      }
    }

    var maskFn = [
      function (x2, y2) { return (x2 + y2) % 2 === 0; },
      function (x2, y2) { return y2 % 2 === 0; },
      function (x2) { return x2 % 3 === 0; },
      function (x2, y2) { return (x2 + y2) % 3 === 0; },
      function (x2, y2) { return (Math.floor(x2 / 3) + Math.floor(y2 / 2)) % 2 === 0; },
      function (x2, y2) { return x2 * y2 % 2 + x2 * y2 % 3 === 0; },
      function (x2, y2) { return (x2 * y2 % 2 + x2 * y2 % 3) % 2 === 0; },
      function (x2, y2) { return ((x2 + y2) % 2 + x2 * y2 % 3) % 2 === 0; }
    ];
    var applyMask = function (m) {
      for (var y3 = 0; y3 < size; y3++) {
        for (var x3 = 0; x3 < size; x3++) {
          if (!fn[y3][x3] && maskFn[m](x3, y3)) { mod[y3][x3] = !mod[y3][x3]; }
        }
      }
    };
    // Penalti sederhana (deretan panjang, blok 2x2, pola mirip finder, keseimbangan gelap/terang).
    var penalty = function () {
      var sc = 0, dark = 0;
      var line = function (get) {
        var run = 1, s2 = 0, hist = '';
        for (var i4 = 0; i4 < size; i4++) {
          var cur = get(i4);
          hist += cur ? '1' : '0';
          if (i4 > 0 && cur === get(i4 - 1)) {
            run++;
            if (run === 5) { s2 += 3; } else if (run > 5) { s2++; }
          } else { run = 1; }
        }
        var re = /(?=10111010000|00001011101)/g;
        while (re.exec(hist)) { s2 += 40; re.lastIndex++; }
        return s2;
      };
      for (var y4 = 0; y4 < size; y4++) {
        sc += line(function (i5) { return mod[y4][i5]; });
        sc += line(function (i5) { return mod[i5][y4]; });
        for (var x4 = 0; x4 < size; x4++) {
          if (mod[y4][x4]) { dark++; }
          if (x4 < size - 1 && y4 < size - 1) {
            var c0 = mod[y4][x4];
            if (c0 === mod[y4][x4 + 1] && c0 === mod[y4 + 1][x4] && c0 === mod[y4 + 1][x4 + 1]) { sc += 3; }
          }
        }
      }
      var total = size * size;
      sc += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
      return sc;
    };
    var best = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      var pen = penalty();
      if (pen < bestScore) { best = m; bestScore = pen; }
      applyMask(m); // XOR dua kali = kembali semula
    }
    applyMask(best);
    drawFormat(best);

    return { size: size, version: ver, modules: mod, get: function (x5, y5) { return mod[y5][x5]; } };
  }

  /* ---------- gambar ---------- */
  function drawQr(ctx, qr, x, y, px) {
    ctx.fillStyle = '#000000';
    for (var yy = 0; yy < qr.size; yy++) {
      for (var xx = 0; xx < qr.size; xx++) {
        if (qr.modules[yy][xx]) { ctx.fillRect(x + xx * px, y + yy * px, px, px); }
      }
    }
  }

  function wrapText(ctx, text, maxW, maxLines) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) { cur = t; } else { lines.push(cur); cur = w; }
    });
    if (cur) { lines.push(cur); }
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) { last = last.slice(0, -1); }
      lines[maxLines - 1] = last + '…';
    }
    return lines.map(function (l) {
      while (l.length > 1 && ctx.measureText(l).width > maxW) { l = l.slice(0, -2) + '…'; }
      return l;
    });
  }

  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  /** Kanvas label siap cetak: kode QR, judul, keterangan, dan alamat. item = {judul, sub, url}. */
  function makeLabel(item, width) {
    var W = width || 640;
    var pad = Math.round(W * 0.06);
    var qr = encode(item.url);
    var inner = W - pad * 2;
    var px = Math.max(1, Math.floor(inner / (qr.size + 8)));
    var qrW = px * (qr.size + 8);
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');

    var fT = Math.round(W * 0.052), fS = Math.round(W * 0.031), fU = Math.round(W * 0.024);
    ctx.font = '700 ' + fT + 'px ' + FONT;
    var tLines = wrapText(ctx, item.judul || 'Tanpa judul', inner, 2);
    ctx.font = fS + 'px ' + FONT;
    var sLines = item.sub ? wrapText(ctx, item.sub, inner, 2) : [];

    var H = pad + qrW + Math.round(fT * 0.5) + tLines.length * Math.round(fT * 1.25)
      + sLines.length * Math.round(fS * 1.35) + Math.round(fU * 1.2) * 2 + pad;
    cv.width = W;
    cv.height = H;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    drawQr(ctx, qr, Math.round((W - qrW) / 2) + px * 4, pad + px * 4, px);

    var y = pad + qrW + Math.round(fT * 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#111111';
    ctx.font = '700 ' + fT + 'px ' + FONT;
    tLines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += Math.round(fT * 1.25); });
    ctx.fillStyle = '#444444';
    ctx.font = fS + 'px ' + FONT;
    sLines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += Math.round(fS * 1.35); });
    ctx.fillStyle = '#666666';
    ctx.font = fU + 'px ' + FONT;
    ctx.fillText('Pindai untuk melihat lokasinya di peta 3D kampus', W / 2, y);
    y += Math.round(fU * 1.2);
    ctx.font = fU + 'px ui-monospace, Consolas, monospace';
    ctx.fillText(wrapText(ctx, item.url, inner, 1)[0] || '', W / 2, y);
    return cv;
  }

  function slug(s) {
    return String(s || 'objek').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'objek';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /** Membuka jendela cetak berisi satu atau banyak label. Mengembalikan FALSE bila jendela diblokir. */
  function printLabels(items, judulHalaman) {
    var w = window.open('', '_blank');
    if (!w) { return false; }
    var many = items.length > 1;
    var html = items.map(function (it) {
      return '<figure><img src="' + makeLabel(it, 900).toDataURL('image/png') + '" alt="Kode QR ' + esc(it.judul || '') + '"></figure>';
    }).join('');
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>' + esc(judulHalaman || 'Label kode QR') + '</title>'
      + '<style>@page{size:A4;margin:12mm}body{margin:0;font-family:system-ui,sans-serif}'
      + '.grid{display:grid;grid-template-columns:' + (many ? '1fr 1fr' : '1fr') + ';gap:8mm;justify-items:center}'
      + 'figure{margin:0;break-inside:avoid;page-break-inside:avoid;border:0.3mm dashed #bbb;padding:3mm}'
      + 'img{display:block;width:' + (many ? '80mm' : '110mm') + ';height:auto}'
      + '.tip{font-size:12px;color:#555;margin:0 0 6mm}@media print{.tip{display:none}}</style></head><body>'
      + '<p class="tip">Jendela cetak terbuka otomatis. Garis putus-putus adalah batas potong.</p>'
      + '<div class="grid">' + html + '</div>'
      + '<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script></body></html>');
    w.document.close();
    return true;
  }

  /* ---------- jendela pratinjau ---------- */
  var dlg = null;
  var current = null;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'qr-dlg';
    dlg.setAttribute('aria-labelledby', 'k3dQrTitle');
    dlg.innerHTML = '<h2 id="k3dQrTitle">Kode QR</h2>'
      + '<p class="note" id="k3dQrInfo"></p>'
      + '<img id="k3dQrImg" alt="">'
      + '<p class="mono" id="k3dQrUrl"></p>'
      + '<div class="row">'
      + '<a class="btn primary" id="k3dQrDl" download>Unduh PNG</a>'
      + '<button class="btn" type="button" id="k3dQrPrint">Cetak</button>'
      + '<button class="btn" type="button" id="k3dQrCopy">Salin tautan</button>'
      + '<button class="btn" type="button" id="k3dQrClose">Tutup</button>'
      + '</div>';
    document.body.appendChild(dlg);
    dlg.querySelector('#k3dQrClose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
    dlg.querySelector('#k3dQrPrint').addEventListener('click', function () {
      if (current && !printLabels([current], 'Kode QR ' + (current.judul || ''))) {
        dlg.querySelector('#k3dQrInfo').textContent = 'Jendela cetak diblokir peramban. Izinkan pop-up untuk situs ini, atau unduh PNG lalu cetak.';
      }
    });
    dlg.querySelector('#k3dQrCopy').addEventListener('click', function () {
      if (!current) { return; }
      var info = dlg.querySelector('#k3dQrInfo');
      var done = function () { info.textContent = 'Tautan disalin.'; };
      var fail = function () { info.textContent = 'Salin tautan di bawah gambar secara manual.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(current.url).then(done, fail); } else { fail(); }
    });
  }

  /** item = {id, judul, sub, url, catatan} */
  function openDialog(item) {
    if (!dlg) { build(); }
    current = item;
    var url = makeLabel(item, 640).toDataURL('image/png');
    dlg.querySelector('#k3dQrTitle').textContent = 'Kode QR: ' + (item.judul || 'tanpa judul');
    dlg.querySelector('#k3dQrInfo').textContent = item.catatan || 'Unduh atau cetak, lalu tempel di pintu. Pengunjung yang memindai langsung diarahkan ke objek ini.';
    dlg.querySelector('#k3dQrImg').src = url;
    dlg.querySelector('#k3dQrImg').alt = 'Kode QR menuju ' + (item.judul || 'objek');
    dlg.querySelector('#k3dQrUrl').textContent = item.url;
    var a = dlg.querySelector('#k3dQrDl');
    a.href = url;
    a.download = 'qr-' + slug(item.judul) + (item.id ? '-' + item.id : '') + '.png';
    if (typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open', ''); }
  }

  global.K3D_QR = { encode: encode, makeLabel: makeLabel, printLabels: printLabels, openDialog: openDialog };
})(typeof window !== 'undefined' ? window : this);
