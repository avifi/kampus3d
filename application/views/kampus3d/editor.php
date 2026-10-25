<?php defined('BASEPATH') OR exit('No direct script access allowed');
$a = $cfg['assetBase'];
$v = time();
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editor Kampus 3D</title>
<script>(function(){var t='light';try{t=localStorage.getItem('k3d_theme')||'light';}catch(e){}document.documentElement.setAttribute('data-theme',t);})();</script>
<link rel="stylesheet" href="<?php echo $a; ?>vendor/bootstrap/bootstrap-icons.min.css">
<link rel="stylesheet" href="<?php echo $a; ?>css/kampus3d.css?v=<?php echo $v; ?>">
</head>
<body>
<div class="app">
  <header class="top">
    <div class="brand">
      <h1>Editor Kampus 3D</h1>
    </div>
    <div class="tools" role="toolbar" aria-label="Alat editor">
      <button class="btn btn-theme k3d-btn-icon" id="themeBtn" type="button" title="Ganti mode tema (Terang/Gelap)" aria-label="Ganti mode tema">
        <i class="bi bi-moon-stars" id="themeIcon" aria-hidden="true"></i>
        <span class="sr-only" id="themeText">Mode Gelap</span>
      </button>
      <div class="quality-wrap" title="Kualitas render & bayangan editor">
        <span class="quality-icon" aria-hidden="true"><i class="bi bi-sliders"></i></span>
        <label for="qualitySelect" class="sr-only">Kualitas</label>
        <select class="btn quality-select" id="qualitySelect" aria-label="Kualitas render">
          <option value="tinggi">Kualitas: Tinggi</option>
          <option value="sedang">Kualitas: Sedang</option>
          <option value="rendah">Kualitas: Rendah</option>
        </select>
      </div>
      <span class="sep" aria-hidden="true"></span>
      <button class="btn k3d-btn-icon" id="m-translate" type="button" aria-pressed="true" title="Mode Pindah objek (Shortcut: W)" aria-label="Pindah (W)">
        <i class="bi bi-arrows-move"></i>
      </button>
      <button class="btn k3d-btn-icon" id="m-rotate" type="button" aria-pressed="false" title="Mode Putar objek (Shortcut: E)" aria-label="Putar (E)">
        <i class="bi bi-arrow-repeat"></i>
      </button>
      <button class="btn k3d-btn-icon" id="m-scale" type="button" aria-pressed="false" title="Mode Skala objek (Shortcut: R)" aria-label="Skala (R)">
        <i class="bi bi-arrows-angle-expand"></i>
      </button>
      <label class="check" title="Tempel pergerakan ke grid/kelipatan tertentu">
        <input type="checkbox" id="snap" checked> <i class="bi bi-grid-3x3" aria-hidden="true"></i> Snap
      </label>
      <span class="sep" aria-hidden="true"></span>
      <button class="btn k3d-btn-icon" id="undo" type="button" disabled title="Urungkan perubahan (Shortcut: Ctrl+Z)" aria-label="Urungkan (Ctrl+Z)">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
      <button class="btn k3d-btn-icon" id="redo" type="button" disabled title="Ulangi perubahan (Shortcut: Ctrl+Y)" aria-label="Ulangi (Ctrl+Y)">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
      <span class="sep" aria-hidden="true"></span>
      <button class="btn k3d-btn-icon" id="resetCam" type="button" title="Kembalikan sudut pandang kamera ke posisi awal" aria-label="Reset kamera">
        <i class="bi bi-compass"></i>
      </button>
      <button class="btn k3d-btn-icon" id="previewBtn" type="button" aria-pressed="false" title="Pratinjau tampilan seperti di halaman publik" aria-label="Pratinjau">
        <i class="bi bi-eye"></i>
      </button>
      <a class="btn k3d-btn-icon" id="publicLink" href="<?php echo html_escape($cfg['urlPublik']); ?>" target="_blank" rel="noopener" title="Buka halaman publik di tab baru" aria-label="Halaman publik">
        <i class="bi bi-box-arrow-up-right"></i>
      </a>
      <span class="sep" aria-hidden="true"></span>
      <span class="chip" id="saveChip" role="status">Memuat&hellip;</span>
      <button class="btn primary k3d-btn-icon" id="saveBtn" type="button" disabled title="Simpan semua perubahan ke server" aria-label="Simpan">
        <i class="bi bi-floppy"></i>
      </button>
      <span class="sep" aria-hidden="true"></span>
      <span class="role-badge <?php echo html_escape($cfg['role']); ?>"><i class="bi bi-shield-lock" aria-hidden="true"></i> <?php echo $cfg['role'] === 'superadmin' ? 'Superadmin' : 'Admin Unit'; ?></span>
      <?php if ($cfg['role'] === 'superadmin'): ?>
        <button class="btn k3d-btn-icon" id="btnKelolaUnit" type="button" title="Kelola wewenang gedung untuk admin unit" aria-label="Wewenang Unit">
          <i class="bi bi-building-gear"></i>
        </button>
        <button class="btn k3d-btn-icon" id="btnAvatarSetting" type="button" title="Pengaturan karakter mode jelajah publik" aria-label="Pengaturan Karakter">
          <i class="bi bi-person-gear"></i>
        </button>
      <?php endif; ?>
      <?php if ( ! empty($cfg['urlLogout'])): ?>
        <span class="sep" aria-hidden="true"></span>
        <a class="btn k3d-btn-icon" href="<?php echo html_escape($cfg['urlLogout']); ?>" title="Keluar dari akun admin (<?php echo html_escape($cfg['user']); ?>)" aria-label="Keluar">
          <i class="bi bi-box-arrow-right"></i>
        </a>
      <?php endif; ?>
    </div>
  </header>

  <aside class="left" aria-label="Panel kontrol editor">
    <nav class="k3d-sidebar-tabs" role="tablist" aria-label="Tab Editor">
      <button class="k3d-tab-btn active" type="button" role="tab" id="tabBtnObjek" data-tab="tabObjek" aria-selected="true" aria-controls="tabObjek" title="Daftar & Hierarki Objek">
        <i class="bi bi-diagram-3"></i>
        <span>Objek</span>
      </button>
      <button class="k3d-tab-btn" type="button" role="tab" id="tabBtnTambah" data-tab="tabTambah" aria-selected="false" aria-controls="tabTambah" title="Tambah Objek 3D">
        <i class="bi bi-plus-circle"></i>
        <span>Tambah</span>
      </button>
      <button class="k3d-tab-btn" type="button" role="tab" id="tabBtnArea" data-tab="tabArea" aria-selected="false" aria-controls="tabArea" title="Gambar Area Outdoor">
        <i class="bi bi-tree"></i>
        <span>Area</span>
      </button>
      <button class="k3d-tab-btn" type="button" role="tab" id="tabBtnPustaka" data-tab="tabPustaka" aria-selected="false" aria-controls="tabPustaka" title="Pustaka Model 3D">
        <i class="bi bi-collection"></i>
        <span>Pustaka</span>
      </button>
      <?php if ($cfg['role'] === 'superadmin'): ?>
      <button class="k3d-tab-btn" type="button" role="tab" id="tabBtnJalur" data-tab="tabJalur" aria-selected="false" aria-controls="tabJalur" title="Jalur Petunjuk Arah">
        <i class="bi bi-signpost-2"></i>
        <span>Jalur</span>
      </button>
      <?php endif; ?>
    </nav>

    <div class="k3d-sidebar-content">
      <!-- Tab 1: Daftar Objek (Hierarki Tree) -->
      <div class="k3d-tab-pane active" id="tabObjek" role="tabpanel" aria-labelledby="tabBtnObjek">
        <section>
          <h2 class="h">Daftar objek <span id="count"></span></h2>
          <ul class="tree" id="tree"></ul>
        </section>
      </div>

      <!-- Tab 2: Tambah Objek -->
      <div class="k3d-tab-pane" id="tabTambah" role="tabpanel" aria-labelledby="tabBtnTambah" hidden>
        <section>
          <h2 class="h">Tambah objek</h2>
          <div class="field">
            <label for="addType">Tipe</label>
            <select id="addType">
              <option value="gedung">Gedung</option>
              <option value="lantai">Lantai</option>
              <option value="ruang">Ruang</option>
              <option value="barang">Barang</option>
            </select>
          </div>
          <div class="field">
            <label for="addKategori">Kategori model saat mengunggah (opsional)</label>
            <input id="addKategori" list="katList" maxlength="60" placeholder="umum" autocomplete="off">
            <datalist id="katList"></datalist>
          </div>
          <div class="row">
            <label class="btn primary" for="fileIn" style="cursor:pointer" title="Unggah model 3D berkas .glb">Unggah .glb</label>
            <button class="btn" id="addBox" type="button" title="Tambah objek kotak 3D baru">Tambah kotak</button>
          </div>
          <input id="fileIn" type="file" accept=".glb" multiple hidden>
          <p class="note">Atau seret berkas .glb ke kanvas. Maksimal <span id="maxMb"></span> MB per berkas. Objek baru masuk ke objek yang sedang dipilih jika tipenya cocok (lantai di gedung, ruang di lantai, barang di ruang).</p>
        </section>
      </div>

      <!-- Tab 3: Area Outdoor -->
      <div class="k3d-tab-pane" id="tabArea" role="tabpanel" aria-labelledby="tabBtnArea" hidden>
        <section>
          <h2 class="h">Area outdoor</h2>
          <div class="field">
            <label for="areaType">Jenis</label>
            <select id="areaType">
              <option value="jalan">Jalan</option>
              <option value="sungai">Sungai</option>
              <option value="taman">Taman</option>
              <option value="lapangan">Lapangan</option>
              <option value="parkir">Parkir</option>
            </select>
          </div>
          <button class="btn primary" id="areaDraw" type="button" title="Mulai menggambar area outdoor pada kanvas">Gambar area</button>
          <div class="row" id="areaDrawBar" hidden>
            <button class="btn primary" id="areaDone" type="button">Selesai</button>
            <button class="btn" id="areaUndoPt" type="button">Hapus titik terakhir</button>
            <button class="btn" id="areaCancel" type="button">Batal</button>
          </div>
          <p class="note" id="areaNote">Klik "Gambar area", lalu klik di tanah untuk menaruh titik. Jalan dan sungai butuh minimal 2 titik, taman, lapangan, dan parkir minimal 3 titik. Selesai dengan tombol, Enter, atau klik dua kali.</p>
        </section>
      </div>

      <!-- Tab 4: Library Model -->
      <div class="k3d-tab-pane" id="tabPustaka" role="tabpanel" aria-labelledby="tabBtnPustaka" hidden>
        <section>
          <h2 class="h">Library model <span id="libCount"></span></h2>
          <div class="field">
            <label for="libQ">Cari model</label>
            <input id="libQ" type="search" placeholder="Nama model" autocomplete="off">
          </div>
          <div class="field">
            <label for="libCat">Kategori</label>
            <select id="libCat"></select>
          </div>
          <ul class="liblist" id="libList"></ul>
          <p class="note" id="libEmpty" hidden></p>
          <div id="libDetail" class="box" hidden>
            <button class="btn primary" id="libAdd" type="button">Tambahkan ke kampus</button>
            <div class="field"><label for="lib-nama">Nama model</label><input id="lib-nama" maxlength="150" autocomplete="off"></div>
            <div class="field"><label for="lib-kat">Kategori</label><input id="lib-kat" list="katList" maxlength="60" autocomplete="off"></div>
            <p class="info-line" id="libInfo"></p>
            <div class="row">
              <button class="btn" id="libSave" type="button">Simpan nama</button>
              <label class="btn" for="libReplaceIn" style="cursor:pointer">Ganti berkas</label>
              <button class="btn danger" id="libDel" type="button">Hapus model</button>
            </div>
            <input id="libReplaceIn" type="file" accept=".glb" hidden>
            <p class="note" id="libHint"></p>
          </div>
          <p class="note">Ubah nama, ganti berkas, dan hapus model langsung berlaku di server, tidak menunggu tombol Simpan.</p>
        </section>
      </div>

      <?php if ($cfg['role'] === 'superadmin'): ?>
      <!-- Tab 5: Jalur Petunjuk Arah -->
      <div class="k3d-tab-pane" id="tabJalur" role="tabpanel" aria-labelledby="tabBtnJalur" hidden>
        <section>
          <h2 class="h">Jalur petunjuk arah <span id="jalurCount"></span></h2>
          <div class="row" style="margin-bottom:8px;">
            <label class="check"><input type="checkbox" id="jalurVisible" checked> Tampilkan jalur</label>
            <button class="btn" id="jalurImportRoad" type="button" title="Otomatis buat titik dan ruas mengikuti garis tengah area jalan tahap 3">Import dari jalan</button>
          </div>
          <div class="field">
            <label for="jalurAddJenis">Jenis titik baru</label>
            <select id="jalurAddJenis">
              <option value="jalur">Titik jalur umum</option>
              <option value="gerbang">Gerbang / Titik awal</option>
              <option value="pintu">Pintu masuk gedung / ruang</option>
              <option value="tangga">Tangga antar-lantai</option>
              <option value="lift">Lift antar-lantai</option>
            </select>
          </div>
          <div class="field">
            <label for="jalurAddLabel">Label titik (opsional)</label>
            <input id="jalurAddLabel" placeholder="Contoh: Gerbang Utama / Pintu Rektorat" maxlength="80" autocomplete="off">
          </div>
          <div class="row">
            <button class="btn primary" id="jalurAddBtn" type="button" title="Tambah titik rute baru dengan klik kanvas">Tambah titik (klik kanvas)</button>
            <button class="btn" id="jalurConnectBtn" type="button" title="Hubungkan dua titik rute yang dipilih">Hubungkan 2 titik</button>
          </div>
          <p class="note" id="jalurHint">Aktifkan "Tambah titik" lalu klik di jalan, pintu gedung, atau koridor lantai untuk menaruh titik rute. Klik dua titik untuk menyambungnya dengan ruas jalan.</p>
        </section>
      </div>
      <?php endif; ?>
    </div>
  </aside>

  <main class="stage" id="stage">
    <canvas id="c" aria-label="Kanvas 3D kampus"></canvas>
    <div class="overlay status" id="status" role="status" aria-live="polite"></div>
    <div class="overlay hint">Seret: putar &middot; Klik kanan + seret: geser &middot; Roda: zoom &middot; Klik berulang: pilih isi di dalam</div>
    <div class="overlay card" id="card" hidden>
      <span class="tag" id="cardTag"></span>
      <h2 id="cardTitle"></h2>
      <p id="cardDesc"></p>
      <div class="row"><button class="btn primary" id="cardFly" type="button">Fokus kamera</button><button class="btn" id="cardClose" type="button">Tutup</button></div>
    </div>
    <div class="tip" id="tip" hidden></div>
    <div class="nogl" id="nogl" hidden>Peramban ini tidak dapat menjalankan WebGL, sehingga tampilan 3D tidak bisa dibuka. Coba peramban lain atau aktifkan akselerasi perangkat keras.</div>
  </main>

  <aside class="right" aria-label="Properti objek">
    <h2 class="h">Properti</h2>
    <p class="note" id="propsEmpty">Pilih objek di kanvas atau di daftar untuk mengubah judul, deskripsi, dan posisinya.</p>
    <div id="propsForm" hidden>
      <div class="note" id="lockNotice" hidden style="background:var(--warn-soft); color:var(--warn); padding:8px 10px; border-radius:6px; margin-bottom:12px; font-weight:600;">🔒 Objek ini di luar wewenang unit Anda (hanya-baca).</div>
      <div class="field na">
        <label for="f-tipe">Tipe</label>
        <select id="f-tipe">
          <option value="gedung">Gedung</option>
          <option value="lantai">Lantai</option>
          <option value="ruang">Ruang</option>
          <option value="barang">Barang</option>
        </select>
      </div>
      <div class="field na"><label for="f-parent">Induk</label><select id="f-parent"></select></div>
      <div class="field">
        <label for="f-status">Status</label>
        <select id="f-status">
          <option value="draft">Draft (belum tampil di halaman publik)</option>
          <option value="terbit">Terbit (tampil di halaman publik)</option>
        </select>
      </div>
      <div class="field"><label for="f-judul">Judul</label><input id="f-judul" maxlength="120" autocomplete="off"></div>
      <div class="field"><label for="f-desk">Deskripsi</label><textarea id="f-desk" rows="4" maxlength="2000"></textarea></div>
      <div class="field na"><span class="lbl">Model</span><div class="mono" id="f-file"></div></div>
      <fieldset class="na"><legend>Posisi (meter, relatif ke induk)</legend><div class="xyz" id="g-pos"></div></fieldset>
      <fieldset class="na"><legend>Rotasi (derajat)</legend><div class="xyz" id="g-rot"></div></fieldset>
      <fieldset class="na"><legend>Skala</legend><div class="xyz" id="g-scale"></div></fieldset>
      <p class="info-line na" id="sizeInfo"></p>
      <div class="field na">
        <label for="fit">Sesuaikan ukuran sisi terpanjang (meter)</label>
        <div class="fit"><input id="fit" type="number" min="0.01" step="0.5"><button class="btn" id="fitBtn" type="button">Terapkan</button></div>
      </div>
      <fieldset class="box ao" id="areaBox" hidden>
        <legend>Bentuk area</legend>
        <div class="field">
          <label for="f-subtipe">Jenis</label>
          <select id="f-subtipe">
            <option value="jalan">Jalan</option>
            <option value="sungai">Sungai</option>
            <option value="taman">Taman</option>
            <option value="lapangan">Lapangan</option>
            <option value="parkir">Parkir</option>
          </select>
        </div>
        <div class="field" id="ao-lebarRow">
          <label for="f-lebar">Lebar jalan (meter)</label>
          <input id="f-lebar" type="number" min="0.5" max="60" step="0.5">
        </div>
        <div id="ao-points" class="ptlist"></div>
        <button class="btn" id="ptAdd" type="button">Tambah titik</button>
        <div class="fit">
          <input id="mv-x" type="number" step="0.5" placeholder="geser X" aria-label="Geser seluruh area di sumbu X">
          <input id="mv-z" type="number" step="0.5" placeholder="geser Z" aria-label="Geser seluruh area di sumbu Z">
          <button class="btn" id="mvBtn" type="button">Geser</button>
        </div>
        <p class="note">Seret titik putih di kanvas atau ubah angkanya. Koordinat dalam meter dari titik acuan kampus (X ke kanan, Z ke arah kamera awal).</p>
      </fieldset>
      <div class="actions">
        <button class="btn" id="focusBtn" type="button" title="Fokuskan kamera ke objek ini">Fokus kamera</button>
        <button class="btn na" id="groundBtn" type="button" title="Letakkan objek di atas permukaan lantai induk">Letakkan di lantai induk</button>
        <button class="btn na" id="resetScale" type="button" title="Kembalikan skala objek ke 1, 1, 1">Reset skala</button>
      </div>
      <div class="actions">
        <button class="btn" id="dupFull" type="button" title="Duplikasi objek beserta seluruh isinya">Salin dengan isi</button>
        <button class="btn" id="dupShell" type="button" title="Duplikasi kerangka gedung/ruang tanpa barang">Salin kerangka</button>
        <button class="btn danger" id="delBtn" type="button" title="Hapus objek ini">Hapus</button>
      </div>
      <div class="actions">
        <button class="btn" id="qrBtn" type="button" title="Buat & Cetak Kode QR untuk objek ini">Kode QR</button>
        <button class="btn" id="qrBatchBtn" type="button" title="Cetak semua kode QR ruang di dalam gedung/lantai ini" hidden>Cetak Semua QR Ruang</button>
      </div>
      <p class="note">"Salin kerangka" menyalin gedung, lantai, dan ruang tanpa barang di dalamnya. Salinan berstatus draft.</p>
      <fieldset class="box" id="copyBox">
        <legend>Salin lanjutan</legend>
        <label class="check"><input type="checkbox" id="cp-isi" checked> Sertakan barang di dalamnya</label>
        <div class="field" id="cp-toRow">
          <label for="cp-parent">Salin ke induk lain</label>
          <div class="fit"><select id="cp-parent"></select><button class="btn" id="cpTo" type="button">Salin</button></div>
        </div>
        <div class="xyz">
          <label><span>Jumlah</span><input class="cpnum" id="cp-n" type="number" min="1" max="50" step="1" value="3"></label>
          <label><span>Jarak X</span><input class="cpnum" id="cp-dx" type="number" step="0.5" placeholder="auto"></label>
          <label><span>Jarak Z</span><input class="cpnum" id="cp-dz" type="number" step="0.5" placeholder="0"></label>
        </div>
        <button class="btn" id="cpRow" type="button">Gandakan berderet</button>
        <p class="note">Berderet: salinan ke-2, 3, dan seterusnya digeser sejauh jarak tersebut (meter, searah sumbu induk). Jarak X kosong berarti otomatis selebar objek.</p>
      </fieldset>
    </div>

    <!-- Properti Titik Jalur (tahap 4b) -->
    <div id="jalurPropsBox" hidden>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="tag" id="jpTag">Titik Jalur</span>
        <button class="btn danger" id="jpDelBtn" type="button" style="padding:2px 8px; font-size:12px;">Hapus Titik</button>
      </div>
      <div class="field">
        <label for="jpJenis">Jenis titik</label>
        <select id="jpJenis">
          <option value="jalur">Titik jalur umum</option>
          <option value="gerbang">Gerbang / Titik awal</option>
          <option value="pintu">Pintu masuk gedung / ruang</option>
          <option value="tangga">Tangga antar-lantai</option>
          <option value="lift">Lift antar-lantai</option>
        </select>
      </div>
      <div class="field">
        <label for="jpLabel">Label nama titik</label>
        <input id="jpLabel" maxlength="80" autocomplete="off" placeholder="Nama titik">
      </div>
      <div class="field" id="jpRuangRow">
        <label for="jpRuang">Menuju ke Ruang / Gedung</label>
        <select id="jpRuang"></select>
      </div>
      <div class="field">
        <span class="lbl">Menempel pada</span>
        <div class="mono" id="jpTempel">Tanah kampus</div>
      </div>
      <fieldset>
        <legend>Posisi lokal (relatif ke tempelan)</legend>
        <div class="xyz" id="jpPos">
          <label><span>X</span><input class="num" id="jp-x" type="number" step="0.5"></label>
          <label><span>Y</span><input class="num" id="jp-y" type="number" step="0.5"></label>
          <label><span>Z</span><input class="num" id="jp-z" type="number" step="0.5"></label>
        </div>
      </fieldset>
      <div class="actions">
        <button class="btn" id="jpConnectBtn" type="button">Sambung ke titik lain</button>
        <button class="btn" id="jpDisconnectBtn" type="button">Putus semua ruas titik ini</button>
      </div>
      <p class="note" id="jpRuasInfo" style="margin-top:8px;"></p>
    </div>
  </aside>
