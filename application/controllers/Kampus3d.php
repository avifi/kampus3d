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

        // Pustaka hanya dikirim untuk model yang dipakai objek terbit.
        $dipakai = array();
        foreach ($objek as $o) {
            if ($o['library_id'] !== NULL) {
                $dipakai[$o['library_id']] = TRUE;
            }
        }
        $library = array();
        foreach ($this->k3d->daftar_library($url_model) as $l) {
            if (isset($dipakai[$l['id']])) {
                unset($l['dipakai'], $l['file_asli']);
                $library[] = $l;
            }
        }

        $this->output
            ->set_header('Cache-Control: public, max-age=60')
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode(array('ok' => TRUE, 'objek' => $objek, 'library' => $library)));
    }
}
