/* Kampus 3D: halaman publik.
   Menampilkan objek yang diterbitkan, pencarian, kartu info, dan tautan langsung (#objek-ID). */
(function () {
  'use strict';
  var cfg = window.K3D_CONFIG || {};
  var TYPES = K3D.TYPES;
  var $ = function (id) { return document.getElementById(id); };

  var stageEl = $('stage');
  var canvas = $('c');
  var stage;
  try {
    stage = K3D.createStage(canvas, stageEl, { dracoPath: cfg.assetBase + 'vendor/draco/' });
  } catch (err) {
    $('nogl').hidden = false;
    $('loading').hidden = true;
    return;
  }

  var nodes = [];
  var selectedId = null;

  /* ---------- pesan ---------- */
  var stTimer = 0;
  function setStatus(msg, kind) {
    var el = $('status');
    el.textContent = msg;
    el.className = 'overlay status show' + (kind ? ' ' + kind : '');
    clearTimeout(stTimer);
    stTimer = setTimeout(function () { el.classList.remove('show'); }, 6000);
  }
  stage.onError = function (m) { setStatus(m, 'warn'); };

  /* ---------- data ---------- */
  var byId = function (id) { return stage.nodeMap.get(id) || null; };

  function crumb(n) {
    var parts = [];
    var cur = n;
    var guard = 0;
    while (cur && guard++ < 20) {
      parts.unshift(cur.judul || K3D.labelOf(cur));
      cur = cur.parent_id != null ? byId(cur.parent_id) : null;
    }
    return parts.join(' › ');
  }

  function load() {
    $('loading').hidden = false;
    $('loading').textContent = 'Memuat data kampus…';
    fetch(cfg.urlData, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) { throw new Error('Server menjawab ' + r.status); }
        return r.json();
      })
      .then(function (d) {
        if (!d || !d.ok) { throw new Error('Data tidak valid'); }
        stage.setLibrary(d.library || []);
        nodes = d.objek || [];
        stage.rebuild(nodes);
        $('loading').hidden = true;
        renderBrowse();
        if (!nodes.length) {
          $('loading').hidden = false;
          $('loading').textContent = 'Belum ada objek yang diterbitkan.';
        }
        stage.home(true);
        applyHash(true);
      })
      .catch(function (err) {
        $('loading').hidden = false;
        $('loading').textContent = 'Data kampus gagal dimuat (' + (err.message || err) + '). Muat ulang halaman untuk mencoba lagi.';
      });
  }

  /* ---------- pemilihan ---------- */
  function select(id, opts) {
    opts = opts || {};
    selectedId = id;
    stage.setSelected(id);
    var n = id != null ? byId(id) : null;
    $('card').hidden = !n;
    if (n) {
      $('cardTag').textContent = K3D.labelOf(n);
      $('cardCrumb').textContent = crumb(n);
      $('cardTitle').textContent = n.judul || '(tanpa judul)';
      $('cardDesc').textContent = n.deskripsi || 'Belum ada deskripsi.';
      try { history.replaceState(null, '', '#objek-' + n.id); } catch (e) { /* diabaikan */ }
      if (opts.fly) { stage.flyTo(id); }
    } else {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* diabaikan */ }
    }
    updateFloorPanelFor(n);
    markBrowse();
  }

  function applyHash(first) {
    var m = /^#objek-(\d+)$/.exec(location.hash || '');
    if (!m) { return; }
    var id = parseInt(m[1], 10);
    if (byId(id)) { select(id, { fly: true }); }
    else if (first) { setStatus('Objek yang dituju tidak ditemukan atau belum diterbitkan.', 'warn'); }
  }
  window.addEventListener('hashchange', function () { applyHash(false); });

  var down = null;
  canvas.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; hideTip(); });
  canvas.addEventListener('pointerup', function (e) {
    if (!down) { return; }
    var d = down;
    down = null;
    if (e.button !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) { return; }
    var chain = stage.pickChain(e.clientX, e.clientY);
    if (!chain.length) { select(null); return; }
    var i = chain.indexOf(selectedId);
    select(i >= 0 ? chain[(i + 1) % chain.length] : chain[0]);
  });

  var tip = $('tip');
  var hoverQueued = false;
  function hideTip() { tip.hidden = true; canvas.style.cursor = ''; }
  canvas.addEventListener('pointerleave', hideTip);
  canvas.addEventListener('pointermove', function (e) {
    if (down || e.pointerType === 'touch' || hoverQueued) { return; }
    hoverQueued = true;
    var cx = e.clientX, cy = e.clientY;
    requestAnimationFrame(function () {
      hoverQueued = false;
      if (down) { return; }
      var chain = stage.pickChain(cx, cy);
      var n = chain.length ? byId(chain[0]) : null;
      if (!n || !n.judul) { hideTip(); return; }
      var r = stageEl.getBoundingClientRect();
      tip.textContent = n.judul;
      tip.style.left = (cx - r.left) + 'px';
      tip.style.top = (cy - r.top) + 'px';
      tip.hidden = false;
      canvas.style.cursor = 'pointer';
    });
  });

  $('cardFly').addEventListener('click', function () { if (selectedId != null) { stage.flyTo(selectedId); } });
  $('cardClose').addEventListener('click', function () { select(null); });
  $('cardLink').addEventListener('click', function () {
    if (selectedId == null) { return; }
    var url = location.origin + location.pathname + location.search + '#objek-' + selectedId;
    var fallback = function () { setStatus('Salin tautan ini dari bilah alamat: ' + url); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { setStatus('Tautan disalin.'); }, fallback);
    } else {
      fallback();
    }
  });

  // Tombol Kode QR untuk pengunjung
  $('cardQr').addEventListener('click', function () {
    if (selectedId == null) { return; }
    var n = byId(selectedId);
    if (!n) { return; }
    var url = location.origin + location.pathname + location.search + '#objek-' + selectedId;
    if (window.K3D_QR) {
      K3D_QR.openDialog({
        id: n.id,
        judul: n.judul || K3D.labelOf(n),
        sub: K3D.labelOf(n) + ' · ' + crumb(n),
        url: url,
        catatan: 'Pindai kode QR ini untuk membuka dan melihat posisi objek di peta 3D kampus.'
      });
    }
  });

  $('homeBtn').addEventListener('click', function () {
    select(null);
    resetAllFloors();
    if ($('floorPanel')) { $('floorPanel').hidden = true; }
    stage.home(false);
  });

  /* ---------- kontrol lantai & mode potong ---------- */
  var curGedungId = null;
  var curFloors = [];
  var curFloorIdx = 0; // 0 = semua lantai, 1..n = lantai ke-1..n

  function gedungOf(n) {
    var cur = n;
    var guard = 0;
    while (cur && guard++ < 25) {
      if (cur.tipe === 'gedung') { return cur; }
      cur = cur.parent_id != null ? byId(cur.parent_id) : null;
    }
    return null;
  }

  function lantaiOf(n) {
    var cur = n;
    var guard = 0;
    while (cur && guard++ < 25) {
      if (cur.tipe === 'lantai') { return cur; }
      cur = cur.parent_id != null ? byId(cur.parent_id) : null;
    }
    return null;
  }

  function getFloors(gedungId) {
    if (gedungId == null) { return []; }
    var list = nodes.filter(function (x) { return x.parent_id === gedungId && x.tipe === 'lantai'; });
    list.sort(function (a, b) { return (a.pos_y || 0) - (b.pos_y || 0); });
    return list;
  }

  function resetAllFloors() {
    nodes.forEach(function (x) {
      var e = stage.entries.get(x.id);
      if (e) {
        e.group.visible = true;
        if (e.body) { e.body.visible = true; }
      }
    });
  }

  function applyFloorFilter() {
    if (!curGedungId || !curFloors.length) {
      resetAllFloors();
      return;
    }
    var cut = $('cutToggle').checked;
    var gEntry = stage.entries.get(curGedungId);

    if (curFloorIdx === 0) {
      // Tampilkan seluruh lantai di gedung ini
      curFloors.forEach(function (fl) {
        var e = stage.entries.get(fl.id);
        if (e) { e.group.visible = true; }
      });
      if (gEntry && gEntry.body) { gEntry.body.visible = true; }
    } else {
      var activeFloor = curFloors[curFloorIdx - 1];
      curFloors.forEach(function (fl, idx) {
        var e = stage.entries.get(fl.id);
        if (!e) { return; }
        if (cut) {
          // Mode potong: sembunyikan lantai di atasnya agar isi ruang lantai terpilih terlihat
          e.group.visible = (idx < curFloorIdx);
        } else {
          e.group.visible = true;
        }
      });
      // Jika mode potong aktif, sembunyikan fasad/atap gedung luar agar isi lantai terlihat jelas
      if (gEntry && gEntry.body) {
        gEntry.body.visible = !cut;
      }
    }
    renderFloorButtons();
  }

  function setFloorIndex(idx, fly) {
    curFloorIdx = Math.max(0, Math.min(curFloors.length, idx));
    var slider = $('floorSlider');
    if (slider) {
      slider.value = String(curFloorIdx);
      var curLbl = $('sliderCurLabel');
      if (curLbl) {
        curLbl.textContent = curFloorIdx === 0 ? 'Semua' : (curFloors[curFloorIdx - 1].judul || 'Lt ' + curFloorIdx);
      }
    }
    applyFloorFilter();
    if (fly && curFloorIdx > 0 && curFloors[curFloorIdx - 1]) {
      stage.flyTo(curFloors[curFloorIdx - 1].id);
    }
  }

  function renderFloorButtons() {
    var box = $('floorButtons');
    if (!box) { return; }
    box.textContent = '';

    // Tombol "Semua Lantai"
    var bAll = document.createElement('button');
    bAll.type = 'button';
    bAll.className = 'floor-btn' + (curFloorIdx === 0 ? ' active' : '');
    bAll.innerHTML = '<span>Semua Lantai</span><span class="floor-count">' + curFloors.length + ' Lt</span>';
    bAll.addEventListener('click', function () { setFloorIndex(0, false); });
    box.appendChild(bAll);

    // Tombol per lantai (diurutkan dari lantai dasar ke atas)
    curFloors.forEach(function (fl, i) {
      var b = document.createElement('button');
      b.type = 'button';
      var idx = i + 1;
      b.className = 'floor-btn' + (curFloorIdx === idx ? ' active' : '');
      var ruangs = nodes.filter(function (r) { return r.parent_id === fl.id && r.tipe === 'ruang'; });
      b.innerHTML = '<span>' + (fl.judul || ('Lantai ' + idx)) + '</span>'
        + '<span class="floor-count">' + (ruangs.length ? ruangs.length + ' ruang' : 'Lt ' + idx) + '</span>';
      b.addEventListener('click', function () { setFloorIndex(idx, true); });
      box.appendChild(b);
    });
  }

  function updateFloorPanelFor(n) {
    var panel = $('floorPanel');
    if (!panel) { return; }
    var g = n ? gedungOf(n) : null;
    if (!g) {
      curGedungId = null;
      curFloors = [];
      curFloorIdx = 0;
      panel.hidden = true;
      resetAllFloors();
      return;
    }

    var floors = getFloors(g.id);
    if (!floors.length) {
      curGedungId = null;
      curFloors = [];
      curFloorIdx = 0;
      panel.hidden = true;
      resetAllFloors();
      return;
    }

    curGedungId = g.id;
    curFloors = floors;
    panel.hidden = false;
    $('floorGedungTitle').textContent = g.judul || 'Gedung';

    var slider = $('floorSlider');
    slider.max = String(floors.length);
    $('sliderMinLabel').textContent = 'Semua';

    // Tentukan lantai aktif berdasarkan objek yang dipilih
    var fl = lantaiOf(n);
    if (fl) {
      var fIdx = floors.findIndex(function (x) { return x.id === fl.id; });
      curFloorIdx = fIdx >= 0 ? fIdx + 1 : 0;
    } else {
      curFloorIdx = 0;
    }

    slider.value = String(curFloorIdx);
    $('sliderCurLabel').textContent = curFloorIdx === 0 ? 'Semua' : (floors[curFloorIdx - 1].judul || 'Lt ' + curFloorIdx);
    renderFloorButtons();
    applyFloorFilter();
  }

  $('floorClose').addEventListener('click', function () {
    $('floorPanel').hidden = true;
    curGedungId = null;
    resetAllFloors();
  });
  $('cutToggle').addEventListener('change', applyFloorFilter);
  $('floorSlider').addEventListener('input', function (e) {
    var val = parseInt(e.target.value, 10) || 0;
    setFloorIndex(val, val > 0);
  });

  /* ---------- daftar dan pencarian ---------- */
  function makeItem(n, withCrumb) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tnode';
    b.dataset.id = String(n.id);
    var dot = document.createElement('span');
    dot.className = 'dot ' + n.tipe;
    var box = document.createElement('span');
    box.className = 'stack';
    var t = document.createElement('span');
    t.className = 'tt';
    t.textContent = n.judul || '(tanpa judul)';
    box.appendChild(t);
    if (withCrumb) {
      var s = document.createElement('span');
      s.className = 'sub';
      s.textContent = K3D.labelOf(n) + ' · ' + crumb(n);
      box.appendChild(s);
    }
    b.append(dot, box);
    b.addEventListener('click', function () { select(n.id, { fly: true }); });
    li.appendChild(b);
    return li;
  }

  function renderBrowse() {
    var ul = $('browse');
    ul.textContent = '';
    var roots = nodes.filter(function (n) { return n.parent_id == null; });
    roots.filter(function (n) { return n.tipe !== 'area'; }).forEach(function (n) { ul.appendChild(makeItem(n, false)); });
    $('browseHead').hidden = ul.children.length === 0;
    var ua = $('browseArea');
    ua.textContent = '';
    roots.filter(function (n) { return n.tipe === 'area'; }).forEach(function (n) { ua.appendChild(makeItem(n, false)); });
    $('browseAreaHead').hidden = ua.children.length === 0;
    markBrowse();
  }
  function markBrowse() {
    document.querySelectorAll('#browse .tnode, #browseArea .tnode, #results .tnode').forEach(function (b) {
      b.classList.toggle('sel', b.dataset.id === String(selectedId));
    });
  }

  var q = $('q');
  q.addEventListener('input', function () {
    var term = q.value.trim().toLowerCase();
    var ul = $('results');
    ul.textContent = '';
    $('resultsNote').textContent = '';
    if (!term) { return; }
    var found = nodes.filter(function (n) {
      return (n.judul || '').toLowerCase().indexOf(term) !== -1 || (n.deskripsi || '').toLowerCase().indexOf(term) !== -1;
    });
    found.slice(0, 15).forEach(function (n) { ul.appendChild(makeItem(n, true)); });
    $('resultsNote').textContent = found.length
      ? (found.length > 15 ? 'Menampilkan 15 dari ' + found.length + ' hasil. Perjelas kata kunci.' : found.length + ' hasil.')
      : 'Tidak ada gedung, ruang, barang, atau area yang cocok.';
    markBrowse();
  });

  load();
})();
