# Kampus 3D untuk CodeIgniter 3 (Tahap 5: Mode Karakter & Optimasi)

Modul untuk menampilkan kampus dalam 3D di browser, dengan editor admin untuk menempatkan gedung, lantai, ruang, barang, area luar, petunjuk arah navigasi dari gerbang ke ruangan, serta **mode jelajah karakter (avatar 1P/3P)** dengan performa tinggi.

- **Halaman publik**:
  - Pencarian gedung, ruang, & fasilitas, kartu info, tautan langsung ke objek (`#objek-ID`), pencetakan & pemindaian kode QR, pengatur lantai & mode potong atap.
  - **Petunjuk arah visual 3D dari gerbang ke ruangan** lengkap dengan navigasi belokan langkah demi langkah ("jalan 50 m, belok kanan, naik tangga ke lantai 2").
  - **Mode Karakter (Jelajah 3D)**: Pengunjung dapat menjelajahi kampus dari sudut pandang orang ketiga (3P) atau orang pertama (1P), kontrol desktop (WASD + mouse look / pointer lock) atau mobile HP (virtual analog joystick), tabrakan dinding otomatis berbasis bounding box tanpa data ekstra, transit tangga/lift antar-lantai, dan interaksi objek di dekat karakter.
  - **Opsi Kualitas Grafis**: Pilihan kualitas rendering (Tinggi dengan bayangan lembut PCF, Sedang, Rendah hemat daya untuk HP lama).
- **Optimasi & Realisme (Tahap 5b)**:
  - **GPU Instancing (`THREE.InstancedMesh`)**: Me-render objek berulang (misal puluhan kursi kelas atau pohon taman) dalam 1 draw call tanpa mengurangi kemampuan klik / kartu info.
  - **Pemuatan Bertahap (Distance LOD Culling)**: Interior gedung di luar jarak pandang disembunyikan otomatis untuk menghemat ratusan ribu poligon dan baterai ponsel.
  - **Pencahayaan & Bayangan Lembut**: Directional sun light dengan normal bias, hemisphere sky light, dan bayangan alami yang jatuh di atas tanah dan bangunan.
  - **Dukungan Penuh Kompresi Google Draco & Tekstur**: Pemuatan instan model `.glb` terkompresi hingga 85-90% lebih kecil.
- **Editor admin**: unggah model `.glb`, atur posisi/rotasi/skala dengan gizmo, isi judul dan deskripsi, status draft/terbit, salin objek, kontrol bentrok penyimpanan bersamaan (optimistic locking), pembagian peran unit (Admin Fakultas / Superadmin), editor jalur navigasi, serta formulir pengaturan kecepatan/model karakter bawaan.
- **Offline & Mandiri**: Semua pustaka JavaScript (Three.js r128, OrbitControls, TransformControls, GLTFLoader, dekoder WebAssembly Draco) sudah tersimpan lokal di folder `assets`, berjalan offline tanpa ketergantungan CDN internet luar.

## Isi paket

```
sql/kampus3d.sql                          skema database lengkap (termasuk k3d_jalur & k3d_setting)
sql/tahap4a.sql                           skrip migrasi tahap 4a (optimistic locking & role unit)
sql/tahap4b.sql                           skrip migrasi tahap 4b (tabel graf jalur petunjuk arah)
sql/tahap5a.sql                           skrip migrasi tahap 5a (tabel k3d_setting mode karakter)
application/config/kampus3d.php           pengaturan modul & default avatar
application/controllers/Kampus3d.php          halaman publik + data JSON publik
application/controllers/Kampus3d_admin.php    editor admin + simpan + unggah + setting avatar
application/models/Kampus3d_model.php
application/views/kampus3d/publik.php
application/views/kampus3d/editor.php
assets/kampus3d/                          css, js (k3d-core, k3d-jalur, k3d-avatar, k3d-qr, k3d-viewer, k3d-editor), vendor
uploads/kampus3d/models/                  folder model .glb
```

## Memperbarui dari tahap sebelumnya

