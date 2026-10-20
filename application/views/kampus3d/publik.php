<?php defined('BASEPATH') OR exit('No direct script access allowed');
$judul = $this->config->item('k3d_judul', 'kampus3d');
if ( ! $judul) { $judul = 'Kampus 3D'; }
$a = $cfg['assetBase'];
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo html_escape($judul); ?></title>
<link rel="stylesheet" href="<?php echo $a; ?>css/kampus3d.css">
</head>
<body>
<div class="app pub">
  <header class="top">
    <div class="brand">
      <h1><?php echo html_escape($judul); ?></h1>
      <p>Jelajahi gedung, ruang, dan fasilitas kampus dalam 3D</p>
    </div>
    <div class="tools"><button class="btn" id="homeBtn" type="button">Lihat seluruh kampus</button></div>
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
        <button class="btn primary" id="cardFly" type="button">Fokus kamera</button>
        <button class="btn" id="cardQr" type="button">Kode QR</button>
        <button class="btn" id="cardLink" type="button">Salin tautan</button>
        <button class="btn" id="cardClose" type="button">Tutup</button>
      </div>
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

<script>window.K3D_CONFIG = <?php echo json_encode($cfg, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?>;</script>
<script src="<?php echo $a; ?>vendor/three.min.js"></script>
<script src="<?php echo $a; ?>vendor/OrbitControls.js"></script>
<script src="<?php echo $a; ?>vendor/GLTFLoader.js"></script>
<script src="<?php echo $a; ?>vendor/DRACOLoader.js"></script>
<script src="<?php echo $a; ?>js/k3d-core.js"></script>
<script src="<?php echo $a; ?>js/k3d-qr.js"></script>
<script src="<?php echo $a; ?>js/k3d-viewer.js"></script>
</body>
</html>
