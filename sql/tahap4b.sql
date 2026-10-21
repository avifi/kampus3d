-- ====================================================================
-- Kampus 3D: Skrip Pembaruan Database Tahap 4b
-- Fitur: Petunjuk arah dari gerbang ke ruangan (graf jalur pejalan kaki).
-- Aman dijalankan berulang kali. Jalankan setelah tahap4a.sql.
-- (Modul juga membuat tabel ini otomatis saat pertama kali dipakai.)
-- ====================================================================

SET NAMES utf8mb4;

-- Titik jalur. Koordinat x/y/z relatif terhadap objek tempelannya (objek_id),
-- sehingga titik di dalam gedung ikut bergeser bila gedungnya dipindah.
-- objek_id NULL = titik di tanah kampus (koordinat dunia, meter).
CREATE TABLE IF NOT EXISTS `k3d_jalur_titik` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `objek_id`  INT UNSIGNED NULL COMMENT 'gedung/lantai/ruang tempat titik menempel; NULL = tanah kampus',
  `jenis`     ENUM('jalur','gerbang','pintu','tangga','lift') NOT NULL DEFAULT 'jalur',
  `label`     VARCHAR(80) NOT NULL DEFAULT '' COMMENT 'nama yang dipakai di langkah petunjuk',
  `ruang_id`  INT UNSIGNED NULL COMMENT 'objek tujuan yang dilayani titik ini (pintu ruang / pintu gedung)',
  `x`         DECIMAL(10,3) NOT NULL DEFAULT 0,
  `y`         DECIMAL(10,3) NOT NULL DEFAULT 0,
  `z`         DECIMAL(10,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_objek` (`objek_id`),
  KEY `idx_ruang` (`ruang_id`),
  KEY `idx_jenis` (`jenis`),
  CONSTRAINT `fk_k3d_jt_objek` FOREIGN KEY (`objek_id`) REFERENCES `k3d_objek` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_k3d_jt_ruang` FOREIGN KEY (`ruang_id`) REFERENCES `k3d_objek` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ruas jalur: sambungan dua arah antara dua titik.
CREATE TABLE IF NOT EXISTS `k3d_jalur_ruas` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titik_a`  INT UNSIGNED NOT NULL,
  `titik_b`  INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ab` (`titik_a`, `titik_b`),
  KEY `idx_b` (`titik_b`),
  CONSTRAINT `fk_k3d_jr_a` FOREIGN KEY (`titik_a`) REFERENCES `k3d_jalur_titik` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_k3d_jr_b` FOREIGN KEY (`titik_b`) REFERENCES `k3d_jalur_titik` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
