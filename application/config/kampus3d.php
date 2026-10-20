<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
 | Pengaturan modul Kampus 3D.
 | Sesuaikan dua kunci session pertama dengan sistem login yang sudah ada di aplikasi Anda.
 */

// Kunci session yang bernilai "benar" bila admin sudah login.
$config['k3d_session_login'] = 'logged_in';

// Kunci session yang berisi nama atau ID admin (dicatat di kolom dibuat_oleh dan log).
$config['k3d_session_user'] = 'username';

// Halaman login (relatif terhadap site_url). Admin yang belum login diarahkan ke sini.
$config['k3d_login_url'] = 'kampus3d_admin/login';

// Judul yang tampil di halaman publik.
$config['k3d_judul'] = 'Kampus 3D UNISNU';

// Folder penyimpanan model .glb dan alamat webnya (relatif terhadap base_url).
$config['k3d_upload_dir'] = FCPATH . 'uploads/kampus3d/models/';
$config['k3d_upload_url'] = 'uploads/kampus3d/models/';

// Ukuran maksimum satu berkas model (megabyte). Sesuaikan juga upload_max_filesize dan post_max_size di php.ini.
$config['k3d_max_mb'] = 25;
