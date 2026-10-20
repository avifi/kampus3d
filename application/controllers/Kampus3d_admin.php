<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Editor admin Kampus 3D.
 * Alamat: site_url('kampus3d_admin'). Semua metode memerlukan login admin.
 */
class Kampus3d_admin extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper('url');
        $this->load->library('session');
        $this->config->load('kampus3d', TRUE);
        $this->load->model('Kampus3d_model', 'k3d');
        $this->cek_login();
    }

    private function cfg($kunci)
    {
        return $this->config->item($kunci, 'kampus3d');
    }

    /** Pengguna yang belum login: halaman diarahkan ke login, permintaan AJAX dijawab 401. */
    private function cek_login()
    {
        $method = $this->router->fetch_method();
        // Method login & logout tidak memerlukan cek status login
        if (in_array($method, array('login', 'logout'), TRUE)) {
            return;
        }

        if ($this->session->userdata($this->cfg('k3d_session_login'))) {
            return;
        }
        if ($method === 'index') {
            redirect($this->cfg('k3d_login_url'));
        }
        set_status_header(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('ok' => FALSE, 'pesan' => 'Sesi login berakhir. Muat ulang halaman dan login kembali.'));
        exit;
    }

    private function nama_user()
    {
        $u = (string) $this->session->userdata($this->cfg('k3d_session_user'));
        $u = substr($u, 0, 64);
        return $u !== '' ? $u : 'admin';
    }

    private function url_model()
    {
        return base_url($this->cfg('k3d_upload_url'));
    }

    /** Menjawab JSON dan selalu menyertakan token CSRF terbaru. */
    private function json($data, $status = 200)
    {
        $data['csrf'] = array(
            'name' => $this->security->get_csrf_token_name(),
            'hash' => $this->security->get_csrf_hash(),
        );
        $this->output
            ->set_status_header($status)
            ->set_header('Cache-Control: no-store')
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode($data));
    }

    /* ------------------------------------------------------------------ */

    /** Halaman login editor admin */
    public function login()
    {
        if ($this->session->userdata($this->cfg('k3d_session_login'))) {
            redirect('admin');
        }

        $error = NULL;
        $username = '';

        if ($this->input->method() === 'post') {
            $username = trim((string) $this->input->post('username'));
            $password = (string) $this->input->post('password');

            if ($username === '' || $password === '') {
                $error = 'Username dan password wajib diisi.';
            } else {
                $user = $this->k3d->autentikasi($username, $password);
                if ($user) {
                    $this->session->set_userdata(array(
                        $this->cfg('k3d_session_login') => TRUE,
                        $this->cfg('k3d_session_user')  => $user['username'],
                        'user_id'                       => $user['id'],
                        'nama_lengkap'                  => $user['nama_lengkap'],
                        'role'                          => $user['role'],
                    ));
                    redirect('admin');
                } else {
                    $error = 'Username atau password tidak sesuai.';
                }
            }
        }

        $data = array(
            'error'     => $error,
            'username'  => $username,
            'urlAksi'   => site_url('login'),
            'assetBase' => base_url('assets/kampus3d/'),
            'judul'     => $this->cfg('k3d_judul'),
            'urlPublik' => site_url(),
            'csrf'      => array(
                'name' => $this->security->get_csrf_token_name(),
                'hash' => $this->security->get_csrf_hash(),
            ),
        );

        $this->load->view('kampus3d/login', $data);
    }

    /** Logout admin */
    public function logout()
    {
        $this->session->unset_userdata(array(
            $this->cfg('k3d_session_login'),
            $this->cfg('k3d_session_user'),
            'user_id',
            'nama_lengkap',
            'role',
        ));
        $this->session->sess_destroy();
        redirect($this->cfg('k3d_login_url'));
    }

    private function user_id()
    {
        return (int) $this->session->userdata('user_id');
    }

    private function role_user()
    {
        $r = (string) $this->session->userdata('role');
        return ($r === 'admin_unit') ? 'admin_unit' : 'superadmin';
    }

    /** Halaman editor. */
    public function index()
    {
        $role = $this->role_user();
        $uid = $this->user_id();
        $izin_gedung = ($role === 'admin_unit') ? array_values($this->k3d->ambil_unit_user($uid)) : 'semua';

        $cfg = array(
            'mode'        => 'admin',
            'role'        => $role,
            'userId'      => $uid,
            'izinGedung'  => $izin_gedung,
            'urlData'     => site_url('kampus3d_admin/data'),
            'urlSimpan'   => site_url('kampus3d_admin/simpan'),
            'urlUnggah'   => site_url('kampus3d_admin/unggah'),
            'urlLibUbah'  => site_url('kampus3d_admin/library_ubah'),
            'urlLibHapus' => site_url('kampus3d_admin/library_hapus'),
            'urlLibGanti' => site_url('kampus3d_admin/library_ganti'),
            'urlUsers'    => site_url('kampus3d_admin/users'),
            'urlSimpanUserUnit' => site_url('kampus3d_admin/simpan_user_unit'),
            'urlPublik'   => site_url('kampus3d'),
            'urlLogout'   => site_url('kampus3d_admin/logout'),
            'user'        => $this->nama_user(),
            'namaLengkap' => (string) $this->session->userdata('nama_lengkap'),
            'assetBase'   => base_url('assets/kampus3d/'),
            'maxMb'       => (int) $this->cfg('k3d_max_mb'),
            'csrf'        => array(
                'name' => $this->security->get_csrf_token_name(),
                'hash' => $this->security->get_csrf_hash(),
            ),
        );
        $this->load->view('kampus3d/editor', array('cfg' => $cfg));
    }

    /** Seluruh objek (termasuk draft) dan pustaka model. */
    public function data()
    {
        $this->json(array(
            'ok'      => TRUE,
            'objek'   => $this->k3d->daftar_objek(FALSE),
            'library' => $this->k3d->daftar_library($this->url_model()),
        ));
    }

    /** Menyimpan keadaan editor. Menerima POST dengan kolom "payload" berisi JSON. */
    public function simpan()
    {
        if ($this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Metode tidak diizinkan.'), 405);
        }
        $data = json_decode((string) $this->input->post('payload'), TRUE);
        if ( ! is_array($data) || ! isset($data['objek']) || ! is_array($data['objek'])) {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Data tidak valid.'), 400);
        }
        $hapus = array();
        if (isset($data['hapus']) && is_array($data['hapus'])) {
            foreach ($data['hapus'] as $id) {
                if (is_numeric($id) && (int) $id > 0) {
                    $hapus[(int) $id] = (int) $id;
                }
            }
        }
        $hasil = $this->k3d->simpan($data['objek'], array_values($hapus), $this->nama_user(), $this->user_id(), $this->role_user());
        $status = 200;
        if ( ! $hasil['ok']) {
            $status = (isset($hasil['bentrok']) && $hasil['bentrok']) ? 409 : 400;
        }
        $this->json($hasil, $status);
    }

    /** Daftar pengguna & gedung untuk manajemen unit (hanya superadmin). */
    public function users()
    {
        if ($this->role_user() !== 'superadmin') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Akses ditolak.'), 403);
        }
        $this->json(array(
            'ok'     => TRUE,
            'users'  => $this->k3d->daftar_admin(),
            'gedung' => $this->k3d->daftar_gedung_pilihan(),
        ));
    }

    /** Menyimpan penugasan gedung ke admin unit (hanya superadmin). */
    public function simpan_user_unit()
    {
        if ($this->role_user() !== 'superadmin' || $this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Akses ditolak.'), 403);
        }
        $uid = (int) $this->input->post('user_id');
        $gedung_raw = $this->input->post('gedung_ids');
        $gedung_ids = is_array($gedung_raw) ? $gedung_raw : json_decode((string) $gedung_raw, TRUE);
        $this->k3d->simpan_unit_user($uid, is_array($gedung_ids) ? $gedung_ids : array());
        $this->json(array('ok' => TRUE, 'pesan' => 'Wewenang unit berhasil disimpan.'));
    }

    /**
     * Memeriksa dan menyimpan berkas .glb dari $_FILES['berkas'].
     * Mengembalikan array: ['ok'=>TRUE, 'file_glb', 'file_asli', 'ukuran', 'dim'=>[x,y,z|NULL]]
     * atau ['ok'=>FALSE, 'pesan', 'status'].
     */
    private function terima_berkas()
    {
        $f = isset($_FILES['berkas']) ? $_FILES['berkas'] : NULL;
        if ( ! is_array($f) || ! isset($f['error']) || is_array($f['error'])) {
            return array('ok' => FALSE, 'status' => 400, 'pesan' => 'Tidak ada berkas yang diterima.');
        }
        if ($f['error'] !== UPLOAD_ERR_OK) {
            $batas = ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE);
            return array('ok' => FALSE, 'status' => 400,
                'pesan' => $batas ? 'Berkas melebihi batas ukuran server (cek upload_max_filesize di php.ini).' : 'Unggahan gagal (kode ' . (int) $f['error'] . ').');
        }

        $maks = (int) $this->cfg('k3d_max_mb') * 1048576;
        $nama_asli = substr(preg_replace('/[\x00-\x1F\x7F]/', '', basename((string) $f['name'])), 0, 200);
        if ( ! is_uploaded_file($f['tmp_name']) || $f['size'] <= 0) {
            return array('ok' => FALSE, 'status' => 400, 'pesan' => 'Berkas tidak valid.');
        }
        if ($f['size'] > $maks) {
            return array('ok' => FALSE, 'status' => 400, 'pesan' => 'Berkas terlalu besar. Maksimal ' . (int) $this->cfg('k3d_max_mb') . ' MB.');
        }
        if (strtolower(pathinfo($nama_asli, PATHINFO_EXTENSION)) !== 'glb') {
            return array('ok' => FALSE, 'status' => 400, 'pesan' => 'Hanya berkas .glb yang diterima.');
        }
        if ( ! self::glb_valid($f['tmp_name'], (int) $f['size'])) {
            return array('ok' => FALSE, 'status' => 400, 'pesan' => 'Isi berkas bukan GLB (glTF biner versi 2) yang utuh.');
        }

        $dir = rtrim($this->cfg('k3d_upload_dir'), '/\\') . DIRECTORY_SEPARATOR;
        if ( ! is_dir($dir) && ! @mkdir($dir, 0755, TRUE)) {
            return array('ok' => FALSE, 'status' => 500, 'pesan' => 'Folder upload tidak dapat dibuat di server.');
        }
        if ( ! is_writable($dir)) {
            return array('ok' => FALSE, 'status' => 500, 'pesan' => 'Folder upload tidak dapat ditulis. Periksa izin folder.');
        }
        $acak = function_exists('random_bytes') ? bin2hex(random_bytes(12)) : md5(uniqid((string) mt_rand(), TRUE));
        $nama_simpan = $acak . '.glb';
        if ( ! move_uploaded_file($f['tmp_name'], $dir . $nama_simpan)) {
            return array('ok' => FALSE, 'status' => 500, 'pesan' => 'Berkas gagal disimpan di server.');
        }
        @chmod($dir . $nama_simpan, 0644);

        $dim = array();
        foreach (array('dim_x', 'dim_y', 'dim_z') as $k) {
            $v = $this->input->post($k);
            $dim[$k] = (is_numeric($v) && $v > 0 && $v < 100000) ? round((float) $v, 3) : NULL;
        }
        return array('ok' => TRUE, 'file_glb' => $nama_simpan, 'file_asli' => $nama_asli,
            'ukuran' => (int) $f['size'], 'dim' => $dim);
    }

    /** Menghapus berkas model dari disk. Hanya nama berkas acak buatan modul ini yang diterima. */
    private function hapus_berkas($nama)
    {
        if ( ! is_string($nama) || ! preg_match('/^[a-f0-9]{24,32}\.glb$/', $nama)) {
            return;
        }
        $path = rtrim($this->cfg('k3d_upload_dir'), '/\\') . DIRECTORY_SEPARATOR . $nama;
        if (is_file($path)) {
            @unlink($path);
        }
    }

    private function library_klien($id)
    {
        $row = $this->k3d->ambil_library($id);
        return $row ? $this->k3d->library_ke_klien($row, $this->url_model(), $this->k3d->pemakaian_library($id)) : NULL;
    }

    /** Mengunggah satu model .glb ke pustaka. */
    public function unggah()
    {
        if ($this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Metode tidak diizinkan.'), 405);
        }
        $b = $this->terima_berkas();
        if ( ! $b['ok']) {
            return $this->json(array('ok' => FALSE, 'pesan' => $b['pesan']), $b['status']);
        }
        $nama = $this->k3d->bersihkan_nama($this->input->post('nama'));
        if ($nama === '') {
            $nama = $this->k3d->bersihkan_nama(pathinfo($b['file_asli'], PATHINFO_FILENAME));
        }
        if ($nama === '') {
            $nama = 'model';
        }
        $id = $this->k3d->tambah_library(array(
            'nama'        => $nama,
            'kategori'    => $this->k3d->bersihkan_kategori($this->input->post('kategori')),
            'file_glb'    => $b['file_glb'],
            'file_asli'   => $b['file_asli'],
            'ukuran_byte' => $b['ukuran'],
            'dim_x'       => $b['dim']['dim_x'],
            'dim_y'       => $b['dim']['dim_y'],
            'dim_z'       => $b['dim']['dim_z'],
            'dibuat_pada' => date('Y-m-d H:i:s'),
            'dibuat_oleh' => $this->nama_user(),
        ));
        $this->json(array('ok' => TRUE, 'library' => $this->library_klien($id)));
    }

    /** Mengubah nama dan kategori model. POST: id, nama, kategori. */
    public function library_ubah()
    {
        if ($this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Metode tidak diizinkan.'), 405);
        }
        $id = (int) $this->input->post('id');
        if ( ! $this->k3d->ubah_library($id, $this->input->post('nama'), $this->input->post('kategori'), $this->nama_user())) {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Model tidak ditemukan atau nama kosong.'), 400);
        }
        $this->json(array('ok' => TRUE, 'library' => $this->library_klien($id)));
    }

    /** Menghapus model yang tidak dipakai. POST: id. */
    public function library_hapus()
    {
        if ($this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Metode tidak diizinkan.'), 405);
        }
        $id = (int) $this->input->post('id');
        $berkas = $this->k3d->hapus_library($id, $this->nama_user());
        if ($berkas === '') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Model tidak dapat dihapus: tidak ditemukan atau masih dipakai objek. Hapus atau ganti objek yang memakainya, simpan, lalu coba lagi.'), 409);
        }
        $this->hapus_berkas($berkas);
        $this->json(array('ok' => TRUE, 'id' => $id));
    }

    /** Mengganti berkas sebuah model; semua objek yang memakainya ikut berubah. POST: id + berkas. */
    public function library_ganti()
    {
        if ($this->input->method() !== 'post') {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Metode tidak diizinkan.'), 405);
        }
        $id = (int) $this->input->post('id');
        if ( ! $this->k3d->ambil_library($id)) {
            return $this->json(array('ok' => FALSE, 'pesan' => 'Model tidak ditemukan.'), 404);
        }
        $b = $this->terima_berkas();
        if ( ! $b['ok']) {
            return $this->json(array('ok' => FALSE, 'pesan' => $b['pesan']), $b['status']);
        }
        $lama = $this->k3d->ganti_berkas_library($id, array(
            'file_glb'    => $b['file_glb'],
            'file_asli'   => $b['file_asli'],
            'ukuran_byte' => $b['ukuran'],
            'dim_x'       => $b['dim']['dim_x'],
            'dim_y'       => $b['dim']['dim_y'],
            'dim_z'       => $b['dim']['dim_z'],
        ), $this->nama_user());
        if ($lama === NULL) {
            $this->hapus_berkas($b['file_glb']);
            return $this->json(array('ok' => FALSE, 'pesan' => 'Model tidak ditemukan.'), 404);
        }
        $this->hapus_berkas($lama);
        $this->json(array('ok' => TRUE, 'library' => $this->library_klien($id)));
    }

    /**
     * Memeriksa kepala berkas GLB: magic "glTF", versi 2, dan panjang sama dengan ukuran berkas.
     */
    public static function glb_valid($path, $ukuran)
    {
        $fh = @fopen($path, 'rb');
        if ( ! $fh) {
            return FALSE;
        }
        $kepala = fread($fh, 12);
        fclose($fh);
        if (strlen($kepala) !== 12 || substr($kepala, 0, 4) !== 'glTF') {
            return FALSE;
        }
        $u = unpack('Vversi/Vpanjang', substr($kepala, 4, 8));
        return $u['versi'] === 2 && $u['panjang'] === $ukuran;
    }
}
