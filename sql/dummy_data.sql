-- =====================================================================
-- Kampus 3D: Data Dummy Layout Sesuai Sketsa Denah Lahan Kampus
-- =====================================================================
-- - Kotak abu: Posisi Gedung (Rektorat, FTIK, Keamanan, PKM, FST, Kompleks Timur FEB/FSH/Perpustakaan)
-- - Garis hijau: Sungai Kampus
-- - Garis putih: Jalan Utama & Lingkar Kampus
-- - Kotak hijau: Lapangan Olahraga (Lapangan Utama Utara & Lapangan Barat Daya)
-- Termasuk titik jalur rute dan ruas jalan navigasi (Tahap 4b & 5a)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `k3d_jalur_ruas`;
TRUNCATE TABLE `k3d_jalur_titik`;
TRUNCATE TABLE `k3d_user_unit`;
TRUNCATE TABLE `k3d_objek`;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- OBJEK KAMPUS (Gedung, Lantai, Ruang, Barang, Area Outdoor)
-- ---------------------------------------------------------------------
INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (1, NULL, 'gedung', NULL, 'Rektorat', 'Gedung Rektorat & Administrasi Pusat', 'Pusat pimpinan universitas, kantor biro administrasi, dan layanan mahasiswa terpadu.', NULL, 32.000, 0.000, 68.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 38.000, 12.000, 11.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (2, 1, 'lantai', NULL, NULL, 'Lantai 1 - Pelayanan Terpadu & Informasi', 'Lantai dasar untuk lobi resepsionis dan pelayanan administrasi akademik.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 36.000, 0.300, 9.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (3, 2, 'ruang', NULL, NULL, 'Lobi Utama & Pusat Informasi', 'Area penerimaan tamu dan meja resepsionis kampus.', NULL, -8.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 14.000, 3.500, 7.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (4, 2, 'ruang', NULL, NULL, 'Ruang Layanan Terpadu (BAAK)', 'Loket pengurusan KRS, administrasi mahasiswa, dan legalisir.', NULL, 8.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 14.000, 3.500, 7.500, NULL, 'terbit', 2, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (5, 3, 'barang', NULL, NULL, 'Meja Resepsionis & Petugas', 'Meja informasi dan buku tamu resepsionis utama.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 2.400, 0.900, 1.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (6, 4, 'barang', NULL, NULL, 'Kios Antrian Mandiri', 'Mesin layar sentuh nomor antrian mahasiswa.', NULL, -3.000, 0.000, 1.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 0.800, 1.400, 0.600, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (7, 1, 'lantai', NULL, NULL, 'Lantai 2 - Kantor Pimpinan & Senat', 'Kantor pimpinan universitas dan ruang rapat senat.', NULL, 0.000, 4.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 36.000, 0.300, 9.500, NULL, 'terbit', 2, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (8, 7, 'ruang', NULL, NULL, 'Ruang Rapat Senat Akademik', 'Ruang konferensi pimpinan dan rapat senat universitas.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 16.000, 3.500, 7.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (9, NULL, 'gedung', NULL, 'FTIK', 'Gedung Fakultas Tarbiyah dan Ilmu Keguruan (FTIK)', 'Pusat perkuliahan pendidikan, keguruan, dan pengembangan media pembelajaran.', NULL, -24.000, 0.000, 35.000, 0.00, -5.00, 0.00, 1.000, 1.000, 1.000, 28.000, 9.500, 12.000, NULL, 'terbit', 2, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (10, 9, 'lantai', NULL, NULL, 'Lantai 1 FTIK - Ruang Perkuliahan', 'Ruang kelas teori dan laboratorium media pembelajaran.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 26.000, 0.300, 10.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (11, 10, 'ruang', NULL, NULL, 'Ruang Kuliah FTIK-101', 'Ruang kuliah berkapasitas 50 mahasiswa dilengkapi proyektor dan AC.', NULL, -6.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 3.500, 8.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (12, NULL, 'gedung', NULL, 'Keamanan & Humas', 'Pusat Informasi & Pos Keamanan Utama', 'Pos komando keamanan kampus, pendaftaran tamu, dan pusat informasi gerbang.', NULL, -1.000, 0.000, 38.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 8.000, 4.500, 8.000, NULL, 'terbit', 3, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (13, 12, 'lantai', NULL, NULL, 'Lantai Dasar Pos Keamanan', 'Lantai dasar pusat informasi gerbang.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 7.000, 0.300, 7.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (14, 13, 'ruang', NULL, NULL, 'Ruang Penjagaan & CCTV', 'Pusat monitor CCTV kampus dan layanan penitipan kendaraan.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 6.000, 3.200, 6.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (15, NULL, 'gedung', NULL, 'Kemahasiswaan', 'Gedung Student Center & PKM', 'Pusat kegiatan organisasi kemahasiswaan (BEM, DPM, UKM) dan ruang kreativitas mahasiswa.', NULL, -4.000, 0.000, 9.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 7.500, 9.000, NULL, 'terbit', 4, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (16, 15, 'lantai', NULL, NULL, 'Lantai 1 - Sekretariat Bersama UKM', 'Ruang sekretariat bersama unit kegiatan mahasiswa.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 8.000, 0.300, 8.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (17, 16, 'ruang', NULL, NULL, 'Ruang Kerja Bersama (Co-Working Space)', 'Area diskusi terbuka dan rapat organisasi mahasiswa.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 7.000, 3.200, 7.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (18, NULL, 'gedung', NULL, 'Fakultas Sains dan Teknologi', 'Gedung Fakultas Sains dan Teknologi (FST)', 'Pusat perkuliahan sains, rekayasa, dan laboratorium informatika & teknik.', NULL, -22.000, 0.000, -46.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 11.000, 22.000, NULL, 'terbit', 5, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (19, 18, 'lantai', NULL, NULL, 'Lantai 1 FST - Laboratorium Komputer & Jaringan', 'Lantai laboratorium komputer, jaringan, dan kecerdasan buatan.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 0.300, 20.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (20, 19, 'ruang', NULL, NULL, 'Lab Jaringan & Cloud Computing', 'Lab riset infrastruktur server, jaringan komputer, dan keamanan siber.', NULL, 0.000, 0.300, -5.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 7.500, 3.500, 8.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (21, 19, 'ruang', NULL, NULL, 'Lab Rekayasa Perangkat Lunak', 'Lab praktikum pengembangan aplikasi web, mobile, dan sistem cerdas.', NULL, 0.000, 0.300, 5.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 7.500, 3.500, 8.500, NULL, 'terbit', 2, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (22, 20, 'barang', NULL, NULL, 'Server Rack 42U Data Center', 'Lemari rack server untuk simulasi jaringan dan hosting lokal.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 1.000, 2.000, 0.900, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (23, NULL, 'gedung', NULL, 'Perkuliahan', 'Gedung Perkuliahan Terpadu A', 'Gedung kuliah umum dan ruang teater multimedia kapasitas 200 mahasiswa.', NULL, 23.000, 0.000, 16.000, 0.00, 12.00, 0.00, 1.000, 1.000, 1.000, 18.000, 9.000, 9.000, NULL, 'terbit', 6, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (24, 23, 'lantai', NULL, NULL, 'Lantai 1 - Teater Perkuliahan Umum', 'Ruang kuliah teater bertingkat dengan sistem audio visual terpadu.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 16.000, 0.300, 7.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (25, 24, 'ruang', NULL, NULL, 'Teater Mini Multimedia A1', 'Ruang kuliah teater mini kapasitas 120 orang.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 14.000, 3.500, 6.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (26, NULL, 'gedung', NULL, 'UPT Perpustakaan', 'Gedung Perpustakaan Pusat & Digital Library', 'Pusat literasi kampus, koleksi buku teks, jurnal ilmiah, dan ruang baca digital ber-AC.', NULL, 35.000, 0.000, 20.000, 0.00, 12.00, 0.00, 1.000, 1.000, 1.000, 28.000, 10.000, 10.000, NULL, 'terbit', 7, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (27, 26, 'lantai', NULL, NULL, 'Lantai 1 - Sirkulasi & Rak Referensi', 'Area peminjaman dan pengembalian buku serta meja baca utama.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 26.000, 0.300, 8.500, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (28, 27, 'ruang', NULL, NULL, 'Ruang Sirkulasi & Koleksi Buku Utama', 'Area rak buku sains, teknologi, humaniora, dan meja baca mandiri.', NULL, 0.000, 0.300, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 22.000, 3.500, 7.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (29, 28, 'barang', NULL, NULL, 'Rak Buku Utama (2 Sisi)', 'Rak buku 5 tingkat kapasitas 500 eksemplar.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 4.000, 2.200, 1.200, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (30, NULL, 'gedung', NULL, 'FEB', 'Gedung Fakultas Ekonomi dan Bisnis (FEB)', 'Kantor dekanat FEB, ruang perkuliahan manajemen, akuntansi, dan galeri investasi BEI.', NULL, 25.000, 0.000, 40.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 16.000, 8.500, 8.000, NULL, 'terbit', 8, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (31, 30, 'lantai', NULL, NULL, 'Lantai 1 FEB - Galeri Investasi', 'Galeri investasi pasar modal dan lab simulasi perbankan syariah.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 14.500, 0.300, 7.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (32, NULL, 'gedung', NULL, 'FSH', 'Gedung Fakultas Syariah dan Hukum (FSH)', 'Pusat studi hukum islam, ruang peradilan semu, dan klinik bantuan hukum mahasiswa.', NULL, 43.000, 0.000, 44.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 10.000, 26.000, NULL, 'terbit', 9, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (33, 32, 'lantai', NULL, NULL, 'Lantai 1 FSH - Ruang Sidang Semu', 'Laboratorium praktik peradilan dan persidangan mahasiswa hukum.', NULL, 0.000, 0.200, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 9.000, 0.300, 24.000, NULL, 'terbit', 1, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (34, NULL, 'area', 'sungai', NULL, 'Sungai Kampus (Aliran Air Alami)', 'Aliran sungai alami yang membelah area utara dan selatan kampus.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[-60,-3],[-35,-4],[-15,-6],[5,-10],[25,-16],[45,-22],[65,-28]],\"lebar\":6}', 'terbit', 10, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (35, NULL, 'area', 'jalan', NULL, 'Jalan Boulevard Gerbang Masuk', 'Jalur masuk utama dari gerbang kampus menuju simpang tengah dan jembatan sungai.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[10,85],[10,60],[9,35],[8,16],[6,0]],\"lebar\":7}', 'terbit', 11, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (36, NULL, 'area', 'jalan', NULL, 'Jalan Cincin Utara & Jembatan Kampus', 'Jalan penghubung menyeberangi jembatan sungai dan mengelilingi lapangan utama utara.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[6,0],[5,-12],[4,-22],[4,-30],[3,-56],[5,-63],[20,-64],[32,-62],[30,-40],[26,-26],[15,-24],[4,-22]],\"lebar\":6}', 'terbit', 12, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (37, NULL, 'area', 'jalan', NULL, 'Jalan Akses Gerbang Utara', 'Jalur akses keluar masuk kampus bagian utara.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[32,-62],[33,-75],[34,-88]],\"lebar\":5.5}', 'terbit', 13, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (38, NULL, 'area', 'jalan', NULL, 'Jalan Lingkar Kampus Barat', 'Jalan lingkar yang mengelilingi lapangan olahraga barat, PKM, dan FTIK.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[8,16],[-25,16],[-36,16],[-38,24],[-36,16],[-38,9],[-36,0],[-18,0],[-3,0],[6,0]],\"lebar\":5.5}', 'terbit', 14, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (39, NULL, 'area', 'jalan', NULL, 'Jalan Tepi Sungai Timur', 'Jalan setapak dan akses kendaraan ringan menyusuri tepi sungai timur.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[26,-26],[38,-20],[52,-14]],\"lebar\":5}', 'terbit', 15, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (40, NULL, 'area', 'lapangan', NULL, 'Lapangan Utama & Stadion Upacara Kampus', 'Fasilitas olahraga outdoor utama kampus (lapangan sepak bola, atletik, dan upacara bendera).', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[7,-56],[28,-56],[28,-37],[7,-37]]}', 'terbit', 16, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

INSERT INTO `k3d_objek` (`id`, `parent_id`, `tipe`, `subtipe`, `unit_nama`, `judul`, `deskripsi`, `library_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, `scale_x`, `scale_y`, `scale_z`, `ukuran_x`, `ukuran_y`, `ukuran_z`, `geometri_json`, `status`, `urutan`, `versi`, `dibuat_pada`, `dibuat_oleh`, `diperbarui_pada`, `diperbarui_oleh`)
VALUES (41, NULL, 'area', 'lapangan', NULL, 'Lapangan Olahraga Terbuka (Futsal & Basket)', 'Lapangan multifungsi untuk basket, futsal, dan voli mahasiswa.', NULL, 0.000, 0.000, 0.000, 0.00, 0.00, 0.00, 1.000, 1.000, 1.000, 10.000, 0.100, 10.000, '{\"titik\":[[-31,4],[-11,4],[-11,12],[-31,12]]}', 'terbit', 17, 1, '2026-10-21 15:37:16', 'admin', '2026-10-21 15:37:16', 'admin');

-- ---------------------------------------------------------------------
-- TITIK JALUR PETUNJUK ARAH & NAVIGASI
-- ---------------------------------------------------------------------
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (1, NULL, 'gerbang', 'Gerbang Masuk Utama', NULL, 10.000, 0.000, 84.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (2, NULL, 'jalur', 'Jalan Depan Rektorat', NULL, 10.000, 0.000, 68.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (3, 1, 'pintu', 'Pintu Utama Rektorat', 3, 13.000, 0.000, 68.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (4, NULL, 'jalur', 'Simpang Gedung FTIK & Keamanan', NULL, 9.000, 0.000, 36.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (5, 12, 'pintu', 'Pintu Pos Keamanan', 14, 3.000, 0.000, 38.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (6, NULL, 'jalur', 'Simpang Lingkar Kampus Barat', NULL, 8.000, 0.000, 16.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (7, NULL, 'jalur', 'Jalan Depan FTIK', NULL, -10.000, 0.000, 16.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (8, 9, 'pintu', 'Pintu Masuk FTIK', 11, -10.000, 0.000, 29.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (9, NULL, 'jalur', 'Jalan Selatan Lapangan Barat', NULL, -25.000, 0.000, 16.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (10, NULL, 'jalur', 'Ujung Barat Daya Kampus', NULL, -36.000, 0.000, 16.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (11, NULL, 'jalur', 'Jalan Barat Lapangan Olahraga', NULL, -37.000, 0.000, 5.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (12, NULL, 'jalur', 'Sudut Barat Laut Lingkar Barat', NULL, -36.000, 0.000, 0.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (13, NULL, 'jalur', 'Jalan Utara Lapangan Olahraga', NULL, -18.000, 0.000, 0.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (14, NULL, 'jalur', 'Jalan Depan Student Center', NULL, -3.000, 0.000, 0.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (15, 15, 'pintu', 'Pintu Student Center', 17, -4.000, 0.000, 5.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (16, NULL, 'jalur', 'Simpang Jembatan Sungai Selatan', NULL, 6.000, 0.000, 0.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (17, NULL, 'jalur', 'Jembatan Sungai Kampus', NULL, 5.500, 0.000, -10.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (18, NULL, 'jalur', 'Simpang Jembatan Sungai Utara', NULL, 4.000, 0.000, -22.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (19, NULL, 'jalur', 'Jalan Depan FST', NULL, 4.000, 0.000, -46.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (20, 18, 'pintu', 'Pintu Masuk FST', 20, -17.000, 0.000, -46.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (21, NULL, 'jalur', 'Sudut Barat Laut Cincin Utara', NULL, 5.000, 0.000, -63.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (22, NULL, 'jalur', 'Jalan Utara Lapangan Utama', NULL, 18.000, 0.000, -64.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (23, NULL, 'jalur', 'Simpang Gerbang Utara', NULL, 31.000, 0.000, -62.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (24, NULL, 'gerbang', 'Gerbang Utara Kampus', NULL, 34.000, 0.000, -86.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (25, NULL, 'jalur', 'Jalan Timur Lapangan Utama', NULL, 29.000, 0.000, -42.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (26, NULL, 'jalur', 'Simpang Cincin Timur & Tepi Sungai', NULL, 26.000, 0.000, -26.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (27, 23, 'pintu', 'Pintu Perkuliahan Terpadu', 25, 17.000, 0.000, 16.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (28, 26, 'pintu', 'Pintu Perpustakaan Pusat', 28, 25.000, 0.000, 20.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (29, 30, 'pintu', 'Pintu Masuk FEB', 31, 20.000, 0.000, 40.000);
INSERT INTO `k3d_jalur_titik` (`id`, `objek_id`, `jenis`, `label`, `ruang_id`, `x`, `y`, `z`)
VALUES (30, 32, 'pintu', 'Pintu Masuk FSH', 33, 38.000, 0.000, 44.000);

-- ---------------------------------------------------------------------
-- RUAS JALUR PETUNJUK ARAH
-- ---------------------------------------------------------------------
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (1, 1, 2);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (2, 2, 3);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (3, 2, 4);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (4, 4, 5);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (5, 4, 29);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (6, 29, 30);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (7, 4, 6);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (8, 6, 7);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (9, 7, 8);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (10, 7, 9);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (11, 9, 10);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (12, 10, 11);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (13, 11, 12);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (14, 12, 13);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (15, 13, 14);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (16, 14, 15);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (17, 14, 16);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (18, 6, 16);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (19, 6, 27);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (20, 27, 28);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (21, 16, 17);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (22, 17, 18);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (23, 18, 19);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (24, 19, 20);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (25, 19, 21);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (26, 21, 22);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (27, 22, 23);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (28, 23, 24);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (29, 23, 25);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (30, 25, 26);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (31, 26, 18);
INSERT INTO `k3d_jalur_ruas` (`id`, `titik_a`, `titik_b`) VALUES (32, 26, 28);

-- ---------------------------------------------------------------------
-- WEWENANG UNIT ADMIN (admin_unit -> FST id: 18)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `k3d_user_unit` (`user_id`, `objek_id`, `catatan`)
SELECT u.id, 18, 'Pengelola Gedung Fakultas Sains dan Teknologi'
FROM `k3d_user` u
WHERE u.username = 'admin_unit';
