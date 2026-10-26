-- ====================================================================
-- Kampus 3D: Skrip Pembaruan Database Tahap 6a
-- Fitur: Media Video & Objek Layar / Videotron 3D (k3d_media)
-- Aman dijalankan berulang kali. Jalankan setelah tahap5a.sql.
-- ====================================================================

SET NAMES utf8mb4;

-- 1. Pustaka Berkas Video & Poster Layar
CREATE TABLE IF NOT EXISTS `k3d_media` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama`         VARCHAR(150) NOT NULL,
  `file_video`   VARCHAR(80)  NOT NULL COMMENT 'nama berkas acak di folder upload media',
  `file_asli`    VARCHAR(200) NOT NULL COMMENT 'nama berkas saat diunggah',
  `file_poster`  VARCHAR(80)  NULL COMMENT 'nama berkas poster diam di folder upload media',
  `ukuran_byte`  INT UNSIGNED NOT NULL DEFAULT 0,
  `durasi_detik` DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT 'durasi video dalam detik',
  `lebar`        INT UNSIGNED NULL COMMENT 'resolusi lebar piksel',
  `tinggi`       INT UNSIGNED NULL COMMENT 'resolusi tinggi piksel',
  `tipe_mime`    VARCHAR(50)  NOT NULL DEFAULT 'video/mp4',
  `dibuat_pada`  DATETIME     NOT NULL,
  `dibuat_oleh`  VARCHAR(64)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_video` (`file_video`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Ubah tipe k3d_objek agar mendukung tipe 'layar'
ALTER TABLE `k3d_objek`
  MODIFY COLUMN `tipe` ENUM('gedung','lantai','ruang','barang','area','layar') NOT NULL;

-- 3. Tambahkan kolom relasi media_id dan pengaturan layar (jika belum ada)
DROP PROCEDURE IF EXISTS `k3d_migrasi_layar_tahap6a`;
DELIMITER $$
CREATE PROCEDURE `k3d_migrasi_layar_tahap6a`()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'k3d_objek' AND COLUMN_NAME = 'media_id'
  ) THEN
    ALTER TABLE `k3d_objek`
      ADD COLUMN `media_id` INT UNSIGNED NULL AFTER `library_id`,
      ADD COLUMN `layar_loop` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = putar ulang otomatis' AFTER `media_id`,
      ADD COLUMN `layar_jarak` DECIMAL(6,2) NOT NULL DEFAULT 20.00 COMMENT 'jarak kamera putar otomatis (meter)' AFTER `layar_loop`,
      ADD COLUMN `layar_target` VARCHAR(60) NOT NULL DEFAULT 'LAYAR' COMMENT 'nama material target pada model .glb' AFTER `layar_jarak`,
      ADD CONSTRAINT `fk_k3d_objek_media` FOREIGN KEY (`media_id`) REFERENCES `k3d_media` (`id`) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL `k3d_migrasi_layar_tahap6a`();
DROP PROCEDURE IF EXISTS `k3d_migrasi_layar_tahap6a`;