Timpa folder `application`, `assets`, dan `uploads` dengan isi paket ini. **Tidak ada perubahan database**: kolom `subtipe`, `geometri_json`, dan tipe `area` sudah disiapkan sejak tahap 1, jadi `sql/kampus3d.sql` tidak perlu dijalankan lagi. Data dan model yang sudah ada tetap dipakai. Bila Anda sudah mengubah `application/config/kampus3d.php`, jangan timpa berkas itu (isinya tidak berubah).

## Prasyarat

CodeIgniter 3.1.x, PHP 7.2 atau lebih baru, MySQL/MariaDB (InnoDB), library `session` berfungsi, dan `base_url` sudah benar di `application/config/config.php`.

## Pemasangan

1. **Salin berkas.** Gabungkan folder `application`, `assets`, dan `uploads` dari paket ini ke folder proyek CI3 Anda (sejajar dengan `index.php`). Tidak ada berkas bawaan CI3 yang ditimpa.
2. **Buat tabel.** Jalankan `sql/kampus3d.sql` pada database aplikasi Anda.
3. **Sesuaikan login.** Buka `application/config/kampus3d.php`:
   - `k3d_session_login`: kunci session yang bernilai benar bila admin sudah login (bawaan `logged_in`).
   - `k3d_session_user`: kunci session berisi nama/ID admin (bawaan `username`).
   - `k3d_login_url`: halaman login tujuan pengalihan (bawaan `login`).
4. **Izin folder.** Folder `uploads/kampus3d/models/` harus bisa ditulis oleh pengguna web server.
5. **Batas upload PHP.** Di `php.ini`, pastikan `upload_max_filesize` dan `post_max_size` minimal sebesar `k3d_max_mb` (bawaan 25 MB), lalu muat ulang PHP.
6. Buka:
   - Publik: `https://situs-anda/kampus3d`
   - Admin: `https://situs-anda/kampus3d_admin`

Bila Anda ingin alamat admin yang lebih rapi, tambahkan di `application/config/routes.php` (opsional):

```php
$route['admin/kampus3d']             = 'kampus3d_admin';
$route['admin/kampus3d/(:any)']      = 'kampus3d_admin/$1';
```

`csrf_protection` boleh dinyalakan: editor mengirim token CSRF pada setiap permintaan dan memperbaruinya dari jawaban server.

## Cara memakai editor

1. Pilih tipe (gedung, lantai, ruang, atau barang), lalu **Unggah .glb** atau seret berkas ke kanvas. Bisa juga **Tambah kotak** untuk penanda sementara.
2. Model baru otomatis diskalakan ke ukuran wajar (gedung sekitar 20 m, ruang 6 m, barang 1 m). Ubah lewat **Sesuaikan ukuran**.
3. Objek baru masuk ke objek yang sedang dipilih bila tipenya cocok: lantai di gedung, ruang di lantai atau gedung, barang di ruang, lantai, atau gedung. Posisi ruang dan barang relatif terhadap induknya, jadi ikut bergeser saat induknya digeser.
4. Geser dengan panah di kanvas (tombol `W` pindah, `E` putar, `R` skala). **Snap** membulatkan ke 0,5 m dan 15 derajat.
5. Klik objek yang sama berulang kali untuk memilih isi di dalamnya (gedung, lalu ruang, lalu barang).
6. Isi judul dan deskripsi, ubah status ke **Terbit** agar tampil di halaman publik. Objek terbit hanya tampil bila seluruh induknya juga terbit.
7. **Pratinjau** menampilkan kartu info seperti yang dilihat pengunjung. **Simpan** (atau `Ctrl+S`) mengirim semua perubahan ke database dalam satu transaksi.

### Area outdoor

- Panel kiri "Area outdoor": pilih jenis (jalan, taman, lapangan, parkir), klik **Gambar area**, lalu klik di tanah untuk menaruh titik. Titik mengikuti **Snap** (0,5 m). Selesai dengan tombol **Selesai**, tombol Enter, atau klik dua kali. Esc membatalkan.
- Jalan butuh minimal 2 titik dan punya lebar (bawaan 6 m, 0,5 sampai 60 m). Taman, lapangan, dan parkir adalah poligon tertutup dengan minimal 3 titik.
- Area yang dipilih menampilkan titik putih di kanvas. Seret titik untuk mengubah bentuk. Di panel kanan ada daftar titik dengan koordinat X dan Z (meter dari titik acuan kampus) yang bisa diketik, tombol **Tambah titik**, tombol × per titik, dan **Geser** untuk memindahkan seluruh area.
- Jenis area bisa diganti kapan saja selama jumlah titiknya cukup. Salin dengan isi dan Gandakan berderet bekerja untuk area (salinan digeser).
- Area tidak punya induk, posisi, rotasi, atau skala: bentuknya sepenuhnya ditentukan oleh titiknya. Karena itu gizmo tidak muncul untuk area.
- Area digambar sebagai lapisan tipis di atas tanah. Bila dua area bertumpuk, urutan atasnya: jalan, parkir, lapangan, taman. Halaman publik mencantumkan area di daftar terpisah "Area luar".

