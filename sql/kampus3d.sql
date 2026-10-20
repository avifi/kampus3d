-- Kampus 3D: skema database (MySQL / MariaDB, InnoDB, utf8mb4)
-- Jalankan sekali pada database aplikasi CI3 Anda.

SET NAMES utf8mb4;

-- Pustaka model .glb. Satu berkas bisa dipakai banyak objek.
CREATE TABLE IF NOT EXISTS `k3d_library` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama`        VARCHAR(150) NOT NULL,
  `kategori`    VARCHAR(60)  NOT NULL DEFAULT 'umum',
  `file_glb`    VARCHAR(80)  NOT NULL COMMENT 'nama berkas acak di folder upload',
  `file_asli`   VARCHAR(200) NOT NULL COMMENT 'nama berkas saat diunggah',
  `ukuran_byte` INT UNSIGNED NOT NULL DEFAULT 0,
  `dim_x`       DECIMAL(10,3) NULL COMMENT 'ukuran asli model (meter)',
  `dim_y`       DECIMAL(10,3) NULL,
  `dim_z`       DECIMAL(10,3) NULL,
  `dibuat_pada` DATETIME NOT NULL,
  `dibuat_oleh` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_glb` (`file_glb`),
  KEY `idx_kategori` (`kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Objek di kampus: gedung > lantai > ruang > barang (tipe 'area' disiapkan untuk jalan/taman/lapangan).
-- Posisi, rotasi, dan skala disimpan relatif terhadap induknya. Satuan: meter dan derajat.
-- Titik (0,0,0) untuk objek tanpa induk = titik acuan kampus (disarankan: gerbang utama).
CREATE TABLE IF NOT EXISTS `k3d_objek` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id`          INT UNSIGNED NULL,
  `tipe`               ENUM('gedung','lantai','ruang','barang','area') NOT NULL,
  `subtipe`            VARCHAR(30)  NULL COMMENT 'dipakai area: jalan, taman, lapangan, parkir',
  `unit_nama`          VARCHAR(100) NULL COMMENT 'nama fakultas/unit penanggung jawab',
  `judul`              VARCHAR(120) NOT NULL DEFAULT '',
  `deskripsi`          TEXT NULL,
  `library_id`         INT UNSIGNED NULL,
  `pos_x`              DECIMAL(10,3) NOT NULL DEFAULT 0,
  `pos_y`              DECIMAL(10,3) NOT NULL DEFAULT 0,
  `pos_z`              DECIMAL(10,3) NOT NULL DEFAULT 0,
  `rot_x`              DECIMAL(8,2)  NOT NULL DEFAULT 0,
  `rot_y`              DECIMAL(8,2)  NOT NULL DEFAULT 0,
  `rot_z`              DECIMAL(8,2)  NOT NULL DEFAULT 0,
  `scale_x`            DECIMAL(8,3)  NOT NULL DEFAULT 1,
  `scale_y`            DECIMAL(8,3)  NOT NULL DEFAULT 1,
  `scale_z`            DECIMAL(8,3)  NOT NULL DEFAULT 1,
  `ukuran_x`           DECIMAL(10,3) NULL COMMENT 'ukuran kotak pengganti bila belum ada model',
  `ukuran_y`           DECIMAL(10,3) NULL,
  `ukuran_z`           DECIMAL(10,3) NULL,
  `geometri_json`      MEDIUMTEXT NULL COMMENT 'cadangan untuk area outdoor (daftar titik)',
  `status`             ENUM('draft','terbit') NOT NULL DEFAULT 'draft',
  `urutan`             INT NOT NULL DEFAULT 0,
  `versi`              INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'nomor versi untuk deteksi bentrok simpan bersamaan',
  `dibuat_pada`        DATETIME NOT NULL,
  `dibuat_oleh`        VARCHAR(64) NULL,
  `diperbarui_pada`    DATETIME NOT NULL,
  `diperbarui_oleh`    VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_tipe_status` (`tipe`,`status`),
  KEY `idx_library` (`library_id`),
  CONSTRAINT `fk_k3d_objek_parent`  FOREIGN KEY (`parent_id`)  REFERENCES `k3d_objek` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_k3d_objek_library` FOREIGN KEY (`library_id`) REFERENCES `k3d_library` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jejak perubahan: satu baris untuk setiap penyimpanan dari editor.
CREATE TABLE IF NOT EXISTS `k3d_log` (
  `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `waktu`     DATETIME NOT NULL,
  `user_id`   VARCHAR(64) NULL,
  `aksi`      VARCHAR(30) NOT NULL,
  `ringkasan` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_waktu` (`waktu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pengguna / Admin Kampus 3D
CREATE TABLE IF NOT EXISTS `k3d_user` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`     VARCHAR(64) NOT NULL,
  `password`     VARCHAR(255) NOT NULL,
  `nama_lengkap` VARCHAR(100) NOT NULL DEFAULT '',
  `role`         VARCHAR(30) NOT NULL DEFAULT 'superadmin',
  `dibuat_pada`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pembatasan hak akses unit/gedung untuk admin_unit
CREATE TABLE IF NOT EXISTS `k3d_user_unit` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`   INT UNSIGNED NOT NULL,
  `objek_id`  INT UNSIGNED NOT NULL COMMENT 'ID gedung di k3d_objek',
  `catatan`   VARCHAR(150) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_objek` (`user_id`, `objek_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_objek` (`objek_id`),
  CONSTRAINT `fk_k3d_user_unit_user` FOREIGN KEY (`user_id`) REFERENCES `k3d_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_k3d_user_unit_objek` FOREIGN KEY (`objek_id`) REFERENCES `k3d_objek` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Akun admin bawaan (password: admin123)
INSERT IGNORE INTO `k3d_user` (`username`, `password`, `nama_lengkap`, `role`, `dibuat_pada`)
VALUES ('admin', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'Administrator Kampus', 'superadmin', NOW());

