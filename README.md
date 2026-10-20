# Kampus 3D untuk CodeIgniter 3 (tahap 3)

Modul untuk menampilkan kampus dalam 3D di browser, dengan editor admin untuk menempatkan gedung, lantai, ruang, dan barang.

- Halaman publik: pencarian, daftar gedung, kartu info, tautan langsung ke objek (`#objek-ID`).
- Editor admin: unggah model `.glb`, atur posisi/rotasi/skala dengan gizmo, isi judul dan deskripsi, status draft/terbit, salin gedung atau ruang, urungkan/ulangi, pratinjau, simpan ke database.
- Library model: setiap berkas yang diunggah masuk ke katalog dan bisa dipakai berkali-kali. Katalog punya pencarian, filter kategori, jumlah pemakaian, ubah nama/kategori, ganti berkas, dan hapus (hanya yang tidak dipakai).
- Area outdoor: jalan, taman, lapangan, dan parkir digambar langsung di tanah dengan klik titik, bentuknya bisa disunting dengan menyeret titik.
- Salin: salin dengan isi, salin kerangka, salin ke induk lain (mis. ruang ke lantai lain), dan gandakan berderet dengan jarak tertentu.
- Semua pustaka JavaScript (Three.js r128, termasuk dekoder Draco) sudah ada di folder `assets`, jadi tidak butuh CDN atau internet.

## Isi paket

```
sql/kampus3d.sql                          skema database (3 tabel)
application/config/kampus3d.php           pengaturan modul
application/controllers/Kampus3d.php          halaman publik + data JSON publik
application/controllers/Kampus3d_admin.php    editor admin + simpan + unggah
application/models/Kampus3d_model.php
application/views/kampus3d/publik.php
application/views/kampus3d/editor.php
assets/kampus3d/                          css, js, dan vendor (Three.js)
uploads/kampus3d/models/                  folder model .glb (sudah berisi .htaccess pengaman)
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

## Pemecahan masalah

- **Simpan gagal dengan pesan "bukan JSON"**: sesi login habis atau token CSRF kedaluwarsa. Muat ulang halaman admin.
- **Hapus model ditolak**: model masih dipakai objek yang tersimpan. Hapus objeknya, klik Simpan, lalu coba lagi.
- **Unggah gagal**: periksa izin folder upload dan `upload_max_filesize`/`post_max_size`.
- **Model tampil sebagai kotak transparan**: berkas model tidak bisa dimuat. Buka konsol browser, dan pastikan alamat `base_url` benar serta folder `uploads/kampus3d/models/` bisa diakses lewat web.
- **Model Draco tidak tampil**: pastikan `assets/kampus3d/vendor/draco/` ikut terunggah (ada tiga berkas, termasuk `.wasm`) dan server melayani `.wasm` dengan tipe `application/wasm`.
- **Layar kosong tanpa kanvas**: peramban atau perangkat tidak mendukung WebGL.

## Lisensi pihak ketiga

Three.js (MIT) disertakan di `assets/kampus3d/vendor/`. Lisensinya ada di `LICENSE-three.txt`.