### Katalog library

- Panel kiri "Library model" memuat semua model yang pernah diunggah. Cari lewat nama atau pilih kategori, lalu klik sebuah model untuk membuka detailnya.
- **Tambahkan ke kampus** memakai tipe yang dipilih di "Tambah objek" dan masuk ke objek yang sedang dipilih bila cocok.
- **Simpan nama** mengubah nama dan kategori model. Kategori ditulis huruf kecil, kosong menjadi `umum`.
- **Ganti berkas** mengunggah GLB baru untuk model yang sama. Semua objek yang memakainya langsung memakai berkas baru (ada konfirmasi bila terpakai). Skala dan posisi objek tidak berubah, jadi periksa ukurannya bila model baru berbeda ukuran. Berkas lama dihapus dari server.
- **Hapus model** hanya aktif bila tidak ada objek yang memakainya. Pemeriksaan dilakukan lagi di server dalam satu pernyataan SQL, jadi aman walau ada admin lain yang sedang menyimpan.
- Ubah nama, ganti berkas, dan hapus model langsung berlaku di server. Tombol Simpan dan urungkan hanya mengatur objek di kampus.

### Salin lanjutan

Di panel kanan, kotak "Salin lanjutan" mengatur dua hal. Kotak centang "Sertakan barang" berlaku untuk keduanya.

- **Salin ke induk lain**: menyalin objek (beserta isinya) ke lantai, gedung, atau ruang lain yang tipenya cocok. Posisi relatif terhadap induk dipertahankan dan judul tidak diubah. Gedung tidak punya induk, jadi pilihan ini tidak muncul.
- **Gandakan berderet**: membuat N salinan (maksimal 50) yang masing-masing digeser sejauh jarak X dan Z dari yang sebelumnya, searah sumbu induknya. Jarak X kosong dan Z kosong berarti jarak otomatis selebar objek ditambah 1 m. Judul diberi nomor (2, 3, 4, dan seterusnya).
- Semua salinan berstatus draft.

Setelah menyimpan, riwayat urungkan dikosongkan. Browser memberi peringatan bila Anda menutup halaman dengan perubahan yang belum disimpan.

## Data

- Satuan: meter dan derajat. Titik (0,0,0) untuk objek tanpa induk adalah titik acuan kampus. Disarankan memakai gerbang utama sebagai titik itu sejak awal.
- `k3d_objek`: hierarki lewat `parent_id`, tipe `gedung`/`lantai`/`ruang`/`barang`/`area`, status `draft`/`terbit`, posisi, rotasi, skala, dan ukuran kotak pengganti. Untuk `area`, `subtipe` berisi jenisnya dan `geometri_json` berisi `{"titik":[[x,z],...],"lebar":6}` (lebar hanya untuk jalan).
- `k3d_library`: model `.glb` (nama acak di server, nama asli, kategori, ukuran).
- `k3d_log`: satu baris per penyimpanan, serta untuk ubah, ganti, dan hapus model library (siapa, kapan, ringkasan).

Endpoint JSON:

| Alamat | Metode | Isi |
|---|---|---|
| `kampus3d/data` | GET | objek terbit + model yang dipakai (publik) |
| `kampus3d_admin/data` | GET | semua objek + library (admin) |
| `kampus3d_admin/simpan` | POST | kolom `payload`: `{objek: [...], hapus: [id,...]}` |
| `kampus3d_admin/unggah` | POST | berkas `berkas` (+ `nama`, `kategori`, `dim_x/y/z`) |
| `kampus3d_admin/library_ubah` | POST | `id`, `nama`, `kategori` |
| `kampus3d_admin/library_hapus` | POST | `id` (ditolak 409 bila masih dipakai) |
| `kampus3d_admin/library_ganti` | POST | `id` + berkas `berkas` (+ `dim_x/y/z`) |