</div>

<?php if ($cfg['role'] === 'superadmin'): ?>
<dialog id="userUnitDlg" class="qr-dlg" style="max-width:560px; text-align:left;">
  <h2 style="font-size:16px; margin-bottom:4px;">Wewenang Gedung Admin Unit</h2>
  <p class="note" style="margin-bottom:14px;">Pilih gedung-gedung yang dapat dikelola oleh admin unit. Admin unit tidak dapat mengubah gedung di luar daftar wewenangnya.</p>
  <div id="userUnitList" style="max-height:360px; overflow-y:auto; margin-bottom:16px; padding:4px 0;"></div>
  <div class="row" style="justify-content:flex-end;">
    <button class="btn" id="userUnitClose" type="button">Tutup</button>
  </div>
</dialog>

<dialog id="avatarSettingDlg" class="qr-dlg dialog-avatar-setting" style="text-align:left;">
  <h2 style="font-size:16px; margin-bottom:4px;">Pengaturan Mode Karakter (Jelajah)</h2>
  <p class="note" style="margin-bottom:14px;">Atur model 3D karakter, kecepatan jalan/lari, dan tinggi pandangan kamera untuk mode jelajah publik.</p>
  <form id="avatarSettingForm" method="dialog">
    <div class="field">
      <label for="setAvatarLib">Model Karakter 3D (.glb)</label>
      <select id="setAvatarLib">
        <option value="">[Bawaan] Stylized Humanoid Mannequin</option>
      </select>
      <p class="note" style="margin-top:4px; font-size:11px;">Model .glb dengan animasi idle & walk dapat diunggah lewat tab Pustaka.</p>
    </div>
    <div class="field">
      <label for="setAvatarSpeed">Kecepatan Jalan (m/s)</label>
      <div class="setting-slider-row">
        <input type="range" id="setAvatarSpeed" min="1.0" max="10.0" step="0.1" value="3.5">
        <span class="setting-slider-val" id="valAvatarSpeed">3.5 m/s</span>
      </div>
    </div>
    <div class="field">
      <label for="setAvatarRunSpeed">Kecepatan Lari (Shift) (m/s)</label>
      <div class="setting-slider-row">
        <input type="range" id="setAvatarRunSpeed" min="2.0" max="15.0" step="0.1" value="6.5">
        <span class="setting-slider-val" id="valAvatarRunSpeed">6.5 m/s</span>
      </div>
    </div>
    <div class="field">
      <label for="setAvatarCamHeight">Tinggi Pandangan / Kamera (meter)</label>
      <div class="setting-slider-row">
        <input type="range" id="setAvatarCamHeight" min="1.0" max="2.5" step="0.05" value="1.6">
        <span class="setting-slider-val" id="valAvatarCamHeight">1.60 m</span>
      </div>
    </div>
    <div class="row" style="justify-content:flex-end; gap:8px; margin-top:16px;">
      <button class="btn" id="avatarSettingClose" type="button">Batal</button>
      <button class="btn primary" id="avatarSettingSave" type="button">Simpan Pengaturan</button>
    </div>
  </form>
</dialog>
<?php endif; ?>


<script>window.K3D_CONFIG = <?php echo json_encode($cfg, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?>;</script>
<script src="<?php echo $a; ?>vendor/three.min.js"></script>
<script src="<?php echo $a; ?>vendor/OrbitControls.js"></script>
<script src="<?php echo $a; ?>vendor/TransformControls.js"></script>
<script src="<?php echo $a; ?>vendor/GLTFLoader.js"></script>
<script src="<?php echo $a; ?>vendor/DRACOLoader.js"></script>
<script src="<?php echo $a; ?>js/k3d-core.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-jalur.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-qr.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-editor.js?v=<?php echo $v; ?>"></script>
</body>
</html>
