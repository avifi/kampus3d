<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Halaman publik Kampus 3D. Alamat: site_url('kampus3d').
 * Hanya menampilkan objek berstatus terbit (beserta seluruh induknya yang juga terbit).
 */
class Kampus3d extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper('url');
        $this->config->load('kampus3d', TRUE);
        $this->load->model('Kampus3d_model', 'k3d');
    }

    public function index()
    {
        $cfg = array(
            'mode'      => 'publik',
            'urlData'   => site_url('kampus3d/data'),
            'assetBase' => base_url('assets/kampus3d/'),
        );
        $this->load->view('kampus3d/publik', array('cfg' => $cfg));
    }

    public function data()
    {
        $url_model = base_url($this->config->item('k3d_upload_url', 'kampus3d'));
        $objek = $this->k3d->daftar_objek(TRUE);
        $avatar = $this->k3d->ambil_avatar_setting();

        // Pustaka hanya dikirim untuk model yang dipakai objek terbit atau model avatar.
        $dipakai = array();
        foreach ($objek as $o) {
            if ($o['library_id'] !== NULL) {
                $dipakai[$o['library_id']] = TRUE;
            }
        }
        if ($avatar['avatar_lib_id'] !== NULL) {
            $dipakai[$avatar['avatar_lib_id']] = TRUE;
        }

        $library = array();
        foreach ($this->k3d->daftar_library($url_model) as $l) {
            if (isset($dipakai[$l['id']])) {
                unset($l['dipakai'], $l['file_asli']);
                $library[] = $l;
            }
        }

        // Media hanya dikirim untuk yang dipakai oleh objek layar terbit.
        $url_media = base_url($this->config->item('k3d_media_upload_url', 'kampus3d'));
        $media_dipakai = array();
        foreach ($objek as $o) {
            if (!empty($o['media_id'])) {
                $media_dipakai[$o['media_id']] = TRUE;
            }
        }
        $media = array();
        foreach ($this->k3d->daftar_media($url_media) as $m) {
            if (isset($media_dipakai[$m['id']])) {
                unset($m['dipakai'], $m['file_asli']);
                $media[] = $m;
            }
        }

        // Jalur hanya memuat titik di tanah kampus atau di objek yang terbit.
        $boleh = array();
        foreach ($objek as $o) {
            $boleh[$o['id']] = TRUE;
        }
        $jalur = $this->k3d->daftar_jalur($boleh);

        $this->output
            ->set_header('Cache-Control: public, max-age=60')
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode(array(
                'ok'      => TRUE,
                'objek'   => $objek,
                'library' => $library,
                'media'   => $media,
                'jalur'   => $jalur,
                'avatar'  => $avatar,
            )));
    }
}

