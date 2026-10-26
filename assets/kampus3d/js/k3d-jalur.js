/* Kampus 3D: jalur petunjuk arah (tahap 4b). Dipakai editor admin dan halaman publik.
   - Graf: titik (menempel ke tanah, gedung, lantai, atau ruang) dan ruas dua arah.
   - Rute: Dijkstra dari gerbang ke titik terbaik untuk objek tujuan.
   - Langkah: kalimat seperti "Jalan 80 m, lalu belok kanan." dan "Naik tangga ke Lantai 2."
   - Lapisan 3D: garis rute beranimasi (publik) dan titik/ruas yang bisa disunting (editor).
   Satuan meter. Sumbu X ke kanan, Z ke arah kamera awal, Y ke atas. */
(function (global) {
  'use strict';

  var JENIS = {
    jalur:   { label: 'Titik jalur', color: 0xe2e8f0 },
    gerbang: { label: 'Gerbang',     color: 0x22c55e },
    pintu:   { label: 'Pintu',       color: 0xf59e0b },
    tangga:  { label: 'Tangga',      color: 0xa855f7 },
    lift:    { label: 'Lift',        color: 0x06b6d4 }
  };
  var BEDA_LANTAI = 1.2;   // beda tinggi (m) agar sebuah ruas dianggap pindah lantai
  var KECEPATAN = 1.25;    // kecepatan jalan kaki (m/detik)
  var DETIK_PER_LANTAI = 20;
  var ANGKAT = 0.45;       // tinggi garis rute di atas titik (m)

  var col = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };
  var huruf = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

  /** Objek leluhur (atau objek itu sendiri) bertipe tertentu. */
  function leluhur(nodeMap, id, tipe) {
    var cur = id != null ? nodeMap.get(id) : null;
    var guard = 0;
    while (cur && guard++ < 50) {
      if (cur.tipe === tipe) { return cur; }
      cur = cur.parent_id != null ? nodeMap.get(cur.parent_id) : null;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Graf                                                                 */
  /* ------------------------------------------------------------------ */

  function infoRuas(a, b) {
    var dx = b.pos.x - a.pos.x;
    var dz = b.pos.z - a.pos.z;
    var dy = b.pos.y - a.pos.y;
    var h = Math.sqrt(dx * dx + dz * dz);
    var moda = 'jalan';
    if (Math.abs(dy) > BEDA_LANTAI) {
      if (a.t.jenis === 'lift' && b.t.jenis === 'lift') {
        moda = 'lift';
      } else if (a.lantai != null || b.lantai != null || a.t.jenis === 'tangga' || b.t.jenis === 'tangga') {
        moda = 'tangga';
      } else {
        moda = 'jalan';
      }
    }
    var panjang = Math.sqrt(h * h + dy * dy);
    var biaya = moda === 'lift' ? h + 20 + Math.abs(dy) * 0.5 : (moda === 'tangga' ? h + Math.abs(dy) * 4 : panjang);
    return { h: h, panjang: panjang, moda: moda, biaya: biaya };
  }

  /**
   * Membangun graf dunia dari data jalur. Titik yang tempelannya tidak ada di adegan
   * (mis. gedung draft di halaman publik) dilewati.
   */
  function buatGraf(stage, jalur) {
    stage.scene.updateMatrixWorld(true);
    var titik = new Map();
    var byRuang = new Map();
    var gerbang = [];
    ((jalur && jalur.titik) || []).forEach(function (t) {
      var pos;
      if (t.objek_id != null) {
        var e = stage.entries.get(t.objek_id);
        if (!e) { return; }
        pos = e.group.localToWorld(new THREE.Vector3(t.x, t.y, t.z));
      } else {
        pos = new THREE.Vector3(t.x, t.y, t.z);
      }
      var g = leluhur(stage.nodeMap, t.objek_id, 'gedung');
      var l = leluhur(stage.nodeMap, t.objek_id, 'lantai');
      var p = {
        id: t.id,
        t: t,
        pos: pos,
        worldPos: pos,
        jenis: t.jenis,
        label: t.label,
        ruangId: t.ruang_id,
        objekId: t.objek_id,
        gedung: g ? g.id : null,
        lantai: l ? l.id : null,
        adj: []
      };
      titik.set(t.id, p);
      if (t.ruang_id != null) {
        if (!byRuang.has(t.ruang_id)) { byRuang.set(t.ruang_id, []); }
        byRuang.get(t.ruang_id).push(p);
      }
      if (t.jenis === 'gerbang') { gerbang.push(p); }
    });
    var jumlahRuas = 0;
    ((jalur && jalur.ruas) || []).forEach(function (r) {
      var a = titik.get(r[0]);
      var b = titik.get(r[1]);
      if (!a || !b || a === b) { return; }
      for (var i = 0; i < a.adj.length; i++) { if (a.adj[i].to === b) { return; } }
      var info = infoRuas(a, b);
      a.adj.push({ to: b, info: info });
      b.adj.push({ to: a, info: info });
      jumlahRuas++;
    });
    return { titik: titik, byRuang: byRuang, gerbang: gerbang, jumlahRuas: jumlahRuas };
  }

  function Heap() { this.a = []; }
  Heap.prototype.push = function (k, v) {
    var a = this.a;
    a.push([k, v]);
    var i = a.length - 1;
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) { break; }
      var t = a[p]; a[p] = a[i]; a[i] = t; i = p;
    }
  };
  Heap.prototype.pop = function () {
    var a = this.a;
    var top = a[0];
    var last = a.pop();
    if (a.length) {
      a[0] = last;
      var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l][0] < a[m][0]) { m = l; }
        if (r < a.length && a[r][0] < a[m][0]) { m = r; }
        if (m === i) { break; }
        var t = a[m]; a[m] = a[i]; a[i] = t; i = m;
      }
    }
    return top;
  };

  function dijkstra(graf, startId, opsi) {
    var dist = new Map();
    var prev = new Map();
    var heap = new Heap();
    dist.set(startId, 0);
    heap.push(0, startId);
    while (heap.a.length) {
      var top = heap.pop();
      var d = top[0];
      var id = top[1];
      if (d > dist.get(id)) { continue; }
      var p = graf.titik.get(id);
      for (var i = 0; i < p.adj.length; i++) {
        var e = p.adj[i];
        if (opsi && opsi.hindariTangga && e.info.moda === 'tangga') { continue; }
        var nd = d + e.info.biaya;
        if (!dist.has(e.to.id) || nd < dist.get(e.to.id)) {
          dist.set(e.to.id, nd);
          prev.set(e.to.id, id);
          heap.push(nd, e.to.id);
        }
      }
    }
    return { dist: dist, prev: prev };
  }

  /** Titik yang terhubung ke salah satu titik awal (untuk pemeriksaan di editor). */
  function terjangkau(graf, awalIds) {
    var seen = new Set();
    var q = awalIds.slice();
    awalIds.forEach(function (id) { seen.add(id); });
    while (q.length) {
      var p = graf.titik.get(q.pop());
      if (!p) { continue; }
      p.adj.forEach(function (e) { if (!seen.has(e.to.id)) { seen.add(e.to.id); q.push(e.to.id); } });
    }
    return seen;
  }

  function jarakLurus(p, pos) {
    var dx = p.pos.x - pos.x;
    var dz = p.pos.z - pos.z;
    return Math.sqrt(dx * dx + dz * dz) + Math.abs(p.pos.y - pos.y) * 4;
  }

  /**
   * Mencari rute dari titik startId ke objek targetId.
   * Urutan pilihan titik akhir: titik yang melayani objek itu (ruang_id), titik di lantai yang sama,
   * titik di gedung yang sama (atau pintu gedung), lalu titik luar terdekat.
   */
  function cariRute(stage, graf, startId, targetId, opsi) {
    opsi = opsi || {};
    var nodeMap = stage.nodeMap;
    var n = nodeMap.get(targetId);
    if (!n) { return { ok: false, pesan: 'Tujuan tidak ditemukan.' }; }
    if (!graf.titik.has(startId)) { return { ok: false, pesan: 'Titik awal tidak ditemukan.' }; }

    var box = stage.worldBox(targetId);
    var pos;
    if (box.isEmpty()) {
      pos = new THREE.Vector3(n.pos_x || 0, 0, n.pos_z || 0);
    } else {
      pos = box.getCenter(new THREE.Vector3());
      pos.y = box.min.y;
    }
    var gedung = leluhur(nodeMap, targetId, 'gedung');
    var lantai = leluhur(nodeMap, targetId, 'lantai');
    var dj = dijkstra(graf, startId, opsi);
    var semua = Array.from(graf.titik.values());

    var exact = [];
    var cur = n;
    var guard = 0;
    while (cur && guard++ < 20) {
      var wadah = cur.tipe === 'lantai' || cur.tipe === 'gedung';
      if (wadah && cur !== n) { break; }
      exact = exact.concat(graf.byRuang.get(cur.id) || []);
      if (wadah || cur.tipe === 'area') { break; }
      cur = cur.parent_id != null ? nodeMap.get(cur.parent_id) : null;
    }

    var tingkat = [{ c: exact, lurus: false }];
    if (n.tipe !== 'gedung' && lantai) {
      tingkat.push({ c: semua.filter(function (p) { return p.lantai === lantai.id; }), lurus: true });
    }
    if (gedung) {
      var bg = graf.byRuang.get(gedung.id) || [];
      var dalam = semua.filter(function (p) {
        return p.gedung === gedung.id && (n.tipe !== 'gedung' || p.t.jenis === 'pintu');
      });
      tingkat.push({ c: bg.concat(dalam), lurus: true, gedungSaja: n.tipe === 'gedung' });
    }
    tingkat.push({ c: semua.filter(function (p) { return p.gedung == null; }), lurus: true });

    for (var i = 0; i < tingkat.length; i++) {
      var best = null;
      var bestS = Infinity;
      tingkat[i].c.forEach(function (p) {
        if (!dj.dist.has(p.id)) { return; }
        var s = dj.dist.get(p.id) + (tingkat[i].lurus ? jarakLurus(p, pos) : 0);
        if (s < bestS) { bestS = s; best = p; }
      });
      if (best) {
        var path = [];
        var id = best.id;
        var g2 = 0;
        while (id != null && g2++ < 100000) {
          path.unshift(graf.titik.get(id));
          id = id === startId ? null : dj.prev.get(id);
        }
        return {
          ok: true, path: path, tujuan: n, posTujuan: pos, gedung: gedung, lantai: lantai,
          tepat: i === 0 || !!tingkat[i].gedungSaja, tingkat: i
        };
      }
    }
    return {
      ok: false,
      pesan: opsi.hindariTangga
        ? 'Tidak ada rute tanpa tangga ke tujuan ini. Matikan pilihan "Hindari tangga" untuk melihat rute lain.'
        : 'Tujuan ini belum terhubung ke jaringan jalur dari gerbang yang dipilih.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* Langkah tertulis                                                     */
  /* ------------------------------------------------------------------ */

  function fmtJarak(m) {
    if (m < 10) { return Math.max(1, Math.round(m)) + ' m'; }
    if (m < 100) { return Math.round(m / 5) * 5 + ' m'; }
    if (m < 1000) { return Math.round(m / 10) * 10 + ' m'; }
    return String(Math.round(m / 100) / 10).replace('.', ',') + ' km';
  }

  /** Sudut belok dari arah u ke arah v (derajat). Positif = ke kanan bila dilihat dari atas. */
  function sudutBelok(u, v) {
    return Math.atan2(u.x * v.z - u.z * v.x, u.x * v.x + u.z * v.z) * 180 / Math.PI;
  }

  function namaTitik(stage, p) {
    if (p.t.label) { return p.t.label; }
    var r = p.t.ruang_id != null ? stage.nodeMap.get(p.t.ruang_id) : null;
    if (p.t.jenis === 'pintu') { return r && r.judul ? 'pintu ' + r.judul : 'pintu'; }
    return { gerbang: 'gerbang', tangga: 'tangga', lift: 'lift' }[p.t.jenis] || '';
  }

  function namaLantaiObj(stage, l) {
    if (!l) { return ''; }
    if (l.judul) { return l.judul; }
    var sibs = stage.nodes.filter(function (x) { return x.parent_id === l.parent_id && x.tipe === 'lantai'; })
      .sort(function (a, b) { return (a.pos_y || 0) - (b.pos_y || 0); });
    return 'lantai ' + (sibs.indexOf(l) + 1);
  }

  function namaLantai(stage, p) {
    if (p.lantai != null) { return namaLantaiObj(stage, stage.nodeMap.get(p.lantai)); }
    return p.gedung != null ? 'lantai dasar' : 'permukaan tanah';
  }

  function ruasAntara(a, b) {
    for (var i = 0; i < a.adj.length; i++) { if (a.adj[i].to === b) { return a.adj[i].info; } }
    return infoRuas(a, b);
  }

  // Arah datang ke titik idx, dirata-rata hingga `batas` meter ke belakang (tidak melewati pergantian lantai).
  function arahMundur(path, idx, batas, minIdx) {
    var j = idx;
    var acc = 0;
    while (j > minIdx) {
      if (Math.abs(path[j - 1].pos.y - path[j].pos.y) > BEDA_LANTAI) { break; }
      acc += path[j - 1].pos.distanceTo(path[j].pos);
      j--;
      if (acc >= batas) { break; }
    }
    return { x: path[idx].pos.x - path[j].pos.x, z: path[idx].pos.z - path[j].pos.z };
  }
  function arahMaju(path, idx, batas) {
    var j = idx;
    var acc = 0;
    while (j < path.length - 1) {
      if (Math.abs(path[j + 1].pos.y - path[j].pos.y) > BEDA_LANTAI) { break; }
      acc += path[j + 1].pos.distanceTo(path[j].pos);
      j++;
      if (acc >= batas) { break; }
    }
    return { x: path[j].pos.x - path[idx].pos.x, z: path[j].pos.z - path[idx].pos.z };
  }

  /**
   * Menyusun langkah tertulis dari hasil cariRute.
   * Setiap langkah: {ikon, teks, dari, ke, jarak} dengan dari/ke = indeks titik pada rute.
   */
  function buatLangkah(stage, rute) {
    var path = rute.path;
    var n = path.length - 1;
    var L = [];
    var judulTujuan = rute.tujuan.judul || K3D.labelOf(rute.tujuan);
    var acc = 0;
    var legDari = 0;
    var total = 0;
    var lantaiDilalui = 0;

    L.push({ ikon: 'mulai', teks: 'Mulai dari ' + (namaTitik(stage, path[0]) || 'titik awal') + '.', dari: 0, ke: 0, jarak: 0 });

    function dorong(ikon, teks, ke) {
      L.push({ ikon: ikon, teks: huruf(teks), dari: legDari, ke: ke, jarak: acc });
      acc = 0;
      legDari = ke;
    }
    function awalan() { return acc >= 1 ? 'jalan ' + fmtJarak(acc) + ', lalu ' : ''; }

    var i = 0;
    while (i < n) {
      var a = path[i];
      var b = path[i + 1];
      var info = ruasAntara(a, b);
      if (info.moda !== 'jalan') {
        var j = i;
        var lift = true;
        while (j < n) {
          var inf2 = ruasAntara(path[j], path[j + 1]);
          if (inf2.moda === 'jalan') { break; }
          if (inf2.moda !== 'lift') { lift = false; }
          total += inf2.panjang;
          j++;
        }
        var dy = path[j].pos.y - path[i].pos.y;
        lantaiDilalui += Math.max(1, Math.round(Math.abs(dy) / 3.5));
        var alat = lift ? 'lift' : 'tangga';
        var pre = acc >= 1 ? 'jalan ' + fmtJarak(acc) + ' ke ' + (namaTitik(stage, a) || alat) + ', lalu ' : '';
        dorong(dy > 0 ? 'naik' : 'turun', pre + (dy > 0 ? 'naik ' : 'turun ') + alat + ' ke ' + namaLantai(stage, path[j]) + '.', j);
        i = j;
        continue;
      }
      acc += info.panjang;
      total += info.panjang;
      var k = i + 1;
      if (k < n) {
        if (a.gedung !== b.gedung) {
          var pintu = b.t.jenis === 'pintu' ? b : (a.t.jenis === 'pintu' ? a : null);
          var np = pintu ? namaTitik(stage, pintu) : '';
          var lewat = np ? ' lewat ' + np : '';
          if (b.gedung != null) {
            var g = stage.nodeMap.get(b.gedung);
            dorong('masuk', awalan() + 'masuk ke ' + ((g && g.judul) || 'gedung') + lewat + '.', k);
          } else {
            var g0 = stage.nodeMap.get(a.gedung);
            dorong('keluar', awalan() + 'keluar dari ' + ((g0 && g0.judul) || 'gedung') + lewat + '.', k);
          }
          i++;
          continue;
        }
        if (ruasAntara(b, path[k + 1]).moda === 'jalan') {
          var sud = sudutBelok(arahMundur(path, k, 4, legDari), arahMaju(path, k, 4));
          var abs = Math.abs(sud);
          // Belokan dilaporkan bila tajam, atau sedang tetapi di persimpangan (ada pilihan jalan).
          if (abs >= 60 || (b.adj.length >= 3 && abs >= 30)) {
            var sisi = sud > 0 ? 'kanan' : 'kiri';
            var ikon, kata;
            if (abs >= 150) { ikon = 'balik'; kata = 'putar balik'; }
            else if (abs < 60) { ikon = 'serong-' + sisi; kata = 'ambil jalan serong ke ' + sisi; }
            else { ikon = sisi; kata = 'belok ' + sisi; }
            dorong(ikon, awalan() + kata + (b.t.label ? ' di ' + b.t.label : '') + '.', k);
          }
        }
      }
      i++;
    }

    // Langkah terakhir: posisi tujuan relatif terhadap arah jalan.
    var last = path[n];
    var v = { x: rute.posTujuan.x - last.pos.x, z: rute.posTujuan.z - last.pos.z };
    var dv = Math.sqrt(v.x * v.x + v.z * v.z);
    var posisi = '';
    if (dv >= 2 && n > 0) {
      var u = arahMundur(path, n, 4, legDari);
      if (u.x || u.z) {
        var s = sudutBelok(u, v);
        var as = Math.abs(s);
        posisi = as < 35 ? 'di depan Anda' : (as > 145 ? 'di belakang Anda' : 'di sebelah ' + (s > 0 ? 'kanan' : 'kiri') + ' Anda');
      }
    }
    var teks = acc >= 1 ? 'Jalan ' + fmtJarak(acc) + '. ' : '';
    teks += posisi ? judulTujuan + ' ada ' + posisi + '.' : 'Sampai di ' + judulTujuan + '.';
    if (!rute.tepat) {
      var catat = [];
      if (dv >= 5) { catat.push('Titik jalur terdekat berjarak sekitar ' + fmtJarak(dv) + ' dari tujuan.'); }
      if (rute.lantai && last.lantai !== rute.lantai.id) {
        catat.push(judulTujuan + ' berada di ' + namaLantaiObj(stage, rute.lantai) + (rute.gedung && rute.gedung.judul ? ', ' + rute.gedung.judul : '') + '.');
      }
      if (catat.length) { teks += ' ' + catat.join(' '); }
    }
    L.push({ ikon: 'tiba', teks: teks, dari: legDari, ke: n, jarak: acc, kurang: !rute.tepat });

    return {
      langkah: L,
      jarak: total,
      menit: Math.max(1, Math.round((total / KECEPATAN + lantaiDilalui * DETIK_PER_LANTAI) / 60))
    };
  }

  /* ------------------------------------------------------------------ */
  /* Lapisan garis rute (publik dan uji rute di editor)                   */
  /* ------------------------------------------------------------------ */

  function RuteLayer(stage) {
    var grp = new THREE.Group();
    stage.scene.add(grp);
    var milik = [];          // geometri yang harus dibuang saat rute dihapus
    var kurva = null;
    var panjang = 0;
    var radius = 0.4;
    var panah = [];
    var pinAkhir = null;
    var sorot = null;
    var titik = [];

    var matUtama = new THREE.MeshBasicMaterial({ color: col(0x2b7fff) });
    var matHantu = new THREE.MeshBasicMaterial({ color: col(0x2b7fff), transparent: true, opacity: 0.3, depthTest: false, depthWrite: false });
    var matSorot = new THREE.MeshBasicMaterial({ color: col(0xffb020), transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    var matPanah = new THREE.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    var matMulai = new THREE.MeshBasicMaterial({ color: col(0x16a34a) });
    var matAkhir = new THREE.MeshBasicMaterial({ color: col(0xef4444) });
    var matCincin = new THREE.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    var geoPanah = new THREE.ConeGeometry(1, 2.4, 3);
    geoPanah.rotateY(Math.PI / 6);

    function buatKurva(pts) {
      var cp = new THREE.CurvePath();
      for (var i = 0; i < pts.length - 1; i++) {
        if (pts[i].distanceTo(pts[i + 1]) > 1e-3) { cp.add(new THREE.LineCurve3(pts[i], pts[i + 1])); }
      }
      return cp.curves.length ? cp : null;
    }
    function tabung(cp, r, mat, order) {
      var len = cp.getLength();
      var seg = Math.max(8, Math.min(3000, Math.ceil(len / 0.5) + cp.curves.length * 2));
      var geo = new THREE.TubeGeometry(cp, seg, r, 8, false);
      milik.push(geo);
      var m = new THREE.Mesh(geo, mat);
      m.renderOrder = order || 0;
      return m;
    }
    function pin(pos, mat, skala) {
      var g = new THREE.Group();
      var batang = new THREE.CylinderGeometry(0.12, 0.12, 3, 8);
      batang.translate(0, 1.5, 0);
      var kepala = new THREE.SphereGeometry(0.75, 20, 14);
      kepala.translate(0, 3.5, 0);
      var cincin = new THREE.RingGeometry(0.9, 1.3, 32);
      cincin.rotateX(-Math.PI / 2);
      milik.push(batang, kepala, cincin);
      var c = new THREE.Mesh(cincin, matCincin);
      c.position.y = 0.05;
      g.add(new THREE.Mesh(batang, mat), new THREE.Mesh(kepala, mat), c);
      g.position.copy(pos);
      g.scale.setScalar(skala);
      g.userData.cincin = c;
      grp.add(g);
      return g;
    }

    function bersih() {
      grp.children.slice().forEach(function (c) { grp.remove(c); });
      milik.forEach(function (g) { g.dispose(); });
      milik = [];
      kurva = null;
      panah = [];
      pinAkhir = null;
      sorot = null;
      titik = [];
    }

    stage.onFrame(function (now) {
      if (!titik.length) { return; }
      var t = now / 1000;
      if (kurva && panah.length) {
        var jarakAntar = panjang / panah.length;
        var tg = new THREE.Vector3();
        var up = new THREE.Vector3(0, 1, 0);
        var dist = stage.camera.position.distanceTo(stage.orbit.target);
        var sk = Math.max(radius * 1.15, Math.min(radius * 4, dist * 0.006));
        for (var i = 0; i < panah.length; i++) {
          var s = ((i * jarakAntar + t * 7) % panjang) / panjang;
          kurva.getPointAt(s, panah[i].position);
          kurva.getTangentAt(s, tg);
          panah[i].quaternion.setFromUnitVectors(up, tg.normalize());
          panah[i].scale.setScalar(sk);
        }
      }
      if (pinAkhir) {
        pinAkhir.position.y = pinAkhir.userData.y + Math.sin(t * 3) * 0.25 * pinAkhir.scale.x;
        var c = pinAkhir.userData.cincin;
        var k = (t * 0.8) % 1;
        c.scale.setScalar(1 + k * 1.8);
        c.material.opacity = 0.6 * (1 - k);
      }
    });

    function kotak(dari, ke) {
      var b = new THREE.Box3();
      for (var i = Math.max(0, dari); i <= Math.min(titik.length - 1, ke); i++) { b.expandByPoint(titik[i]); }
      return b;
    }

    return {
      /** Menampilkan rute melalui daftar posisi dunia (Vector3). */
      tampil: function (posisi) {
        bersih();
        titik = posisi.map(function (p) { return p.clone().add(new THREE.Vector3(0, ANGKAT, 0)); });
        if (!titik.length) { return; }
        var b = kotak(0, titik.length - 1);
        var s = b.getSize(new THREE.Vector3());
        radius = Math.max(0.3, Math.min(1.0, Math.max(s.x, s.z) / 350));
        kurva = buatKurva(titik);
        if (kurva) {
          panjang = kurva.getLength();
          grp.add(tabung(kurva, radius, matUtama, 1));
          grp.add(tabung(kurva, radius * 0.9, matHantu, 30));
          var jml = Math.max(1, Math.min(80, Math.floor(panjang / 9)));
          for (var i = 0; i < jml; i++) {
            var m = new THREE.Mesh(geoPanah, matPanah);
            m.renderOrder = 32;
            grp.add(m);
            panah.push(m);
          }
        }
        var skala = Math.max(1, radius * 2.2);
        pin(posisi[0], matMulai, skala);
        pinAkhir = pin(posisi[posisi.length - 1], matAkhir, skala);
        pinAkhir.userData.y = pinAkhir.position.y;
      },
      /** Menyorot bagian rute dari indeks dari sampai ke. */
      sorot: function (dari, ke) {
        if (sorot) { grp.remove(sorot); sorot = null; }
        if (ke <= dari || !titik.length) { return; }
        var cp = buatKurva(titik.slice(dari, ke + 1));
        if (!cp) { return; }
        sorot = tabung(cp, radius * 1.35, matSorot, 31);
        grp.add(sorot);
      },
      /** Mengarahkan kamera ke bagian rute (seluruh rute bila argumen kosong). */
      fokus: function (dari, ke) {
        if (!titik.length) { return; }
        if (dari == null) { dari = 0; ke = titik.length - 1; }
        var b = kotak(dari, ke);
        var c = b.getCenter(new THREE.Vector3());
        var s = b.getSize(new THREE.Vector3());
        var jarak = Math.max(s.x, s.y, s.z, 10) * 1.25 + 12;
        var dir = stage.camera.position.clone().sub(stage.orbit.target).normalize();
        if (dir.y < 0.35) { dir.y = 0.35; dir.normalize(); }
        stage.flyToPoint(c.clone().addScaledVector(dir, jarak), c);
      },
      hapus: bersih,
      aktif: function () { return titik.length > 0; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Lapisan graf untuk editor                                            */
  /* ------------------------------------------------------------------ */

  function GrafLayer(stage) {
    var grp = new THREE.Group();
    grp.visible = false;
    stage.scene.add(grp);
    var geoBola = new THREE.SphereGeometry(1, 14, 10);
    var mats = {};
    Object.keys(JENIS).forEach(function (k) {
      mats[k] = new THREE.MeshBasicMaterial({ color: col(JENIS[k].color), depthTest: false, transparent: true });
    });
    var matPilih = new THREE.MeshBasicMaterial({ color: col(0xffb020), depthTest: false, transparent: true });
    var matGaris = new THREE.LineBasicMaterial({ color: col(0x38bdf8), depthTest: false, transparent: true, opacity: 0.9 });
    var matVert = new THREE.LineBasicMaterial({ color: col(0xc084fc), depthTest: false, transparent: true, opacity: 0.95 });
    var bola = [];
    var garis = [];

    stage.onFrame(function () {
      if (!grp.visible) { return; }
      for (var i = 0; i < bola.length; i++) {
        var m = bola[i];
        var s = Math.max(0.12, stage.camera.position.distanceTo(m.position) * 0.0075);
        m.scale.setScalar(m.userData.sel ? s * 1.7 : s);
      }
    });

    function garisDari(arr, mat) {
      if (!arr.length) { return; }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      var l = new THREE.LineSegments(g, mat);
      l.renderOrder = 11;
      grp.add(l);
      garis.push(l);
    }

    return {
      set: function (graf, pilihId, redup) {
        bola.forEach(function (m) { grp.remove(m); });
        garis.forEach(function (l) { grp.remove(l); l.geometry.dispose(); });
        bola = [];
        garis = [];
        var biasa = [];
        var vert = [];
        var sudah = new Set();
        graf.titik.forEach(function (p) {
          var m = new THREE.Mesh(geoBola, p.id === pilihId ? matPilih : (mats[p.t.jenis] || mats.jalur));
          m.position.set(p.pos.x, p.pos.y + 0.3, p.pos.z);
          m.renderOrder = 12;
          m.userData.id = p.id;
          m.userData.sel = p.id === pilihId;
          if (redup && redup(p)) { m.visible = false; }
          grp.add(m);
          bola.push(m);
          p.adj.forEach(function (e) {
            if (sudah.has(e.to.id)) { return; }
            if (redup && (redup(p) && redup(e.to))) { return; }
            var arr = e.info.moda === 'jalan' ? biasa : vert;
            arr.push(p.pos.x, p.pos.y + 0.3, p.pos.z, e.to.pos.x, e.to.pos.y + 0.3, e.to.pos.z);
          });
          sudah.add(p.id);
        });
        garisDari(biasa, matGaris);
        garisDari(vert, matVert);
      },
      pilih: function (clientX, clientY) {
        var hits = stage.raycast(clientX, clientY, bola.filter(function (m) { return m.visible; }));
        return hits.length ? hits[0].object.userData.id : null;
      },
      tampil: function (on) { grp.visible = !!on; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Membuat jaringan jalur dari area jalan (tahap 3)                     */
  /* ------------------------------------------------------------------ */

  /**
   * Mengubah garis tengah semua area jalan menjadi titik dan ruas. Persimpangan dan
   * pertemuan bentuk T dideteksi otomatis. Titik luar yang sudah ada dalam jarak `tol`
   * dipakai ulang. Mengembalikan {titik: [baru], ruas: [[a, b], ...], pakaiUlang: n}.
   */
  function dariJalan(areaNodes, titikLama, newId, tol) {
    tol = tol || 1;
    var segs = [];
    areaNodes.forEach(function (a) {
      if (a.tipe !== 'area' || a.subtipe !== 'jalan' || !a.geometri || !a.geometri.titik) { return; }
      var t = a.geometri.titik;
      var w = a.geometri.lebar || 6;
      for (var i = 0; i < t.length - 1; i++) {
        segs.push({ a: t[i], b: t[i + 1], w: w, ts: [0, 1] });
      }
    });
    var gabung = [];   // pasangan [segIdx, u, segIdx2, u2] yang harus menjadi satu titik

    function proyeksi(s, p) {
      var dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
      var L2 = dx * dx + dz * dz || 1;
      var u = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / L2;
      var cx = s.a[0] + u * dx, cz = s.a[1] + u * dz;
      return { u: u, d: Math.hypot(p[0] - cx, p[1] - cz) };
    }

    for (var i = 0; i < segs.length; i++) {
      for (var j = i + 1; j < segs.length; j++) {
        var s = segs[i], t = segs[j];
        var rx = s.b[0] - s.a[0], rz = s.b[1] - s.a[1];
        var qx = t.b[0] - t.a[0], qz = t.b[1] - t.a[1];
        var den = rx * qz - rz * qx;
        if (Math.abs(den) > 1e-9) {
          var px = t.a[0] - s.a[0], pz = t.a[1] - s.a[1];
          var u = (px * qz - pz * qx) / den;
          var v = (px * rz - pz * rx) / den;
          if (u >= -1e-6 && u <= 1 + 1e-6 && v >= -1e-6 && v <= 1 + 1e-6) {
            u = Math.max(0, Math.min(1, u));
            v = Math.max(0, Math.min(1, v));
            s.ts.push(u);
            t.ts.push(v);
            gabung.push([i, u, j, v]);
          }
        }
        // Pertemuan bentuk T: ujung satu jalan berhenti di badan jalan lain.
        [[s, i, t, j], [t, j, s, i]].forEach(function (c) {
          [0, 1].forEach(function (ujung) {
            var p = ujung ? c[2].b : c[2].a;
            var pr = proyeksi(c[0], p);
            if (pr.u > 0 && pr.u < 1 && pr.d <= c[0].w / 2 + tol) {
              c[0].ts.push(pr.u);
              gabung.push([c[1], pr.u, c[3], ujung]);
            }
          });
        });
      }
    }

    var raw = [];
    var kunci = {};
    var key = function (si, u) { return si + ':' + u.toFixed(5); };
    segs.forEach(function (s, si) {
      var ts = s.ts.slice().sort(function (a, b) { return a - b; });
      var uniq = [];
      ts.forEach(function (u) { if (!uniq.length || u - uniq[uniq.length - 1] > 1e-5) { uniq.push(u); } });
      var ya = s.a[2] || 0;
      var yb = s.b[2] || 0;
      s.idx = uniq.map(function (u) {
        raw.push({ x: s.a[0] + (s.b[0] - s.a[0]) * u, y: ya + (yb - ya) * u, z: s.a[1] + (s.b[1] - s.a[1]) * u, dalam: u > 1e-5 && u < 1 - 1e-5 });
        kunci[key(si, u)] = raw.length - 1;
        return raw.length - 1;
      });
      s.us = uniq;
    });

    var induk = raw.map(function (_, k) { return k; });
    var cari = function (k) { while (induk[k] !== k) { induk[k] = induk[induk[k]]; k = induk[k]; } return k; };
    var satukan = function (a, b) { a = cari(a); b = cari(b); if (a !== b) { induk[b] = a; } };
    var temukan = function (si, u) {
      var s = segs[si];
      var best = -1, bd = Infinity;
      s.us.forEach(function (uu, k) { var d = Math.abs(uu - u); if (d < bd) { bd = d; best = s.idx[k]; } });
      return best;
    };
    gabung.forEach(function (g) { satukan(temukan(g[0], g[1]), temukan(g[2], g[3])); });
    for (var a = 0; a < raw.length; a++) {
      for (var b = a + 1; b < raw.length; b++) {
        if (Math.abs(raw[a].x - raw[b].x) <= tol && Math.abs(raw[a].z - raw[b].z) <= tol && Math.hypot(raw[a].x - raw[b].x, raw[a].z - raw[b].z) <= tol) { satukan(a, b); }
      }
    }

    // Posisi wakil kelompok: rata-rata titik di badan jalan (persimpangan) bila ada, selain itu rata-rata semua.
    var kel = {};
    raw.forEach(function (p, k) { var r = cari(k); (kel[r] = kel[r] || []).push(p); });
    var lama = (titikLama || []).filter(function (t) { return t.objek_id == null; });
    var idKel = {};
    var baru = [];
    var pakaiUlang = 0;
    Object.keys(kel).forEach(function (r) {
      var ps = kel[r];
      var dalam = ps.filter(function (p) { return p.dalam; });
      var pakai = dalam.length ? dalam : ps;
      var x = 0, y = 0, z = 0;
      pakai.forEach(function (p) { x += p.x; y += (p.y || 0); z += p.z; });
      x = Math.round(x / pakai.length * 100) / 100;
      y = Math.round(y / pakai.length * 100) / 100;
      z = Math.round(z / pakai.length * 100) / 100;
      var ada = null;
      for (var i = 0; i < lama.length; i++) {
        if (Math.hypot(lama[i].x - x, lama[i].z - z) <= tol) { ada = lama[i]; break; }
      }
      if (ada) { idKel[r] = ada.id; pakaiUlang++; return; }
      var t = { id: newId(), objek_id: null, jenis: 'jalur', label: '', ruang_id: null, x: x, y: y, z: z };
      baru.push(t);
      lama.push(t);
      idKel[r] = t.id;
    });

    var ruas = [];
    var sudah = {};
    segs.forEach(function (s) {
      for (var k = 0; k < s.idx.length - 1; k++) {
        var A = idKel[cari(s.idx[k])];
        var B = idKel[cari(s.idx[k + 1])];
        if (A === B) { continue; }
        var kk = A < B ? A + ':' + B : B + ':' + A;
        if (sudah[kk]) { continue; }
        sudah[kk] = true;
        ruas.push([A, B]);
      }
    });
    return { titik: baru, ruas: ruas, pakaiUlang: pakaiUlang, jumlahJalan: segs.length };
  }

  global.K3D_JALUR = {
    JENIS: JENIS,
    BEDA_LANTAI: BEDA_LANTAI,
    leluhur: leluhur,
    buatGraf: buatGraf,
    cariRute: cariRute,
    buatLangkah: buatLangkah,
    terjangkau: terjangkau,
    fmtJarak: fmtJarak,
    namaTitik: namaTitik,
    RuteLayer: RuteLayer,
    GrafLayer: GrafLayer,
    dariJalan: dariJalan
  };
})(window);
