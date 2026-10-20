-- =====================================================================
-- Kampus 3D: Data Dummy / Contoh Struktur Kampus Lengkap
-- =====================================================================
-- Berisi contoh hierarki lengkap:
-- Gedung -> Lantai -> Ruang -> Barang
-- Serta Area Outdoor (Jalan, Taman, Lapangan, Parkir)
-- Status Terbit (muncul di publik) dan Draft (hanya di editor admin)
-- Wewenang unit untuk admin_unit pada Gedung FST
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- GEDUNG 1: Gedung Rektorat & Administrasi Pusat (Status: Terbit)
-- ---------------------------------------------------------------------
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (1, NULL, 'gedung', NULL, 'Rektorat', 'Gedung Rektorat & Administrasi Pusat', 'Pusat pimpinan universitas, kantor biro administrasi, dan layanan mahasiswa terpadu.', NULL, 0.000, 0.000, -25.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 26.000, 12.000, 16.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 1 Rektorat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (2, 1, 'lantai', NULL, NULL, 'Lantai 1 - Pelayanan Terpadu & Informasi', 'Lantai dasar untuk lobi resepsionis dan pelayanan administrasi akademik.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 24.000, 0.300, 14.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- Ruang di Lantai 1 Rektorat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES 
(3, 2, 'ruang', NULL, NULL, 'Lobi Utama & Pusat Informasi', 'Area penerimaan tamu dan meja resepsionis kampus.', NULL, -5.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 3.500, 8.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin'),
(4, 2, 'ruang', NULL, NULL, 'Ruang Layanan Terpadu (BAAK)', 'Loket pengurusan KRS, administrasi mahasiswa, dan legalisir.', NULL, 5.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 3.500, 8.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

-- Barang di Ruang Lobi & Layanan
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES 
(5, 3, 'barang', NULL, NULL, 'Meja Resepsionis & Petugas', 'Meja informasi dan buku tamu resepsionis utama.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 2.400, 0.900, 1.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin'),
(6, 3, 'barang', NULL, NULL, 'Sofa Ruang Tunggu Tamu', 'Sofa tunggu kapasitas 4 orang.', NULL, 2.500, 0.000, 1.500, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 1.800, 0.800, 0.900, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin'),
(7, 4, 'barang', NULL, NULL, 'Kios Antrian Mandiri', 'Mesin layar sentuh nomor antrian mahasiswa.', NULL, -2.500, 0.000, 1.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 0.800, 1.400, 0.600, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 2 Rektorat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (8, 1, 'lantai', NULL, NULL, 'Lantai 2 - Ruang Pimpinan & Senat', 'Kantor pimpinan universitas dan ruang rapat senat.', NULL, 0.000, 4.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 24.000, 0.300, 14.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES 
(9, 8, 'ruang', NULL, NULL, 'Ruang Rektor & Pimpinan', 'Ruang kerja Rektor dan Wakil Rektor.', NULL, -5.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 3.500, 8.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin'),
(10, 8, 'ruang', NULL, NULL, 'Ruang Rapat Senat Akademik', 'Ruang konferensi pimpinan dan rapat senat universitas.', NULL, 5.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 3.500, 8.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

-- Barang di Ruang Rapat Senat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (11, 10, 'barang', NULL, NULL, 'Meja Konferensi Senat', 'Meja oval kapasitas 20 anggota senat.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 4.500, 0.800, 1.800, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 3 Rektorat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (12, 1, 'lantai', NULL, NULL, 'Lantai 3 - Auditorium & Aula Utama', 'Auditorium kapasitas 300 orang untuk seminar dan pelantikan.', NULL, 0.000, 8.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 24.000, 0.300, 14.000, NULL, 'terbit', 3, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (13, 12, 'ruang', NULL, NULL, 'Auditorium Utama Rektorat', 'Aula serbaguna dengan panggung dan layar proyektor ganda.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 20.000, 3.500, 12.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- ---------------------------------------------------------------------
-- GEDUNG 2: Fakultas Sains dan Teknologi (FST) (Status: Terbit)
-- ---------------------------------------------------------------------
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (14, NULL, 'gedung', NULL, 'Fakultas Sains dan Teknologi', 'Gedung Fakultas Sains dan Teknologi (FST)', 'Pusat perkuliahan sains, rekayasa, dan laboratorium informatika & teknik.', NULL, -35.000, 0.000, -5.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 22.000, 9.000, 16.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 1 FST
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (15, 14, 'lantai', NULL, NULL, 'Lantai 1 FST - Laboratorium Komputer', 'Lantai laboratorium komputer, jaringan, dan kecerdasan buatan.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 20.000, 0.300, 14.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES 
(16, 15, 'ruang', NULL, NULL, 'Lab Jaringan & Cloud Computing', 'Lab riset infrastruktur server, jaringan komputer, dan keamanan siber.', NULL, -4.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 8.000, 3.500, 10.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin'),
(17, 15, 'ruang', NULL, NULL, 'Lab Rekayasa Perangkat Lunak', 'Lab praktikum pengembangan aplikasi web, mobile, dan sistem cerdas.', NULL, 4.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 8.000, 3.500, 10.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

-- Barang di Lab Jaringan
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (18, 16, 'barang', NULL, NULL, 'Server Rack 42U Data Center', 'Lemari rack server untuk simulasi jaringan dan hosting lokal.', NULL, -2.500, 0.000, -3.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 1.000, 2.000, 0.900, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 2 FST
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (19, 14, 'lantai', NULL, NULL, 'Lantai 2 FST - Ruang Kuliah & Dekanat', 'Ruang kelas multimedia dan kantor dekanat fakultas.', NULL, 0.000, 4.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 20.000, 0.300, 14.000, NULL, 'terbit', 2, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (20, 19, 'ruang', NULL, NULL, 'Ruang Kuliah FST-201 (Smart Class)', 'Ruang kuliah dengan proyektor interaktif dan kapasitas 45 mahasiswa.', NULL, -4.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 8.000, 3.500, 10.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- ---------------------------------------------------------------------
-- GEDUNG 3: Gedung Perpustakaan Pusat (Status: Terbit)
-- ---------------------------------------------------------------------
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (21, NULL, 'gedung', NULL, 'UPT Perpustakaan', 'Gedung Perpustakaan Pusat', 'Pusat literasi kampus, koleksi buku teks, jurnal ilmiah, dan ruang baca digital.', NULL, 35.000, 0.000, -5.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 20.000, 8.000, 16.000, NULL, 'terbit', 3, 1, NOW(), 'admin', NOW(), 'admin');

-- Lantai 1 Perpustakaan
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (22, 21, 'lantai', NULL, NULL, 'Lantai 1 - Ruang Sirkulasi & Koleksi Referensi', 'Layanan peminjaman, pengembalian buku, dan ruang baca umum.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 18.000, 0.300, 14.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (23, 22, 'ruang', NULL, NULL, 'Ruang Sirkulasi & Rak Utama', 'Area rak buku sains, teknologi, humaniora, dan meja baca.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 14.000, 3.500, 10.000, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (24, 23, 'barang', NULL, NULL, 'Rak Buku Utama (2 Sisi)', 'Rak buku 5 tingkat kapasitas 500 eksemplar.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 4.000, 2.200, 1.200, NULL, 'terbit', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- ---------------------------------------------------------------------
-- GEDUNG 4: Gedung Student Center (Contoh Status DRAFT)
-- ---------------------------------------------------------------------
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (25, NULL, 'gedung', NULL, 'Kemahasiswaan', 'Gedung Student Center (Rencana Pengembangan)', 'Gedung kegiatan mahasiswa, sekretariat BEM & UKM. (Contoh status DRAFT: hanya tampil di editor admin).', NULL, 30.000, 0.000, 25.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 18.000, 7.000, 14.000, NULL, 'draft', 4, 1, NOW(), 'admin', NOW(), 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (26, 25, 'lantai', NULL, NULL, 'Lantai 1 - Sekretariat Bersama Organisasi Mahasiswa', 'Ruang sekretariat organisasi dan ruang rapat himpunan mahasiswa.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 16.000, 0.300, 12.000, NULL, 'draft', 1, 1, NOW(), 'admin', NOW(), 'admin');

-- ---------------------------------------------------------------------
-- AREA OUTDOOR (Jalan, Taman, Lapangan, Parkir)
-- ---------------------------------------------------------------------
-- 1. Jalan Utama Kampus (Lebar 6 meter)
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (27, NULL, 'area', 'jalan', NULL, 'Jalan Utama Boulevard Kampus', 'Jalur utama penghubung gerbang kampus menuju Rektorat, FST, dan Perpustakaan.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{"titik":[[0,48],[0,10],[-20,10],[-20,-5],[-20,-18],[0,-18],[20,-18],[20,-5],[20,10],[0,10]],"lebar":6}', 'terbit', 5, 1, NOW(), 'admin', NOW(), 'admin');

-- 2. Taman Plaza Rektorat
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (28, NULL, 'area', 'taman', NULL, 'Taman Plaza & Gazebo Rektorat', 'Ruang terbuka hijau di tengah kampus dengan tanaman peneduh dan tempat duduk santai.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{"titik":[[-14,-12],[14,-12],[14,4],[-14,4]]}', 'terbit', 6, 1, NOW(), 'admin', NOW(), 'admin');

-- 3. Lapangan Olahraga Serbaguna
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (29, NULL, 'area', 'lapangan', NULL, 'Lapangan Olahraga & Upacara Kampus', 'Fasilitas olahraga outdoor serbaguna (basket, futsal) dan area upacara bendera.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{"titik":[[-16,16],[12,16],[12,36],[-16,36]]}', 'terbit', 7, 1, NOW(), 'admin', NOW(), 'admin');

-- 4. Area Parkir Barat (FST & Rektorat)
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (30, NULL, 'area', 'parkir', NULL, 'Kawasan Parkir Kendaraan Barat', 'Area parkir terpadu kendaraan roda dua dan roda empat dosen, mahasiswa, dan tamu.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{"titik":[[-48,16],[-22,16],[-22,36],[-48,36]]}', 'terbit', 8, 1, NOW(), 'admin', NOW(), 'admin');

-- ---------------------------------------------------------------------
-- WEWENANG UNIT (k3d_user_unit): Hubungkan admin_unit ke Gedung FST (id: 14)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `k3d_user_unit` (`user_id`, `objek_id`, `catatan`)
SELECT u.id, 14, 'Pengelola Gedung Fakultas Sains dan Teknologi'
FROM `k3d_user` u
WHERE u.username = 'admin_unit';