## Keamanan yang sudah ada

- Semua metode admin memeriksa session login. Permintaan AJAX tanpa login dijawab 401.
- Upload hanya `.glb`: ekstensi, ukuran, dan kepala berkas (`glTF`, versi 2, panjang cocok) diperiksa di server. Berkas disimpan dengan nama acak dan folder upload tidak mengeksekusi skrip.
- Data dari editor dibersihkan di server: tipe, aturan induk-anak, rentang angka, panjang teks, serta bentuk area (jumlah titik maksimal 500, koordinat dijepit ±5000 m, titik kembar dibuang). Area dengan titik kurang dari batas minimal tidak disimpan. Judul dan deskripsi ditampilkan sebagai teks biasa, bukan HTML.
- Penyimpanan memakai transaksi, sehingga gagal berarti tidak ada perubahan setengah jadi.

Yang belum ada: pembagian peran per unit dan pengecekan bentrok bila dua admin menyimpan bersamaan (yang terakhir menyimpan yang menang). Keduanya masuk rencana tahap 4. Katalog library juga belum punya gambar pratinjau per model. Area belum bisa memiliki tekstur, pohon, atau marka (hanya warna datar), dan sistem tidak memeriksa apakah garis poligon saling berpotongan.

## Yang sudah dan belum diuji

Sudah diuji otomatis: sintaks semua berkas, validasi dan penyimpanan area (pembersihan titik, lebar, jenis tak dikenal), bentuk 3D jalan dan poligon (ukuran dan arah sumbu Z tepat), memilih area, titik tanah di bawah kursor, menggambar/menyeret/menghapus titik di editor, logika simpan (id sementara menjadi id server, aturan induk, hapus, jejak log) dengan database tiruan, logika library (pemakaian, ubah, hapus hanya bila tidak dipakai, ganti berkas, log), validasi berkas GLB, katalog dan salin lanjutan di DOM tiruan (filter, ubah nama, hapus ditolak/berhasil, ganti berkas GLB nyata, salin ke induk lain, posisi salinan berderet), adegan 3D (pemilihan objek tembus, pindah induk, kamera), pemuatan model GLB nyata, serta alur editor dan halaman publik di DOM tiruan.

Belum diuji: berjalan di CodeIgniter dan MySQL sungguhan (termasuk pernyataan `DELETE ... NOT EXISTS` di MySQL asli), unggah dan hapus berkas di disk server sungguhan, serta tampilan di browser dengan GPU (termasuk menyeret titik area dengan mouse sungguhan; penyeretan diuji dengan peristiwa tiruan). Coba dulu di lingkungan pengembangan.

## Panduan Optimasi Model 3D untuk Admin (Kompresi Draco & Tekstur)

Agar halaman 3D kampus dapat dibuka dengan cepat dan lancar pada perangkat HP lama atau koneksi seluler, berkas model `.glb` yang diekspor dari perangkat lunak 3D (SketchUp, Blender, Revit, AutoCAD) disarankan dioptimasi dan dikompresi di komputer admin terlebih dahulu sebelum diunggah ke pustaka Kampus 3D.

Modul Kampus 3D telah menyertakan dekoder WebAssembly **Google Draco** di `assets/kampus3d/vendor/draco/`, sehingga browser pengunjung dapat membaca model terkompresi tanpa memerlukan unduhan pustaka tambahan.

### 1. Kompresi Cepat dengan `gltf-pipeline` (Disarankan)

Jika komputer admin memiliki Node.js, gunakan alat resmi `gltf-pipeline` dari CesiumGS melalui terminal/PowerShell tanpa perlu instalasi rumit:

```bash
# Kompresi standar dengan Google Draco
npx -y gltf-pipeline -i gedung_asli.glb -o gedung_draco.glb -d

# Kompresi tingkat tinggi (file 80-92% lebih kecil)
npx -y gltf-pipeline -i gedung_asli.glb -o gedung_draco.glb -d --draco.compressionLevel 10 --draco.quantizePositionBits 14
```

