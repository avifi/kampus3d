<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Model data Kampus 3D.
 * Semua posisi memakai satuan meter dan rotasi dalam derajat, relatif terhadap induk.
 */
class Kampus3d_model extends CI_Model
{
    /** Tipe induk yang diizinkan untuk setiap tipe objek. */
    private $parent_boleh = array(
        'gedung' => array(),
        'lantai' => array('gedung'),
        'ruang'  => array('lantai', 'gedung'),
        'barang' => array('ruang', 'lantai', 'gedung'),
        'area'   => array(),
    );

    private $batas_objek = 5000;

    /** Jenis area outdoor. 'garis' = berupa jalur dengan lebar, 'bidang' = poligon tertutup. */
    private $subtipe_area = array(
        'jalan'    => 'garis',
        'sungai'   => 'garis',
        'taman'    => 'bidang',
        'lapangan' => 'bidang',
        'parkir'   => 'bidang',
    );
    private $batas_titik = 500;

    /** Jalur petunjuk arah (tahap 4b). */
    private $jenis_titik = array('jalur', 'gerbang', 'pintu', 'tangga', 'lift');
    private $tempel_boleh = array('gedung', 'lantai', 'ruang');
    private $batas_jalur_titik = 5000;
    private $batas_jalur_ruas = 20000;

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
    }

    /* ------------------------------------------------------------------
     * Membaca data
     * ------------------------------------------------------------------ */

    /**
     * Daftar objek untuk klien. Bila $hanya_terbit TRUE, hanya objek berstatus
     * terbit yang seluruh induknya juga terbit.
     */
    public function daftar_objek($hanya_terbit = FALSE)
    {
        $rows = $this->db->order_by('urutan', 'ASC')->order_by('id', 'ASC')
                         ->get('k3d_objek')->result_array();
        $by_id = array();
        foreach ($rows as $r) {
            $by_id[(int) $r['id']] = $r;
        }
        $out = array();
        foreach ($rows as $r) {
            if ($hanya_terbit && ! $this->rantai_terbit($r, $by_id)) {
                continue;
            }
            $out[] = $this->ke_klien($r);
        }
        return $out;
    }

    /** TRUE bila objek dan semua induknya berstatus terbit. */
    public function rantai_terbit($r, $by_id)
    {
        $guard = 0;
        while ($r) {
            if ($r['status'] !== 'terbit') {
                return FALSE;
            }
            if ($r['parent_id'] === NULL) {
                return TRUE;
            }
            $pid = (int) $r['parent_id'];
            if ( ! isset($by_id[$pid]) || ++$guard > 1000) {
                return FALSE;
            }
            $r = $by_id[$pid];
        }
        return FALSE;
    }

    private function ke_klien($r)
    {
        $uk = NULL;
        if ($r['ukuran_x'] !== NULL && $r['ukuran_y'] !== NULL && $r['ukuran_z'] !== NULL) {
            $uk = array((float) $r['ukuran_x'], (float) $r['ukuran_y'], (float) $r['ukuran_z']);
        }
        return array(
            'id'         => (int) $r['id'],
            'parent_id'  => $r['parent_id'] === NULL ? NULL : (int) $r['parent_id'],
            'tipe'       => $r['tipe'],
            'subtipe'    => $r['subtipe'],
            'judul'      => (string) $r['judul'],
            'deskripsi'  => (string) $r['deskripsi'],
            'library_id' => $r['library_id'] === NULL ? NULL : (int) $r['library_id'],
            'pos_x'      => (float) $r['pos_x'],
            'pos_y'      => (float) $r['pos_y'],
            'pos_z'      => (float) $r['pos_z'],
            'rot_x'      => (float) $r['rot_x'],
            'rot_y'      => (float) $r['rot_y'],
            'rot_z'      => (float) $r['rot_z'],
            'scale_x'    => (float) $r['scale_x'],
            'scale_y'    => (float) $r['scale_y'],
            'scale_z'    => (float) $r['scale_z'],
            'ukuran'     => $uk,
            'geometri'   => $this->baca_geometri(isset($r['geometri_json']) ? $r['geometri_json'] : NULL),
            'status'     => $r['status'],
            'versi'      => (int) (isset($r['versi']) ? $r['versi'] : 1),
            'unit_nama'  => isset($r['unit_nama']) ? $r['unit_nama'] : NULL,
        );
    }

    private function baca_geometri($json)
    {
        if ($json === NULL || $json === '') {
            return NULL;
        }
        $g = json_decode($json, TRUE);
        return (is_array($g) && isset($g['titik']) && is_array($g['titik'])) ? $g : NULL;
    }

    /** Daftar model di pustaka. $url_dasar adalah alamat web folder upload (diakhiri "/"). */
    public function daftar_library($url_dasar)
    {
        $rows = $this->db->order_by('kategori', 'ASC')->order_by('nama', 'ASC')
                         ->get('k3d_library')->result_array();
        $pakai = $this->hitung_pemakaian();
        $out = array();
        foreach ($rows as $r) {
            $id = (int) $r['id'];
            $out[] = $this->library_ke_klien($r, $url_dasar, isset($pakai[$id]) ? $pakai[$id] : 0);
        }
        return $out;
    }

    /** Jumlah objek tersimpan yang memakai tiap model: [id_library => jumlah]. */
    public function hitung_pemakaian()
    {
        $q = $this->db->query('SELECT library_id, COUNT(*) AS jumlah FROM k3d_objek WHERE library_id IS NOT NULL GROUP BY library_id');
        $out = array();
        foreach ($q->result_array() as $r) {
            $out[(int) $r['library_id']] = (int) $r['jumlah'];
        }
        return $out;
    }

    public function library_ke_klien($r, $url_dasar, $dipakai = 0)
    {
        $dim = NULL;
        if ($r['dim_x'] !== NULL && $r['dim_y'] !== NULL && $r['dim_z'] !== NULL) {
            $dim = array((float) $r['dim_x'], (float) $r['dim_y'], (float) $r['dim_z']);
        }
        return array(
            'id'        => (int) $r['id'],
            'nama'      => $r['nama'],
            'kategori'  => $r['kategori'],
            'url'       => $url_dasar . $r['file_glb'],
            'file_asli' => $r['file_asli'],
            'bytes'     => (int) $r['ukuran_byte'],
            'dim'       => $dim,
            'dipakai'   => (int) $dipakai,
        );
    }

    public function ambil_library($id)
    {
        return $this->db->get_where('k3d_library', array('id' => (int) $id))->row_array();
    }

    public function tambah_library($data)
    {
        $this->db->insert('k3d_library', $data);
        return (int) $this->db->insert_id();
    }

    /** Jumlah objek tersimpan yang memakai satu model. */
    public function pemakaian_library($id)
    {
        $pakai = $this->hitung_pemakaian();
        return isset($pakai[(int) $id]) ? $pakai[(int) $id] : 0;
    }

    /** Membersihkan nama model: tanpa karakter kontrol, maksimal 150 karakter. */
    public function bersihkan_nama($nama)
    {
        $nama = preg_replace('/[\x00-\x1F\x7F]/', '', (string) $nama);
        return trim(function_exists('mb_substr') ? mb_substr($nama, 0, 150, 'UTF-8') : substr($nama, 0, 150));
    }

    /** Membersihkan kategori: huruf kecil, angka, spasi, garis; kosong menjadi "umum". */
    public function bersihkan_kategori($kat)
    {
        $kat = strtolower(trim((string) $kat));
        $kat = preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9 _-]/', '', $kat));
        $kat = trim(substr($kat, 0, 60));
        return $kat === '' ? 'umum' : $kat;
    }

    /** Mengubah nama dan kategori model. Mengembalikan FALSE bila model tidak ada atau nama kosong. */
    public function ubah_library($id, $nama, $kategori, $user)
    {
        $row = $this->ambil_library($id);
        $nama = $this->bersihkan_nama($nama);
        if ( ! $row || $nama === '') {
            return FALSE;
        }
        $kategori = $this->bersihkan_kategori($kategori);
        $this->db->where('id', (int) $id)->update('k3d_library', array('nama' => $nama, 'kategori' => $kategori));
        $this->catat($user, 'library_ubah', 'model #' . (int) $id . ' "' . $nama . '" kategori ' . $kategori);
        return TRUE;
    }

    /**
     * Menghapus model hanya bila tidak dipakai objek mana pun. Pemeriksaan dan penghapusan
     * dilakukan dalam satu pernyataan SQL agar tidak bisa bentrok dengan penyimpanan lain.
     * Mengembalikan nama berkas yang harus dihapus dari disk, atau string kosong bila ditolak.
     */
    public function hapus_library($id, $user)
    {
        $row = $this->ambil_library($id);
        if ( ! $row) {
            return '';
        }
        $this->db->query(
            'DELETE FROM k3d_library WHERE id = ? AND NOT EXISTS (SELECT 1 FROM k3d_objek WHERE library_id = ?)',
            array((int) $id, (int) $id)
        );
        if ((int) $this->db->affected_rows() < 1) {
            return '';
        }
        $this->catat($user, 'library_hapus', 'model #' . (int) $id . ' "' . $row['nama'] . '"');
        return (string) $row['file_glb'];
    }

    /** Mengganti berkas sebuah model. Mengembalikan nama berkas lama, atau NULL bila model tidak ada. */
    public function ganti_berkas_library($id, $data, $user)
    {
        $row = $this->ambil_library($id);
        if ( ! $row) {
            return NULL;
        }
        $this->db->where('id', (int) $id)->update('k3d_library', $data);
        $this->catat($user, 'library_ganti', 'model #' . (int) $id . ' "' . $row['nama'] . '" diganti berkas');
        return (string) $row['file_glb'];
    }

    private function catat($user, $aksi, $ringkasan)
    {
        $this->db->insert('k3d_log', array(
            'waktu'     => date('Y-m-d H:i:s'),
            'user_id'   => $user,
            'aksi'      => $aksi,
            'ringkasan' => substr($ringkasan, 0, 500),
        ));
    }

    /* ------------------------------------------------------------------
     * Menyimpan data
     * ------------------------------------------------------------------ */

    /**
     * Menyimpan keadaan editor. $objek adalah daftar lengkap objek dari klien;
     * objek baru memakai id nol atau negatif sebagai id sementara. $hapus adalah
     * daftar id di database yang dihapus admin.
     *
     * @return array ['ok'=>bool, 'pesan'=>string, 'peta_id'=>object, ...]
     */
    /**
     * Menyimpan keadaan editor. Mendukung pemeriksaan bentrok simpan bersamaan
     * (optimistic locking via kolom versi) dan pembatasan per unit gedung.
     *
     * @return array ['ok'=>bool, 'pesan'=>string, 'peta_id'=>object, 'versi_baru'=>object, ...]
     */
    public function simpan($objek, $hapus, $user, $user_id = NULL, $role = 'superadmin', $jalur = NULL, $jalur_rev = NULL)
    {
        $this->pastikan_tabel_user();
        if ($jalur !== NULL) {
            $this->pastikan_tabel_jalur();
        }

        if (count($objek) > $this->batas_objek) {
            return array('ok' => FALSE, 'pesan' => 'Terlalu banyak objek (maksimal ' . $this->batas_objek . ').');
        }

        $baru = array();
        foreach ($objek as $r) {
            $n = $this->normalisasi($r);
            if ($n === NULL || isset($baru[$n['id']])) {
                continue;
            }
            $baru[$n['id']] = $n;
        }

        // Model yang tidak ada di pustaka dilepas dari objek.
        $lib_dipakai = array();
        foreach ($baru as $n) {
            if ($n['library_id'] !== NULL) {
                $lib_dipakai[$n['library_id']] = TRUE;
            }
        }
        $lib_ada = $this->id_ada('k3d_library', array_keys($lib_dipakai));
        foreach ($baru as $kid => $n) {
            if ($n['library_id'] !== NULL && ! isset($lib_ada[$n['library_id']])) {
                $baru[$kid]['library_id'] = NULL;
            }
        }

        // Induk harus ada di daftar dan bertipe yang cocok.
        foreach ($baru as $kid => $n) {
            if ($n['parent_id'] === NULL) {
                continue;
            }
            $p = isset($baru[$n['parent_id']]) ? $baru[$n['parent_id']] : NULL;
            if ($p === NULL || $p['id'] === $n['id']
                || ! in_array($p['tipe'], $this->parent_boleh[$n['tipe']], TRUE)) {
                $baru[$kid]['parent_id'] = NULL;
            }
        }

        $positif = array();
        foreach (array_keys($baru) as $kid) {
            if ($kid > 0) {
                $positif[] = $kid;
            }
        }

        // 1. Pemeriksaan Bentrok (Optimistic Concurrency Control)
        $cek_ids = array_unique(array_merge($positif, $hapus));
        $db_map = array();
        if ( ! empty($cek_ids)) {
            $db_rows = $this->db->select('id, parent_id, tipe, judul, versi, diperbarui_oleh, diperbarui_pada')
                                ->where_in('id', $cek_ids)
                                ->get('k3d_objek')->result_array();
            foreach ($db_rows as $row) {
                $db_map[(int) $row['id']] = $row;
            }

            foreach ($baru as $kid => $n) {
                if ($kid > 0 && isset($db_map[$kid])) {
                    $db_v = (int) $db_map[$kid]['versi'];
                    $klien_v = (int) $n['versi'];
                    if ($db_v > $klien_v) {
                        $oleh = ! empty($db_map[$kid]['diperbarui_oleh']) ? $db_map[$kid]['diperbarui_oleh'] : 'admin lain';
                        $waktu = ! empty($db_map[$kid]['diperbarui_pada']) ? $db_map[$kid]['diperbarui_pada'] : '';
                        return array(
                            'ok'      => FALSE,
                            'bentrok' => TRUE,
                            'pesan'   => 'Bentrok penyimpanan terdeteksi! Objek "' . ($db_map[$kid]['judul'] ?: '#' . $kid) . '" telah diubah oleh ' . $oleh . ($waktu ? ' pada ' . $waktu : '') . '. Muat ulang halaman untuk menyinkronkan data terbaru sebelum menyimpan.',
                        );
                    }
                }
            }
        }

        // 2. Pembatasan Hak Akses Unit (Admin Fakultas/Unit)
        if ($role === 'admin_unit' && $user_id !== NULL) {
            $izin_gedung = $this->ambil_unit_user($user_id);
            // Fungsi telusuri root gedung dari objek
            $cari_gedung_root = function ($id, $item) use (&$cari_gedung_root, $baru, $db_map) {
                $cur = $item;
                $guard = 0;
                while ($cur && $guard++ < 20) {
                    if ($cur['tipe'] === 'gedung') {
                        return (int) $cur['id'];
                    }
                    $pid = isset($cur['parent_id']) ? $cur['parent_id'] : NULL;
                    if ($pid === NULL) {
                        break;
                    }
                    if (isset($baru[$pid])) {
                        $cur = $baru[$pid];
                    } elseif (isset($db_map[$pid])) {
                        $cur = $db_map[$pid];
                    } else {
                        break;
                    }
                }
                return NULL;
            };

            foreach ($baru as $kid => $n) {
                if ($n['tipe'] === 'area') {
                    return array('ok' => FALSE, 'pesan' => 'Akses ditolak: Hanya superadmin yang dapat mengelola area outdoor.');
                }
                $root_gedung = $cari_gedung_root($kid, $n);
                if ($root_gedung === NULL || ! isset($izin_gedung[$root_gedung])) {
                    return array('ok' => FALSE, 'pesan' => 'Akses ditolak: Anda hanya berwenang mengubah objek pada gedung unit Anda.');
                }
            }

            foreach ($hapus as $hid) {
                if (isset($db_map[$hid])) {
                    $root_gedung = $cari_gedung_root($hid, $db_map[$hid]);
                    if ($root_gedung === NULL || ! isset($izin_gedung[$root_gedung])) {
                        return array('ok' => FALSE, 'pesan' => 'Akses ditolak: Anda tidak memiliki hak untuk menghapus objek gedung ini.');
                    }
                }
            }
        }

        // 3. Jalur petunjuk arah: hanya superadmin, dan jalur di server tidak boleh berubah sejak dimuat.
        $jalur_bersih = NULL;
        if ($jalur !== NULL) {
            if ($role !== 'superadmin') {
                return array('ok' => FALSE, 'pesan' => 'Akses ditolak: Hanya superadmin yang dapat mengubah jalur petunjuk arah.');
            }
            if ((int) $jalur_rev !== $this->jalur_rev()) {
                return array(
                    'ok'      => FALSE,
                    'bentrok' => TRUE,
                    'pesan'   => 'Bentrok penyimpanan terdeteksi! Jalur petunjuk arah telah diubah oleh admin lain sejak halaman ini dimuat. Muat ulang halaman sebelum menyimpan.',
                );
            }
            $jalur_bersih = $this->bersihkan_jalur($jalur, $this->peta_tempelan($jalur, $baru, $hapus));
        }

        $now = date('Y-m-d H:i:s');
        $debug_lama = $this->db->db_debug;
        $this->db->db_debug = FALSE;
        $this->db->trans_start();

        if ( ! empty($hapus)) {
            $this->db->where_in('id', $hapus)->delete('k3d_objek');
        }

        $ada = $this->id_ada('k3d_objek', $positif);

        $peta = array();
        $versi_baru = array();
        $tambah = 0;
        $ubah = 0;
        foreach ($baru as $kid => $n) {
            $data = $this->ke_baris($n);
            $data['diperbarui_pada'] = $now;
            $data['diperbarui_oleh'] = $user;
            if ($kid > 0 && isset($ada[$kid])) {
                $v = isset($db_map[$kid]['versi']) ? (int) $db_map[$kid]['versi'] + 1 : (int) $n['versi'] + 1;
                $data['versi'] = $v;
                $this->db->where('id', $kid)->update('k3d_objek', $data);
                $peta[$kid] = $kid;
                $versi_baru[$kid] = $v;
                $ubah++;
            } else {
                $data['dibuat_pada'] = $now;
                $data['dibuat_oleh'] = $user;
                $data['parent_id'] = NULL;
                $data['versi'] = 1;
                $this->db->insert('k3d_objek', $data);
                $nid = (int) $this->db->insert_id();
                $peta[$kid] = $nid;
                $versi_baru[$nid] = 1;
                $tambah++;
            }
        }

        // Tahap kedua: pasang induk setelah semua baris punya id yang pasti.
        $induk = array();
        foreach ($baru as $kid => $n) {
            $pid = NULL;
            if ($n['parent_id'] !== NULL && isset($peta[$n['parent_id']])) {
                $pid = $peta[$n['parent_id']];
            }
            $induk[] = array('id' => $peta[$kid], 'parent_id' => $pid);
        }
        if ( ! empty($induk)) {
            $this->db->update_batch('k3d_objek', $induk, 'id');
        }

        $this->db->insert('k3d_log', array(
            'waktu'     => $now,
            'user_id'   => $user,
            'aksi'      => 'simpan',
            'ringkasan' => 'tambah ' . $tambah . ', ubah ' . $ubah . ', hapus ' . count($hapus),
        ));

        if ($jalur_bersih !== NULL) {
            $this->tulis_jalur($jalur_bersih, $peta, $now, $user);
        }

        $this->db->trans_complete();
        $gagal = ($this->db->trans_status() === FALSE);
        $this->db->db_debug = $debug_lama;

        if ($gagal) {
            return array('ok' => FALSE, 'pesan' => 'Gagal menyimpan ke database. Tidak ada perubahan yang tersimpan.');
        }
        $hasil = array(
            'ok'         => TRUE,
            'peta_id'    => (object) $peta,
            'versi_baru' => (object) $versi_baru,
            'tambah'     => $tambah,
            'ubah'       => $ubah,
            'hapus'      => count($hapus),
        );
        if ($jalur_bersih !== NULL) {
            $hasil['jalur'] = $this->daftar_jalur();
            $hasil['jalur_rev'] = $this->jalur_rev();
        }
        return $hasil;
    }

    /* ------------------------------------------------------------------
     * Jalur petunjuk arah (tahap 4b)
     * ------------------------------------------------------------------ */

    /** Membuat tabel jalur bila belum ada (sama dengan sql/tahap4b.sql). */
    public function pastikan_tabel_jalur()
    {
        if ( ! $this->db->table_exists('k3d_jalur_titik')) {
            $this->db->query("CREATE TABLE IF NOT EXISTS `k3d_jalur_titik` (
              `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `objek_id`  INT UNSIGNED NULL,
              `jenis`     ENUM('jalur','gerbang','pintu','tangga','lift') NOT NULL DEFAULT 'jalur',
              `label`     VARCHAR(80) NOT NULL DEFAULT '',
              `ruang_id`  INT UNSIGNED NULL,
              `x`         DECIMAL(10,3) NOT NULL DEFAULT 0,
              `y`         DECIMAL(10,3) NOT NULL DEFAULT 0,
              `z`         DECIMAL(10,3) NOT NULL DEFAULT 0,
              PRIMARY KEY (`id`),
              KEY `idx_objek` (`objek_id`),
              KEY `idx_ruang` (`ruang_id`),
              KEY `idx_jenis` (`jenis`),
              CONSTRAINT `fk_k3d_jt_objek` FOREIGN KEY (`objek_id`) REFERENCES `k3d_objek` (`id`) ON DELETE CASCADE,
              CONSTRAINT `fk_k3d_jt_ruang` FOREIGN KEY (`ruang_id`) REFERENCES `k3d_objek` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
        if ( ! $this->db->table_exists('k3d_jalur_ruas')) {
            $this->db->query("CREATE TABLE IF NOT EXISTS `k3d_jalur_ruas` (
              `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `titik_a`  INT UNSIGNED NOT NULL,
              `titik_b`  INT UNSIGNED NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uk_ab` (`titik_a`, `titik_b`),
              KEY `idx_b` (`titik_b`),
              CONSTRAINT `fk_k3d_jr_a` FOREIGN KEY (`titik_a`) REFERENCES `k3d_jalur_titik` (`id`) ON DELETE CASCADE,
              CONSTRAINT `fk_k3d_jr_b` FOREIGN KEY (`titik_b`) REFERENCES `k3d_jalur_titik` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
    }

    /**
     * Nomor revisi jalur = id log penyimpanan jalur terakhir (0 bila belum pernah).
     * Dipakai untuk menolak penyimpanan dari halaman yang memuat jalur versi lama.
     */
    public function jalur_rev()
    {
        $row = $this->db->query("SELECT MAX(id) AS rev FROM k3d_log WHERE aksi = 'jalur'")->row_array();
        return ($row && $row['rev'] !== NULL) ? (int) $row['rev'] : 0;
    }

    /**
     * Graf jalur untuk klien: ['titik' => [...], 'ruas' => [[a, b], ...]].
     * Bila $objek_boleh diisi (peta id => TRUE), hanya titik yang menempel di tanah
     * atau di objek tersebut yang dikirim, dan ruang_id di luar daftar dikosongkan.
     */
    public function daftar_jalur($objek_boleh = NULL)
    {
        $this->pastikan_tabel_jalur();
        $rows = $this->db->order_by('id', 'ASC')->get('k3d_jalur_titik')->result_array();
        $titik = array();
        $ada = array();
        foreach ($rows as $r) {
            $oid = $r['objek_id'] === NULL ? NULL : (int) $r['objek_id'];
            $rid = $r['ruang_id'] === NULL ? NULL : (int) $r['ruang_id'];
            if ($objek_boleh !== NULL) {
                if ($oid !== NULL && ! isset($objek_boleh[$oid])) {
                    continue;
                }
                if ($rid !== NULL && ! isset($objek_boleh[$rid])) {
                    $rid = NULL;
                }
            }
            $id = (int) $r['id'];
            $ada[$id] = TRUE;
            $titik[] = array(
                'id'       => $id,
                'objek_id' => $oid,
                'jenis'    => $r['jenis'],
                'label'    => (string) $r['label'],
                'ruang_id' => $rid,
                'x'        => (float) $r['x'],
                'y'        => (float) $r['y'],
                'z'        => (float) $r['z'],
            );
        }
        $ruas = array();
        foreach ($this->db->order_by('id', 'ASC')->get('k3d_jalur_ruas')->result_array() as $r) {
            $a = (int) $r['titik_a'];
            $b = (int) $r['titik_b'];
            if (isset($ada[$a]) && isset($ada[$b])) {
                $ruas[] = array($a, $b);
            }
        }
        return array('titik' => $titik, 'ruas' => $ruas);
    }

    /**
     * Peta id objek (id klien) => tipe untuk semua objek yang boleh dirujuk titik jalur:
     * objek dalam daftar simpan, ditambah objek lama di database yang dirujuk dan tidak dihapus.
     */
    private function peta_tempelan($jalur, $baru, $hapus)
    {
        $peta = array();
        foreach ($baru as $kid => $n) {
            $peta[$kid] = $n['tipe'];
        }
        $cari = array();
        if (is_array($jalur) && isset($jalur['titik']) && is_array($jalur['titik'])) {
            foreach ($jalur['titik'] as $t) {
                foreach (array('objek_id', 'ruang_id') as $k) {
                    if (is_array($t) && isset($t[$k]) && is_numeric($t[$k]) && (int) $t[$k] > 0 && ! isset($peta[(int) $t[$k]])) {
                        $cari[(int) $t[$k]] = (int) $t[$k];
                    }
                }
            }
        }
        foreach ($hapus as $hid) {
            unset($cari[(int) $hid]);
        }
        if ( ! empty($cari)) {
            foreach (array_chunk(array_values($cari), 500) as $potong) {
                $rows = $this->db->select('id, tipe')->where_in('id', $potong)->get('k3d_objek')->result_array();
                foreach ($rows as $r) {
                    $peta[(int) $r['id']] = $r['tipe'];
                }
            }
        }
        return $peta;
    }

    /**
     * Membersihkan graf jalur dari klien. $tempelan: peta id objek => tipe yang sah.
     * Titik yang menempel ke objek tak dikenal dibuang, ruas ke titik yang dibuang ikut dibuang.
     * Mengembalikan ['titik' => [id_klien => baris], 'ruas' => [[id_klien_a, id_klien_b], ...]].
     */
    public function bersihkan_jalur($jalur, $tempelan)
    {
        $titik = array();
        $ruas = array();
        if ( ! is_array($jalur)) {
            return array('titik' => $titik, 'ruas' => $ruas);
        }
        $daftar = (isset($jalur['titik']) && is_array($jalur['titik'])) ? array_values($jalur['titik']) : array();
        foreach (array_slice($daftar, 0, $this->batas_jalur_titik) as $t) {
            if ( ! is_array($t) || ! isset($t['id']) || ! is_numeric($t['id'])) {
                continue;
            }
            $cid = (int) $t['id'];
            if (isset($titik[$cid])) {
                continue;
            }
            $oid = NULL;
            if (isset($t['objek_id']) && $t['objek_id'] !== '' && is_numeric($t['objek_id'])) {
                $oid = (int) $t['objek_id'];
                if ( ! isset($tempelan[$oid]) || ! in_array($tempelan[$oid], $this->tempel_boleh, TRUE)) {
                    continue; // tempelan sudah dihapus atau bukan gedung/lantai/ruang
                }
            }
            $rid = NULL;
            if (isset($t['ruang_id']) && $t['ruang_id'] !== '' && is_numeric($t['ruang_id']) && isset($tempelan[(int) $t['ruang_id']])) {
                $rid = (int) $t['ruang_id'];
            }
            $jenis = (isset($t['jenis']) && in_array($t['jenis'], $this->jenis_titik, TRUE)) ? $t['jenis'] : 'jalur';
            $titik[$cid] = array(
                'objek_id' => $oid,
                'jenis'    => $jenis,
                'label'    => trim($this->potong(isset($t['label']) ? $t['label'] : '', 80)),
                'ruang_id' => $rid,
                'x'        => round($this->angka($t, 'x', 0, -5000, 5000), 3),
                'y'        => round($this->angka($t, 'y', 0, -5000, 5000), 3),
                'z'        => round($this->angka($t, 'z', 0, -5000, 5000), 3),
            );
        }
        $daftar = (isset($jalur['ruas']) && is_array($jalur['ruas'])) ? array_values($jalur['ruas']) : array();
        foreach (array_slice($daftar, 0, $this->batas_jalur_ruas) as $r) {
            if ( ! is_array($r) || count($r) < 2) {
                continue;
            }
            $r = array_values($r);
            if ( ! is_numeric($r[0]) || ! is_numeric($r[1])) {
                continue;
            }
            $a = (int) $r[0];
            $b = (int) $r[1];
            if ($a === $b || ! isset($titik[$a]) || ! isset($titik[$b])) {
                continue;
            }
            $kunci = min($a, $b) . ':' . max($a, $b);
            $ruas[$kunci] = array($a, $b);
        }
        return array('titik' => $titik, 'ruas' => array_values($ruas));
    }

    /**
     * Mengganti seluruh graf jalur (dipanggil di dalam transaksi simpan).
     * $peta: id klien objek => id database (dari penyimpanan objek pada transaksi yang sama).
     */
    private function tulis_jalur($j, $peta, $now, $user)
    {
        $this->db->query('DELETE FROM k3d_jalur_ruas');
        $this->db->query('DELETE FROM k3d_jalur_titik');
        $map = array();
        $ubah_id = function ($id) use ($peta) {
            if ($id === NULL) {
                return NULL;
            }
            return isset($peta[$id]) ? (int) $peta[$id] : ($id > 0 ? $id : NULL);
        };
        foreach ($j['titik'] as $cid => $t) {
            $oid = $ubah_id($t['objek_id']);
            if ($t['objek_id'] !== NULL && $oid === NULL) {
                continue;
            }
            $t['objek_id'] = $oid;
            $t['ruang_id'] = $ubah_id($t['ruang_id']);
            $this->db->insert('k3d_jalur_titik', $t);
            $map[$cid] = (int) $this->db->insert_id();
        }
        $batch = array();
        foreach ($j['ruas'] as $r) {
            if (isset($map[$r[0]]) && isset($map[$r[1]])) {
                $batch[] = array('titik_a' => $map[$r[0]], 'titik_b' => $map[$r[1]]);
            }
        }
        foreach (array_chunk($batch, 500) as $potong) {
            $this->db->insert_batch('k3d_jalur_ruas', $potong);
        }
        $this->db->insert('k3d_log', array(
            'waktu'     => $now,
            'user_id'   => $user,
            'aksi'      => 'jalur',
            'ringkasan' => 'jalur: ' . count($map) . ' titik, ' . count($batch) . ' ruas',
        ));
    }

    /** Mengembalikan peta id => TRUE untuk id yang ada di tabel. */
    private function id_ada($tabel, $ids)
    {
        $ada = array();
        if (empty($ids)) {
            return $ada;
        }
        foreach (array_chunk($ids, 500) as $potong) {
            $rows = $this->db->select('id')->where_in('id', $potong)->get($tabel)->result_array();
            foreach ($rows as $r) {
                $ada[(int) $r['id']] = TRUE;
            }
        }
        return $ada;
    }

    /* ------------------------------------------------------------------
     * Validasi
     * ------------------------------------------------------------------ */

    /** Membersihkan satu objek dari klien. Mengembalikan NULL bila tidak layak. */
    public function normalisasi($r)
    {
        if ( ! is_array($r) || ! isset($r['id']) || ! is_numeric($r['id'])) {
            return NULL;
        }
        $tipe = isset($r['tipe']) ? $r['tipe'] : '';
        if ( ! isset($this->parent_boleh[$tipe])) {
            return NULL;
        }
        $parent = NULL;
        if (isset($r['parent_id']) && $r['parent_id'] !== '' && is_numeric($r['parent_id'])) {
            $parent = (int) $r['parent_id'];
        }
        $uk = array(NULL, NULL, NULL);
        if (isset($r['ukuran']) && is_array($r['ukuran']) && count($r['ukuran']) === 3) {
            $tmp = array_values($r['ukuran']);
            $ok = TRUE;
            foreach ($tmp as $v) {
                if ( ! is_numeric($v) || $v <= 0 || $v > 100000) {
                    $ok = FALSE;
                }
            }
            if ($ok) {
                $uk = array((float) $tmp[0], (float) $tmp[1], (float) $tmp[2]);
            }
        }
        $lib = NULL;
        if (isset($r['library_id']) && is_numeric($r['library_id']) && (int) $r['library_id'] > 0) {
            $lib = (int) $r['library_id'];
        }
        $subtipe = NULL;
        $geometri = NULL;
        $khusus = array();
        if ($tipe === 'area') {
            $subtipe = (isset($r['subtipe']) && is_string($r['subtipe']) && isset($this->subtipe_area[$r['subtipe']]))
                ? $r['subtipe'] : 'taman';
            $geometri = $this->bersihkan_geometri(isset($r['geometri']) ? $r['geometri'] : NULL, $subtipe);
            if ($geometri === NULL) {
                return NULL; // area tanpa bentuk yang sah tidak disimpan
            }
            // Bentuk area ditentukan oleh titiknya (koordinat dunia), jadi transformasi dibuat netral.
            $khusus = array('pos_x' => 0, 'pos_y' => 0, 'pos_z' => 0, 'rot_x' => 0, 'rot_y' => 0, 'rot_z' => 0,
                'scale_x' => 1, 'scale_y' => 1, 'scale_z' => 1);
            $parent = NULL;
            $lib = NULL;
            $uk = array(NULL, NULL, NULL);
        }

        $hasil = array(
            'id'         => (int) $r['id'],
            'parent_id'  => $parent,
            'tipe'       => $tipe,
            'subtipe'    => $subtipe,
            'judul'      => $this->potong(isset($r['judul']) ? $r['judul'] : '', 120),
            'deskripsi'  => $this->potong(isset($r['deskripsi']) ? $r['deskripsi'] : '', 2000),
            'library_id' => $lib,
            'pos_x'      => $this->angka($r, 'pos_x', 0, -100000, 100000),
            'pos_y'      => $this->angka($r, 'pos_y', 0, -100000, 100000),
            'pos_z'      => $this->angka($r, 'pos_z', 0, -100000, 100000),
            'rot_x'      => $this->angka($r, 'rot_x', 0, -3600, 3600),
            'rot_y'      => $this->angka($r, 'rot_y', 0, -3600, 3600),
            'rot_z'      => $this->angka($r, 'rot_z', 0, -3600, 3600),
            'scale_x'    => $this->angka($r, 'scale_x', 1, 0.001, 10000),
            'scale_y'    => $this->angka($r, 'scale_y', 1, 0.001, 10000),
            'scale_z'    => $this->angka($r, 'scale_z', 1, 0.001, 10000),
            'ukuran_x'   => $uk[0],
            'ukuran_y'   => $uk[1],
            'ukuran_z'   => $uk[2],
            'status'     => (isset($r['status']) && $r['status'] === 'terbit') ? 'terbit' : 'draft',
            'geometri'   => $geometri,
            'unit_nama'  => (isset($r['unit_nama']) && is_string($r['unit_nama']) && trim($r['unit_nama']) !== '') ? $this->potong(trim($r['unit_nama']), 100) : NULL,
            'versi'      => (isset($r['versi']) && is_numeric($r['versi'])) ? max(1, (int) $r['versi']) : 1,
        );
        return array_merge($hasil, $khusus);
    }

    /**
     * Membersihkan bentuk area. Mengembalikan ['titik'=>[[x,z],...], 'lebar'=>float (jalan saja)]
     * atau NULL bila jumlah titik kurang atau data tidak sah.
     */
    public function bersihkan_geometri($g, $subtipe)
    {
        if ( ! is_array($g) || ! isset($g['titik']) || ! is_array($g['titik']) || ! isset($this->subtipe_area[$subtipe])) {
            return NULL;
        }
        $titik = array();
        foreach (array_slice(array_values($g['titik']), 0, $this->batas_titik) as $t) {
            if ( ! is_array($t) || count($t) < 2) {
                continue;
            }
            $t = array_values($t);
            if ( ! is_numeric($t[0]) || ! is_numeric($t[1])) {
                continue;
            }
            $x = round(max(-5000, min(5000, (float) $t[0])), 2);
            $z = round(max(-5000, min(5000, (float) $t[1])), 2);
            $n = count($titik);
            if ($n > 0 && abs($titik[$n - 1][0] - $x) < 0.01 && abs($titik[$n - 1][1] - $z) < 0.01) {
                continue; // titik kembar berurutan
            }
            $titik[] = array($x, $z);
        }
        $garis = ($this->subtipe_area[$subtipe] === 'garis');
        if (count($titik) < ($garis ? 2 : 3)) {
            return NULL;
        }
        $out = array('titik' => $titik);
        if ($garis) {
            $l = (isset($g['lebar']) && is_numeric($g['lebar'])) ? (float) $g['lebar'] : 6.0;
            $out['lebar'] = round(max(0.5, min(60, $l)), 2);
        }
        return $out;
    }

    private function ke_baris($n)
    {
        return array(
            'parent_id'  => NULL, // dipasang pada tahap kedua
            'tipe'       => $n['tipe'],
            'subtipe'    => $n['subtipe'],
            'unit_nama'  => $n['unit_nama'],
            'judul'      => $n['judul'],
            'deskripsi'  => $n['deskripsi'],
            'library_id' => $n['library_id'],
            'pos_x'      => $n['pos_x'], 'pos_y' => $n['pos_y'], 'pos_z' => $n['pos_z'],
            'rot_x'      => $n['rot_x'], 'rot_y' => $n['rot_y'], 'rot_z' => $n['rot_z'],
            'scale_x'    => $n['scale_x'], 'scale_y' => $n['scale_y'], 'scale_z' => $n['scale_z'],
            'ukuran_x'   => $n['ukuran_x'], 'ukuran_y' => $n['ukuran_y'], 'ukuran_z' => $n['ukuran_z'],
            'geometri_json' => $n['geometri'] === NULL ? NULL : json_encode($n['geometri']),
            'status'     => $n['status'],
            'versi'      => $n['versi'],
        );
    }

    private function angka($r, $kunci, $bawaan, $min, $maks)
    {
        if ( ! isset($r[$kunci]) || ! is_numeric($r[$kunci])) {
            return $bawaan;
        }
        $v = (float) $r[$kunci];
        if (is_nan($v) || is_infinite($v)) {
            return $bawaan;
        }
        return max($min, min($maks, $v));
    }

    private function potong($s, $panjang)
    {
        $s = is_scalar($s) ? (string) $s : '';
        $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s);
        return function_exists('mb_substr') ? mb_substr($s, 0, $panjang, 'UTF-8') : substr($s, 0, $panjang);
    }

    /* ------------------------------------------------------------------
     * Manajemen Pengguna & Autentikasi
     * ------------------------------------------------------------------ */

    /**
     * Memastikan tabel dan kolom tahap 4a ada:
     * - k3d_user (superadmin & admin_unit)
     * - k3d_user_unit (tabel relasi admin unit -> gedung)
     * - k3d_objek kolom versi dan unit_nama
     */
    public function pastikan_tabel_user()
    {
        // 1. Tabel k3d_user
        if ( ! $this->db->table_exists('k3d_user')) {
            $sql = "CREATE TABLE IF NOT EXISTS `k3d_user` (
              `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `username`     VARCHAR(64) NOT NULL,
              `password`     VARCHAR(255) NOT NULL,
              `nama_lengkap` VARCHAR(100) NOT NULL DEFAULT '',
              `role`         VARCHAR(30) NOT NULL DEFAULT 'superadmin',
              `dibuat_pada`  DATETIME NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uk_username` (`username`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            $this->db->query($sql);
            $pass = password_hash('admin123', PASSWORD_BCRYPT);
            $this->db->insert('k3d_user', array(
                'username'     => 'admin',
                'password'     => $pass,
                'nama_lengkap' => 'Administrator Kampus',
                'role'         => 'superadmin',
                'dibuat_pada'  => date('Y-m-d H:i:s'),
            ));
        } else {
            // Update role 'admin' lama ke 'superadmin'
            $this->db->where('role', 'admin')->update('k3d_user', array('role' => 'superadmin'));

            $count = $this->db->count_all('k3d_user');
            if ($count === 0) {
                $pass = password_hash('admin123', PASSWORD_BCRYPT);
                $this->db->insert('k3d_user', array(
                    'username'     => 'admin',
                    'password'     => $pass,
                    'nama_lengkap' => 'Administrator Kampus',
                    'role'         => 'superadmin',
                    'dibuat_pada'  => date('Y-m-d H:i:s'),
                ));
            } else {
                // Perbaiki hash admin bawaan bila masih menggunakan hash lama yang tidak valid dari skema SQL
                $admin_user = $this->db->where('username', 'admin')->get('k3d_user')->row_array();
                if ($admin_user && ! password_verify('admin123', $admin_user['password']) && in_array($admin_user['password'], array('$2y$10$wEkgzW4p3tBqJtUdg1aQ1OK8BfZK0pBwKzVek2/kGvX88sR0/f7.a', 'admin123', md5('admin123'), sha1('admin123')), TRUE)) {
                    $this->db->where('username', 'admin')->update('k3d_user', array('password' => password_hash('admin123', PASSWORD_BCRYPT)));
                }
            }
        }

        // Tambah akun contoh admin_unit jika belum ada
        $ada_unit = $this->db->where('username', 'admin_unit')->get('k3d_user')->row_array();
        if ( ! $ada_unit) {
            $this->db->insert('k3d_user', array(
                'username'     => 'admin_unit',
                'password'     => password_hash('unit123', PASSWORD_BCRYPT),
                'nama_lengkap' => 'Admin Fakultas / Unit',
                'role'         => 'admin_unit',
                'dibuat_pada'  => date('Y-m-d H:i:s'),
            ));
        }

        // 2. Kolom versi dan unit_nama di k3d_objek
        if ($this->db->table_exists('k3d_objek')) {
            $fields = $this->db->list_fields('k3d_objek');
            if ( ! in_array('versi', $fields, TRUE)) {
                $this->db->query("ALTER TABLE `k3d_objek` ADD COLUMN `versi` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'nomor versi untuk deteksi bentrok simpan bersamaan' AFTER `urutan`");
            }
            if ( ! in_array('unit_nama', $fields, TRUE)) {
                $this->db->query("ALTER TABLE `k3d_objek` ADD COLUMN `unit_nama` VARCHAR(100) NULL COMMENT 'nama fakultas/unit penanggung jawab' AFTER `subtipe`");
            }
        }

        // 3. Tabel k3d_user_unit
        if ( ! $this->db->table_exists('k3d_user_unit')) {
            $sql = "CREATE TABLE IF NOT EXISTS `k3d_user_unit` (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            $this->db->query($sql);
        }
    }

    /**
     * Mengambil daftar ID gedung yang boleh dikelola oleh pengguna.
     * Mengembalikan array: [gedung_id => gedung_id]
     */
    public function ambil_unit_user($user_id)
    {
        $this->pastikan_tabel_user();
        $rows = $this->db->select('objek_id')->where('user_id', (int) $user_id)->get('k3d_user_unit')->result_array();
        $out = array();
        foreach ($rows as $r) {
            $out[(int) $r['objek_id']] = (int) $r['objek_id'];
        }
        return $out;
    }

    /**
     * Mengatur gedung yang dapat dikelola oleh admin unit.
     */
    public function simpan_unit_user($user_id, $gedung_ids)
    {
        $this->pastikan_tabel_user();
        $user_id = (int) $user_id;
        $this->db->where('user_id', $user_id)->delete('k3d_user_unit');
        if ( ! empty($gedung_ids) && is_array($gedung_ids)) {
            $batch = array();
            foreach ($gedung_ids as $gid) {
                if (is_numeric($gid) && (int) $gid > 0) {
                    $batch[] = array(
                        'user_id'  => $user_id,
                        'objek_id' => (int) $gid,
                    );
                }
            }
            if ( ! empty($batch)) {
                $this->db->insert_batch('k3d_user_unit', $batch);
            }
        }
        return TRUE;
    }

    /**
     * Daftar seluruh admin untuk pengaturan wewenang gedung.
     */
    public function daftar_admin()
    {
        $this->pastikan_tabel_user();
        $users = $this->db->select('id, username, nama_lengkap, role, dibuat_pada')
                          ->order_by('role', 'DESC')
                          ->order_by('username', 'ASC')
                          ->get('k3d_user')->result_array();
        $out = array();
        foreach ($users as $u) {
            $uid = (int) $u['id'];
            $u['gedung_ids'] = array_values($this->ambil_unit_user($uid));
            $out[] = $u;
        }
        return $out;
    }

    /**
     * Mengambil daftar semua gedung kampus untuk pilihan penugasan unit.
     */
    public function daftar_gedung_pilihan()
    {
        return $this->db->select('id, judul, unit_nama')
                        ->where('tipe', 'gedung')
                        ->order_by('judul', 'ASC')
                        ->get('k3d_objek')->result_array();
    }

    /**
     * Memeriksa login user.
     * Mengembalikan data user bila cocok, FALSE bila gagal.
     */
    public function autentikasi($username, $password)
    {
        $this->pastikan_tabel_user();

        $username = trim((string) $username);
        $password = (string) $password;

        if ($username === '' || $password === '') {
            return FALSE;
        }

        $user = $this->db->where('username', $username)->get('k3d_user')->row_array();
        if ( ! $user) {
            return FALSE;
        }

        $cocok = FALSE;
        if (password_verify($password, $user['password'])) {
            $cocok = TRUE;
            if (password_needs_rehash($user['password'], PASSWORD_BCRYPT)) {
                $baru = password_hash($password, PASSWORD_BCRYPT);
                $this->db->where('id', $user['id'])->update('k3d_user', array('password' => $baru));
            }
        } elseif ($user['password'] === md5($password) || $user['password'] === sha1($password) || $user['password'] === $password || ($user['username'] === 'admin' && $password === 'admin123' && in_array($user['password'], array('$2y$10$wEkgzW4p3tBqJtUdg1aQ1OK8BfZK0pBwKzVek2/kGvX88sR0/f7.a', 'admin123'), TRUE))) {
            $cocok = TRUE;
            $baru = password_hash($password, PASSWORD_BCRYPT);
            $this->db->where('id', $user['id'])->update('k3d_user', array('password' => $baru));
        }

        if ( ! $cocok) {
            return FALSE;
        }

        return $user;
    }

    /* ------------------------------------------------------------------
     * Pengaturan Mode Karakter / Avatar (Tahap 5a)
     * ------------------------------------------------------------------ */

    /** Memastikan tabel k3d_setting ada dan berisi nilai awal. */
    public function pastikan_tabel_setting()
    {
        if ( ! $this->db->table_exists('k3d_setting')) {
            $sql = "CREATE TABLE IF NOT EXISTS `k3d_setting` (
              `kunci` VARCHAR(60) NOT NULL,
              `nilai` TEXT NOT NULL,
              PRIMARY KEY (`kunci`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            $this->db->query($sql);

            $default_settings = array(
                array('kunci' => 'avatar_lib_id',     'nilai' => ''),
                array('kunci' => 'avatar_speed',      'nilai' => '3.5'),
                array('kunci' => 'avatar_run_speed',  'nilai' => '6.5'),
                array('kunci' => 'avatar_cam_height', 'nilai' => '1.6'),
            );
            $this->db->insert_batch('k3d_setting', $default_settings);
        }
    }

    /** Mengambil pengaturan avatar untuk publik maupun admin. */
    public function ambil_avatar_setting()
    {
        $this->pastikan_tabel_setting();

        $rows = $this->db->get('k3d_setting')->result_array();
        $map = array();
        foreach ($rows as $r) {
            $map[$r['kunci']] = $r['nilai'];
        }

        $def_speed = (float) $this->config->item('k3d_avatar_speed', 'kampus3d');
        if ($def_speed <= 0) { $def_speed = 3.5; }

        $def_run = (float) $this->config->item('k3d_avatar_run_speed', 'kampus3d');
        if ($def_run <= 0) { $def_run = 6.5; }

        $def_height = (float) $this->config->item('k3d_avatar_cam_height', 'kampus3d');
        if ($def_height <= 0) { $def_height = 1.6; }

        $lib_id = (isset($map['avatar_lib_id']) && is_numeric($map['avatar_lib_id']) && (int) $map['avatar_lib_id'] > 0)
            ? (int) $map['avatar_lib_id'] : NULL;

        $speed = isset($map['avatar_speed']) && is_numeric($map['avatar_speed']) ? (float) $map['avatar_speed'] : $def_speed;
        $run_speed = isset($map['avatar_run_speed']) && is_numeric($map['avatar_run_speed']) ? (float) $map['avatar_run_speed'] : $def_run;
        $cam_height = isset($map['avatar_cam_height']) && is_numeric($map['avatar_cam_height']) ? (float) $map['avatar_cam_height'] : $def_height;

        // Validasi batas angka wajar
        $speed = max(0.5, min(15.0, $speed));
        $run_speed = max(1.0, min(25.0, $run_speed));
        $cam_height = max(0.8, min(3.0, $cam_height));

        return array(
            'avatar_lib_id'     => $lib_id,
            'avatar_speed'      => $speed,
            'avatar_run_speed'  => $run_speed,
            'avatar_cam_height' => $cam_height,
        );
    }

    /** Menyimpan pengaturan avatar dari form admin. */
    public function simpan_avatar_setting($data)
    {
        $this->pastikan_tabel_setting();

        $lib_id = '';
        if (isset($data['avatar_lib_id']) && is_numeric($data['avatar_lib_id']) && (int) $data['avatar_lib_id'] > 0) {
            $cek = $this->db->where('id', (int) $data['avatar_lib_id'])->get('k3d_library')->row_array();
            if ($cek) {
                $lib_id = (string) (int) $data['avatar_lib_id'];
            }
        }

        $speed = isset($data['avatar_speed']) && is_numeric($data['avatar_speed']) ? (float) $data['avatar_speed'] : 3.5;
        $run_speed = isset($data['avatar_run_speed']) && is_numeric($data['avatar_run_speed']) ? (float) $data['avatar_run_speed'] : 6.5;
        $cam_height = isset($data['avatar_cam_height']) && is_numeric($data['avatar_cam_height']) ? (float) $data['avatar_cam_height'] : 1.6;

        $speed = max(1.0, min(15.0, $speed));
        $run_speed = max(2.0, min(25.0, $run_speed));
        $cam_height = max(1.0, min(3.0, $cam_height));

        $items = array(
            'avatar_lib_id'     => $lib_id,
            'avatar_speed'      => (string) $speed,
            'avatar_run_speed'  => (string) $run_speed,
            'avatar_cam_height' => (string) $cam_height,
        );

        foreach ($items as $k => $v) {
            $ada = $this->db->where('kunci', $k)->get('k3d_setting')->row_array();
            if ($ada) {
                $this->db->where('kunci', $k)->update('k3d_setting', array('nilai' => $v));
            } else {
                $this->db->insert('k3d_setting', array('kunci' => $k, 'nilai' => $v));
            }
        }

        return $this->ambil_avatar_setting();
    }
}

