-- ====================================================================
-- Kampus 3D: Skrip Pembaruan Database Tahap 5a
-- Fitur: Mode Karakter / Avatar Jelajah (opsi tambahan, tampilan orbit tetap ada)
-- Aman dijalankan berulang kali. Jalankan setelah tahap4b.sql.
-- ====================================================================

SET NAMES utf8mb4;

-- Tabel pengaturan modul Kampus 3D (key-value)
CREATE TABLE IF NOT EXISTS `k3d_setting` (
  `kunci` VARCHAR(60) NOT NULL,
  `nilai` TEXT NOT NULL,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pengaturan bawaan mode karakter
INSERT IGNORE INTO `k3d_setting` (`kunci`, `nilai`) VALUES
('avatar_lib_id', ''),
('avatar_speed', '3.5'),
('avatar_run_speed', '6.5'),
('avatar_cam_height', '1.6');
