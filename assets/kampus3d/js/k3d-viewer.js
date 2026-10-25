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
  var rawJalur = null;
  var graf = null;
  var ruteLayer = (typeof K3D_JALUR !== 'undefined') ? K3D_JALUR.RuteLayer(stage) : null;
  var curRouteTargetId = null;
  var avatarSetting = null;
  var avatarCtrl = null;

  /* ---------- pengaturan kualitas grafis & bayangan (tahap 5b) ---------- */
  var qSelect = $('qualitySelect');
  var savedQuality = 'tinggi';
  try {
    savedQuality = localStorage.getItem('k3d_quality') || (window.innerWidth <= 768 ? 'sedang' : 'tinggi');
  } catch (e) {
    savedQuality = window.innerWidth <= 768 ? 'sedang' : 'tinggi';
  }
  stage.setQuality(savedQuality);
  if (qSelect) {
    qSelect.value = savedQuality;
    qSelect.addEventListener('change', function () {
      stage.setQuality(this.value);
      var labels = {
        tinggi: 'Kualitas Tinggi (Bayangan Halus)',
        sedang: 'Kualitas Sedang',
        rendah: 'Kualitas Rendah (Cepat / HP Lama)'
      };
      setStatus('Kualitas grafis diubah ke: ' + (labels[this.value] || this.value));
    });
  }

  /* ---------- opsi tema terang / gelap (Bootstrap & custom) ---------- */
  var themeBtn = $('themeBtn');
  var themeIcon = $('themeIcon');
  var themeText = $('themeText');
  function updateThemeUi(curTheme) {
    if (!themeBtn) { return; }
    var isDark = curTheme === 'dark';
    document.documentElement.setAttribute('data-theme', curTheme);
    document.documentElement.setAttribute('data-bs-theme', curTheme);
    if (themeIcon) {
      themeIcon.className = isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars';
    }
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

  /* ---------- toggle sidebar & layar penuh (tampilan lebih luas) ---------- */
  var sidebarToggle = $('sidebarToggle');
  var floatingSidebarToggle = $('floatingSidebarToggle');
  var appEl = document.querySelector('.app.pub');

  function setSidebarCollapsed(collapsed) {
    if (!appEl) { return; }
    appEl.classList.toggle('sidebar-collapsed', collapsed);
    if (floatingSidebarToggle) {
      floatingSidebarToggle.hidden = !collapsed;
    }
    if (sidebarToggle) {
      sidebarToggle.setAttribute('title', collapsed ? 'Tampilkan Daftar Gedung (Buka Panel)' : 'Sembunyikan Daftar (Bikin 3D Lebih Luas)');
      var icon = sidebarToggle.querySelector('i');
      if (icon) {
        icon.className = collapsed ? 'bi bi-layout-sidebar' : 'bi bi-layout-sidebar-inset';
      }
    }
    try { localStorage.setItem('k3d_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
    setTimeout(function () {
      if (stage && stage.resize) { stage.resize(); }
    }, 260);
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      var isCurrently = appEl ? appEl.classList.contains('sidebar-collapsed') : false;
      setSidebarCollapsed(!isCurrently);
    });
  }
  if (floatingSidebarToggle) {
    floatingSidebarToggle.addEventListener('click', function () {
      setSidebarCollapsed(false);
    });
  }

  try {
    var savedCollapsed = localStorage.getItem('k3d_sidebar_collapsed');
    if (savedCollapsed === '1' || (savedCollapsed === null && window.innerWidth <= 768)) {
      setSidebarCollapsed(true);
    }
  } catch (e) {}

  var fullscreenBtn = $('fullscreenBtn');
  var fullscreenIcon = $('fullscreenIcon');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
    document.addEventListener('fullscreenchange', function () {
      var isFs = !!document.fullscreenElement;
      if (fullscreenIcon) {
        fullscreenIcon.className = isFs ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
      }
      fullscreenBtn.setAttribute('title', isFs ? 'Keluar dari Layar Penuh' : 'Layar Penuh (Fullscreen)');
      setTimeout(function () { if (stage && stage.resize) { stage.resize(); } }, 150);
    });
  }

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

  function rebuildGraf() {
    if (typeof K3D_JALUR !== 'undefined' && rawJalur) {
      graf = K3D_JALUR.buatGraf(stage, rawJalur);
    }
    initAvatar();
  }

  function initAvatar() {
    if (typeof K3D_AVATAR === 'undefined') { return; }
    if (avatarCtrl) {
      avatarCtrl.setSetting(avatarSetting);
      if (typeof avatarCtrl.setGraf === 'function') {
        avatarCtrl.setGraf(graf);
      }
      return;
    }
    avatarCtrl = K3D_AVATAR.buatAvatarController(stage, {
      avatarSetting: avatarSetting,
      container: stageEl,
      graf: graf,
      onToast: function (m) { setStatus(m); },
      onInteract: function (id, node) { select(id, { fly: false }); },
      onEnterObject: function (id, node, masukInfo) {
        select(id, { fly: false });
        if (node && node.tipe === 'ruang') {
          var fl = lantaiOf(node);
          if (fl && curFloors && curFloors.length) {
            var fIdx = curFloors.findIndex(function (x) { return x.id === fl.id; });
            if (fIdx >= 0) {
              setFloorIndex(fIdx + 1, false);
            }
          }
        }
      },
      onTransitLantai: function (pt) {
        setStatus('Berpindah lantai via ' + (pt.jenis === 'lift' ? 'Lift' : 'Tangga') + ' (' + (pt.label || 'Lantai') + ')');
        if (pt.ruangId) { select(pt.ruangId, { fly: false }); }
      },
      onActiveChange: function (isActive) {
        var btn = $('exploreBtn');
        if (btn) {
          btn.classList.toggle('btn-success', !isActive);
          btn.classList.toggle('btn-danger', isActive);
          btn.innerHTML = isActive
            ? '<i class="bi bi-box-arrow-right" id="exploreIcon"></i>'
            : '<i class="bi bi-person-walking" id="exploreIcon"></i>';
          btn.setAttribute('title', isActive ? 'Keluar Mode Jelajah (Kembali ke Orbit Seluruh Kampus)' : 'Jelajah Kampus (Mode Karakter 3D)');
        }
        if (isActive) {
          $('card').hidden = true;
          $('tip').hidden = true;
        }
      },
      onExit: function (goHome) {
        if (goHome) {
          select(null);
          hideDirections();
          resetAllFloors();
          if ($('floorPanel')) { $('floorPanel').hidden = true; }
          setStatus('Kembali ke mode orbit seluruh kampus.');
        } else {
          setStatus('Keluar dari mode jelajah.');
        }
      }
    });
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
        rawJalur = d.jalur || null;
        avatarSetting = d.avatar || {};
        stage.rebuild(nodes);
        rebuildGraf();
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
    if (opts.fly && avatarCtrl && avatarCtrl.isActive()) {
      avatarCtrl.keluarJelajah(false);
    }
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
    if (id != null) { openBuildingFor(id); }
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

  $('cardExplore').addEventListener('click', function () {
    if (selectedId == null) { return; }
    initAvatar();
    var objId = selectedId;
    var n = byId(objId);
    if (!n || !avatarCtrl) { return; }

    var spawnPos = new THREE.Vector3(0, 0, 0);
    var floorY = 0;
    var pintuPt = null;
    if (graf && graf.titik) {
      graf.titik.forEach(function (pt) {
        var j = pt.jenis || (pt.t && pt.t.jenis);
        var rId = pt.ruangId || (pt.t && pt.t.ruang_id);
        var oId = pt.objekId || (pt.t && pt.t.objek_id);
        if (j === 'pintu' && (rId === objId || oId === objId)) {
          pintuPt = pt;
        }
      });
    }
    var ptCoord = pintuPt ? (pintuPt.pos || pintuPt.worldPos) : null;
    if (ptCoord) {
      spawnPos.copy(ptCoord);
      floorY = ptCoord.y;
    } else {
      var box = stage.worldBox(objId);
      if (!box.isEmpty()) {
        var c = box.getCenter(new THREE.Vector3());
        var s = box.getSize(new THREE.Vector3());
        spawnPos.set(c.x, box.min.y, box.max.z + 1.2);
        floorY = box.min.y;
      }
    }
    $('card').hidden = true;
    avatarCtrl.mulaiJelajah(spawnPos, 0, floorY, null);
    setStatus('Muncul di depan ' + (n.judul || 'objek') + '. Selamat menjelajah!');
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

  /* ---------- petunjuk arah (tahap 4b) ---------- */
  function getStartPoints() {
    if (!graf || !graf.titik.size) { return []; }
    // Prioritaskan titik berjenis gerbang
    var g = graf.gerbang.slice();
    if (!g.length) {
      // Jika belum ada jenis gerbang, ambil titik luar yang terhubung
      graf.titik.forEach(function (p) {
        if (p.gedung == null) { g.push(p); }
      });
    }
    return g;
  }

  function fillStartSelect(curStartId) {
    var sel = $('routeStart');
    if (!sel) { return null; }
    sel.textContent = '';
    var list = getStartPoints();
    if (!list.length) {
      var oNone = document.createElement('option');
      oNone.value = '';
      oNone.textContent = 'Belum ada jalur/gerbang';
      sel.appendChild(oNone);
      return null;
    }
    list.forEach(function (p, i) {
      var opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = p.t.label ? p.t.label : ('Gerbang / Titik Awal ' + (i + 1));
      sel.appendChild(opt);
    });
    if (curStartId && sel.querySelector('option[value="' + curStartId + '"]')) {
      sel.value = String(curStartId);
    } else {
      sel.value = String(list[0].id);
    }
    return parseInt(sel.value, 10);
  }

  function renderRouteSteps(langkahList, rutePath) {
    var ol = $('routeSteps');
    if (!ol) { return; }
    ol.textContent = '';
    langkahList.forEach(function (st, idx) {
      var li = document.createElement('li');
      li.className = 'route-step' + (st.kurang ? ' warn' : '');
      var ikon = document.createElement('span');
      ikon.className = 'step-icon ' + st.ikon;
      var txtBox = document.createElement('div');
      txtBox.className = 'step-text-box';
      var txt = document.createElement('span');
      txt.className = 'step-text';
      txt.textContent = st.teks;
      txtBox.appendChild(txt);
      if (st.jarak >= 1) {
        var dist = document.createElement('span');
        dist.className = 'step-dist';
        dist.textContent = K3D_JALUR.fmtJarak(st.jarak);
        txtBox.appendChild(dist);
      }
      li.append(ikon, txtBox);

      li.addEventListener('mouseenter', function () {
        if (ruteLayer) { ruteLayer.sorot(st.dari, st.ke); }
      });
      li.addEventListener('mouseleave', function () {
        if (ruteLayer) { ruteLayer.sorot(0, 0); }
      });
      li.addEventListener('click', function () {
        if (ruteLayer) { ruteLayer.fokus(st.dari, st.ke); }
      });
      ol.appendChild(li);
    });
  }

  function showDirections(targetId) {
    if (!targetId || typeof K3D_JALUR === 'undefined') { return; }
    var n = byId(targetId);
    if (!n) { return; }
    curRouteTargetId = targetId;

    if (!graf || !graf.titik.size) {
      setStatus('Jalur kampus belum dikonfigurasi oleh admin.', 'warn');
      return;
    }

    var startId = fillStartSelect($('routeStart') ? $('routeStart').value : null);
    if (!startId) {
      setStatus('Belum ada titik gerbang atau jalur yang terdaftar.', 'warn');
      return;
    }

    var noStairs = $('routeNoStairs') ? $('routeNoStairs').checked : false;
    var rute = K3D_JALUR.cariRute(stage, graf, startId, targetId, { hindariTangga: noStairs });

    var panel = $('routePanel');
    if (!rute.ok) {
      if (ruteLayer) { ruteLayer.hapus(); }
      if (panel) { panel.hidden = false; }
      $('routeDestTitle').textContent = n.judul || K3D.labelOf(n);
      $('routeSummary').textContent = rute.pesan;
      $('routeSummary').className = 'route-summary warn';
      $('routeSteps').textContent = '';
      return;
    }

    if (panel) { panel.hidden = false; }
    $('routeDestTitle').textContent = n.judul || K3D.labelOf(n);

    // Hitung langkah tertulis & ringkasan
    var hasil = K3D_JALUR.buatLangkah(stage, rute);
    $('routeSummary').className = 'route-summary';
    $('routeTime').textContent = hasil.menit + ' menit jalan kaki';
    $('routeDist').textContent = '(' + K3D_JALUR.fmtJarak(hasil.jarak) + ')';
    renderRouteSteps(hasil.langkah, rute.path);

    // Tampilkan rute visual 3D
    if (ruteLayer) {
      ruteLayer.tampil(rute.path.map(function (p) { return p.pos; }));
      ruteLayer.fokus();
    }
  }

  function hideDirections() {
    curRouteTargetId = null;
    if ($('routePanel')) { $('routePanel').hidden = true; }
    if (ruteLayer) { ruteLayer.hapus(); }
  }

  $('cardRoute').addEventListener('click', function () {
    if (selectedId != null) { showDirections(selectedId); }
  });
  $('routeClose').addEventListener('click', hideDirections);
  $('routeStart').addEventListener('change', function () {
    if (curRouteTargetId != null) { showDirections(curRouteTargetId); }
  });
  $('routeNoStairs').addEventListener('change', function () {
    if (curRouteTargetId != null) { showDirections(curRouteTargetId); }
  });
  $('routeFlyAll').addEventListener('click', function () {
    if (ruteLayer) { ruteLayer.fokus(); }
  });

  $('homeBtn').addEventListener('click', function () {
    if (avatarCtrl && avatarCtrl.isActive()) {
      avatarCtrl.keluarJelajah(true);
    } else {
      stage.home(false);
    }
    select(null);
    hideDirections();
    resetAllFloors();
    if ($('floorPanel')) { $('floorPanel').hidden = true; }
    setStatus('Kembali ke mode orbit seluruh kampus.');
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

  /* ---------- daftar gedung/ruang collapse dan pencarian ---------- */
  function getIconClass(n) {
    if (n.tipe === 'gedung') { return 'bi-buildings text-warning'; }
    if (n.tipe === 'lantai') { return 'bi-layers text-success'; }
    if (n.tipe === 'ruang') { return 'bi-door-open text-primary'; }
    if (n.tipe === 'barang') { return 'bi-box-seam text-secondary'; }
    if (n.tipe === 'area') {
      if (n.subtipe === 'jalan') { return 'bi-signpost-2 text-success'; }
      if (n.subtipe === 'lapangan') { return 'bi-flag text-success'; }
      if (n.subtipe === 'taman') { return 'bi-flower1 text-success'; }
      if (n.subtipe === 'parkir') { return 'bi-p-square text-success'; }
      return 'bi-tree text-success';
    }
    return 'bi-geo-alt text-muted';
  }

  function getBuildingIdFor(objId) {
    var cur = byId(objId);
    var guard = 0;
    while (cur && guard++ < 10) {
      if (cur.tipe === 'gedung') { return cur.id; }
      cur = cur.parent_id != null ? byId(cur.parent_id) : null;
    }
    return null;
  }

  function openBuildingFor(objId) {
    if (objId == null) { return; }
    var bId = getBuildingIdFor(objId);
    if (bId != null) {
      var item = document.querySelector('.k3d-gedung-item[data-id="' + bId + '"]');
      if (item && !item.classList.contains('open')) {
        item.classList.add('open');
        var body = item.querySelector('.k3d-gedung-body');
        if (body) { body.hidden = false; }
      }
    }
  }

  function makeItem(n, withCrumb) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tnode';
    b.dataset.id = String(n.id);

    var icon = document.createElement('i');
    icon.className = 'bi ' + getIconClass(n) + ' me-2 fs-6 flex-shrink-0';

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
    b.append(icon, box);
    b.addEventListener('click', function () { select(n.id, { fly: true }); });
    li.appendChild(b);
    return li;
  }

  function renderBrowse() {
    var ul = $('browse');
    ul.textContent = '';

    // 1. Ambil seluruh gedung
    var gedungs = nodes.filter(function (n) { return n.tipe === 'gedung'; });

    gedungs.forEach(function (g) {
      // Cari seluruh ruangan milik gedung ini (baik langsung maupun via lantai)
      var rooms = nodes.filter(function (r) {
        if (r.tipe !== 'ruang') { return false; }
        if (r.parent_id === g.id) { return true; }
        var p = byId(r.parent_id);
        return (p && p.tipe === 'lantai' && p.parent_id === g.id);
      });

      // Cari seluruh lantai milik gedung ini
      var floors = nodes.filter(function (fl) {
        return fl.tipe === 'lantai' && fl.parent_id === g.id;
      }).sort(function (a, b) {
        return (a.urutan || 0) - (b.urutan || 0);
      });

      var li = document.createElement('li');
      li.className = 'k3d-gedung-item';
      li.dataset.id = String(g.id);

      // Header Gedung
      var header = document.createElement('div');
      header.className = 'k3d-gedung-header';
      header.dataset.id = String(g.id);

      var chevronWrap = document.createElement('span');
      chevronWrap.className = 'k3d-chevron-icon';
      chevronWrap.innerHTML = '<i class="bi bi-chevron-right"></i>';

      var bIcon = document.createElement('i');
      bIcon.className = 'bi bi-buildings-fill text-warning me-1 flex-shrink-0';

      var titleSpan = document.createElement('span');
      titleSpan.className = 'k3d-gedung-title';
      titleSpan.textContent = g.judul || '(Gedung tanpa judul)';

      var countBadge = document.createElement('span');
      countBadge.className = 'badge rounded-pill bg-body-tertiary text-body-secondary border ms-auto';
      countBadge.style.fontSize = '10px';
      countBadge.textContent = rooms.length + ' ruang';

      var focusBtn = document.createElement('button');
      focusBtn.type = 'button';
      focusBtn.className = 'k3d-focus-icon-btn';
      focusBtn.title = 'Fokus kamera ke ' + (g.judul || 'gedung');
      focusBtn.setAttribute('aria-label', 'Fokus gedung');
      focusBtn.innerHTML = '<i class="bi bi-crosshair"></i>';
      focusBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        select(g.id, { fly: true });
      });

      header.append(chevronWrap, bIcon, titleSpan, countBadge, focusBtn);

      // Body Gedung (Daftar Ruangan)
      var body = document.createElement('div');
      body.className = 'k3d-gedung-body';
      body.hidden = true; // Tertutup (collapse) secara bawaan

      if (rooms.length === 0) {
        var emptyMsg = document.createElement('div');
        emptyMsg.className = 'text-muted py-1 px-2';
        emptyMsg.style.fontSize = '11px';
        emptyMsg.textContent = 'Belum ada ruangan terdaftar di gedung ini.';
        body.appendChild(emptyMsg);
      } else if (floors.length > 0) {
        // Kelompokkan per lantai
        floors.forEach(function (fl) {
          var floorRooms = rooms.filter(function (r) { return r.parent_id === fl.id; });
          if (floorRooms.length > 0) {
            var fHead = document.createElement('div');
            fHead.className = 'k3d-floor-heading';
            fHead.innerHTML = '<i class="bi bi-layers text-success me-1"></i> ' + (fl.judul || 'Lantai');
            body.appendChild(fHead);

            floorRooms.forEach(function (r) {
              var rBtn = document.createElement('button');
              rBtn.type = 'button';
              rBtn.className = 'k3d-room-node tnode';
              rBtn.dataset.id = String(r.id);
              rBtn.innerHTML = '<i class="bi bi-door-open text-primary me-1 flex-shrink-0"></i>'
                + '<span class="stack"><span class="tt">' + (r.judul || '(tanpa judul)') + '</span>'
                + (r.unit_nama ? '<span class="sub text-muted">' + r.unit_nama + '</span>' : '') + '</span>';
              rBtn.addEventListener('click', function () { select(r.id, { fly: true }); });
              body.appendChild(rBtn);
            });
          }
        });

        // Ruangan langsung di bawah gedung tanpa lantai
        var directRooms = rooms.filter(function (r) { return r.parent_id === g.id; });
        if (directRooms.length > 0) {
          var dHead = document.createElement('div');
          dHead.className = 'k3d-floor-heading';
          dHead.innerHTML = '<i class="bi bi-geo text-muted me-1"></i> Ruang Lainnya';
          body.appendChild(dHead);

          directRooms.forEach(function (r) {
            var rBtn = document.createElement('button');
            rBtn.type = 'button';
            rBtn.className = 'k3d-room-node tnode';
            rBtn.dataset.id = String(r.id);
            rBtn.innerHTML = '<i class="bi bi-door-open text-primary me-1 flex-shrink-0"></i>'
              + '<span class="stack"><span class="tt">' + (r.judul || '(tanpa judul)') + '</span>'
              + (r.unit_nama ? '<span class="sub text-muted">' + r.unit_nama + '</span>' : '') + '</span>';
            rBtn.addEventListener('click', function () { select(r.id, { fly: true }); });
            body.appendChild(rBtn);
          });
        }
      } else {
        // Gedung tanpa lantai, tampilkan daftar ruang langsung
        rooms.forEach(function (r) {
          var rBtn = document.createElement('button');
          rBtn.type = 'button';
          rBtn.className = 'k3d-room-node tnode';
          rBtn.dataset.id = String(r.id);
          rBtn.innerHTML = '<i class="bi bi-door-open text-primary me-1 flex-shrink-0"></i>'
            + '<span class="stack"><span class="tt">' + (r.judul || '(tanpa judul)') + '</span>'
            + (r.unit_nama ? '<span class="sub text-muted">' + r.unit_nama + '</span>' : '') + '</span>';
          rBtn.addEventListener('click', function () { select(r.id, { fly: true }); });
          body.appendChild(rBtn);
        });
      }

      // Klik header membuka/menutup collapse dan memilih gedung
      header.addEventListener('click', function () {
        var isOpen = li.classList.contains('open');
        li.classList.toggle('open', !isOpen);
        body.hidden = isOpen;
        select(g.id, { fly: false });
      });

      li.append(header, body);
      ul.appendChild(li);
    });

    $('browseHead').hidden = ul.children.length === 0;

    // 2. Ambil Area Luar
    var ua = $('browseArea');
    ua.textContent = '';
    var areas = nodes.filter(function (n) { return n.tipe === 'area'; });
    areas.forEach(function (n) { ua.appendChild(makeItem(n, false)); });

    var areaWrap = $('browseAreaWrap');
    if (areaWrap) { areaWrap.hidden = areas.length === 0; }
    if ($('browseAreaHead')) { $('browseAreaHead').hidden = areas.length === 0; }

    markBrowse();
  }

  function markBrowse() {
    document.querySelectorAll('#browse .tnode, #browseArea .tnode, #results .tnode, .k3d-gedung-header').forEach(function (b) {
      b.classList.toggle('sel', b.dataset.id === String(selectedId));
    });
  }

  // Tombol Buka Semua & Tutup Semua Gedung
  var expandAllBtn = $('expandAllBtn');
  var collapseAllBtn = $('collapseAllBtn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.k3d-gedung-item').forEach(function (el) {
        el.classList.add('open');
        var body = el.querySelector('.k3d-gedung-body');
        if (body) { body.hidden = false; }
      });
    });
  }
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.k3d-gedung-item').forEach(function (el) {
        el.classList.remove('open');
        var body = el.querySelector('.k3d-gedung-body');
        if (body) { body.hidden = true; }
      });
    });
  }

  // Pencarian
  var q = $('q');
  var qClear = $('qClear');
  if (q) {
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase();
      var ul = $('results');
      ul.textContent = '';
      $('resultsNote').textContent = '';
      if (qClear) { qClear.classList.toggle('d-none', !q.value); }
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
  }
  if (qClear) {
    qClear.addEventListener('click', function () {
      if (!q) { return; }
      q.value = '';
      qClear.classList.add('d-none');
      $('results').textContent = '';
      $('resultsNote').textContent = '';
      q.focus();
    });
  }

  /* ---------- mode karakter / avatar jelajah (tahap 5a) ---------- */
  var spawnModal = $('spawnModal');
  var btnExplore = $('exploreBtn');
  var tabSpawnGate = $('tabSpawnGate');
  var tabSpawnRoom = $('tabSpawnRoom');
  var secSpawnGate = $('sectionSpawnGate');
  var secSpawnRoom = $('sectionSpawnRoom');
  var selSpawnGate = $('selectSpawnGate');
  var selSpawnRoom = $('selectSpawnRoom');
  var spawnMode = 'gate'; // 'gate' atau 'room'

  function bukaModalSpawn() {
    if (!spawnModal) { return; }
    initAvatar();

    // 1. Isi daftar gerbang / titik masuk
    selSpawnGate.textContent = '';
    var gates = [];
    if (graf && graf.titik) {
      graf.titik.forEach(function (pt) {
        if (pt.jenis === 'gerbang') { gates.push(pt); }
      });
      if (!gates.length) {
        // Ambil titik luar bila belum ada jenis gerbang khusus
        graf.titik.forEach(function (pt) {
          if (pt.gedung == null) { gates.push(pt); }
        });
      }
    }

    if (gates.length) {
      gates.forEach(function (g) {
        var opt = document.createElement('option');
        opt.value = String(g.id);
        opt.textContent = g.label ? g.label : 'Titik ' + (g.jenis || 'Masuk') + ' #' + g.id;
        selSpawnGate.appendChild(opt);
      });
    } else {
      var defOpt = document.createElement('option');
      defOpt.value = 'default_origin';
      defOpt.textContent = 'Gerbang Utama (Depan Kampus)';
      selSpawnGate.appendChild(defOpt);
    }

    // 2. Isi daftar gedung & ruangan
    selSpawnRoom.textContent = '';
    var rooms = nodes.filter(function (n) {
      return (n.tipe === 'ruang' || n.tipe === 'gedung') && n.judul;
    }).sort(function (a, b) {
      return (a.judul || '').localeCompare(b.judul || '');
    });

    rooms.forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = String(r.id);
      opt.textContent = (r.tipe === 'ruang' ? 'Ruang: ' : 'Gedung: ') + r.judul + (r.unit_nama ? ' (' + r.unit_nama + ')' : '');
      selSpawnRoom.appendChild(opt);
    });

    // Buka tab default gerbang
    setTabSpawn('gate');
    spawnModal.hidden = false;
  }

  function setTabSpawn(mode) {
    spawnMode = mode;
    tabSpawnGate.classList.toggle('active', mode === 'gate');
    tabSpawnRoom.classList.toggle('active', mode === 'room');
    secSpawnGate.hidden = (mode !== 'gate');
    secSpawnRoom.hidden = (mode !== 'room');
  }

  if (tabSpawnGate) { tabSpawnGate.addEventListener('click', function () { setTabSpawn('gate'); }); }
  if (tabSpawnRoom) { tabSpawnRoom.addEventListener('click', function () { setTabSpawn('room'); }); }
  if (btnExplore) {
    btnExplore.addEventListener('click', function () {
      if (avatarCtrl && avatarCtrl.isActive()) {
        avatarCtrl.keluarJelajah(true);
      } else {
        bukaModalSpawn();
      }
    });
  }

  function tutupModalSpawn() {
    if (spawnModal) { spawnModal.hidden = true; }
  }

  $('spawnClose').addEventListener('click', tutupModalSpawn);
  $('spawnCancel').addEventListener('click', tutupModalSpawn);

  $('spawnStart').addEventListener('click', function () {
    tutupModalSpawn();
    if (!avatarCtrl) { initAvatar(); }
    if (!avatarCtrl) { return; }

    var spawnPos = new THREE.Vector3(0, 0, 15);
    var spawnYaw = 0;
    var floorY = 0;
    var lantaiId = null;

    if (spawnMode === 'gate') {
      var gateVal = selSpawnGate.value;
      if (gateVal !== 'default_origin' && graf && graf.titik.has(parseInt(gateVal, 10))) {
        var pt = graf.titik.get(parseInt(gateVal, 10));
        var gPos = pt ? (pt.pos || pt.worldPos) : null;
        if (gPos) {
          spawnPos.copy(gPos);
          floorY = gPos.y;
          // Hadapkan karakter ke arah tengah kampus
          spawnYaw = Math.atan2(-spawnPos.x, -spawnPos.z);
        } else {
          spawnPos.set(10, 0, 84);
          spawnYaw = 0;
          floorY = 0;
        }
      } else {
        spawnPos.set(10, 0, 84);
        spawnYaw = 0;
        floorY = 0;
      }
    } else {
      var objId = parseInt(selSpawnRoom.value, 10);
      var n = byId(objId);
      if (n) {
        // Cek titik pintu ruangan di graf
        var pintuPt = null;
        if (graf && graf.titik) {
          graf.titik.forEach(function (pt) {
            var j = pt.jenis || (pt.t && pt.t.jenis);
            var rId = pt.ruangId || (pt.t && pt.t.ruang_id);
            var oId = pt.objekId || (pt.t && pt.t.objek_id);
            if (j === 'pintu' && (rId === objId || oId === objId)) {
              pintuPt = pt;
            }
          });
        }

        var pintuPos = pintuPt ? (pintuPt.pos || pintuPt.worldPos) : null;
        if (pintuPos) {
          spawnPos.copy(pintuPos);
          floorY = pintuPos.y;
          spawnYaw = 0;
        } else {
          // Ambil bounding box objek di dunia nyata
          var box = stage.worldBox(objId);
          if (!box.isEmpty()) {
            var c = box.getCenter(new THREE.Vector3());
            var s = box.getSize(new THREE.Vector3());
            spawnPos.set(c.x, box.min.y, box.max.z + 1.2);
            floorY = box.min.y;
            spawnYaw = 0;
          }
        }
      }
    }

    avatarCtrl.mulaiJelajah(spawnPos, spawnYaw, floorY, lantaiId);
    setStatus('Mode Jelajah Aktif. Gunakan WASD atau Joystick untuk berjalan, Shift untuk lari, V untuk alih kamera 1P/3P.');
  });

  load();
})();