Hasil berkas `gedung_draco.glb` biasanya menyusut dari 25 MB menjadi hanya 1,8 MB – 3,5 MB dan siap diunggah ke editor admin Kampus 3D.

### 2. Optimasi Geometri & Tekstur Menyeluruh dengan `gltfpack`

`gltfpack` sangat cocok jika model arsitektur memiliki banyak material dan tekstur resolusi tinggi (4K/8K) yang ingin disederhanakan:

```bash
# Instalasi global via npm
npm install -g gltfpack

# Kompresi geometri Draco (-cc) dan batasi resolusi tekstur maksimal 1024px (-ts 0.5)
gltfpack -i model_asli.glb -o model_opt.glb -cc -ts 0.5
```

Parameter yang berguna:
- `-cc`: Mengaktifkan kompresi Draco pada geometri.
- `-ts 0.5`: Mengompresi / memperkecil ukuran dimensi tekstur menjadi separuh (misal tekstur 2048x2048 diturunkan ke 1024x1024), sangat menghemat VRAM ponsel.
- `-kn`: Menjaga nama-nama simpul/node agar hierarki tetap utuh.

### 3. Ekspor Langsung dari Blender

Jika admin membuat atau mengedit model di Blender:
1. Buka menu **File** &rarr; **Export** &rarr; **glTF 2.0 (.glb)**.
2. Di panel pengaturan ekspor sebelah kanan:
   - Centang **Apply Modifiers** (tab *Geometry*).
   - Centang **Draco mesh compression** (tab *Compression*). Atur *Quantization Bits* ke 14 atau 16.
   - Pada tab *Images*, pilih format **JPEG / WebP** jika ada opsi, atau pastikan tekstur gambar tidak melebihi 2048&times;2048 piksel.
3. Klik **Export glTF 2.0**. Berkas `.glb` yang dihasilkan sudah langsung terkompresi Draco.

### 4. Tips Kualitas Grafis & Realisme Ringan

- **Hindari tekstur di atas 2048x2048**: Pada layar peramban ponsel, tekstur 1024x1024 atau 2048x2048 sudah sangat tajam dan menghemat memori GPU secara drastis.
- **Manfaatkan GPU Instancing**: Untuk perabot berulang (misal kursi kelas, meja, pohon taman), gunakan model pustaka `.glb` yang sama (`library_id` seragam). Modul Kampus 3D secara otomatis menggabungkannya ke dalam 1 panggilan gambar (*InstancedMesh*), sehingga 100 kursi hanya membebani GPU sebesar 1 kursi.
- **Pemuatan Bertahap (LOD)**: Sistem otomatis menyembunyikan isi ruangan pada gedung yang berada jauh (>100 m) dan hanya merender penuh ketika didekati kamera atau karakter.
- **Pilihan Kualitas**: Pengunjung dapat memilih mode **Rendah** di pojok kanan atas untuk mematikan bayangan dinamis bila membuka di ponsel lama dengan baterai hemat.

## Pemecahan masalah

- **Simpan gagal dengan pesan "bukan JSON"**: sesi login habis atau token CSRF kedaluwarsa. Muat ulang halaman admin.
- **Hapus model ditolak**: model masih dipakai objek yang tersimpan. Hapus objeknya, klik Simpan, lalu coba lagi.
- **Unggah gagal**: periksa izin folder upload dan `upload_max_filesize`/`post_max_size`.
- **Model tampil sebagai kotak transparan**: berkas model tidak bisa dimuat. Buka konsol browser, dan pastikan alamat `base_url` benar serta folder `uploads/kampus3d/models/` bisa diakses lewat web.
- **Model Draco tidak tampil**: pastikan `assets/kampus3d/vendor/draco/` ikut terunggah (ada tiga berkas, termasuk `.wasm`) dan server melayani `.wasm` dengan tipe `application/wasm`.
- **Layar kosong tanpa kanvas**: peramban atau perangkat tidak mendukung WebGL.

## Lisensi pihak ketiga

Three.js (MIT) disertakan di `assets/kampus3d/vendor/`. Lisensinya ada di `LICENSE-three.txt`.
