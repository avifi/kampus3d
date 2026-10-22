<?php defined('BASEPATH') OR exit('No direct script access allowed');
$judul = $this->config->item('k3d_judul', 'kampus3d');
if ( ! $judul) { $judul = 'Kampus 3D'; }
$a = $cfg['assetBase'];
$v = time();
?><!DOCTYPE html>
<html lang="id" data-bs-theme="light" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo html_escape($judul); ?></title>
<script>(function(){var t='light';try{t=localStorage.getItem('k3d_theme')||'light';}catch(e){}document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-bs-theme',t);})();</script>
<link rel="stylesheet" href="<?php echo $a; ?>vendor/bootstrap/bootstrap.min.css">
<link rel="stylesheet" href="<?php echo $a; ?>vendor/bootstrap/bootstrap-icons.min.css">
<link rel="stylesheet" href="<?php echo $a; ?>css/kampus3d.css?v=<?php echo $v; ?>">
</head>
<body>
<div class="app pub">
  <header class="top">
    <div class="brand">
      <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="sidebarToggle" type="button" title="Sembunyikan / Tampilkan Daftar Gedung (Bikin 3D Lebih Luas)" aria-label="Toggle Panel">
        <i class="bi bi-layout-sidebar-inset"></i>
      </button>
      <div class="brand-text">
        <div class="brand-title">
          <i class="bi bi-buildings-fill text-primary me-1" aria-hidden="true"></i>
          <h1><?php echo html_escape($judul); ?></h1>
        </div>
        <p>Jelajahi gedung, ruang, dan fasilitas kampus dalam 3D</p>
      </div>
    </div>
    <div class="tools" role="toolbar" aria-label="Kontrol Navigasi">
      <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="homeBtn" type="button" title="Lihat Seluruh Kampus (Reset Kamera)" aria-label="Lihat seluruh kampus">
        <i class="bi bi-compass"></i>
      </button>
      <button class="btn btn-sm btn-success k3d-btn-icon" id="exploreBtn" type="button" title="Jelajah Kampus (Mode Karakter 3D)" aria-label="Jelajah Kampus">
        <i class="bi bi-person-walking" id="exploreIcon"></i>
      </button>
      <div class="quality-wrap" title="Pengaturan Kualitas Rendering & Bayangan">
        <span class="quality-icon" aria-hidden="true"><i class="bi bi-sliders"></i></span>
        <label for="qualitySelect" class="sr-only">Kualitas</label>
        <select class="form-select form-select-sm quality-select" id="qualitySelect" aria-label="Pilih kualitas rendering">
          <option value="tinggi">Kualitas: Tinggi</option>
          <option value="sedang">Kualitas: Sedang</option>
          <option value="rendah">Kualitas: Rendah</option>
        </select>
      </div>
      <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="themeBtn" type="button" title="Ganti Mode Tema (Terang/Gelap)" aria-label="Ganti mode tema">
        <i class="bi bi-moon-stars" id="themeIcon" aria-hidden="true"></i>
        <span class="sr-only" id="themeText">Mode Gelap</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="fullscreenBtn" type="button" title="Layar Penuh (Fullscreen)" aria-label="Layar penuh">
        <i class="bi bi-arrows-fullscreen" id="fullscreenIcon" aria-hidden="true"></i>
      </button>
    </div>
  </header>

  <aside class="left" id="sidebar" aria-label="Pencarian dan daftar gedung">
    <section class="k3d-sidebar-search">
      <div class="input-group input-group-sm mb-2">
        <span class="input-group-text bg-body-tertiary border-end-0 text-muted" id="searchAddon"><i class="bi bi-search"></i></span>
        <input id="q" type="search" class="form-control border-start-0" placeholder="Cari gedung, ruang, area..." autocomplete="off" aria-describedby="searchAddon">
        <button class="btn btn-outline-secondary border-start-0 d-none" id="qClear" type="button" title="Hapus pencarian"><i class="bi bi-x-lg"></i></button>
      </div>
      <ul class="results" id="results"></ul>
      <p class="note" id="resultsNote" aria-live="polite"></p>
    </section>

    <section class="k3d-sidebar-content" id="browseSection">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="k3d-section-label"><i class="bi bi-buildings me-1 text-primary"></i> Gedung & Ruang</span>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-secondary py-0 px-2 btn-mini" id="expandAllBtn" title="Buka Semua Gedung"><i class="bi bi-arrows-expand"></i></button>
          <button type="button" class="btn btn-outline-secondary py-0 px-2 btn-mini" id="collapseAllBtn" title="Tutup Semua Gedung"><i class="bi bi-arrows-collapse"></i></button>
        </div>
      </div>
      <h2 class="h" id="browseHead" hidden>Daftar Gedung</h2>
      <ul class="k3d-collapse-tree" id="browse"></ul>

      <div class="d-flex align-items-center justify-content-between mt-3 mb-2" id="browseAreaWrap">
        <span class="k3d-section-label"><i class="bi bi-tree me-1 text-success"></i> Area Luar Kampus</span>
      </div>
      <h2 class="h" id="browseAreaHead" hidden>Area luar</h2>
      <ul class="k3d-collapse-tree" id="browseArea"></ul>
    </section>
  </aside>

  <main class="stage" id="stage">
    <canvas id="c" aria-label="Peta kampus 3D"></canvas>

    <!-- Tombol floating saat panel sidebar di-collapse -->
    <button class="btn btn-light shadow-sm k3d-floating-toggle" id="floatingSidebarToggle" type="button" title="Buka Daftar Gedung & Ruang" aria-label="Buka Daftar" hidden>
      <i class="bi bi-layout-sidebar-inset"></i>
    </button>

    <div class="overlay status" id="status" role="status" aria-live="polite"></div>
    <div class="overlay hint">Seret: putar &middot; Klik kanan: geser &middot; Roda: zoom &middot; Klik objek: pilih</div>

    <!-- Kartu Info Objek Terpilih (Kompak dengan Tombol Icon-Only) -->
    <div class="overlay card shadow-lg" id="card" hidden>
      <div class="d-flex align-items-center justify-content-between gap-2">
        <span class="badge text-bg-primary-subtle text-primary border" id="cardTag"></span>
        <span class="crumb text-truncate" id="cardCrumb"></span>
      </div>
      <h2 id="cardTitle"></h2>
      <p id="cardDesc"></p>
      <div class="k3d-card-actions">
        <button class="btn btn-sm btn-success k3d-btn-icon" id="cardExplore" type="button" title="Jelajah ke sini (Mulai mode jalan di depan objek ini)" aria-label="Jelajah ke sini">
          <i class="bi bi-person-walking"></i>
        </button>
        <button class="btn btn-sm btn-primary k3d-btn-icon" id="cardRoute" type="button" title="Petunjuk arah navigasi ke sini" aria-label="Petunjuk arah">
          <i class="bi bi-signpost-split"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary k3d-btn-icon" id="cardFly" type="button" title="Fokus kamera ke objek ini" aria-label="Fokus kamera">
          <i class="bi bi-crosshair"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="cardQr" type="button" title="Lihat dan cetak Kode QR objek" aria-label="Kode QR">
          <i class="bi bi-qr-code"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary k3d-btn-icon" id="cardLink" type="button" title="Salin tautan langsung objek" aria-label="Salin tautan">
          <i class="bi bi-link-45deg"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger k3d-btn-icon" id="cardClose" type="button" title="Tutup kartu informasi" aria-label="Tutup">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Panel Petunjuk Arah -->
    <div class="overlay route-panel shadow-lg" id="routePanel" hidden>
      <div class="route-header">
        <div class="route-title-box">
          <span class="route-badge"><i class="bi bi-signpost-split me-1"></i> Petunjuk Arah</span>
          <h3 class="route-dest" id="routeDestTitle">Ruangan</h3>
        </div>
        <button class="btn-close" id="routeClose" type="button" title="Tutup petunjuk arah" aria-label="Tutup"></button>
      </div>
      <div class="route-config">
        <div class="field">
          <label for="routeStart">Titik keberangkatan</label>
          <select id="routeStart" class="form-select form-select-sm"></select>
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
        <button class="btn btn-sm btn-outline-primary" id="routeFlyAll" type="button" title="Lihat seluruh rute dari atas">
          <i class="bi bi-arrows-fullscreen me-1"></i> Lihat seluruh rute
        </button>
      </div>
      <ol class="route-steps" id="routeSteps"></ol>
    </div>

    <!-- Panel Lantai & Mode Potong -->
    <div class="overlay floor-panel shadow-lg" id="floorPanel" hidden>
      <div class="floor-header">
        <span class="floor-title" id="floorGedungTitle">Lantai Gedung</span>
        <button class="btn-close" id="floorClose" type="button" title="Tutup kontrol lantai" aria-label="Tutup"></button>
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
  <div class="k3d-spawn-dialog shadow-lg" role="dialog" aria-modal="true" aria-labelledby="spawnModalTitle">
    <div class="k3d-spawn-header">
      <h3 id="spawnModalTitle"><i class="bi bi-person-walking text-primary me-2"></i> Pilih Titik Awal Jelajah</h3>
      <button class="btn-close" id="spawnClose" type="button" title="Tutup" aria-label="Tutup"></button>
    </div>
    <div class="k3d-spawn-body">
      <p class="note" style="margin: 0;">Pilih lokasi awal untuk memunculkan karakter Anda menjelajahi kampus.</p>
      <div class="k3d-spawn-options">
        <button class="k3d-spawn-tab active" id="tabSpawnGate" type="button"><i class="bi bi-signpost-2 me-1"></i> Gerbang Kampus</button>
        <button class="k3d-spawn-tab" id="tabSpawnRoom" type="button"><i class="bi bi-door-open me-1"></i> Di Depan Ruangan</button>
      </div>
      <!-- Pilihan Gerbang -->
      <div id="sectionSpawnGate">
        <div class="field" style="margin-bottom: 0;">
          <label for="selectSpawnGate">Pilih Gerbang / Titik Masuk</label>
          <select id="selectSpawnGate" class="form-select form-select-sm"></select>
        </div>
      </div>
      <!-- Pilihan Ruangan -->
      <div id="sectionSpawnRoom" hidden>
        <div class="field" style="margin-bottom: 0;">
          <label for="selectSpawnRoom">Pilih Ruangan / Gedung Tujuan</label>
          <select id="selectSpawnRoom" class="form-select form-select-sm"></select>
        </div>
      </div>
    </div>
    <div class="k3d-spawn-footer">
      <button class="btn btn-sm btn-outline-secondary" id="spawnCancel" type="button"><i class="bi bi-x-circle me-1"></i> Batal</button>
      <button class="btn btn-sm btn-success" id="spawnStart" type="button"><i class="bi bi-play-circle-fill me-1"></i> Mulai Jelajah</button>
    </div>
  </div>
</div>

<script>window.K3D_CONFIG = <?php echo json_encode($cfg, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?>;</script>
<script src="<?php echo $a; ?>vendor/three.min.js"></script>
<script src="<?php echo $a; ?>vendor/OrbitControls.js"></script>
<script src="<?php echo $a; ?>vendor/GLTFLoader.js"></script>
<script src="<?php echo $a; ?>vendor/DRACOLoader.js"></script>
<script src="<?php echo $a; ?>vendor/bootstrap/bootstrap.bundle.min.js"></script>
<script src="<?php echo $a; ?>js/k3d-core.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-jalur.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-avatar.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-qr.js?v=<?php echo $v; ?>"></script>
<script src="<?php echo $a; ?>js/k3d-viewer.js?v=<?php echo $v; ?>"></script>
</body>
</html>

