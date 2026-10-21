<?php defined('BASEPATH') OR exit('No direct script access allowed');
$judul = $this->config->item('k3d_judul', 'kampus3d');
if ( ! $judul) { $judul = 'Kampus 3D'; }
$a = $cfg['assetBase'];
$v = time();
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo html_escape($judul); ?></title>
<script>(function(){var t='light';try{t=localStorage.getItem('k3d_theme')||'light';}catch(e){}document.documentElement.setAttribute('data-theme',t);})();</script>
<link rel="stylesheet" href="<?php echo $a; ?>css/kampus3d.css?v=<?php echo $v; ?>">
</head>
<body>
<div class="app pub">
  <header class="top">
    <div class="brand">
      <h1><?php echo html_escape($judul); ?></h1>
      <p>Jelajahi gedung, ruang, dan fasilitas kampus dalam 3D</p>
    </div>
    <div class="tools">
      <button class="btn btn-theme" id="themeBtn" type="button" title="Ganti mode tema (Terang/Gelap)" aria-label="Ganti mode tema">
        <span class="theme-icon" id="themeIcon" aria-hidden="true">🌙</span>
        <span class="theme-text" id="themeText">Mode Gelap</span>
      </button>
      <button class="btn btn-explore" id="exploreBtn" type="button" title="Masuk ke mode karakter orang ketiga / pertama">Jelajah Kampus</button>
      <button class="btn" id="homeBtn" type="button">Lihat seluruh kampus</button>
      <div class="quality-wrap" title="Pengaturan kualitas rendering & bayangan">
        <label for="qualitySelect" class="sr-only">Kualitas</label>
        <select class="btn quality-select" id="qualitySelect" aria-label="Pilih kualitas rendering">
          <option value="tinggi">Kualitas: Tinggi</option>
          <option value="sedang">Kualitas: Sedang</option>
          <option value="rendah">Kualitas: Rendah (HP Lama)</option>
        </select>
      </div>
    </div>
  </header>

  <aside class="left" aria-label="Pencarian dan daftar">
    <section>
      <div class="field">
        <label for="q">Cari gedung, ruang, barang, atau area</label>
        <input id="q" type="search" placeholder="Contoh: perpustakaan" autocomplete="off">
      </div>
      <ul class="results" id="results"></ul>
      <p class="note" id="resultsNote" aria-live="polite"></p>
    </section>
    <section>
      <h2 class="h" id="browseHead" hidden>Daftar</h2>
      <ul class="tree" id="browse"></ul>
      <h2 class="h" id="browseAreaHead" hidden>Area luar</h2>
      <ul class="tree" id="browseArea"></ul>
    </section>
  </aside>

  <main class="stage" id="stage">
    <canvas id="c" aria-label="Peta kampus 3D"></canvas>
    <div class="overlay status" id="status" role="status" aria-live="polite"></div>
    <div class="overlay hint">Seret: putar &middot; Klik kanan + seret: geser &middot; Roda: zoom &middot; Klik berulang: pilih isi di dalam</div>
    <div class="overlay card" id="card" hidden>
      <span class="tag" id="cardTag"></span>
      <span class="crumb" id="cardCrumb"></span>
      <h2 id="cardTitle"></h2>
      <p id="cardDesc"></p>
      <div class="row">
        <button class="btn btn-explore" id="cardExplore" type="button" title="Mulai mode jalan di depan objek ini">Jelajah ke sini</button>
        <button class="btn primary" id="cardRoute" type="button">Petunjuk arah</button>
        <button class="btn" id="cardFly" type="button">Fokus kamera</button>
        <button class="btn" id="cardQr" type="button">Kode QR</button>
        <button class="btn" id="cardLink" type="button">Salin tautan</button>
        <button class="btn" id="cardClose" type="button">Tutup</button>
      </div>
    </div>
    <!-- Panel Petunjuk Arah -->
    <div class="overlay route-panel" id="routePanel" hidden>
      <div class="route-header">
        <div class="route-title-box">
          <span class="route-badge">Petunjuk Arah</span>
          <h3 class="route-dest" id="routeDestTitle">Ruangan</h3>
        </div>
        <button class="route-close" id="routeClose" type="button" title="Tutup petunjuk arah">&times;</button>
      </div>
      <div class="route-config">
        <div class="field">
          <label for="routeStart">Titik keberangkatan</label>
          <select id="routeStart"></select>
        </div>
        <label class="check" title="Pilih rute menggunakan lift atau jalur datar jika tersedia">
          <input type="checkbox" id="routeNoStairs"> Hindari tangga (ramah difabel)
        </label>
      </div>
      <div class="route-summary" id="routeSummary">
        <span class="route-time" id="routeTime"></span>
        <span class="route-dist" id="routeDist"></span>
      </div>
      <div class="route-actions">
        <button class="btn" id="routeFlyAll" type="button">Lihat seluruh rute</button>
      </div>
      <ol class="route-steps" id="routeSteps"></ol>
    </div>
    <!-- Panel Lantai & Mode Potong -->
    <div class="overlay floor-panel" id="floorPanel" hidden>
      <div class="floor-header">
        <span class="floor-title" id="floorGedungTitle">Lantai Gedung</span>
        <button class="floor-close" id="floorClose" type="button" title="Tutup kontrol lantai">&times;</button>
      </div>
      <div class="floor-options">
        <label class="check floor-cut-toggle" title="Sembunyikan lantai di atasnya agar isi ruang terlihat">
          <input type="checkbox" id="cutToggle" checked> Mode Potong
        </label>
      </div>
      <div class="floor-buttons" id="floorButtons" role="radiogroup" aria-label="Tingkat Lantai"></div>
      <div class="floor-slider-wrap">
        <input type="range" id="floorSlider" min="0" max="1" step="1" value="0">
        <div class="floor-slider-labels">
          <span id="sliderMinLabel">Semua</span>
          <span id="sliderCurLabel">Semua</span>
        </div>
      </div>
    </div>
    <div class="tip" id="tip" hidden></div>
    <div class="loading" id="loading">Memuat data kampus&hellip;</div>
    <div class="nogl" id="nogl" hidden>Peramban ini tidak dapat menjalankan WebGL, sehingga tampilan 3D tidak bisa dibuka. Coba peramban lain atau aktifkan akselerasi perangkat keras.</div>
  </main>
