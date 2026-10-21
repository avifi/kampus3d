/* Kampus 3D: editor admin.
   Seluruh keadaan dipegang di browser (dengan urungkan/ulangi) dan dikirim ke server saat menekan Simpan.
   Objek baru memakai id sementara negatif sampai disimpan. */
(function () {
  'use strict';
  var cfg = window.K3D_CONFIG || {};
  var TYPES = K3D.TYPES;
  var ALLOWED = K3D.ALLOWED_PARENT;
  var r2 = K3D.r2;
  var r3 = K3D.r3;
  var $ = function (id) { return document.getElementById(id); };

  var stageEl = $('stage');
  var canvas = $('c');
  var stage;
  try {
    stage = K3D.createStage(canvas, stageEl, { dracoPath: cfg.assetBase + 'vendor/draco/' });
  } catch (err) {
    $('nogl').hidden = false;
    return;
  }
  $('maxMb').textContent = String(cfg.maxMb || 25);

  /* ---------- keadaan ---------- */
  var nodes = [];
  var deleted = [];           // id di database yang akan dihapus saat menyimpan
  var library = [];
  var tempSeq = 0;
  var selectedId = null;
  var mode = 'translate';
  var preview = false;
  var history = [];
  var hIdx = -1;
  var savedSnap = '';
  var dirty = false;
  var saving = false;
  var csrf = cfg.csrf || { name: '', hash: '' };
  var drawing = null;         // {sub, pts} saat menggambar area baru
  var dragH = null;           // {idx, moved} saat menyeret titik area
  var activeHandle = -1;

  var role = cfg.role || 'superadmin';
  var izinGedung = cfg.izinGedung || 'semua';
  var avatarSetting = null;

  /* ---------- pengaturan kualitas grafis editor (tahap 5b) ---------- */
  var qSelect = $('qualitySelect');
  var savedQuality = 'tinggi';
  try {
    savedQuality = localStorage.getItem('k3d_quality') || (window.innerWidth <= 768 ? 'sedang' : 'tinggi');
  } catch (e) {
    savedQuality = 'tinggi';
  }
  stage.setQuality(savedQuality);
  if (qSelect) {
    qSelect.value = savedQuality;
    qSelect.addEventListener('change', function () {
      stage.setQuality(this.value);
      setStatus('Kualitas render diubah ke: ' + this.value);
    });
  }

  /* ---------- opsi tema terang / gelap ---------- */
  var themeBtn = $('themeBtn');
  var themeIcon = $('themeIcon');
  var themeText = $('themeText');
  function updateThemeUi(curTheme) {
    if (!themeBtn) { return; }
    var isDark = curTheme === 'dark';
    if (themeIcon) { themeIcon.textContent = isDark ? '☀️' : '🌙'; }
    if (themeText) { themeText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap'; }
    themeBtn.setAttribute('title', isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap');
  }
  updateThemeUi(stage.getTheme());
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var nextTheme = stage.getTheme() === 'dark' ? 'light' : 'dark';
      stage.setTheme(nextTheme);
      updateThemeUi(nextTheme);
      setStatus('Tema diubah ke: ' + (nextTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'));
    });
  }

  /* ---------- jalur petunjuk arah (tahap 4b) ---------- */
  var jalur = { titik: [], ruas: [] };
  var jalurRev = 0;
  var selectedJalurPt = null;
  var jalurAddMode = false;
  var jalurConnectMode = false;
  var jalurConnectFirst = null;
  var dragJalur = null;
  var grafLayer = (typeof K3D_JALUR !== 'undefined') ? K3D_JALUR.GrafLayer(stage) : null;
  var curGraf = null;

  var newId = function () { return -(++tempSeq); };
  var byId = function (id) { return stage.nodeMap.get(id) || null; };

  function gedungOf(n) {
    var cur = n;
    var guard = 0;
    while (cur && guard++ < 25) {
      if (cur.tipe === 'gedung') { return cur; }
      cur = cur.parent_id != null ? byId(cur.parent_id) : null;
    }
    return null;
  }

  function canEdit(n) {
    if (role === 'superadmin' || izinGedung === 'semua') { return true; }
    if (!n) { return false; }
    if (n.tipe === 'area') { return false; }
    var g = gedungOf(n);
    if (!g) { return false; }
    return Array.isArray(izinGedung) && izinGedung.map(Number).indexOf(Number(g.id)) !== -1;
  }

  function mk(o) {
    return Object.assign({
      id: newId(), parent_id: null, tipe: 'barang', subtipe: null, judul: '', deskripsi: '',
      library_id: null, pos_x: 0, pos_y: 0, pos_z: 0, rot_x: 0, rot_y: 0, rot_z: 0,
      scale_x: 1, scale_y: 1, scale_z: 1, ukuran: null, geometri: null, status: 'draft',
      versi: 1
    }, o);
  }

  function descendants(id) {
    var out = [];
    var queue = [id];
    while (queue.length) {
      var cur = queue.shift();
      nodes.forEach(function (n) { if (n.parent_id === cur) { out.push(n.id); queue.push(n.id); } });
    }
    return out;
  }

  /* ---------- pesan ---------- */
  var stTimer = 0;
  function setStatus(msg, kind) {
    var el = $('status');
    el.textContent = msg;
    el.className = 'overlay status show' + (kind ? ' ' + kind : '');
    clearTimeout(stTimer);
    stTimer = setTimeout(function () { el.classList.remove('show'); }, 7000);
  }
  stage.onError = function (m) { setStatus(m, 'warn'); };

  /* ---------- gizmo ---------- */
  var tc = new THREE.TransformControls(stage.camera, canvas);
  tc.setSize(0.9);
  stage.scene.add(tc);
  tc.addEventListener('dragging-changed', function (e) { stage.orbit.enabled = !e.value; });
  tc.addEventListener('objectChange', function () {
    var n = byId(selectedId);
    if (!n) { return; }
    stage.syncFromObj(n);
    fillTransform();
    updateSizeInfo();
  });
  tc.addEventListener('mouseUp', function () { commit(); });

  function applySnap() {
    var on = $('snap').checked;
    tc.setTranslationSnap(on ? 0.5 : null);
    tc.setRotationSnap(on ? THREE.MathUtils.degToRad(15) : null);
    tc.setScaleSnap(on ? 0.1 : null);
  }

  /* ---------- riwayat dan status simpan ---------- */
  function snapshot() { return JSON.stringify({ n: nodes, d: deleted, j: jalur }); }
  function refreshDirty() {
    dirty = snapshot() !== savedSnap;
    var chip = $('saveChip');
    chip.textContent = dirty ? 'Belum disimpan' : 'Tersimpan';
    chip.className = 'chip' + (dirty ? ' dirty' : '');
    $('saveBtn').disabled = !dirty || saving;
  }
  function updateHistoryButtons() {
    $('undo').disabled = hIdx <= 0;
    $('redo').disabled = hIdx >= history.length - 1;
  }
  function commit() {
    var s = snapshot();
    if (history[hIdx] !== s) {
      history.length = hIdx + 1;
      history.push(s);
      if (history.length > 100) { history.shift(); }
      hIdx = history.length - 1;
    }
    updateHistoryButtons();
    refreshDirty();
    renderLibrary();
    renderJalur();
  }
  function loadSnapshot(s) {
    var o = JSON.parse(s);
    nodes = o.n;
    deleted = o.d;
    if (o.j) { jalur = o.j; }
    rebuildScene();
    updateHistoryButtons();
    refreshDirty();
    renderLibrary();
    renderJalur();
  }
  function undo() { if (hIdx > 0) { hIdx--; loadSnapshot(history[hIdx]); } }
  function redo() { if (hIdx < history.length - 1) { hIdx++; loadSnapshot(history[hIdx]); } }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- adegan ---------- */
  function rebuildScene() {
    tc.detach();
    stage.rebuild(nodes);
    if (selectedId != null && !byId(selectedId)) { selectedId = null; }
    select(selectedId);
  }

  function select(id) {
    selectedId = id;
    if (id != null) { deselectJalurPt(); }
    stage.setSelected(id);
    var e = id != null ? stage.entries.get(id) : null;
    var sn = id != null ? byId(id) : null;
    var editable = canEdit(sn);
    if (e && !preview && sn && sn.tipe !== 'area' && editable) { tc.attach(e.group); } else { tc.detach(); }
    activeHandle = -1;
    renderAll();
    updateSizeInfo();
  }

  var down = null;
  canvas.addEventListener('pointerdown', function (e) {
    down = { x: e.clientX, y: e.clientY, onGizmo: !preview && tc.axis !== null };
    hideTip();
    var an = byId(selectedId);
    if (e.button === 0 && !drawing && !preview && an && an.tipe === 'area' && an.geometri && canEdit(an)) {
      var hi = stage.pickHandle(e.clientX, e.clientY);
      if (hi >= 0) {
        dragH = { idx: hi, moved: false };
        activeHandle = hi;
        down.onGizmo = true;
        stage.orbit.enabled = false;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* diabaikan */ }
        updateHandles();
        fillPoints(an);
        return;
      }
    }
    // Periksa klik pada titik jalur
    if (e.button === 0 && !drawing && !preview && grafLayer && $('jalurVisible') && $('jalurVisible').checked) {
      var jId = grafLayer.pilih(e.clientX, e.clientY);
      if (jId != null) {
        down.onGizmo = true;
        if (jalurConnectMode) {
          handleJalurConnectClick(jId);
          return;
        }
        selectJalurPt(jId);
        dragJalur = { id: jId, moved: false };
        stage.orbit.enabled = false;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* diabaikan */ }
        return;
      }
    }
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!down) { return; }
    var d = down;
    down = null;
    if (e.button !== 0 || d.onGizmo || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) { return; }
    if (drawing) {
      var gp = stage.groundPoint(e.clientX, e.clientY);
      if (gp) { drawing.pts.push([snapV(gp.x), snapV(gp.z)]); updateHandles(); updateDrawNote(); }
      return;
    }
    if (jalurAddMode) {
      handleJalurCanvasAdd(e.clientX, e.clientY);
      return;
    }
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

  /* ---------- tampilan panel ---------- */
  function renderTree() {
    var ul = $('tree');
    ul.textContent = '';
    $('count').textContent = '(' + nodes.length + ')';
    var kids = {};
    nodes.forEach(function (n) {
      var k = n.parent_id == null ? 'root' : String(n.parent_id);
      (kids[k] = kids[k] || []).push(n);
    });
    function walk(pid, depth) {
      (kids[pid] || []).forEach(function (n) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        var editable = canEdit(n);
        b.className = 'tnode' + (n.id === selectedId ? ' sel' : '') + (!editable ? ' locked-item' : '');
        if (!editable) { b.title = 'Hanya baca (di luar wewenang unit Anda)'; }
        b.style.paddingLeft = (8 + depth * 16) + 'px';
        var dot = document.createElement('span');
        dot.className = 'dot ' + n.tipe;
        dot.title = K3D.labelOf(n);
        var t = document.createElement('span');
        t.className = 'tt';
        t.textContent = n.judul || '(tanpa judul)';
        b.append(dot, t);
        if (n.status !== 'terbit') {
          var bd = document.createElement('span');
          bd.className = 'badge';
          bd.textContent = 'draft';
          b.appendChild(bd);
        }
        b.addEventListener('click', function () {
          select(n.id);
          if (preview) { stage.flyTo(n.id); }
        });
        li.appendChild(b);
        ul.appendChild(li);
        walk(String(n.id), depth + 1);
      });
    }
    walk('root', 0);
    if (!nodes.length) {
      var li = document.createElement('li');
      li.className = 'note';
      li.textContent = 'Belum ada objek. Mulai dengan menambah gedung: unggah .glb atau tambah kotak.';
      ul.appendChild(li);
    }
  }

  function xyzInputs(containerId, prefix, step) {
    var box = $(containerId);
    ['x', 'y', 'z'].forEach(function (axis) {
      var lab = document.createElement('label');
      var sp = document.createElement('span');
      sp.textContent = axis.toUpperCase();
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'num';
      inp.step = step;
      inp.dataset.k = prefix + '_' + axis;
      inp.setAttribute('aria-label', containerId.replace('g-', '') + ' ' + axis.toUpperCase());
      lab.append(sp, inp);
      box.appendChild(lab);
    });
  }
  xyzInputs('g-pos', 'pos', '0.5');
  xyzInputs('g-rot', 'rot', '15');
  xyzInputs('g-scale', 'scale', '0.1');

  function fillParentOptions(n) {
    var sel = $('f-parent');
    sel.textContent = '';
    var none = document.createElement('option');
    none.value = '';
    none.textContent = 'Tanpa induk (di tanah kampus)';
    sel.appendChild(none);
    var banned = {};
    banned[n.id] = true;
    descendants(n.id).forEach(function (id) { banned[id] = true; });
    nodes.forEach(function (p) {
      if (banned[p.id] || ALLOWED[n.tipe].indexOf(p.tipe) === -1) { return; }
      var o = document.createElement('option');
      o.value = String(p.id);
      o.textContent = K3D.labelOf(p) + ': ' + (p.judul || '(tanpa judul)');
      sel.appendChild(o);
    });
    sel.value = n.parent_id == null ? '' : String(n.parent_id);
  }

  function libName(id) {
    for (var i = 0; i < library.length; i++) { if (library[i].id === id) { return library[i].nama; } }
    return null;
  }

  function fillTransform() {
    var n = byId(selectedId);
    if (!n) { return; }
    document.querySelectorAll('.num').forEach(function (i) {
      if (document.activeElement !== i) { i.value = String(r3(n[i.dataset.k])); }
    });
  }
  function fillTransformForce(n) {
    document.querySelectorAll('.num').forEach(function (i) { i.value = String(r3(n[i.dataset.k])); });
  }

  function fillProps() {
    var n = byId(selectedId);
    $('propsEmpty').hidden = !!n;
    $('propsForm').hidden = !n;
    if (!n) { return; }
    var editable = canEdit(n);
    var lock = $('lockNotice');
    if (lock) { lock.hidden = editable; }

    $('f-tipe').value = n.tipe;
    $('f-status').value = n.status;
    fillParentOptions(n);
    $('f-judul').value = n.judul;
    $('f-desk').value = n.deskripsi;
    var nm = n.library_id != null ? libName(n.library_id) : null;
    $('f-file').textContent = n.library_id != null
      ? (nm ? 'Library: ' + nm : 'Model tidak ditemukan di library (tampil sebagai kotak)')
      : 'Kotak pengganti, belum memakai model';
    $('fit').value = String(TYPES[n.tipe].target);
    fillCopyOptions(n);
    fillTransform();
    var isArea = n.tipe === 'area';
    document.querySelectorAll('.na').forEach(function (el) { el.hidden = isArea; });
    $('areaBox').hidden = !isArea;
    if (isArea) {
      $('f-subtipe').value = n.subtipe || 'taman';
      var garis = K3D.AREA[n.subtipe || 'taman'].kind === 'garis';
      $('ao-lebarRow').hidden = !garis;
      if (garis && document.activeElement !== $('f-lebar')) { $('f-lebar').value = String((n.geometri && n.geometri.lebar) || 6); }
      fillPoints(n);
    }

    // Kunci / aktifkan kontrol formulir sesuai wewenang
    var formEl = $('propsForm');
    if (formEl) {
      var inputs = formEl.querySelectorAll('input, textarea, select, button');
      inputs.forEach(function (el) {
        if (el.id === 'focusBtn' || el.id === 'qrBtn' || el.id === 'qrBatchBtn') {
          el.disabled = false;
        } else {
          el.disabled = !editable;
        }
      });
    }

    // Tombol batch QR untuk gedung dan lantai
    var batchBtn = $('qrBatchBtn');
    if (batchBtn) {
      if (n && (n.tipe === 'gedung' || n.tipe === 'lantai')) {
        var ruangs = descendants(n.id).map(byId).filter(function (x) { return x && x.tipe === 'ruang' && x.id > 0; });
        if (ruangs.length > 0) {
          batchBtn.hidden = false;
          batchBtn.textContent = 'Cetak Semua QR Ruang (' + ruangs.length + ')';
        } else {
          batchBtn.hidden = true;
        }
      } else {
        batchBtn.hidden = true;
      }
    }
  }

  function updateSizeInfo() {
    var el = $('sizeInfo');
    if (selectedId == null) { el.textContent = ''; return; }
    var b = stage.worldBox(selectedId);
    if (b.isEmpty()) { el.textContent = 'Ukuran nyata: model sedang dimuat'; return; }
    var s = b.getSize(new THREE.Vector3());
    var f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
    el.textContent = 'Ukuran nyata: ' + f1(s.x) + ' × ' + f1(s.y) + ' × ' + f1(s.z) + ' m';
  }

  function renderOverlay() {
    var n = byId(selectedId);
    var show = preview && !!n;
    $('card').hidden = !show;
    if (!show) { return; }
    $('cardTag').textContent = K3D.labelOf(n) + (n.status === 'terbit' ? '' : ' · draft');
    $('cardTitle').textContent = n.judul || '(tanpa judul)';
    $('cardDesc').textContent = n.deskripsi || 'Belum ada deskripsi.';
  }

  /* ---------- katalog library ---------- */
  var selectedLib = null;
  var libDelTimer = 0;

  function libById(id) {
    for (var i = 0; i < library.length; i++) { if (library[i].id === id) { return library[i]; } }
    return null;
  }
  function localUse(id) {
    var c = 0;
    nodes.forEach(function (n) { if (n.library_id === id) { c++; } });
    return c;
  }
  function usedCount(l) { return Math.max(localUse(l.id), l.dipakai || 0); }
  function fmtBytes(b) { return b >= 1048576 ? (Math.round(b / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function fmtDim(d) {
    return d ? d.map(function (v) { return String(Math.round(v * 10) / 10); }).join(' × ') + ' m' : 'ukuran belum diketahui';
  }

  function renderLibrary() {
    var q = $('libQ').value.trim().toLowerCase();
    var catSel = $('libCat');
    var cat = catSel.value;
    var cats = {};
    library.forEach(function (l) { cats[l.kategori] = true; });
    var names = Object.keys(cats).sort();

    catSel.textContent = '';
    var all = document.createElement('option');
    all.value = '';
    all.textContent = 'Semua kategori';
    catSel.appendChild(all);
    $('katList').textContent = '';
    names.forEach(function (nm) {
      var o = document.createElement('option');
      o.value = nm;
      o.textContent = nm;
      catSel.appendChild(o);
      var d = document.createElement('option');
      d.value = nm;
      $('katList').appendChild(d);
    });
    catSel.value = cats[cat] ? cat : '';
    cat = catSel.value;

    var list = library.filter(function (l) {
      return (!cat || l.kategori === cat) && (!q || l.nama.toLowerCase().indexOf(q) !== -1 || l.kategori.indexOf(q) !== -1);
    });
    $('libCount').textContent = library.length ? '(' + list.length + (list.length !== library.length ? '/' + library.length : '') + ')' : '';
    var ul = $('libList');
    var sc = ul.scrollTop;
    ul.textContent = '';
    list.forEach(function (l) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'libitem' + (l.id === selectedLib ? ' sel' : '');
      var t = document.createElement('span');
      t.className = 'tt';
      t.textContent = l.nama;
      var sub = document.createElement('span');
      sub.className = 'sub';
      var u = usedCount(l);
      sub.textContent = l.kategori + ' · ' + fmtBytes(l.bytes) + ' · ' + (u ? 'dipakai ' + u + '×' : 'belum dipakai');
      b.appendChild(t);
      b.appendChild(sub);
      b.addEventListener('click', function () { pickLib(l.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    var empty = $('libEmpty');
    empty.hidden = list.length > 0;
    empty.textContent = library.length ? 'Tidak ada model yang cocok dengan pencarian.' : 'Belum ada model. Unggah berkas .glb untuk mengisi library.';
    ul.scrollTop = sc;
    if (selectedLib != null && !libById(selectedLib)) { selectedLib = null; }
    updateLibDetail(false);
  }

  function pickLib(id) {
    selectedLib = id;
    disarmLibDelete();
    renderLibrary();
    updateLibDetail(true);
  }

  /** Mengisi kotak detail. $isi TRUE menimpa isian nama dan kategori (dipakai saat ganti pilihan). */
  function updateLibDetail(isi) {
    var l = selectedLib != null ? libById(selectedLib) : null;
    $('libDetail').hidden = !l;
    if (!l) { return; }
    if (isi) {
      $('lib-nama').value = l.nama;
      $('lib-kat').value = l.kategori;
    }
    var u = usedCount(l);
    $('libInfo').textContent = fmtDim(l.dim) + ' · ' + fmtBytes(l.bytes) + ' · ' + l.file_asli;
    $('libDel').disabled = u > 0;
    $('libHint').textContent = u === 0
      ? ''
      : (localUse(l.id) > 0
        ? 'Dipakai ' + localUse(l.id) + ' objek di kampus. Hapus objek itu dulu bila ingin menghapus model.'
        : 'Masih tercatat dipakai objek yang penghapusannya belum disimpan. Klik Simpan dulu.');
  }

  function replaceLib(item) {
    var found = false;
    library = library.map(function (l) { if (l.id === item.id) { found = true; return item; } return l; });
    if (!found) { library.push(item); }
    stage.setLibrary(library);
    renderLibrary();
    fillProps();
  }

  function disarmLibDelete() {
    clearTimeout(libDelTimer);
    $('libDel').classList.remove('armed');
    $('libDel').textContent = 'Hapus model';
  }

  $('libQ').addEventListener('input', renderLibrary);
  $('libCat').addEventListener('change', renderLibrary);

  $('libAdd').addEventListener('click', function () {
    var lib = libById(selectedLib);
    if (!lib) { return; }
    var tipe = $('addType').value;
    var skala = addFromLibrary(lib, tipe);
    setStatus(skala
      ? '"' + lib.nama + '" ditambahkan dan diskalakan ke sekitar ' + TYPES[tipe].target + ' m. Ubah lewat "Sesuaikan ukuran".'
      : '"' + lib.nama + '" ditambahkan. Ukuran aslinya belum diketahui, gunakan "Sesuaikan ukuran".');
  });

  $('libSave').addEventListener('click', function () {
    var l = libById(selectedLib);
    if (!l) { return; }
    if (!$('lib-nama').value.trim()) { setStatus('Nama model tidak boleh kosong.', 'warn'); return; }
    var fd = new FormData();
    fd.append('id', String(l.id));
    fd.append('nama', $('lib-nama').value);
    fd.append('kategori', $('lib-kat').value);
    post(cfg.urlLibUbah, fd).then(function (res) {
      if (!res.ok) { throw new Error(res.pesan || 'Gagal menyimpan nama.'); }
      replaceLib(res.library);
      updateLibDetail(true);
      setStatus('Nama dan kategori model tersimpan.');
    }).catch(function (err) { setStatus('Gagal menyimpan nama model: ' + ((err && err.message) || err), 'warn'); });
  });

  $('libDel').addEventListener('click', function () {
    var l = libById(selectedLib);
    if (!l || usedCount(l) > 0) { return; }
    var btn = $('libDel');
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Yakin? Klik lagi';
      libDelTimer = setTimeout(disarmLibDelete, 3500);
      return;
    }
    disarmLibDelete();
    var fd = new FormData();
    fd.append('id', String(l.id));
    post(cfg.urlLibHapus, fd).then(function (res) {
      if (!res.ok) { throw new Error(res.pesan || 'Gagal menghapus model.'); }
      library = library.filter(function (x) { return x.id !== l.id; });
      selectedLib = null;
      stage.setLibrary(library);
      renderLibrary();
      setStatus('Model "' + l.nama + '" dihapus dari library dan dari server.');
    }).catch(function (err) { setStatus('Model tidak dihapus: ' + ((err && err.message) || err), 'warn'); });
  });

  $('libReplaceIn').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    var l = libById(selectedLib);
    if (!file || !l) { return; }
    if (!/\.glb$/i.test(file.name)) { setStatus('Gunakan berkas .glb.', 'warn'); return; }
    if (file.size > (cfg.maxMb || 25) * 1048576) { setStatus('Berkas terlalu besar. Maksimal ' + (cfg.maxMb || 25) + ' MB.', 'warn'); return; }
    var u = usedCount(l);
    if (u > 0 && !window.confirm('Model "' + l.nama + '" dipakai ' + u + ' objek. Semuanya akan memakai berkas baru ini. Lanjutkan?')) { return; }
    setStatus('Mengganti berkas "' + l.nama + '"…');
    file.arrayBuffer().then(function (buf) {
      return stage.parseGlb(buf);
    }).then(function (info) {
      var fd = new FormData();
      fd.append('id', String(l.id));
      fd.append('berkas', file, file.name);
      fd.append('dim_x', String(r3(info.size.x)));
      fd.append('dim_y', String(r3(info.size.y)));
      fd.append('dim_z', String(r3(info.size.z)));
      return post(cfg.urlLibGanti, fd);
    }).then(function (res) {
      if (!res.ok) { throw new Error(res.pesan || 'Penggantian ditolak server.'); }
      replaceLib(res.library);
      rebuildScene();
      setStatus('Berkas diganti.' + (u ? ' ' + u + ' objek kini memakai model baru, periksa ukuran dan posisinya.' : ''), u ? 'warn' : '');
    }).catch(function (err) { setStatus('Gagal mengganti berkas: ' + ((err && err.message) || err), 'warn'); });
  });

  function renderAll() {
    renderTree();
    fillProps();
    renderOverlay();
    updateHandles();
  }

  /* ---------- mode dan alat ---------- */
  function setMode(m) {
    mode = m;
    tc.setMode(m);
    ['translate', 'rotate', 'scale'].forEach(function (k) { $('m-' + k).setAttribute('aria-pressed', String(k === m)); });
  }
  $('m-translate').addEventListener('click', function () { setMode('translate'); });
  $('m-rotate').addEventListener('click', function () { setMode('rotate'); });
  $('m-scale').addEventListener('click', function () { setMode('scale'); });
  $('snap').addEventListener('change', applySnap);
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('resetCam').addEventListener('click', function () { stage.home(false); });
  $('previewBtn').addEventListener('click', function () {
    preview = !preview;
    $('previewBtn').setAttribute('aria-pressed', String(preview));
    select(selectedId);
    setStatus(preview ? 'Mode pratinjau: klik objek untuk melihat info seperti pengunjung.' : 'Mode edit.');
  });
  $('cardFly').addEventListener('click', function () { if (selectedId != null) { stage.flyTo(selectedId); } });
  $('cardClose').addEventListener('click', function () { select(null); });
  $('saveBtn').addEventListener('click', save);

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); return; }
    if (drawing && (k === 'escape' || k === 'enter')) { e.preventDefault(); if (k === 'enter') { finishDraw(); } else { cancelDraw(); } return; }
    if (inField) { return; }
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) { redo(); } else { undo(); } return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (k === 'w') { setMode('translate'); }
    else if (k === 'e') { setMode('rotate'); }
    else if (k === 'r') { setMode('scale'); }
    else if (k === 'escape') { select(null); }
  });

  /* ---------- form properti ---------- */
  $('f-judul').addEventListener('input', function (e) {
    var n = byId(selectedId);
    if (!n) { return; }
    n.judul = e.target.value;
    renderTree();
    renderOverlay();
    refreshDirty();
  });
  $('f-judul').addEventListener('change', commit);
  $('f-desk').addEventListener('input', function (e) {
    var n = byId(selectedId);
    if (!n) { return; }
    n.deskripsi = e.target.value;
    renderOverlay();
    refreshDirty();
  });
  $('f-desk').addEventListener('change', commit);

  $('f-status').addEventListener('change', function (e) {
    var n = byId(selectedId);
    if (!n) { return; }
    n.status = e.target.value === 'terbit' ? 'terbit' : 'draft';
    commit();
    renderAll();
  });
  $('f-tipe').addEventListener('change', function (e) {
    var n = byId(selectedId);
    if (!n) { return; }
    n.tipe = e.target.value;
    if (n.parent_id != null) {
      var p = byId(n.parent_id);
      if (!p || ALLOWED[n.tipe].indexOf(p.tipe) === -1) { stage.reparent(n, null); }
    }
    stage.refresh(n);
    commit();
    renderAll();
    updateSizeInfo();
  });
  $('f-parent').addEventListener('change', function (e) {
    var n = byId(selectedId);
    if (!n) { return; }
    stage.reparent(n, e.target.value === '' ? null : parseInt(e.target.value, 10));
    commit();
    renderAll();
  });

  document.querySelectorAll('.num').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var n = byId(selectedId);
      if (!n) { return; }
      var v = parseFloat(inp.value);
      if (!isFinite(v)) { return; }
      var k = inp.dataset.k;
      n[k] = k.indexOf('scale') === 0 ? Math.max(0.001, v) : v;
      stage.applyTransform(n);
      updateSizeInfo();
      refreshDirty();
    });
    inp.addEventListener('change', function () {
      var n = byId(selectedId);
      if (n) { fillTransformForce(n); commit(); }
    });
  });

  $('focusBtn').addEventListener('click', function () {
    if (selectedId != null && !stage.flyTo(selectedId)) { setStatus('Model masih dimuat. Coba lagi sebentar.'); }
  });
  $('resetScale').addEventListener('click', function () {
    var n = byId(selectedId);
    if (!n) { return; }
    n.scale_x = n.scale_y = n.scale_z = 1;
    stage.applyTransform(n);
    fillTransformForce(n);
    updateSizeInfo();
    commit();
  });
  $('fitBtn').addEventListener('click', function () {
    var n = byId(selectedId);
    var target = parseFloat($('fit').value);
    if (!n || !(target > 0)) { setStatus('Isi ukuran dalam meter, misalnya 20.', 'warn'); return; }
    var b = stage.worldBox(n.id);
    if (b.isEmpty()) { setStatus('Model masih dimuat. Coba lagi sebentar.'); return; }
    var s = b.getSize(new THREE.Vector3());
    var cur = Math.max(s.x, s.y, s.z);
    if (!(cur > 0)) { return; }
    var f = target / cur;
    n.scale_x = r3(Math.max(0.001, n.scale_x * f));
    n.scale_y = r3(Math.max(0.001, n.scale_y * f));
    n.scale_z = r3(Math.max(0.001, n.scale_z * f));
    stage.applyTransform(n);
    fillTransformForce(n);
    updateSizeInfo();
    commit();
  });
  $('groundBtn').addEventListener('click', function () {
    var n = byId(selectedId);
    var e = n ? stage.entries.get(n.id) : null;
    if (!n || !e) { return; }
    var b = stage.worldBox(n.id);
    if (b.isEmpty()) { setStatus('Model masih dimuat. Coba lagi sebentar.'); return; }
    var floor = 0;
    if (n.parent_id != null) {
      var pb = stage.worldBox(n.parent_id);
      if (!pb.isEmpty()) { floor = pb.min.y; }
    }
    var wp = new THREE.Vector3();
    e.group.getWorldPosition(wp);
    wp.y += floor - b.min.y;
    e.group.parent.updateMatrixWorld(true);
    e.group.position.copy(e.group.parent.worldToLocal(wp));
    stage.syncFromObj(n);
    fillTransformForce(n);
    updateSizeInfo();
    commit();
  });

  /* ---------- hapus dan salin ---------- */
  var delTimer = 0;
  function disarmDelete() {
    clearTimeout(delTimer);
    $('delBtn').classList.remove('armed');
    $('delBtn').textContent = 'Hapus';
  }
  $('delBtn').addEventListener('click', function () {
    var n = byId(selectedId);
    if (!n) { return; }
    var btn = $('delBtn');
    if (!btn.classList.contains('armed')) {
      var extra = descendants(n.id).length;
      btn.classList.add('armed');
      btn.textContent = extra ? 'Yakin? Hapus beserta ' + extra + ' isi' : 'Yakin? Klik lagi';
      delTimer = setTimeout(disarmDelete, 3500);
      return;
    }
    disarmDelete();
    var ids = [n.id].concat(descendants(n.id));
    ids.forEach(function (id) { if (id > 0 && deleted.indexOf(id) === -1) { deleted.push(id); } });
    nodes = nodes.filter(function (x) { return ids.indexOf(x.id) === -1; });
    selectedId = null;
    rebuildScene();
    commit();
  });
  $('tree').addEventListener('click', disarmDelete);

  var MAX_OBJEK = 5000;

  /** Membuat salinan sebuah objek beserta isinya (id sementara baru, status draft). Induk salinan teratas = parentId. */
  function cloneSubtree(srcId, withContents, parentId) {
    var ids = [srcId];
    descendants(srcId).forEach(function (id) {
      var d = byId(id);
      if (withContents || d.tipe !== 'barang') { ids.push(id); }
    });
    var map = {};
    ids.forEach(function (id) { map[id] = newId(); });
    return ids.map(function (id) {
      var c = JSON.parse(JSON.stringify(byId(id)));
      c.id = map[id];
      c.status = 'draft';
      c.parent_id = id === srcId ? parentId : map[c.parent_id];
      return c;
    });
  }

  /** Faktor skala dunia dari induk (satuan lokal anak = satuan dunia / faktor ini). */
  function parentScale(pid) {
    if (pid == null) { return 1; }
    stage.scene.updateMatrixWorld(true);
    var e = stage.entries.get(pid);
    return (e && e.group.getWorldScale(new THREE.Vector3()).x) || 1;
  }

  function addCopies(copies, focusId) {
    if (nodes.length + copies.length > MAX_OBJEK) {
      setStatus('Terlalu banyak objek. Batas ' + MAX_OBJEK + ' objek, saat ini ' + nodes.length + '.', 'warn');
      return false;
    }
    nodes = nodes.concat(copies);
    selectedId = focusId;
    rebuildScene();
    commit();
    return true;
  }

  function duplicate(withContents) {
    var src = byId(selectedId);
    if (!src) { return; }
    var b = stage.worldBox(src.id);
    var width = b.isEmpty() ? 0 : b.getSize(new THREE.Vector3()).x;
    var copies = cloneSubtree(src.id, withContents, src.parent_id);
    var root = copies[0];
    root.judul = (root.judul + ' salinan').slice(0, 120);
    var geser = src.parent_id == null ? Math.max(2, Math.round((width + 2) * 2) / 2) : 2;
    if (root.tipe === 'area') { shiftArea(root, geser, 0); } else { root.pos_x = r2(root.pos_x + geser); }
    if (addCopies(copies, root.id)) {
      setStatus('Salinan dibuat (' + copies.length + ' objek, berstatus draft). Geser untuk memindahkannya.');
    }
  }
  $('dupFull').addEventListener('click', function () { duplicate(true); });
  $('dupShell').addEventListener('click', function () { duplicate(false); });

  /* ---------- salin lanjutan: ke induk lain dan berderet ---------- */
  function pathName(id) {
    var parts = [];
    var cur = id;
    var guard = 0;
    while (cur != null && guard++ < 50) {
      var n = byId(cur);
      if (!n) { break; }
      parts.unshift(n.judul || K3D.labelOf(n));
      cur = n.parent_id;
    }
    return parts.join(' › ');
  }

  function fillCopyOptions(n) {
    var sel = $('cp-parent');
    var prev = sel.value;
    sel.textContent = '';
    var allowed = ALLOWED[n.tipe] || [];
    $('cp-toRow').hidden = allowed.length === 0;
    nodes.forEach(function (p) {
      if (allowed.indexOf(p.tipe) === -1 || p.id === n.parent_id || p.id === n.id) { return; }
      var o = document.createElement('option');
      o.value = String(p.id);
      o.textContent = pathName(p.id);
      sel.appendChild(o);
    });
    if (!sel.options.length) {
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = 'Tidak ada induk lain';
      sel.appendChild(o0);
    }
    $('cpTo').disabled = !sel.value;
    if (prev && sel.querySelector('option[value="' + prev + '"]')) { sel.value = prev; $('cpTo').disabled = false; }
  }

  $('cpTo').addEventListener('click', function () {
    var src = byId(selectedId);
    var target = parseInt($('cp-parent').value, 10);
    if (!src || !target || !byId(target)) { return; }
    var copies = cloneSubtree(src.id, $('cp-isi').checked, target);
    var jml = copies.length;
    if (addCopies(copies, copies[0].id)) {
      setStatus('Disalin ke "' + pathName(target) + '" (' + jml + ' objek, draft). Posisinya sama dengan aslinya relatif terhadap induk baru.');
    }
  });

  function num(id, def) {
    var raw = $(id).value;
    var v = parseFloat(raw);
    return isFinite(v) ? v : def;
  }

  $('cpRow').addEventListener('click', function () {
    var src = byId(selectedId);
    if (!src) { return; }
    var jumlah = Math.max(1, Math.min(50, Math.round(num('cp-n', 1))));
    var dx = $('cp-dx').value.trim() === '' ? null : num('cp-dx', 0);
    var dz = num('cp-dz', 0);
    if (dx === null) {
      if (dz !== 0) {
        dx = 0;
      } else {
        var b = stage.worldBox(src.id);
        var w = b.isEmpty() ? 3 : b.getSize(new THREE.Vector3()).x + 1;
        dx = Math.max(0.5, Math.ceil(w / parentScale(src.parent_id) * 2) / 2);
      }
    }
    var all = [];
    for (var i = 1; i <= jumlah; i++) {
      var c = cloneSubtree(src.id, $('cp-isi').checked, src.parent_id);
      c[0].judul = (src.judul + ' ' + (i + 1)).slice(0, 120);
      if (c[0].tipe === 'area') {
        shiftArea(c[0], i * dx, i * dz);
      } else {
        c[0].pos_x = r2(src.pos_x + i * dx);
        c[0].pos_z = r2(src.pos_z + i * dz);
      }
      all = all.concat(c);
    }
    var last = all.length / jumlah;
    if (addCopies(all, all[all.length - last].id)) {
      setStatus(jumlah + ' salinan dibuat berderet (' + all.length + ' objek, draft), jarak X ' + dx + ' m, Z ' + dz + ' m.');
    }
  });

  /* ---------- area outdoor ---------- */
  function snapV(v) { return $('snap').checked ? Math.round(v * 2) / 2 : r2(v); }
  function minPts(sub) { return K3D.AREA[sub].kind === 'garis' ? 2 : 3; }

  function shiftArea(n, dx, dz) {
    if (!n.geometri) { return; }
    n.geometri.titik = n.geometri.titik.map(function (p) { return [r2(p[0] + dx), r2(p[1] + dz)]; });
  }

  function updateHandles() {
    if (drawing) {
      stage.setHandles(drawing.pts, drawing.pts.length - 1, false);
      return;
    }
    var n = byId(selectedId);
    if (!preview && n && n.tipe === 'area' && n.geometri) {
      stage.setHandles(n.geometri.titik, activeHandle, K3D.AREA[n.subtipe || 'taman'].kind === 'bidang');
    } else {
      stage.setHandles(null);
    }
  }

  function updateDrawNote() {
    var need = minPts(drawing.sub);
    $('areaNote').textContent = 'Menggambar ' + K3D.AREA[drawing.sub].label.toLowerCase() + ': ' + drawing.pts.length + ' titik'
      + (drawing.pts.length < need ? ' (butuh minimal ' + need + ')' : '') + '. Klik tanah untuk titik berikutnya, Enter atau "Selesai" untuk menyelesaikan, Esc untuk batal.';
  }

  function setDrawUi(on) {
    $('areaDrawBar').hidden = !on;
    $('areaDraw').disabled = on;
    $('areaType').disabled = on;
    stageEl.classList.toggle('drawing', on);
    if (!on) { $('areaNote').textContent = 'Klik "Gambar area", lalu klik di tanah untuk menaruh titik. Jalan butuh minimal 2 titik, taman, lapangan, dan parkir minimal 3 titik. Selesai dengan tombol, Enter, atau klik dua kali.'; }
  }

  function startDraw() {
    if (drawing) { return; }
    if (preview) { $('previewBtn').click(); }
    select(null);
    drawing = { sub: $('areaType').value, pts: [] };
    setDrawUi(true);
    updateDrawNote();
    updateHandles();
  }
  function cancelDraw() {
    if (!drawing) { return; }
    drawing = null;
    setDrawUi(false);
    updateHandles();
    setStatus('Menggambar area dibatalkan.');
  }
  function finishDraw() {
    if (!drawing) { return; }
    var pts = [];
    drawing.pts.forEach(function (p) {
      var l = pts[pts.length - 1];
      if (!l || Math.abs(l[0] - p[0]) > 0.01 || Math.abs(l[1] - p[1]) > 0.01) { pts.push(p); }
    });
    var need = minPts(drawing.sub);
    if (pts.length < need) {
      drawing.pts = pts;
      updateHandles();
      updateDrawNote();
      setStatus('Butuh minimal ' + need + ' titik berbeda untuk ' + K3D.AREA[drawing.sub].label.toLowerCase() + '.', 'warn');
      return;
    }
    var st = K3D.AREA[drawing.sub];
    var geo = { titik: pts };
    if (st.kind === 'garis') { geo.lebar = 6; }
    var n = mk({ tipe: 'area', subtipe: drawing.sub, judul: st.label + ' baru', geometri: geo });
    drawing = null;
    setDrawUi(false);
    nodes.push(n);
    selectedId = n.id;
    rebuildScene();
    commit();
    setStatus(st.label + ' dibuat (' + pts.length + ' titik, draft). Seret titik putih untuk menyempurnakan bentuk, lalu isi judul dan deskripsi.');
  }
  $('areaDraw').addEventListener('click', startDraw);
  $('areaDone').addEventListener('click', finishDraw);
  $('areaCancel').addEventListener('click', cancelDraw);
  $('areaUndoPt').addEventListener('click', function () {
    if (!drawing || !drawing.pts.length) { return; }
    drawing.pts.pop();
    updateHandles();
    updateDrawNote();
  });
  canvas.addEventListener('dblclick', function () { if (drawing) { finishDraw(); } });

  // seret titik area di kanvas atau titik jalur
  canvas.addEventListener('pointermove', function (e) {
    if (dragH) {
      var n = byId(selectedId);
      var gp = stage.groundPoint(e.clientX, e.clientY);
      if (!n || !n.geometri || !gp) { return; }
      var p = [snapV(gp.x), snapV(gp.z)];
      var cur = n.geometri.titik[dragH.idx];
      if (cur && (cur[0] !== p[0] || cur[1] !== p[1])) {
        n.geometri.titik[dragH.idx] = p;
        dragH.moved = true;
        stage.refresh(n);
        updateHandles();
        fillPoints(n);
      }
      return;
    }
    if (dragJalur) {
      var pt = getJalurPt(dragJalur.id);
      if (!pt) { return; }
      var posDunia;
      if (pt.objek_id != null) {
        var eObj = stage.entries.get(pt.objek_id);
        if (!eObj) { return; }
        // Dapatkan bidang horizontal setinggi objek
        var wPos = new THREE.Vector3();
        eObj.group.getWorldPosition(wPos);
        posDunia = stage.planePoint(e.clientX, e.clientY, wPos.y + pt.y);
        if (!posDunia) { return; }
        var loc = eObj.group.worldToLocal(posDunia);
        pt.x = snapV(loc.x);
        pt.z = snapV(loc.z);
      } else {
        posDunia = stage.groundPoint(e.clientX, e.clientY);
        if (!posDunia) { return; }
        pt.x = snapV(posDunia.x);
        pt.z = snapV(posDunia.z);
      }
      dragJalur.moved = true;
      renderJalur();
      fillJalurProps(pt);
    }
  });
  window.addEventListener('pointerup', function () {
    if (dragH) {
      var moved = dragH.moved;
      dragH = null;
      stage.orbit.enabled = true;
      if (moved) { commit(); }
      return;
    }
    if (dragJalur) {
      var jMoved = dragJalur.moved;
      dragJalur = null;
      stage.orbit.enabled = true;
      if (jMoved) { commit(); }
    }
  });

  /* daftar titik di panel properti */
  function fillPoints(n) {
    var box = $('ao-points');
    var pts = (n.geometri && n.geometri.titik) || [];
    if (box.dataset.id !== String(n.id) || box.children.length !== pts.length) {
      box.dataset.id = String(n.id);
      box.textContent = '';
      pts.forEach(function (p, i) {
        var row = document.createElement('div');
        row.className = 'ptrow';
        var no = document.createElement('span');
        no.className = 'no';
        no.textContent = String(i + 1);
        var ix = document.createElement('input');
        var iz = document.createElement('input');
        [ix, iz].forEach(function (inp, k) {
          inp.type = 'number';
          inp.step = '0.5';
          inp.className = 'cpnum';
          inp.dataset.i = String(i);
          inp.dataset.k = String(k);
          inp.setAttribute('aria-label', 'Titik ' + (i + 1) + (k ? ' Z' : ' X'));
          inp.addEventListener('focus', function () { activeHandle = i; updateHandles(); });
          inp.addEventListener('change', function () {
            var node = byId(selectedId);
            var v = parseFloat(inp.value);
            if (!node || !node.geometri || !isFinite(v)) { fillPoints(node); return; }
            node.geometri.titik[i][k] = r2(Math.max(-5000, Math.min(5000, v)));
            stage.refresh(node);
            updateHandles();
            commit();
          });
        });
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn danger';
        del.textContent = '×';
        del.setAttribute('aria-label', 'Hapus titik ' + (i + 1));
        del.addEventListener('click', function () {
          var node = byId(selectedId);
          if (!node || !node.geometri) { return; }
          var need = minPts(node.subtipe || 'taman');
          if (node.geometri.titik.length <= need) { setStatus('Bentuk ini butuh minimal ' + need + ' titik.', 'warn'); return; }
          node.geometri.titik.splice(i, 1);
          activeHandle = -1;
          stage.refresh(node);
          fillPoints(node);
          updateHandles();
          commit();
        });
        row.append(no, ix, iz, del);
        box.appendChild(row);
      });
    }
    Array.prototype.forEach.call(box.children, function (row, i) {
      row.classList.toggle('act', i === activeHandle);
      var ins = row.querySelectorAll('input');
      [0, 1].forEach(function (k) {
        if (pts[i] && document.activeElement !== ins[k]) { ins[k].value = String(pts[i][k]); }
      });
    });
  }

  $('ptAdd').addEventListener('click', function () {
    var n = byId(selectedId);
    if (!n || !n.geometri) { return; }
    var t = n.geometri.titik;
    var last = t[t.length - 1];
    var np;
    if (K3D.AREA[n.subtipe || 'taman'].kind === 'bidang') {
      np = [r2((last[0] + t[0][0]) / 2), r2((last[1] + t[0][1]) / 2)];
      if (Math.abs(np[0] - last[0]) < 0.01 && Math.abs(np[1] - last[1]) < 0.01) { np = [last[0] + 2, last[1]]; }
    } else {
      np = [r2(last[0] + 5), last[1]];
    }
    t.push(np);
    activeHandle = t.length - 1;
    stage.refresh(n);
    fillPoints(n);
    updateHandles();
    commit();
  });

  $('mvBtn').addEventListener('click', function () {
    var n = byId(selectedId);
    var dx = parseFloat($('mv-x').value) || 0;
    var dz = parseFloat($('mv-z').value) || 0;
    if (!n || !n.geometri || (!dx && !dz)) { return; }
    shiftArea(n, dx, dz);
    stage.refresh(n);
    fillPoints(n);
    updateHandles();
    commit();
  });

  $('f-subtipe').addEventListener('change', function (e) {
    var n = byId(selectedId);
    if (!n || n.tipe !== 'area') { return; }
    var sub = e.target.value;
    if (n.geometri && n.geometri.titik.length < minPts(sub)) {
      setStatus(K3D.AREA[sub].label + ' butuh minimal ' + minPts(sub) + ' titik. Tambah titik dulu.', 'warn');
      e.target.value = n.subtipe;
      return;
    }
    n.subtipe = sub;
    if (K3D.AREA[sub].kind === 'garis') { n.geometri.lebar = n.geometri.lebar || 6; } else { delete n.geometri.lebar; }
    stage.refresh(n);
    commit();
    renderAll();
  });
  $('f-lebar').addEventListener('change', function (e) {
    var n = byId(selectedId);
    var v = parseFloat(e.target.value);
    if (!n || !n.geometri || !isFinite(v)) { return; }
    n.geometri.lebar = r2(Math.max(0.5, Math.min(60, v)));
    e.target.value = String(n.geometri.lebar);
    stage.refresh(n);
    commit();
  });

  /* ---------- fitur jalur petunjuk arah (tahap 4b) ---------- */
  function getJalurPt(id) {
    if (!jalur || !jalur.titik) { return null; }
    for (var i = 0; i < jalur.titik.length; i++) {
      if (jalur.titik[i].id === id) { return jalur.titik[i]; }
    }
    return null;
  }

  function renderJalur() {
    if (!grafLayer) { return; }
    var visible = $('jalurVisible') ? $('jalurVisible').checked : true;
    grafLayer.tampil(visible);
    if (!visible) { return; }
    curGraf = K3D_JALUR.buatGraf(stage, jalur);
    grafLayer.set(curGraf, selectedJalurPt, null);
    var countEl = $('jalurCount');
    if (countEl) {
      countEl.textContent = '(' + jalur.titik.length + ' titik, ' + jalur.ruas.length + ' ruas)';
    }
  }

  function deselectJalurPt() {
    selectedJalurPt = null;
    if ($('jalurPropsBox')) { $('jalurPropsBox').hidden = true; }
    renderJalur();
  }

  function selectJalurPt(id) {
    var pt = getJalurPt(id);
    if (!pt) { deselectJalurPt(); return; }
    // Batalkan seleksi objek gedung/ruang jika ada
    selectedId = null;
    stage.setSelected(null);
    tc.detach();
    renderTree();
    renderOverlay();
    $('propsEmpty').hidden = true;
    $('propsForm').hidden = true;

    selectedJalurPt = id;
    renderJalur();
    fillJalurProps(pt);
  }

  function fillJalurProps(pt) {
    var box = $('jalurPropsBox');
    if (!box) { return; }
    box.hidden = false;
    $('jpTag').textContent = 'Titik #' + pt.id + ' · ' + (K3D_JALUR.JENIS[pt.jenis] ? K3D_JALUR.JENIS[pt.jenis].label : 'Jalur');
    $('jpJenis').value = pt.jenis;
    $('jpLabel').value = pt.label || '';

    // Tempelan
    if (pt.objek_id != null) {
      var o = byId(pt.objek_id);
      $('jpTempel').textContent = o ? (K3D.labelOf(o) + ': ' + (o.judul || '#' + o.id)) : 'Objek #' + pt.objek_id;
    } else {
      $('jpTempel').textContent = 'Tanah kampus (outdoor)';
    }

    // Dropdown ruang/gedung
    var rRow = $('jpRuangRow');
    var rSel = $('jpRuang');
    if (rRow && rSel) {
      rRow.hidden = (pt.jenis !== 'pintu');
      rSel.textContent = '';
      var optNone = document.createElement('option');
      optNone.value = '';
      optNone.textContent = '(Tidak terhubung ke ruang)';
      rSel.appendChild(optNone);
      nodes.filter(function (x) { return x.tipe === 'ruang' || x.tipe === 'gedung'; }).forEach(function (x) {
        var opt = document.createElement('option');
        opt.value = String(x.id);
        opt.textContent = K3D.labelOf(x) + ': ' + (x.judul || '(tanpa judul)');
        rSel.appendChild(opt);
      });
      rSel.value = pt.ruang_id != null ? String(pt.ruang_id) : '';
    }

    // Koordinat
    if (document.activeElement !== $('jp-x')) { $('jp-x').value = String(pt.x); }
    if (document.activeElement !== $('jp-y')) { $('jp-y').value = String(pt.y); }
    if (document.activeElement !== $('jp-z')) { $('jp-z').value = String(pt.z); }

    // Info ruas
    var kRuas = 0;
    (jalur.ruas || []).forEach(function (r) {
      if (r[0] === pt.id || r[1] === pt.id) { kRuas++; }
    });
    $('jpRuasInfo').textContent = kRuas > 0 ? ('Tersambung ke ' + kRuas + ' titik lain.') : 'Belum tersambung ke titik mana pun.';
  }

  // Update input properti titik jalur
  if ($('jpJenis')) {
    $('jpJenis').addEventListener('change', function (e) {
      var pt = getJalurPt(selectedJalurPt);
      if (!pt) { return; }
      pt.jenis = e.target.value;
      if (pt.jenis !== 'pintu') { pt.ruang_id = null; }
      fillJalurProps(pt);
      commit();
    });
  }
  if ($('jpLabel')) {
    $('jpLabel').addEventListener('input', function (e) {
      var pt = getJalurPt(selectedJalurPt);
      if (!pt) { return; }
      pt.label = e.target.value;
      refreshDirty();
    });
    $('jpLabel').addEventListener('change', commit);
  }
  if ($('jpRuang')) {
    $('jpRuang').addEventListener('change', function (e) {
      var pt = getJalurPt(selectedJalurPt);
      if (!pt) { return; }
      pt.ruang_id = e.target.value ? parseInt(e.target.value, 10) : null;
      commit();
    });
  }
  ['x', 'y', 'z'].forEach(function (axis) {
    var inp = $('jp-' + axis);
    if (!inp) { return; }
    inp.addEventListener('input', function () {
      var pt = getJalurPt(selectedJalurPt);
      if (!pt) { return; }
      var v = parseFloat(inp.value);
      if (isFinite(v)) {
        pt[axis] = v;
        renderJalur();
        refreshDirty();
      }
    });
    inp.addEventListener('change', commit);
  });

  if ($('jpDelBtn')) {
    $('jpDelBtn').addEventListener('click', function () {
      if (selectedJalurPt == null) { return; }
      var id = selectedJalurPt;
      jalur.titik = jalur.titik.filter(function (t) { return t.id !== id; });
      jalur.ruas = jalur.ruas.filter(function (r) { return r[0] !== id && r[1] !== id; });
      deselectJalurPt();
      commit();
      setStatus('Titik jalur #' + id + ' dihapus.');
    });
  }

  if ($('jpDisconnectBtn')) {
    $('jpDisconnectBtn').addEventListener('click', function () {
      if (selectedJalurPt == null) { return; }
      var id = selectedJalurPt;
      var jml = 0;
      jalur.ruas = jalur.ruas.filter(function (r) {
        if (r[0] === id || r[1] === id) { jml++; return false; }
        return true;
      });
      commit();
      fillJalurProps(getJalurPt(id));
      setStatus('Semua ' + jml + ' ruas dari titik #' + id + ' diputus.');
    });
  }

  if ($('jpConnectBtn')) {
    $('jpConnectBtn').addEventListener('click', function () {
      if (selectedJalurPt == null) { return; }
      startJalurConnect(selectedJalurPt);
    });
  }

  // Sambung titik ruas
  function startJalurConnect(firstId) {
    jalurConnectMode = true;
    jalurConnectFirst = firstId;
    if ($('jalurConnectBtn')) { $('jalurConnectBtn').classList.add('primary'); }
    setStatus('Mode sambung aktif. Klik titik kedua pada kanvas untuk menyambungkan ruas jalan.');
  }

  function handleJalurConnectClick(targetPtId) {
    if (!jalurConnectFirst) {
      jalurConnectFirst = targetPtId;
      selectJalurPt(targetPtId);
      setStatus('Titik pertama dipilih (#' + targetPtId + '). Klik titik kedua untuk menyambung.');
      return;
    }
    if (jalurConnectFirst === targetPtId) {
      setStatus('Tidak dapat menyambung titik ke dirinya sendiri.', 'warn');
      return;
    }
    // Cek apakah sudah ada ruas
    var a = Math.min(jalurConnectFirst, targetPtId);
    var b = Math.max(jalurConnectFirst, targetPtId);
    var adaIdx = -1;
    for (var i = 0; i < jalur.ruas.length; i++) {
      var ra = Math.min(jalur.ruas[i][0], jalur.ruas[i][1]);
      var rb = Math.max(jalur.ruas[i][0], jalur.ruas[i][1]);
      if (ra === a && rb === b) { adaIdx = i; break; }
    }

    if (adaIdx >= 0) {
      jalur.ruas.splice(adaIdx, 1);
      setStatus('Ruas antara titik #' + a + ' dan #' + b + ' dihapus.');
    } else {
      jalur.ruas.push([a, b]);
      setStatus('Ruas jalan dibuat antara titik #' + a + ' dan #' + b + '.');
    }
    jalurConnectFirst = targetPtId; // Tetap aktif untuk menyambung rantai jalur
    selectJalurPt(targetPtId);
    commit();
  }

  function stopJalurConnect() {
    jalurConnectMode = false;
    jalurConnectFirst = null;
    if ($('jalurConnectBtn')) { $('jalurConnectBtn').classList.remove('primary'); }
  }

  // Tambah titik dari klik kanvas
  function handleJalurCanvasAdd(clientX, clientY) {
    var jenis = $('jalurAddJenis') ? $('jalurAddJenis').value : 'jalur';
    var label = $('jalurAddLabel') ? $('jalurAddLabel').value.trim() : '';

    // Cek apakah mengenai objek gedung/lantai/ruang
    var chain = stage.pickChain(clientX, clientY);
    var attachObj = null;
    for (var i = 0; i < chain.length; i++) {
      var cand = byId(chain[i]);
      if (cand && (cand.tipe === 'ruang' || cand.tipe === 'lantai' || cand.tipe === 'gedung')) {
        attachObj = cand;
        break;
      }
    }

    var pt;
    if (attachObj) {
      var eObj = stage.entries.get(attachObj.id);
      var wPos = new THREE.Vector3();
      eObj.group.getWorldPosition(wPos);
      var pDunia = stage.planePoint(clientX, clientY, wPos.y);
      if (!pDunia) { pDunia = stage.groundPoint(clientX, clientY); }
      var loc = pDunia ? eObj.group.worldToLocal(pDunia) : new THREE.Vector3(0, 0, 0);
      pt = {
        id: newId(),
        objek_id: attachObj.id,
        jenis: jenis,
        label: label,
        ruang_id: (jenis === 'pintu' && attachObj.tipe === 'ruang') ? attachObj.id : null,
        x: snapV(loc.x),
        y: snapV(loc.y),
        z: snapV(loc.z)
      };
    } else {
      var gp = stage.groundPoint(clientX, clientY);
      if (!gp) { return; }
      pt = {
        id: newId(),
        objek_id: null,
        jenis: jenis,
        label: label,
        ruang_id: null,
        x: snapV(gp.x),
        y: 0,
        z: snapV(gp.z)
      };
    }

    jalur.titik.push(pt);

    // Jika sebelumnya ada titik terpilih, sambungkan otomatis ke titik baru
    if (selectedJalurPt != null) {
      jalur.ruas.push([selectedJalurPt, pt.id]);
    }

    selectJalurPt(pt.id);
    commit();
    setStatus('Titik jalur dibuat (' + (K3D_JALUR.JENIS[jenis] ? K3D_JALUR.JENIS[jenis].label : 'Jalur') + '). Seret untuk memindahkan posisinya.');
  }

  // Event listener tombol sidebar jalur
  if ($('jalurVisible')) {
    $('jalurVisible').addEventListener('change', renderJalur);
  }

  if ($('jalurAddBtn')) {
    $('jalurAddBtn').addEventListener('click', function () {
      jalurAddMode = !jalurAddMode;
      $('jalurAddBtn').classList.toggle('primary', jalurAddMode);
      $('jalurAddBtn').textContent = jalurAddMode ? 'Selesai menambah titik' : 'Tambah titik (klik kanvas)';
      if (jalurAddMode) {
        stopJalurConnect();
        setStatus('Mode tambah titik aktif. Klik di jalan luar atau lantai ruangan untuk menaruh titik.');
      } else {
        setStatus('Mode tambah titik dimatikan.');
      }
    });
  }

  if ($('jalurConnectBtn')) {
    $('jalurConnectBtn').addEventListener('click', function () {
      if (jalurConnectMode) {
        stopJalurConnect();
        setStatus('Mode sambung ruas dimatikan.');
      } else {
        jalurAddMode = false;
        if ($('jalurAddBtn')) {
          $('jalurAddBtn').classList.remove('primary');
          $('jalurAddBtn').textContent = 'Tambah titik (klik kanvas)';
        }
        startJalurConnect(selectedJalurPt);
      }
    });
  }

  // Import jalur dari jalan area outdoor (tahap 3)
  if ($('jalurImportRoad')) {
    $('jalurImportRoad').addEventListener('click', function () {
      if (typeof K3D_JALUR === 'undefined') { return; }
      var roads = nodes.filter(function (x) { return x.tipe === 'area' && x.subtipe === 'jalan'; });
      if (!roads.length) {
        setStatus('Belum ada area jalan outdoor yang digambar di kampus.', 'warn');
        return;
      }
      var res = K3D_JALUR.dariJalan(nodes, jalur.titik, newId, 1.2);
      if (!res.titik.length && !res.ruas.length) {
        setStatus('Tidak ada titik baru dari jalan yang berhasil diimpor.', 'warn');
        return;
      }
      jalur.titik = jalur.titik.concat(res.titik);
      jalur.ruas = jalur.ruas.concat(res.ruas);
      commit();
      setStatus('Jalur berhasil diimpor dari ' + roads.length + ' area jalan: ' + res.titik.length + ' titik baru, ' + res.ruas.length + ' ruas baru (' + res.pakaiUlang + ' titik lama dipakai ulang).');
    });
  }

  /* ---------- pembatasan peran admin unit ---------- */
  if (role !== 'superadmin') {
    var optG = $('addType').querySelector('option[value="gedung"]');
    if (optG) { optG.remove(); }
    var areaSec = $('areaDraw') ? $('areaDraw').closest('section') : null;
    if (areaSec) { areaSec.hidden = true; }
  }

  /* ---------- tambah objek ---------- */
  function defaultParentFor(tipe) {
    var cur = selectedId;
    var guard = 0;
    while (cur != null && guard++ < 1000) {
      var n = byId(cur);
      if (!n) { return null; }
      if (ALLOWED[tipe].indexOf(n.tipe) !== -1) { return n.id; }
      cur = n.parent_id;
    }
    return null;
  }
  function snappedTarget() {
    var t = stage.orbit.target;
    return [Math.round(t.x * 2) / 2, 0, Math.round(t.z * 2) / 2];
  }

  $('addBox').addEventListener('click', function () {
    var tipe = $('addType').value;
    var parent = defaultParentFor(tipe);
    if (role !== 'superadmin') {
      if (tipe === 'gedung') {
        setStatus('Admin unit hanya dapat mengelola gedung yang telah ditugaskan.', 'warn');
        return;
      }
      if (parent != null && !canEdit(byId(parent))) {
        setStatus('Pilih gedung atau lantai dalam wewenang Anda terlebih dahulu.', 'warn');
        return;
      }
    }
    var pos = parent != null ? [0, 0, 0] : snappedTarget();
    var n = mk({ parent_id: parent, tipe: tipe, judul: TYPES[tipe].label + ' baru', pos_x: pos[0], pos_y: pos[1], pos_z: pos[2] });
    nodes.push(n);
    selectedId = n.id;
    rebuildScene();
    commit();
    setStatus('Kotak ditambahkan. Seret panahnya untuk memindahkan, lalu isi judul dan deskripsi.');
  });

  function addFromLibrary(lib, tipe) {
    var parent = defaultParentFor(tipe);
    if (role !== 'superadmin') {
      if (tipe === 'gedung') {
        setStatus('Admin unit hanya dapat mengelola gedung yang telah ditugaskan.', 'warn');
        return false;
      }
      if (parent != null && !canEdit(byId(parent))) {
        setStatus('Pilih gedung atau lantai dalam wewenang Anda terlebih dahulu.', 'warn');
        return false;
      }
    }
    stage.scene.updateMatrixWorld(true);
    var ps = 1;
    if (parent != null) { ps = stage.entries.get(parent).group.getWorldScale(new THREE.Vector3()).x || 1; }
    var factor = 1;
    var skala = false;
    if (lib.dim) {
      var maxDim = Math.max(lib.dim[0], lib.dim[1], lib.dim[2]) || 1;
      factor = Math.max(0.001, r3(TYPES[tipe].target / maxDim / ps));
      skala = true;
    }
    var pos = parent != null ? [0, 0, 0] : snappedTarget();
    var n = mk({
      parent_id: parent, tipe: tipe, judul: lib.nama, library_id: lib.id,
      pos_x: pos[0], pos_y: pos[1], pos_z: pos[2], scale_x: factor, scale_y: factor, scale_z: factor
    });
    nodes.push(n);
    selectedId = n.id;
    rebuildScene();
    commit();
    return skala;
  }

  /* ---------- komunikasi dengan server ---------- */
  function readJson(r) {
    return r.text().then(function (t) {
      var d;
      try { d = JSON.parse(t); } catch (e) {
        throw new Error('Server menjawab ' + r.status + ' dan bukan JSON. Muat ulang halaman bila sesi login atau token CSRF sudah kedaluwarsa.');
      }
      if (d && d.csrf) { csrf = d.csrf; }
      if (!r.ok && !d.bentrok) {
        throw new Error(d.pesan || ('Server menjawab status ' + r.status));
      }
      return d;
    });
  }
  function post(url, fd) {
    if (csrf.name) { fd.append(csrf.name, csrf.hash); }
    return fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' }).then(readJson);
  }

  function uploadFile(file) {
    if (!/\.glb$/i.test(file.name)) { setStatus('"' + file.name + '" dilewati. Gunakan berkas .glb.', 'warn'); return Promise.resolve(null); }
    var maxBytes = (cfg.maxMb || 25) * 1048576;
    if (file.size > maxBytes) { setStatus('"' + file.name + '" terlalu besar. Maksimal ' + (cfg.maxMb || 25) + ' MB.', 'warn'); return Promise.resolve(null); }
    return file.arrayBuffer().then(function (buf) {
      return stage.parseGlb(buf);
    }).then(function (info) {
      var fd = new FormData();
      fd.append('berkas', file, file.name);
      fd.append('nama', file.name.replace(/\.glb$/i, '').replace(/[_-]+/g, ' ').slice(0, 150));
      fd.append('kategori', $('addKategori').value);
      fd.append('dim_x', String(r3(info.size.x)));
      fd.append('dim_y', String(r3(info.size.y)));
      fd.append('dim_z', String(r3(info.size.z)));
      return post(cfg.urlUnggah, fd);
    }).then(function (res) {
      if (!res.ok) { throw new Error(res.pesan || 'Unggahan ditolak server.'); }
      library.push(res.library);
      stage.setLibrary(library);
      selectedLib = res.library.id;
      renderLibrary();
      updateLibDetail(true);
      return res.library;
    });
  }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var tipe = $('addType').value;
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        setStatus('Mengunggah "' + f.name + '"…');
        return uploadFile(f).then(function (lib) {
          if (!lib) { return; }
          addFromLibrary(lib, tipe);
          var big = f.size > 12 * 1048576 ? ' Berkas cukup besar (' + (Math.round(f.size / 104857.6) / 10) + ' MB), kompres sebelum dipakai di website.' : '';
          setStatus('"' + f.name + '" diunggah ke library dan ditambahkan ke kampus.' + big, big ? 'warn' : '');
        }).catch(function (err) {
          setStatus('Gagal memproses "' + f.name + '": ' + ((err && err.message) || err), 'warn');
        });
      });
    });
    return chain;
  }
  $('fileIn').addEventListener('change', function (e) { handleFiles(e.target.files); e.target.value = ''; });
  stageEl.addEventListener('dragover', function (e) { e.preventDefault(); });
  stageEl.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { handleFiles(e.dataTransfer.files); }
  });

  /* ---------- simpan ---------- */
  function save() {
    if (saving || !dirty) { return; }
    saving = true;
    refreshDirty();
    setStatus('Menyimpan…');
    var fd = new FormData();
    var payloadObj = { objek: nodes, hapus: deleted };
    if (role === 'superadmin') {
      payloadObj.jalur = jalur;
      payloadObj.jalur_rev = jalurRev;
    }
    fd.append('payload', JSON.stringify(payloadObj));
    post(cfg.urlSimpan, fd).then(function (res) {
      if (!res.ok) {
        if (res.bentrok) {
          alert('PENYIMPANAN DIBATALKAN (BENTROK DATA):\n\n' + res.pesan + '\n\nData di server telah diperbarui oleh pengguna lain. Silakan salin catatan Anda lalu muat ulang halaman ini.');
          setStatus('Gagal menyimpan: Bentrok dengan perubahan admin lain. Silakan muat ulang halaman.', 'warn');
          return;
        }
        throw new Error(res.pesan || 'Gagal menyimpan.');
      }
      var map = res.peta_id || {};
      var pick = function (id) { return map[id] !== undefined ? map[id] : id; };
      nodes = nodes.map(function (n) {
        var c = Object.assign({}, n);
        c.id = pick(n.id);
        c.parent_id = n.parent_id != null ? pick(n.parent_id) : null;
        if (res.versi_baru && res.versi_baru[c.id] !== undefined) {
          c.versi = res.versi_baru[c.id];
        }
        return c;
      });
      if (selectedId != null) { selectedId = pick(selectedId); }

      // Update jalur dari server jika tersedia
      if (res.jalur) {
        jalur = res.jalur;
        jalurRev = res.jalur_rev || 0;
      } else if (res.peta_id && jalur && jalur.titik) {
        // Petakan ID objek tempelan baru
        jalur.titik.forEach(function (t) {
          if (t.objek_id != null && map[t.objek_id] !== undefined) {
            t.objek_id = map[t.objek_id];
          }
          if (t.ruang_id != null && map[t.ruang_id] !== undefined) {
            t.ruang_id = map[t.ruang_id];
          }
        });
      }

      deleted = [];
      history = [snapshot()];
      hIdx = 0;
      savedSnap = snapshot();
      rebuildScene();
      renderJalur();
      library.forEach(function (l) { l.dipakai = localUse(l.id); });
      renderLibrary();
      setStatus('Tersimpan: ' + res.tambah + ' ditambah, ' + res.ubah + ' diperbarui, ' + res.hapus + ' dihapus. Riwayat urungkan dikosongkan.');
    }).catch(function (err) {
      setStatus('Gagal menyimpan: ' + ((err && err.message) || err), 'warn');
    }).then(function () {
      saving = false;
      updateHistoryButtons();
      refreshDirty();
    });
  }

  /* ---------- kode QR ---------- */
  var qrBtn = $('qrBtn');
  if (qrBtn) {
    qrBtn.addEventListener('click', function () {
      var n = byId(selectedId);
      if (!n) { return; }
      if (n.id < 0) {
        setStatus('Objek baru harus disimpan terlebih dahulu sebelum membuat kode QR.', 'warn');
        return;
      }
      if (typeof K3D_QR !== 'undefined') {
        K3D_QR.openDialog(n, cfg.urlPublik);
      } else {
        setStatus('Modul QR belum siap.', 'warn');
      }
    });
  }

  var qrBatchBtn = $('qrBatchBtn');
  if (qrBatchBtn) {
    qrBatchBtn.addEventListener('click', function () {
      var n = byId(selectedId);
      if (!n) { return; }
      var ruangs = descendants(n.id).map(byId).filter(function (x) { return x && x.tipe === 'ruang' && x.id > 0; });
      if (!ruangs.length) {
        setStatus('Tidak ada objek ruang tersimpan di dalam ' + (n.judul || 'objek ini') + '.', 'warn');
        return;
      }
      if (typeof K3D_QR !== 'undefined') {
        K3D_QR.printLabels(ruangs, cfg.urlPublik, 'Label Pintu Ruang - ' + (n.judul || 'Kampus'));
      }
    });
  }

  /* ---------- dialog manajemen wewenang admin unit (superadmin) ---------- */
  var btnKelola = $('btnKelolaUnit');
  var dlgUnit = $('userUnitDlg');
  if (btnKelola && dlgUnit) {
    btnKelola.addEventListener('click', function () {
      if (typeof dlgUnit.showModal === 'function') {
        dlgUnit.showModal();
      } else {
        dlgUnit.setAttribute('open', '');
      }
      loadUserUnits();
    });
    var btnCloseUnit = $('userUnitClose');
    if (btnCloseUnit) {
      btnCloseUnit.addEventListener('click', function () {
        if (typeof dlgUnit.close === 'function') { dlgUnit.close(); }
        else { dlgUnit.removeAttribute('open'); }
      });
    }
  }

  function loadUserUnits() {
    var box = $('userUnitList');
    if (!box) { return; }
    box.innerHTML = '<p class="note">Memuat daftar admin unit…</p>';
    fetch(cfg.urlUsers, { credentials: 'same-origin' })
      .then(readJson)
      .then(function (d) {
        if (!d.ok) { throw new Error(d.pesan || 'Gagal memuat data'); }
        var users = (d.users || []).filter(function (u) { return u.role === 'admin_unit'; });
        var gedungs = d.gedung || [];
        if (!users.length) {
          box.innerHTML = '<p class="note">Belum ada akun dengan peran Admin Unit. Tambahkan akun di tabel k3d_user terlebih dahulu.</p>';
          return;
        }
        if (!gedungs.length) {
          box.innerHTML = '<p class="note">Belum ada objek gedung yang terdaftar di kampus.</p>';
          return;
        }
        box.textContent = '';
        users.forEach(function (u) {
          var uWrap = document.createElement('div');
          uWrap.style.cssText = 'border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:12px; background:var(--bg);';
          var head = document.createElement('div');
          head.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';
          head.innerHTML = '<strong>' + (u.nama_lengkap || u.username) + '</strong><span style="font-size:12px; color:var(--muted); font-family:monospace;">@' + u.username + '</span>';
          uWrap.appendChild(head);

          var gWrap = document.createElement('div');
          gWrap.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:6px; margin-bottom:10px;';
          var unitIds = (u.unit_ids || []).map(Number);

          var checks = [];
          gedungs.forEach(function (g) {
            var lbl = document.createElement('label');
            lbl.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;';
            var chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.value = String(g.id);
            chk.checked = unitIds.indexOf(Number(g.id)) !== -1;
            checks.push(chk);
            lbl.appendChild(chk);
            lbl.appendChild(document.createTextNode(g.judul || ('Gedung #' + g.id)));
            gWrap.appendChild(lbl);
          });
          uWrap.appendChild(gWrap);

          var actRow = document.createElement('div');
          actRow.style.cssText = 'display:flex; justify-content:flex-end; align-items:center; gap:8px;';
          var st = document.createElement('span');
          st.style.cssText = 'font-size:12px; color:var(--muted);';
          var bSave = document.createElement('button');
          bSave.type = 'button';
          bSave.className = 'btn';
          bSave.textContent = 'Simpan Wewenang';
          bSave.addEventListener('click', function () {
            bSave.disabled = true;
            st.textContent = 'Menyimpan…';
            var selectedGedungIds = checks.filter(function (c) { return c.checked; }).map(function (c) { return parseInt(c.value, 10); });
            var fd = new FormData();
            fd.append('user_id', String(u.id));
            fd.append('gedung_ids', JSON.stringify(selectedGedungIds));
            post(cfg.urlSimpanUserUnit, fd).then(function (res) {
              if (!res.ok) { throw new Error(res.pesan || 'Gagal menyimpan'); }
              st.textContent = 'Tersimpan!';
              setTimeout(function () { st.textContent = ''; }, 3000);
            }).catch(function (err) {
              st.textContent = 'Gagal: ' + (err.message || err);
            }).then(function () {
              bSave.disabled = false;
            });
          });
          actRow.append(st, bSave);
          uWrap.appendChild(actRow);
          box.appendChild(uWrap);
        });
      })
      .catch(function (err) {
        box.innerHTML = '<p class="note" style="color:var(--warn);">Gagal memuat pengguna: ' + (err.message || err) + '</p>';
      });
  }

  /* ---------- dialog pengaturan mode karakter / avatar (tahap 5a) ---------- */
  var btnAvatarSetting = $('btnAvatarSetting');
  var dlgAvatar = $('avatarSettingDlg');
  if (btnAvatarSetting && dlgAvatar) {
    btnAvatarSetting.addEventListener('click', function () {
      // 1. Isi opsi select library
      var selLib = $('setAvatarLib');
      selLib.innerHTML = '<option value="">[Bawaan] Stylized Humanoid Mannequin</option>';
      library.forEach(function (l) {
        var opt = document.createElement('option');
        opt.value = String(l.id);
        opt.textContent = l.nama + ' (' + l.kategori + ')';
        selLib.appendChild(opt);
      });

      var s = avatarSetting || {};
      selLib.value = s.avatar_lib_id ? String(s.avatar_lib_id) : '';

      var speed = (s.avatar_speed != null) ? s.avatar_speed : 3.5;
      $('setAvatarSpeed').value = speed;
      $('valAvatarSpeed').textContent = Number(speed).toFixed(1) + ' m/s';

      var runSpeed = (s.avatar_run_speed != null) ? s.avatar_run_speed : 6.5;
      $('setAvatarRunSpeed').value = runSpeed;
      $('valAvatarRunSpeed').textContent = Number(runSpeed).toFixed(1) + ' m/s';

      var camHeight = (s.avatar_cam_height != null) ? s.avatar_cam_height : 1.6;
      $('setAvatarCamHeight').value = camHeight;
      $('valAvatarCamHeight').textContent = Number(camHeight).toFixed(2) + ' m';

      if (typeof dlgAvatar.showModal === 'function') {
        dlgAvatar.showModal();
      } else {
        dlgAvatar.setAttribute('open', '');
      }
    });

    $('setAvatarSpeed').addEventListener('input', function () {
      $('valAvatarSpeed').textContent = Number(this.value).toFixed(1) + ' m/s';
    });
    $('setAvatarRunSpeed').addEventListener('input', function () {
      $('valAvatarRunSpeed').textContent = Number(this.value).toFixed(1) + ' m/s';
    });
    $('setAvatarCamHeight').addEventListener('input', function () {
      $('valAvatarCamHeight').textContent = Number(this.value).toFixed(2) + ' m';
    });

    $('avatarSettingClose').addEventListener('click', function () {
      if (typeof dlgAvatar.close === 'function') { dlgAvatar.close(); }
      else { dlgAvatar.removeAttribute('open'); }
    });

    $('avatarSettingSave').addEventListener('click', function () {
      var btn = $('avatarSettingSave');
      btn.disabled = true;
      btn.textContent = 'Menyimpan…';

      var fd = new FormData();
      fd.append('avatar_lib_id', $('setAvatarLib').value);
      fd.append('avatar_speed', $('setAvatarSpeed').value);
      fd.append('avatar_run_speed', $('setAvatarRunSpeed').value);
      fd.append('avatar_cam_height', $('setAvatarCamHeight').value);

      post(cfg.urlAvatarSetting, fd).then(function (res) {
        if (!res.ok) { throw new Error(res.pesan || 'Gagal menyimpan pengaturan'); }
        avatarSetting = res.avatar || {};
        setStatus('Pengaturan mode karakter berhasil disimpan.');
        if (typeof dlgAvatar.close === 'function') { dlgAvatar.close(); }
        else { dlgAvatar.removeAttribute('open'); }
      }).catch(function (err) {
        setStatus('Gagal menyimpan: ' + ((err && err.message) || err), 'warn');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = 'Simpan Pengaturan';
      });
    });
  }

  /* ---------- mulai ---------- */
  applySnap();
  setMode('translate');
  fetch(cfg.urlData, { credentials: 'same-origin' }).then(readJson).then(function (d) {
    if (!d || !d.ok) { throw new Error((d && d.pesan) || 'Data tidak dapat dimuat.'); }
    library = d.library || [];
    stage.setLibrary(library);
    renderLibrary();
    nodes = d.objek || [];
    jalur = d.jalur || { titik: [], ruas: [] };
    jalurRev = d.jalur_rev || 0;
    avatarSetting = d.avatar || {};
    deleted = [];
    rebuildScene();
    renderJalur();
    stage.home(true);
    history = [snapshot()];
    hIdx = 0;
    savedSnap = snapshot();
    updateHistoryButtons();
    refreshDirty();
    setStatus(nodes.length
      ? nodes.length + ' objek dimuat. Klik objek untuk memilihnya.'
      : 'Belum ada objek. Mulai dengan menambah gedung di panel kiri.');
  }).catch(function (err) {
    $('saveChip').textContent = 'Gagal memuat';
    setStatus('Data gagal dimuat: ' + ((err && err.message) || err), 'warn');
  });
})();

