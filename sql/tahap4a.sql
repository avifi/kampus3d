-- ====================================================================
-- Kampus 3D: Skrip Pembaruan Database Tahap 4a
-- Fitur: Deteksi bentrok penyimpanan bersamaan (optimistic locking)
--        dan Hak Akses / Pembatasan Unit (Admin Fakultas/Unit).
-- ====================================================================

SET NAMES utf8mb4;

-- 1. Tambah kolom versi dan unit_nama pada tabel k3d_objek bila belum ada
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'k3d_objek'
      AND COLUMN_NAME = 'versi'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `k3d_objek` ADD COLUMN `versi` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT \'Nomor versi untuk deteksi bentrok simpan bersamaan\' AFTER `urutan`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'k3d_objek'
      AND COLUMN_NAME = 'unit_nama'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `k3d_objek` ADD COLUMN `unit_nama` VARCHAR(100) NULL COMMENT \'Nama fakultas/unit penanggung jawab\' AFTER `subtipe`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Pastikan tabel k3d_user ada
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

-- Perbarui admin bawaan menjadi superadmin jika sebelumnya 'admin'
UPDATE `k3d_user` SET `role` = 'superadmin' WHERE `role` = 'admin';

-- 3. Buat tabel relasi k3d_user_unit untuk pembatasan gedung per admin unit/fakultas
CREATE TABLE IF NOT EXISTS `k3d_user_unit` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`   INT UNSIGNED NOT NULL,
  `objek_id`  INT UNSIGNED NOT NULL COMMENT 'ID gedung di k3d_objek yang diizinkan untuk dikelola',
  `catatan`   VARCHAR(150) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_objek` (`user_id`, `objek_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_objek` (`objek_id`),
  CONSTRAINT `fk_k3d_user_unit_user` FOREIGN KEY (`user_id`) REFERENCES `k3d_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_k3d_user_unit_objek` FOREIGN KEY (`objek_id`) REFERENCES `k3d_objek` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tambah akun contoh Admin Unit Fakultas bila belum ada (username: admin_unit, password: unit123)
-- Password hash bcrypt dari 'unit123'
INSERT IGNORE INTO `k3d_user` (`username`, `password`, `nama_lengkap`, `role`, `dibuat_pada`)
VALUES ('admin_unit', '$2y$10$64R1Xm06e6tTjD88Rfg1jOiU7eGZgO/gS0p.33i.jC7e7y072C.zO', 'Admin Fakultas / Unit', 'admin_unit', NOW());