</div>

<!-- Modal Pemilihan Tempat Muncul (Spawn Mode Jelajah) -->
<div class="k3d-spawn-backdrop" id="spawnModal" hidden>
  <div class="k3d-spawn-dialog" role="dialog" aria-modal="true" aria-labelledby="spawnModalTitle">
    <div class="k3d-spawn-header">
      <h3 id="spawnModalTitle"><span>🚶</span> Pilih Titik Awal Jelajah</h3>
      <button class="route-close" id="spawnClose" type="button" title="Tutup">&times;</button>
    </div>
    <div class="k3d-spawn-body">
      <p class="note" style="margin: 0;">Pilih lokasi awal untuk memunculkan karakter Anda menjelajahi kampus.</p>
      <div class="k3d-spawn-options">
        <button class="k3d-spawn-tab active" id="tabSpawnGate" type="button">Gerbang Kampus</button>
        <button class="k3d-spawn-tab" id="tabSpawnRoom" type="button">Di Depan Ruangan</button>
      </div>
      <!-- Pilihan Gerbang -->
      <div id="sectionSpawnGate">
        <div class="field" style="margin-bottom: 0;">
          <label for="selectSpawnGate">Pilih Gerbang / Titik Masuk</label>
          <select id="selectSpawnGate"></select>
        </div>
      </div>
      <!-- Pilihan Ruangan -->
      <div id="sectionSpawnRoom" hidden>
        <div class="field" style="margin-bottom: 0;">
          <label for="selectSpawnRoom">Pilih Ruangan / Gedung Tujuan</label>
          <select id="selectSpawnRoom"></select>
        </div>
      </div>
    </div>
    <div class="k3d-spawn-footer">
      <button class="btn" id="spawnCancel" type="button">Batal</button>
      <button class="btn btn-explore" id="spawnStart" type="button">Mulai Jelajah</button>
    </div>
  </div>
</div>

<script>window.K3D_CONFIG = <?php echo json_encode($cfg, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?>;</script>
<script src="<?php echo $a; ?>vendor/three.min.js"></script>
<script src="<?php echo $a; ?>vendor/OrbitControls.js"></script>
<script src="<?php echo $a; ?>vendor/GLTFLoader.js"></script>
<script src="<?php echo $a; ?>vendor/DRACOLoader.js"></script>
<script src="<?php echo $a; ?>js/k3d-core.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-jalur.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-avatar.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-qr.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-viewer.js?v=<?php echo $v; ?>"></script>
</body>
</html>

