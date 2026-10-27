/* Kampus 3D: Mode Karakter / Avatar Jelajah (Tahap 5a)
   Menyediakan controller avatar untuk menjelajahi kampus dalam sudut pandang orang ketiga (3P)
   atau orang pertama (1P), kontrol desktop (WASD + mouse look) & mobile (joystick virtual),
   collision detection dinding, transit tangga/lift (tahap 4b), dan interaksi objek. */
(function (global) {
  'use strict';

  var THREE = global.THREE;
  if (!THREE) { return; }

  /**
   * Membuat material & mesh karakter prosedural (stylized humanoid mannequin)
   * jika belum ada model GLTF dari pustaka model.
   */
  function buatManekinProcedural() {
    var group = new THREE.Group();
    group.name = 'ProceduralAvatar';

    // Palet warna modern & elegan (casual kampus)
    var matSkin = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    var matCloth = new THREE.MeshLambertMaterial({ color: 0x1f4e79 }); // Biru kampus UNISNU
    var matPants = new THREE.MeshLambertMaterial({ color: 0x2b303a }); // Celana gelap
    var matShoes = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }); // Sepatu putih
    var matHair = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });  // Rambut hitam

    // 1. Badan (Torso)
    var torsoGeo = new THREE.BoxGeometry(0.44, 0.58, 0.26);
    var torso = new THREE.Mesh(torsoGeo, matCloth);
    torso.position.y = 1.05;
    group.add(torso);

    // 2. Kepala & Leher
    var headGroup = new THREE.Group();
    headGroup.position.set(0, 1.48, 0);

    var headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
    var head = new THREE.Mesh(headGeo, matSkin);
    headGroup.add(head);

    // Rambut
    var hairGeo = new THREE.BoxGeometry(0.28, 0.10, 0.28);
    var hair = new THREE.Mesh(hairGeo, matHair);
    hair.position.y = 0.14;
    headGroup.add(hair);

    // Kacamata / Visor sederhana
    var visorGeo = new THREE.BoxGeometry(0.24, 0.05, 0.08);
    var visor = new THREE.Mesh(visorGeo, new THREE.MeshBasicMaterial({ color: 0x222222 }));
    visor.position.set(0, 0.02, 0.12);
    headGroup.add(visor);

    group.add(headGroup);

    // 3. Tangan Kiri & Kanan (Pivot di bahu)
    var armGeo = new THREE.BoxGeometry(0.12, 0.52, 0.12);
    // Geser titik pivot ke bagian atas lengan
    armGeo.translate(0, -0.22, 0);

    var leftArm = new THREE.Mesh(armGeo, matCloth);
    leftArm.position.set(-0.29, 1.30, 0);
    group.add(leftArm);

    var rightArm = new THREE.Mesh(armGeo, matCloth);
    rightArm.position.set(0.29, 1.30, 0);
    group.add(rightArm);

    // 4. Kaki Kiri & Kanan (Pivot di pinggul)
    var legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.16);
    // Geser titik pivot ke bagian atas paha
    legGeo.translate(0, -0.34, 0);

    var leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.13, 0.76, 0);
    var leftLeg = new THREE.Mesh(legGeo, matPants);
    leftLegGroup.add(leftLeg);

    var leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), matShoes);
    leftShoe.position.set(0, -0.68, 0.04);
    leftLegGroup.add(leftShoe);
    group.add(leftLegGroup);

    var rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.13, 0.76, 0);
    var rightLeg = new THREE.Mesh(legGeo, matPants);
    rightLegGroup.add(rightLeg);

    var rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), matShoes);
    rightShoe.position.set(0, -0.68, 0.04);
    rightLegGroup.add(rightShoe);
    group.add(rightLegGroup);

    // 5. Bayangan halus di bawah kaki (Ground shadow blob)
    var shadowGeo = new THREE.CircleGeometry(0.38, 16);
    var shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return {
      root: group,
      leftArm: leftArm,
      rightArm: rightArm,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      head: headGroup,
      isProcedural: true
    };
  }

  /**
   * Controller Avatar Kampus 3D
   */
  function buatAvatarController(stage, opts) {
    opts = opts || {};
    var scene = stage.scene;
    var camera = stage.camera;
    var canvas = stage.renderer.domElement;

    var setting = Object.assign({
      avatar_lib_id: null,
      avatar_speed: 3.5,
      avatar_run_speed: 6.5,
      avatar_cam_height: 1.6
    }, opts.avatarSetting || {});

    // State karakter
    var active = false;
    var firstPerson = false;
    var avatarPos = new THREE.Vector3(0, 0, 0);
    var avatarYaw = 0;   // Rotasi pandangan horizontal (radian)
    var avatarPitch = 0; // Rotasi pandangan vertikal (radian)
    var currentFloorY = 0; // Ketinggian lantai saat ini
    var currentLantaiId = null;

    // Animasi prosedural berjalan
    var walkPhase = 0;
    var isMoving = false;
    var isRunning = false;

    // Root Three.js container untuk avatar
    var avatarContainer = new THREE.Group();
    avatarContainer.name = 'K3DAvatarContainer';
    avatarContainer.visible = false;
    scene.add(avatarContainer);

    // Model avatar (bawaan manekin atau GLTF)
    var avatarModel = null;
    var gltfMixer = null;
    var gltfAnimations = {};
    var gltfCurrentAction = null;

    // Pasang manekin awal
    avatarModel = buatManekinProcedural();
    avatarContainer.add(avatarModel.root);

    // Lampu interior halus untuk penerangan saat berada di dalam gedung/ruangan tertutup
    var interiorLight = new THREE.PointLight(0xfff6ea, 0.65, 14, 1.2);
    interiorLight.position.set(0, 1.7, 0);
    avatarContainer.add(interiorLight);

    // Mencoba memuat model GLTF bila ada setting pustaka
    if (setting.avatar_lib_id && stage.libraryMap && stage.libraryMap.has(setting.avatar_lib_id)) {
      muatModelGltf(stage.libraryMap.get(setting.avatar_lib_id));
    }

    function muatModelGltf(libItem) {
      if (!libItem || !libItem.url || !stage.loader) { return; }
      stage.loader.load(libItem.url, function (gltf) {
        if (!active && !avatarContainer) { return; }
        // Bersihkan model lama
        while (avatarContainer.children.length > 0) {
          avatarContainer.remove(avatarContainer.children[0]);
        }
        var m = gltf.scene;
        m.name = 'GLTFAvatarModel';

        // Hitung skala agar tingginya proporsional (~1.7m)
        var box = new THREE.Box3().setFromObject(m);
        var size = box.getSize(new THREE.Vector3());
        if (size.y > 0.05) {
          var scale = 1.7 / size.y;
          m.scale.setScalar(scale);
          // Ratakan dasar model dengan lantai
          box.setFromObject(m);
          m.position.y = -box.min.y;
        }

        // Aktifkan bayangan
        m.traverse(function (node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        avatarContainer.add(m);

        // Siapkan animasi GLTF bila ada
        if (gltf.animations && gltf.animations.length) {
          gltfMixer = new THREE.AnimationMixer(m);
          gltf.animations.forEach(function (clip) {
            var name = clip.name.toLowerCase();
            var action = gltfMixer.clipAction(clip);
            gltfAnimations[name] = action;
            if (name.indexOf('idle') >= 0 || name.indexOf('diam') >= 0) {
              gltfAnimations.idle = action;
            } else if (name.indexOf('walk') >= 0 || name.indexOf('jalan') >= 0) {
              gltfAnimations.walk = action;
            } else if (name.indexOf('run') >= 0 || name.indexOf('lari') >= 0) {
              gltfAnimations.run = action;
            }
          });
          // Set animasi default idle
          if (gltfAnimations.idle) {
            gltfCurrentAction = gltfAnimations.idle;
            gltfCurrentAction.play();
          } else if (gltf.animations[0]) {
            gltfCurrentAction = gltfMixer.clipAction(gltf.animations[0]);
            gltfCurrentAction.play();
          }
        }

        avatarModel = {
          root: m,
          isProcedural: false
        };
      }, undefined, function (err) {
        console.warn('Gagal memuat model karakter GLTF, tetap memakai manekin bawaan:', err);
      });
    }

    /* ------------------------------------------------------------------
     * Kontrol Keyboard & Mouse (Desktop)
     * ------------------------------------------------------------------ */
    var keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };

    var isDraggingMouse = false;
    var lastMousePos = { x: 0, y: 0 };

    function onMouseDown(e) {
      if (!active) { return; }
      // Jangan mulai seret jika mengklik elemen UI tombol, popup, dialog, atau info modal
      if (e.target && (e.target.closest('button') || e.target.closest('.k3d-entry-popup') || e.target.closest('.k3d-avatar-mobile') || e.target.closest('.k3d-info-modal-backdrop') || e.target.closest('.k3d-info-modal-card') || e.target.closest('.k3d-avatar-hud-actions') || e.target.closest('dialog') || e.target.closest('.qr-dlg'))) {
        return;
      }
      isDraggingMouse = true;
      lastMousePos = { x: e.clientX, y: e.clientY };
      if (canvas) { canvas.style.cursor = 'grabbing'; }
    }

    function onMouseUp(e) {
      if (!active) { return; }
      if (isDraggingMouse) {
        isDraggingMouse = false;
        if (canvas) { canvas.style.cursor = 'grab'; }
      }
    }

    function onMouseMove(e) {
      if (!active) { return; }

      // Jika user secara eksplisit berada di pointer lock
      if (document.pointerLockElement === canvas) {
        var sens = 0.0022;
        avatarYaw -= e.movementX * sens;
        avatarPitch -= e.movementY * sens;
        avatarPitch = Math.max(-1.35, Math.min(1.30, avatarPitch));
        return;
      }

      // Mode kursor bebas: Seret mouse (drag) untuk memutar sudut pandang kamera
      if (isDraggingMouse) {
        var dx = e.clientX - lastMousePos.x;
        var dy = e.clientY - lastMousePos.y;
        lastMousePos.x = e.clientX;
        lastMousePos.y = e.clientY;

        var sensDrag = 0.0035;
        avatarYaw -= dx * sensDrag;
        avatarPitch -= dy * sensDrag;
        avatarPitch = Math.max(-1.35, Math.min(1.30, avatarPitch));
      }
    }

    function onKeyDown(e) {
      if (!active) { return; }
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea') { return; }

      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.forward = true; break;
        case 'KeyS': case 'ArrowDown':  keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  keys.left = true; break;
        case 'KeyD': case 'ArrowRight': keys.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
        case 'KeyV':
          toggleCameraView();
          e.preventDefault();
          break;
        case 'KeyE':
        case 'Enter':
          if (interaksiAktif) {
            lakukanInteraksi();
            e.preventDefault();
          }
          break;
        case 'KeyI':
          if (interaksiAktif) {
            if (elInfoModal && !elInfoModal.hidden) {
              tutupModalInfoGedung();
            } else {
              bukaModalInfoGedung();
            }
            e.preventDefault();
          }
          break;
        case 'KeyH':
        case 'KeyQ':
          keluarJelajah(true);
          e.preventDefault();
          break;
        case 'Escape':
          if (elInfoModal && !elInfoModal.hidden) {
            tutupModalInfoGedung();
            e.preventDefault();
            break;
          }
          keluarJelajah(true);
          e.preventDefault();
          break;
      }
    }

    function onKeyUp(e) {
      if (!active) { return; }
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.forward = false; break;
        case 'KeyS': case 'ArrowDown':  keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  keys.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', function () { isDraggingMouse = false; });
    canvas.addEventListener('contextmenu', function (e) {
      if (active) { e.preventDefault(); }
    });

    document.addEventListener('pointerlockchange', function () {
      if (!active) { return; }
      var isLocked = (document.pointerLockElement === canvas);
      var crosshair = hudEl.querySelector('#avatarCrosshair');
      if (crosshair) {
        crosshair.style.opacity = isLocked ? '1' : '0.4';
      }
    });

    /* ------------------------------------------------------------------
     * UI Overlay (HUD & Mobile Controls)
     * ------------------------------------------------------------------ */
    var hudEl = document.createElement('div');
    hudEl.className = 'k3d-avatar-hud';
    hudEl.hidden = true;
    hudEl.innerHTML = [
      '<button class="k3d-avatar-top-exit" id="avatarTopExit" type="button" title="Keluar ke mode lihat seluruh kampus (Tekan H, Q, atau ESC)">✕ Lihat Seluruh Kampus (H / ESC)</button>',
      '<div class="k3d-avatar-crosshair" id="avatarCrosshair" style="display:none;"></div>',
      '<div class="k3d-entry-popup" id="avatarEntryPopup" hidden>',
        '<div class="k3d-entry-info">',
          '<span class="k3d-entry-badge" id="avatarEntryBadge">🚪 Pintu Masuk</span>',
          '<span class="k3d-entry-title" id="avatarEntryTitle">Nama Gedung / Ruang</span>',
        '</div>',
        '<div class="k3d-entry-desc" id="avatarEntryDesc" hidden></div>',
        '<div class="k3d-entry-actions">',
          '<button class="k3d-entry-btn" id="avatarEntryBtn" type="button">',
            '<span class="k3d-entry-btn-text" id="avatarEntryBtnText">Masuk</span>',
            '<kbd>E</kbd>',
          '</button>',
        '</div>',
      '</div>',
      '<div class="k3d-avatar-hud-actions" id="avatarHudActions" hidden>',
        '<button class="k3d-hud-btn info" id="avatarInfoBtn" type="button" title="Lihat Informasi Gedung (Tekan I)">',
          '<i class="bi bi-info-circle-fill"></i> <span>Info Gedung</span> <kbd>I</kbd>',
        '</button>',
        '<button class="k3d-hud-btn act" id="avatarActBtn" type="button" title="Aksi Masuk / Keluar (Tekan E)">',
          '<i class="bi bi-door-open-fill"></i> <span id="avatarActBtnText">Masuk</span> <kbd>E</kbd>',
        '</button>',
      '</div>',
      '<div class="k3d-info-modal-backdrop" id="avatarInfoModal" hidden>',
        '<div class="k3d-info-modal-card" role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">',
          '<div class="k3d-info-modal-header">',
            '<span class="k3d-info-modal-badge" id="infoModalBadge">🏢 Gedung</span>',
            '<button class="k3d-info-modal-close" id="infoModalClose" type="button" title="Tutup informasi" aria-label="Tutup">&times;</button>',
          '</div>',
          '<div class="k3d-info-modal-body">',
            '<h3 class="k3d-info-modal-title" id="infoModalTitle">Nama Gedung</h3>',
            '<div class="k3d-info-modal-sub" id="infoModalSub" hidden></div>',
            '<div class="k3d-info-modal-desc" id="infoModalDesc">Deskripsi gedung...</div>',
            '<div class="k3d-info-modal-meta" id="infoModalMeta" hidden></div>',
          '</div>',
          '<div class="k3d-info-modal-footer">',
            '<button class="k3d-info-modal-act-btn" id="infoModalActBtn" type="button">',
              '<span id="infoModalActText">Masuk ke Gedung</span> <kbd>E</kbd>',
            '</button>',
            '<button class="k3d-info-modal-close-btn" id="infoModalCloseBtn" type="button">Tutup</button>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="k3d-avatar-prompt" id="avatarPrompt" hidden>',
        '<span class="k3d-prompt-key">E</span>',
        '<span class="k3d-prompt-text" id="avatarPromptText">Interaksi</span>',
      '</div>',
      '<div class="k3d-avatar-help" id="avatarHelp">',
        '<span><b>WASD</b>: Gerak &middot; <b>Seret Mouse</b>: Putar Kamera &middot; <b>Shift</b>: Lari &middot; <b>V</b>: Kamera 1P/3P &middot; <b>E</b>: Aksi &middot; <b>I</b>: Info Gedung</span>',
        '<button class="k3d-avatar-exit-btn" id="avatarExitBtn" type="button" title="Keluar ke mode lihat seluruh kampus">Lihat Seluruh Kampus (H)</button>',
      '</div>',
      '<div class="k3d-avatar-mobile" id="avatarMobile">',
        '<div class="k3d-joystick-zone" id="joystickZone">',
          '<div class="k3d-joystick-base" id="joystickBase">',
            '<div class="k3d-joystick-stick" id="joystickStick"></div>',
          '</div>',
        '</div>',
        '<div class="k3d-mobile-buttons">',
          '<button class="k3d-mobile-btn info" id="mBtnInfo" type="button" hidden>ℹ️ Info Gedung</button>',
          '<button class="k3d-mobile-btn act" id="mBtnAct" type="button" hidden>Masuk (E)</button>',
          '<button class="k3d-mobile-btn sprint" id="mBtnSprint" type="button">Lari</button>',
          '<button class="k3d-mobile-btn cam" id="mBtnCam" type="button">3P / 1P</button>',
          '<button class="k3d-mobile-btn exit" id="mBtnExit" type="button" title="Kembali ke tampilan seluruh kampus">Seluruh Kampus</button>',
        '</div>',
      '</div>'
    ].join('');
    (opts.container || document.body).appendChild(hudEl);

    var elEntryPopup = hudEl.querySelector('#avatarEntryPopup');
    var elEntryBadge = hudEl.querySelector('#avatarEntryBadge');
    var elEntryTitle = hudEl.querySelector('#avatarEntryTitle');
    var elEntryDesc = hudEl.querySelector('#avatarEntryDesc');
    var elEntryBtn = hudEl.querySelector('#avatarEntryBtn');
    var elEntryBtnText = hudEl.querySelector('#avatarEntryBtnText');

    var elHudActions = hudEl.querySelector('#avatarHudActions');
    var elInfoBtn = hudEl.querySelector('#avatarInfoBtn');
    var elActBtn = hudEl.querySelector('#avatarActBtn');
    var elActBtnText = hudEl.querySelector('#avatarActBtnText');

    var elMBtnInfo = hudEl.querySelector('#mBtnInfo');

    var elInfoModal = hudEl.querySelector('#avatarInfoModal');
    var elInfoModalBadge = hudEl.querySelector('#infoModalBadge');
    var elInfoModalTitle = hudEl.querySelector('#infoModalTitle');
    var elInfoModalSub = hudEl.querySelector('#infoModalSub');
    var elInfoModalDesc = hudEl.querySelector('#infoModalDesc');
    var elInfoModalMeta = hudEl.querySelector('#infoModalMeta');
    var elInfoModalActBtn = hudEl.querySelector('#infoModalActBtn');
    var elInfoModalActText = hudEl.querySelector('#infoModalActText');
    var elInfoModalClose = hudEl.querySelector('#infoModalClose');
    var elInfoModalCloseBtn = hudEl.querySelector('#infoModalCloseBtn');

    function bukaModalInfoGedung() {
      if (!interaksiAktif) { return; }
      var node = interaksiAktif.node;
      if (!node && stage.nodeMap && interaksiAktif.id) {
        node = stage.nodeMap.get(interaksiAktif.id);
      }

      var title = (node && node.judul) ? node.judul : (interaksiAktif.title || 'Informasi Gedung');
      var badge = interaksiAktif.badge || ((node && node.tipe === 'gedung') ? '🏢 Gedung' : '🚪 Ruangan');
      var desc = (node && node.deskripsi) ? node.deskripsi : (interaksiAktif.desc || 'Informasi gedung dan ruangan di lingkungan kampus UNISNU Jepara.');
      var sub = (node && node.unit_nama) ? node.unit_nama : '';

      if (elInfoModalBadge) { elInfoModalBadge.textContent = badge; }
      if (elInfoModalTitle) { elInfoModalTitle.textContent = title; }
      if (elInfoModalSub) {
        elInfoModalSub.textContent = sub;
        elInfoModalSub.hidden = !sub;
      }
      if (elInfoModalDesc) { elInfoModalDesc.textContent = desc; }

      if (elInfoModalMeta) {
        var metaHtml = '';
        if (node && node.tipe === 'gedung' && stage.nodes) {
          var rCount = 0;
          var fCount = 0;
          stage.nodes.forEach(function (n) {
            if (n.parent_id === node.id) {
              if (n.tipe === 'ruang') { rCount++; }
              if (n.tipe === 'lantai') { fCount++; }
            } else if (n.tipe === 'ruang' && stage.nodeMap) {
              var p = stage.nodeMap.get(n.parent_id);
              if (p && p.parent_id === node.id) { rCount++; }
            }
          });
          if (fCount > 0) { metaHtml += '<span><i class="bi bi-layers"></i> ' + fCount + ' Lantai</span>'; }
          if (rCount > 0) { metaHtml += '<span><i class="bi bi-door-open"></i> ' + rCount + ' Ruangan</span>'; }
        }
        if (node && node.panjang && node.lebar) {
          metaHtml += '<span><i class="bi bi-aspect-ratio"></i> ' + Math.round(node.panjang) + ' &times; ' + Math.round(node.lebar) + ' m</span>';
        }
        elInfoModalMeta.innerHTML = metaHtml;
        elInfoModalMeta.hidden = !metaHtml;
      }

      if (elInfoModalActText) {
        elInfoModalActText.textContent = (interaksiAktif.tipe === 'keluar_objek') ? 'Keluar ke Halaman' : (interaksiAktif.btnText || 'Masuk');
      }

      if (elInfoModal) {
        elInfoModal.hidden = false;
      }
    }

    function tutupModalInfoGedung() {
      if (elInfoModal) {
        elInfoModal.hidden = true;
      }
    }

    if (elInfoBtn) {
      elInfoBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        bukaModalInfoGedung();
      });
    }
    if (elActBtn) {
      elActBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        lakukanInteraksi();
      });
    }
    if (elMBtnInfo) {
      elMBtnInfo.addEventListener('click', function (e) {
        e.stopPropagation();
        bukaModalInfoGedung();
      });
    }
    if (elInfoModalClose) {
      elInfoModalClose.addEventListener('click', function (e) {
        e.stopPropagation();
        tutupModalInfoGedung();
      });
    }
    if (elInfoModalCloseBtn) {
      elInfoModalCloseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        tutupModalInfoGedung();
      });
    }
    if (elInfoModalActBtn) {
      elInfoModalActBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        tutupModalInfoGedung();
        lakukanInteraksi();
      });
    }
    if (elInfoModal) {
      elInfoModal.addEventListener('click', function (e) {
        if (e.target === elInfoModal) {
          tutupModalInfoGedung();
        }
      });
    }

    if (elEntryBtn) {
      elEntryBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        lakukanInteraksi();
      });
    }

    var elPrompt = hudEl.querySelector('#avatarPrompt');
    var elPromptText = hudEl.querySelector('#avatarPromptText');
    var elExitBtn = hudEl.querySelector('#avatarExitBtn');
    var elTopExit = hudEl.querySelector('#avatarTopExit');
    if (elTopExit) {
      elTopExit.addEventListener('click', function () { keluarJelajah(true); });
    }
    var elMBtnExit = hudEl.querySelector('#mBtnExit');
    var elMBtnCam = hudEl.querySelector('#mBtnCam');
    var elMBtnSprint = hudEl.querySelector('#mBtnSprint');
    var elMBtnAct = hudEl.querySelector('#mBtnAct');

    if (elExitBtn) {
      elExitBtn.addEventListener('click', function () { keluarJelajah(true); });
    }
    if (elMBtnExit) {
      elMBtnExit.addEventListener('click', function () { keluarJelajah(true); });
    }
    elMBtnCam.addEventListener('click', toggleCameraView);
    elMBtnAct.addEventListener('click', lakukanInteraksi);

    var mobileSprintActive = false;
    elMBtnSprint.addEventListener('click', function () {
      mobileSprintActive = !mobileSprintActive;
      elMBtnSprint.classList.toggle('active', mobileSprintActive);
    });

    /* ---------- Virtual Joystick & Touch Drag Look (HP / Layar Sentuh) ---------- */
    var touchJoyId = null;
    var joyCenter = { x: 0, y: 0 };
    var joyDelta = { x: 0, y: 0 };
    var joyMaxRadius = 46;
    var elJoyBase = hudEl.querySelector('#joystickBase');
    var elJoyStick = hudEl.querySelector('#joystickStick');
    var elJoyZone = hudEl.querySelector('#joystickZone');

    var touchLookId = null;
    var touchLookLast = { x: 0, y: 0 };

    elJoyZone.addEventListener('touchstart', function (e) {
      if (!active) { return; }
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (touchJoyId === null) {
          touchJoyId = t.identifier;
          var rect = elJoyZone.getBoundingClientRect();
          joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          updateJoystick(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', function (e) {
      if (!active) { return; }
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === touchJoyId) {
          updateJoystick(t.clientX, t.clientY);
        } else if (t.identifier === touchLookId) {
          var dx = t.clientX - touchLookLast.x;
          var dy = t.clientY - touchLookLast.y;
          touchLookLast.x = t.clientX;
          touchLookLast.y = t.clientY;
          var sens = 0.0035;
          avatarYaw -= dx * sens;
          avatarPitch -= dy * sens;
          avatarPitch = Math.max(-1.35, Math.min(1.30, avatarPitch));
        }
      }
    }, { passive: false });

    function resetJoystick() {
      touchJoyId = null;
      joyDelta = { x: 0, y: 0 };
      if (elJoyStick) {
        elJoyStick.style.transform = 'translate(-50%, -50%) translate(0px, 0px)';
      }
    }

    window.addEventListener('touchend', function (e) {
      if (!active) { return; }
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === touchJoyId) {
          resetJoystick();
        } else if (t.identifier === touchLookId) {
          touchLookId = null;
        }
      }
    });

    window.addEventListener('touchcancel', function (e) {
      resetJoystick();
      touchLookId = null;
    });

    // Touch look pada separuh kanan layar (touch di canvas/stage)
    canvas.addEventListener('touchstart', function (e) {
      if (!active) { return; }
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        // Jika sentuhan di separuh kanan layar dan belum ada touchLook aktif
        if (t.clientX > window.innerWidth * 0.4 && touchLookId === null) {
          touchLookId = t.identifier;
          touchLookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });

    function updateJoystick(clientX, clientY) {
      var dx = clientX - joyCenter.x;
      var dy = clientY - joyCenter.y;
      var dist = Math.hypot(dx, dy);
      if (dist > joyMaxRadius) {
        dx = (dx / dist) * joyMaxRadius;
        dy = (dy / dist) * joyMaxRadius;
      }
      joyDelta.x = dx / joyMaxRadius;
      joyDelta.y = dy / joyMaxRadius;
      if (elJoyStick) {
        elJoyStick.style.transform = 'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px)';
      }
    }

    /* ------------------------------------------------------------------
     * Collision Detection (Sliding Collision Bounding Box)
     * Menggunakan ukuran gedung & ruang yang sudah tersimpan di database
     * ------------------------------------------------------------------ */
    var avatarRadius = 0.30; // Radius silinder tabrakan tubuh avatar (meter)
    var colliders = [];

    var _probeRaycaster = new THREE.Raycaster();
    var _dirMotion = new THREE.Vector3();
    var _dirs8 = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.7071, 0, 0.7071),
      new THREE.Vector3(-0.7071, 0, 0.7071),
      new THREE.Vector3(0.7071, 0, -0.7071),
      new THREE.Vector3(-0.7071, 0, -0.7071)
    ];

    function getHitNormalY(hit) {
      if (hit.face && hit.face.normal) {
        if (hit.object && hit.object.matrixWorld) {
          _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
          return _worldNormal.y;
        }
        return hit.face.normal.y;
      }
      return 0;
    }

    function perbaruiDaftarCollider() {
      colliders = [];
      if (!stage.entries) { return; }

      stage.entries.forEach(function (entry, id) {
        var node = stage.nodeMap ? stage.nodeMap.get(id) : null;
        if (!node || !entry.body) { return; }

        // Bounding box dunia
        var box = new THREE.Box3().setFromObject(entry.body);
        if (box.isEmpty()) { return; }

        var hasModel = !!(node.library_id != null || node.model_url);
        var center = box.getCenter(new THREE.Vector3());

        // Kumpulkan mesh dinding & geometri solid objek 3D untuk deteksi tabrakan presisi
        var wallMeshes = [];
        entry.body.traverse(function (obj) {
          if (!obj.isMesh) { return; }
          if (obj.userData && (obj.userData.isWindow || obj.userData.noPick || obj.userData.isCeiling || obj.userData.isShadowBlob)) {
            return;
          }
          if (obj.material) {
            var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
            if (mat.transparent && mat.opacity < 0.35) { return; }
            if (mat.side !== THREE.DoubleSide) {
              mat.side = THREE.DoubleSide;
            }
          }
          wallMeshes.push(obj);
        });

        if (node.tipe === 'gedung' || node.tipe === 'ruang') {
          colliders.push({
            id: id,
            tipe: node.tipe,
            node: node,
            box: box,
            hasModel: hasModel,
            center: center,
            wallMeshes: wallMeshes,
            minX: box.min.x, maxX: box.max.x,
            minY: box.min.y, maxY: box.max.y,
            minZ: box.min.z, maxZ: box.max.z
          });
        } else if (node.tipe === 'barang') {
          var size = box.getSize(new THREE.Vector3());
          if (size.x > 0.4 && size.z > 0.4 && wallMeshes.length > 0) {
            colliders.push({
              id: id,
              tipe: 'barang',
              node: node,
              box: box,
              hasModel: hasModel,
              center: center,
              wallMeshes: wallMeshes,
              minX: box.min.x, maxX: box.max.x,
              minY: box.min.y, maxY: box.max.y,
              minZ: box.min.z, maxZ: box.max.z
            });
          }
        }
      });
    }

    var lastEntrancePos = null;

    var _raycasterDown = new THREE.Raycaster();
    var _dirDown = new THREE.Vector3(0, -1, 0);
    var _rayOrigin = new THREE.Vector3();
    var _worldNormal = new THREE.Vector3();

    /**
     * Memeriksa ketinggian permukaan 3D model (undakan anak tangga, teras, atau lantai gedung)
     * Menggunakan downward raycast terhadap mesh objek terkait sehingga karakter bisa naik
     * undakan dan berjalan di teras terbuka secara natural.
     */
    function dapatkanElevasiModel(x, z, currentY) {
      if (!colliders || colliders.length === 0) { return null; }
      var maxElev = null;

      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        // Cek jika x, z berada dalam area horizontal objek (dengan toleransi tangga/undakan 1.5m)
        if (x < c.minX - 1.5 || x > c.maxX + 1.5 || z < c.minZ - 1.5 || z > c.maxZ + 1.5) {
          continue;
        }

        var entry = stage.entries ? stage.entries.get(c.id) : null;
        if (!entry || !entry.body) { continue; }

        var curY = (currentY != null) ? currentY : (avatarPos ? avatarPos.y : 0);
        // Casting dari atas ketinggian langkah undakan (+1.1m)
        var startY = Math.max(curY, c.minY) + 1.1;
        // Batasi startY agar tidak melompat ke atap jika karakter masih di lantai dasar
        if (curY < c.minY + 2.0 && startY > c.minY + 2.8) {
          startY = c.minY + 2.8;
        }

        _rayOrigin.set(x, startY, z);
        _raycasterDown.set(_rayOrigin, _dirDown);
        _raycasterDown.far = Math.max(3.8, (startY - c.minY) + 1.8);

        var hits = _raycasterDown.intersectObject(entry.body, true);
        for (var h = 0; h < hits.length; h++) {
          var hit = hits[h];
          if (!hit.point) { continue; }

          // Cek kemiringan permukaan: hanya permukaan yang relatif datar / walkable (normal.y > 0.40)
          var normalY = 1.0;
          if (hit.face && hit.face.normal) {
            if (hit.object && hit.object.matrixWorld) {
              _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
              normalY = _worldNormal.y;
            } else {
              normalY = hit.face.normal.y;
            }
          }

          if (normalY > 0.40) {
            var hitY = hit.point.y;
            var stepDiff = hitY - curY;
            // Ketinggian undakan yang bisa dinaiki avatar: naik hingga 0.85m, atau turun hingga 3.0m
            if (stepDiff <= 0.85 && stepDiff >= -3.0) {
              if (maxElev === null || hitY > maxElev) {
                maxElev = hitY;
              }
            }
          }
        }
      }
      return maxElev;
    }

    /**
     * Menghitung ketinggian permukaan tanah / tanjakan jalan / undakan teras 3D di titik (x, z).
     * Jika berada di atas ruas jalan berkontur/tanjakan, mengembalikan ketinggian lereng Y.
     * Jika berada di atas undakan/teras model 3D, mengembalikan ketinggian anak tangga/lantai model.
     * Jika berada di luar jalan, mengembalikan 0 (atau currentFloorY jika dalam gedung).
     */
    function dapatkanElevasiTanah(x, z) {
      var curY = avatarPos ? avatarPos.y : (currentFloorY || 0);
      var modelElev = dapatkanElevasiModel(x, z, curY);

      if (currentLantaiId != null && currentFloorY > 0.5) {
        return (modelElev != null) ? Math.max(modelElev, currentFloorY) : currentFloorY;
      }

      var nodes = stage.nodes || [];
      var elevasiTertinggi = 0;
      var ditemukan = false;

      for (var nIdx = 0; nIdx < nodes.length; nIdx++) {
        var node = nodes[nIdx];
        if (!node || node.tipe !== 'area' || !node.geometri || !node.geometri.titik) { continue; }
        var pts = node.geometri.titik;
        if (pts.length < 2) { continue; }

        if (node.subtipe === 'jalan' || node.subtipe === 'sungai') {
          var halfW = ((node.geometri.lebar || 6) / 2) + 0.35;
          for (var i = 0; i < pts.length - 1; i++) {
            var p0 = pts[i];
            var p1 = pts[i + 1];
            var x0 = p0[0], z0 = p0[1], y0 = p0[2] || 0;
            var x1 = p1[0], z1 = p1[1], y1 = p1[2] || 0;

            var dx = x1 - x0;
            var dz = z1 - z0;
            var lenSq = dx * dx + dz * dz;
            if (lenSq < 1e-6) {
              var d0 = Math.hypot(x - x0, z - z0);
              if (d0 <= halfW) {
                if (!ditemukan || y0 > elevasiTertinggi) { elevasiTertinggi = y0; ditemukan = true; }
              }
              continue;
            }

            var t = ((x - x0) * dx + (z - z0) * dz) / lenSq;
            var clampT = Math.max(0, Math.min(1, t));
            var cx = x0 + clampT * dx;
            var cz = z0 + clampT * dz;
            var dist = Math.hypot(x - cx, z - cz);

            if (dist <= halfW) {
              var yRamp = y0 + clampT * (y1 - y0);
              if (!ditemukan || yRamp > elevasiTertinggi) {
                elevasiTertinggi = yRamp;
                ditemukan = true;
              }
            }
          }
          for (var j = 0; j < pts.length; j++) {
            var pj = pts[j];
            var distJ = Math.hypot(x - pj[0], z - pj[1]);
            if (distJ <= halfW) {
              var yj = pj[2] || 0;
              if (!ditemukan || yj > elevasiTertinggi) {
                elevasiTertinggi = yj;
                ditemukan = true;
              }
            }
          }
        } else if (node.subtipe === 'taman' || node.subtipe === 'lapangan' || node.subtipe === 'parkir') {
          var maxY = 0;
          for (var k = 0; k < pts.length; k++) {
            if ((pts[k][2] || 0) > maxY) { maxY = pts[k][2] || 0; }
          }
          if (maxY > 0) {
            var diDalam = false;
            for (var a = 0, b = pts.length - 1; a < pts.length; b = a++) {
              var xi = pts[a][0], zi = pts[a][1];
              var xj = pts[b][0], zj = pts[b][1];
              var intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-9) + xi);
              if (intersect) { diDalam = !diDalam; }
            }
            if (diDalam) {
              if (!ditemukan || maxY > elevasiTertinggi) {
                elevasiTertinggi = maxY;
                ditemukan = true;
              }
            }
          }
        }
      }

      var baseElev = ditemukan ? elevasiTertinggi : (currentFloorY || 0);
      if (modelElev != null) {
        return Math.max(baseElev, modelElev);
      }
      return baseElev;
    }

    /**
     * Memeriksa apakah posisi baru (x, z, y) menabrak model 3D dinding / batasan gedung / ruang.
     * Menggunakan mesh-accurate raycasting (mengikuti bentuk asli model 3D) dan batasan envelope.
     * Mengizinkan avatar menaiki undakan teras secara mulus tanpa terhalang riser undakan.
     */
    function cekTabrakan(x, z, y) {
      var tebalDinding = 0.35;
      var MAX_STEP_RISE = 0.85;

      // Jika baru saja teleport masuk melalui pintu, beri toleransi kecil tepat di titik pintu
      if (lastEntrancePos && Math.hypot(x - lastEntrancePos.x, z - lastEntrancePos.z) < 1.8) {
        return false;
      }

      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];

        // 1. Pemeriksaan awal AABB sederhana (hanya objek yang berada dalam radius jangkauan avatar)
        if (x < c.minX - 1.5 || x > c.maxX + 1.5 || z < c.minZ - 1.5 || z > c.maxZ + 1.5) {
          continue;
        }
        if (y < c.minY - 1.0 || y > c.maxY + 1.0) {
          continue;
        }

        var isNearDoor = apakahDekatPintu(x, z, c.id) || apakahDekatPintu(avatarPos.x, avatarPos.z, c.id);

        // Periksa apakah posisi target (x, z) berada di atas undakan / teras yang bisa dinaiki
        var stepElev = dapatkanElevasiModel(x, z, avatarPos.y);
        var stepRise = (stepElev != null) ? (stepElev - avatarPos.y) : 0;
        var isWalkableUndakan = (stepElev != null && stepRise <= MAX_STEP_RISE && stepRise >= -3.0);
        var targetStepY = (isWalkableUndakan) ? stepElev : y;

        // 2. Deteksi Tabrakan Presisi Mengikuti Poligon Model 3D (Mesh-Accurate Collision)
        if (c.wallMeshes && c.wallMeshes.length > 0) {
          // A. Vektor gerakan dari posisi avatar saat ini ke posisi target (x, z)
          var dx = x - avatarPos.x;
          var dz = z - avatarPos.z;
          var moveDist = Math.hypot(dx, dz);

          if (moveDist > 0.001) {
            _dirMotion.set(dx / moveDist, 0, dz / moveDist);
            var maxTestDist = moveDist + avatarRadius;

            // Ketinggian uji raycast:
            // Sinar uji harus berada di atas undakan yang sedang dinaiki agar riser anak tangga/teras
            // tidak disalahartikan sebagai dinding penghalang
            var baseH = Math.max(avatarPos.y, targetStepY);

            // Uji di 2 ketinggian tubuh: 60cm di atas pijakan (pinggang) dan 125cm di atas pijakan (dada)
            for (var hIdx = 0; hIdx < 2; hIdx++) {
              var testH = (hIdx === 0) ? (baseH + 1.25) : (baseH + 0.60);
              _rayOrigin.set(avatarPos.x, testH, avatarPos.z);
              _probeRaycaster.set(_rayOrigin, _dirMotion);
              _probeRaycaster.near = 0.04;
              _probeRaycaster.far = maxTestDist;

              var hits = _probeRaycaster.intersectObjects(c.wallMeshes, false);
              for (var h = 0; h < hits.length; h++) {
                var hit = hits[h];
                var nY = getHitNormalY(hit);
                // Hanya permukaan vertikal (dinding) yang diuji
                if (Math.abs(nY) < 0.60) {
                  // Jika hit berada di bawah atau setinggi undakan teras/anak tangga yang bisa dinaiki:
                  if (hit.point) {
                    if (isWalkableUndakan && hit.point.y <= stepElev + 0.15) {
                      continue; // Ini adalah riser anak tangga/undakan teras, lewati!
                    }
                    // Cek apakah permukaan di balik/di atas titik tabrakan ini adalah undakan walkable
                    if (hit.point.y <= avatarPos.y + MAX_STEP_RISE) {
                      var forwardStepElev = dapatkanElevasiModel(hit.point.x + _dirMotion.x * 0.2, hit.point.z + _dirMotion.z * 0.2, avatarPos.y);
                      if (forwardStepElev != null && (forwardStepElev - avatarPos.y) <= MAX_STEP_RISE) {
                        continue; // Undakan teras terdeteksi! Lewati riser.
                      }
                    }
                  }
                  return true; // Menabrak dinding vertikal model 3D!
                }
              }
            }
          }

          // B. Uji Proksimitas Radial 8-Arah di Posisi Target
          var probeH = Math.max(avatarPos.y, targetStepY) + 0.85;
          _rayOrigin.set(x, probeH, z);
          for (var d = 0; d < 8; d++) {
            _probeRaycaster.set(_rayOrigin, _dirs8[d]);
            _probeRaycaster.near = 0.02;
            _probeRaycaster.far = avatarRadius;

            var rHits = _probeRaycaster.intersectObjects(c.wallMeshes, false);
            for (var rh = 0; rh < rHits.length; rh++) {
              var rHit = rHits[rh];
              var rnY = getHitNormalY(rHit);
              if (Math.abs(rnY) < 0.60) {
                if (rHit.point) {
                  if (isWalkableUndakan && rHit.point.y <= stepElev + 0.15) {
                    continue;
                  }
                  if (rHit.point.y <= avatarPos.y + MAX_STEP_RISE) {
                    var rStepElev = dapatkanElevasiModel(rHit.point.x + _dirs8[d].x * 0.2, rHit.point.z + _dirs8[d].z * 0.2, avatarPos.y);
                    if (rStepElev != null && (rStepElev - avatarPos.y) <= MAX_STEP_RISE) {
                      continue;
                    }
                  }
                }
                return true; // Posisi target terlalu dekat / menembus dinding 3D!
              }
            }
          }
        }

        // 3. Batasan Envelope Kulit Luar Gedung / Ruang
        // Jika avatar melangkah di atas undakan teras luar (isWalkableUndakan), izinkan pergerakan di teras
        if ((c.tipe === 'gedung' || c.tipe === 'ruang') && !isWalkableUndakan) {
          var insideOuter = (x >= c.minX - avatarRadius && x <= c.maxX + avatarRadius &&
                             z >= c.minZ - avatarRadius && z <= c.maxZ + avatarRadius);

          if (insideOuter && !isNearDoor) {
            var nearBorderX = (Math.abs(x - c.minX) <= tebalDinding + avatarRadius) || (Math.abs(x - c.maxX) <= tebalDinding + avatarRadius);
            var nearBorderZ = (Math.abs(z - c.minZ) <= tebalDinding + avatarRadius) || (Math.abs(z - c.maxZ) <= tebalDinding + avatarRadius);

            if (nearBorderX || nearBorderZ) {
              // Jika sebelumnya di luar gedung/ruang dan mencoba menembus dinding luar
              var wasOutside = (avatarPos.x < c.minX - 0.05 || avatarPos.x > c.maxX + 0.05 ||
                                avatarPos.z < c.minZ - 0.05 || avatarPos.z > c.maxZ + 0.05);
              if (wasOutside) {
                return true; // Dinding luar menghalangi masuk tanpa pintu
              }

              // Jika sebelumnya di dalam gedung/ruang dan mencoba melangkah tembus keluar dinding
              var isCrossingOut = (x < c.minX + 0.1 || x > c.maxX - 0.1 || z < c.minZ + 0.1 || z > c.maxZ - 0.1);
              if (isCrossingOut) {
                return true; // Dinding luar menghalangi keluar tanpa pintu
              }
            }
          }
        }
      }

      return false;
    }

    /** Memeriksa apakah posisi avatar dekat dengan pintu atau akses objek (gedung/ruang) */
    function apakahDekatPintu(x, z, objekId) {
      // 1. Cek titik pintu terdaftar di graf rute (radius 2.5 meter)
      if (opts.graf && opts.graf.titik) {
        var dekatGraf = false;
        opts.graf.titik.forEach(function (pt) {
          var j = pt.jenis || (pt.t && pt.t.jenis);
          var rId = pt.ruangId || (pt.t && pt.t.ruang_id);
          var oId = pt.objekId || (pt.t && pt.t.objek_id);
          var p = pt.pos || pt.worldPos;
          if (p && j === 'pintu' && (oId === objekId || rId === objekId)) {
            var dist = Math.hypot(x - p.x, z - p.z);
            if (dist < 2.5) { dekatGraf = true; }
          }
        });
        if (dekatGraf) { return true; }
      }

      // 2. Cek titik pintu/akses yang dihitung dari geometri objek
      var cNode = stage.nodeMap ? stage.nodeMap.get(objekId) : null;
      if (cNode) {
        var box = stage.worldBox ? stage.worldBox(objekId) : null;
        if (box && !box.isEmpty()) {
          var c = box.getCenter(new THREE.Vector3());
          // Pintu depan standar di sumbu Z terdepan tengah
          if (Math.hypot(x - c.x, z - (box.max.z - 0.5)) < 2.5) {
            return true;
          }
        }
      }

      return false;
    }

    /** Mencari titik pintu rute yang tertaut ke objek tertentu */
    function cariPintuObjek(objekId) {
      if (!opts.graf || !opts.graf.titik) { return null; }
      var pintuPt = null;
      var minDist = 999;
      opts.graf.titik.forEach(function (pt) {
        var j = pt.jenis || (pt.t && pt.t.jenis);
        var rId = pt.ruangId || (pt.t && pt.t.ruang_id);
        var oId = pt.objekId || (pt.t && pt.t.objek_id);
        if (j === 'pintu' && (rId === objekId || oId === objekId)) {
          var pCoord = pt.pos || pt.worldPos;
          if (pCoord) {
            var d = avatarPos.distanceTo(pCoord);
            if (d < minDist) {
              minDist = d;
              pintuPt = pt;
            }
          }
        }
      });
      return pintuPt;
    }

    /** Menghitung posisi pintu masuk terbaik untuk gedung atau ruang (posisi di DALAM gedung/lobi) */
    function dapatkanPosisiPintuMasuk(targetId, targetNode) {
      var box = stage.worldBox ? stage.worldBox(targetId) : new THREE.Box3();
      var hasBox = box && !box.isEmpty();
      var c = hasBox ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();

      var pintuPt = cariPintuObjek(targetId);
      if (pintuPt) {
        var pCoord = (pintuPt.pos || pintuPt.worldPos).clone();
        var dirIn = new THREE.Vector3(c.x - pCoord.x, 0, c.z - pCoord.z);
        if (dirIn.lengthSq() < 0.01) { dirIn.set(0, 0, -1); }
        dirIn.normalize();

        // Posisikan aktor 3.2m ke arah dalam gedung agar berada di dalam ruangan / lobi gedung,
        // bukan tertinggal di undakan atau teras luar gedung
        var insidePos = pCoord.clone().addScaledVector(dirIn, 3.2);

        var floorY = pCoord.y;
        var insideFloor = dapatkanElevasiTanah(insidePos.x, insidePos.z);
        if (insideFloor != null && insideFloor > 0) {
          floorY = insideFloor;
        } else if (hasBox) {
          floorY = Math.max(box.min.y, pCoord.y);
        }
        insidePos.y = floorY;

        var yaw = Math.atan2(dirIn.x, dirIn.z);

        return {
          pos: insidePos,
          floorY: floorY,
          yaw: yaw,
          pintu: pintuPt
        };
      }

      // Jika belum ada titik pintu di graf rute, hitung posisi masuk ke dalam gedung dari bounding box
      if (hasBox) {
        var floorY = box.min.y;

        // Cari sisi terdekat dari posisi avatar ke bounding box
        var dFront = Math.abs(avatarPos.z - box.max.z);
        var dBack = Math.abs(avatarPos.z - box.min.z);
        var dLeft = Math.abs(avatarPos.x - box.min.x);
        var dRight = Math.abs(avatarPos.x - box.max.x);
        var minD = Math.min(dFront, dBack, dLeft, dRight);

        var spawnX = c.x;
        var spawnZ = box.max.z - 3.2;

        if (minD === dBack) {
          spawnX = c.x;
          spawnZ = box.min.z + 3.2;
        } else if (minD === dLeft) {
          spawnX = box.min.x + 3.2;
          spawnZ = c.z;
        } else if (minD === dRight) {
          spawnX = box.max.x - 3.2;
          spawnZ = c.z;
        } else {
          spawnX = c.x;
          spawnZ = Math.min(box.max.z - 3.2, c.z + (box.max.z - c.z) * 0.35);
        }

        spawnX = Math.max(box.min.x + 1.0, Math.min(box.max.x - 1.0, spawnX));
        spawnZ = Math.max(box.min.z + 1.0, Math.min(box.max.z - 1.0, spawnZ));

        var insidePos = new THREE.Vector3(spawnX, floorY, spawnZ);
        var insideFloor = dapatkanElevasiTanah(spawnX, spawnZ);
        if (insideFloor != null && insideFloor > 0) {
          insidePos.y = insideFloor;
          floorY = insideFloor;
        }

        var yaw = Math.atan2(c.x - spawnX, c.z - spawnZ);
        return {
          pos: insidePos,
          floorY: floorY,
          yaw: yaw,
          pintu: null
        };
      }

      return null;
    }

    /** Memposisikan aktor ke pintu masuk gedung atau ruang */
    function masukKeObjek(targetId, targetNode) {
      var masukInfo = dapatkanPosisiPintuMasuk(targetId, targetNode);
      if (!masukInfo) { return; }

      // Posisikan aktor di pintu masuk
      avatarPos.copy(masukInfo.pos);
      currentFloorY = masukInfo.floorY;
      avatarPos.y = currentFloorY;
      avatarYaw = masukInfo.yaw;
      avatarPitch = -0.05;

      lastEntrancePos = avatarPos.clone();

      avatarContainer.position.copy(avatarPos);
      avatarContainer.rotation.y = avatarYaw;

      var labelTipe = (targetNode && targetNode.tipe === 'ruang') ? 'Ruang' : 'Gedung';
      var nama = (targetNode && targetNode.judul) ? targetNode.judul : labelTipe;
      if (typeof opts.onToast === 'function') {
        opts.onToast('Masuk ke ' + labelTipe.toLowerCase() + ' ' + nama + '. Anda berada di pintu masuk.');
      }

      if (typeof opts.onEnterObject === 'function') {
        opts.onEnterObject(targetId, targetNode, masukInfo);
      } else if (typeof opts.onInteract === 'function') {
        opts.onInteract(targetId, targetNode);
      }

      // Sembunyikan popup sementara agar tidak langsung memicu lagi di frame yang sama
      if (elEntryPopup) { elEntryPopup.hidden = true; }
      interaksiAktif = null;
    }

    /** Memposisikan aktor ke luar gedung/ruang ke halaman kampus */
    function keluarDariObjek(targetId, targetNode) {
      var box = stage.worldBox ? stage.worldBox(targetId) : new THREE.Box3();
      var c = (box && !box.isEmpty()) ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();

      var pintuPt = cariPintuObjek(targetId);
      var exitPos = null;
      var exitYaw = avatarYaw;

      if (pintuPt && (pintuPt.pos || pintuPt.worldPos)) {
        var pCoord = (pintuPt.pos || pintuPt.worldPos).clone();
        // Arahkan keluar menjauhi pusat gedung
        var dirOut = new THREE.Vector3(pCoord.x - c.x, 0, pCoord.z - c.z);
        if (dirOut.lengthSq() < 0.01) { dirOut.set(0, 0, 1); }
        dirOut.normalize();
        // Tempatkan di halaman luar di depan tangga / undakan
        exitPos = pCoord.clone().addScaledVector(dirOut, 3.8);
        exitYaw = Math.atan2(dirOut.x, dirOut.z);
      } else if (box && !box.isEmpty()) {
        // Tempatkan di depan tangga/halaman luar gedung
        var spawnZ = box.max.z + 2.5;
        exitPos = new THREE.Vector3(c.x, box.min.y, spawnZ);
        exitYaw = 0;
      }

      if (!exitPos) {
        exitPos = avatarPos.clone().add(new THREE.Vector3(0, 0, 3.0));
      }

      // Pastikan ketinggian tanah di luar
      currentFloorY = 0;
      currentLantaiId = null;
      var floorY = dapatkanElevasiTanah(exitPos.x, exitPos.z);
      exitPos.y = floorY;
      currentFloorY = floorY;

      avatarPos.copy(exitPos);
      avatarYaw = exitYaw;
      avatarPitch = -0.05;

      lastEntrancePos = avatarPos.clone();

      avatarContainer.position.copy(avatarPos);
      avatarContainer.rotation.y = avatarYaw;

      var labelTipe = (targetNode && targetNode.tipe === 'ruang') ? 'Ruang' : 'Gedung';
      var nama = (targetNode && targetNode.judul) ? targetNode.judul : labelTipe;

      if (typeof opts.onToast === 'function') {
        opts.onToast('Keluar dari ' + labelTipe.toLowerCase() + ' ' + nama + '. Anda berada di halaman luar.');
      }

      if (typeof opts.onExitObject === 'function') {
        opts.onExitObject(targetId, targetNode, exitPos);
      }

      if (elEntryPopup) { elEntryPopup.hidden = true; }
      interaksiAktif = null;
    }

    /* ------------------------------------------------------------------
     * Deteksi Interaksi & Pop-up Masuk / Keluar (Pintu, Gedung, Ruang, Tangga, Lift)
     * ------------------------------------------------------------------ */
    var interaksiAktif = null;

    function periksaInteraksiSekitar() {
      interaksiAktif = null;

      // 1. Cek tangga atau lift (Tahap 4b) untuk perpindahan lantai
      if (opts.graf && opts.graf.titik) {
        opts.graf.titik.forEach(function (pt) {
          if (pt.jenis === 'tangga' || pt.jenis === 'lift') {
            var pCoord = pt.pos || pt.worldPos;
            if (!pCoord) { return; }
            var dist = Math.hypot(avatarPos.x - pCoord.x, avatarPos.z - pCoord.z);
            if (dist < 1.6 && Math.abs(avatarPos.y - pCoord.y) < 1.8) {
              interaksiAktif = {
                tipe: pt.jenis,
                label: (pt.jenis === 'lift' ? 'Gunakan Lift' : 'Gunakan Tangga') + (pt.label ? ' (' + pt.label + ')' : ''),
                titik: pt
              };
            }
          }
        });
      }

      // 2. Cek apakah berada di dalam atau dekat Gedung atau Ruang
      if (!interaksiAktif && stage.entries) {
        var calonTerbaik = null;
        var calonKeluar = null;
        var jarakTerkecil = 999;
        var jarakKeluarTerkecil = 999;

        stage.entries.forEach(function (entry, id) {
          var node = stage.nodeMap ? stage.nodeMap.get(id) : null;
          if (!node || !node.judul) { return; }
          if (node.tipe !== 'ruang' && node.tipe !== 'gedung') { return; }

          var box = stage.worldBox ? stage.worldBox(id) : new THREE.Box3().setFromObject(entry.body);
          if (!box || box.isEmpty()) { return; }

          // Jarak horizontal dan vertikal ke bounding box
          var distToBox = box.distanceToPoint(avatarPos);
          var dy = Math.abs(avatarPos.y - box.min.y);

          // Cek titik pintu khusus objek ini di graf
          var pintuPt = cariPintuObjek(id);
          var distToPintu = 999;
          if (pintuPt) {
            var pCoord = pintuPt.pos || pintuPt.worldPos;
            if (pCoord) {
              distToPintu = avatarPos.distanceTo(pCoord);
            }
          }

          // Periksa apakah avatar sudah berada di dalam bangunan / interior ruangan
          // Catatan: Teras depan gedung adalah AREA LUAR. Aktor baru dianggap di dalam gedung jika
          // sudah melangkah masuk melewati pintu masuk ke area interior
          var insideObj = false;

          if (node.tipe === 'ruang') {
            insideObj = (avatarPos.x >= box.min.x + 0.5 && avatarPos.x <= box.max.x - 0.5 &&
                         avatarPos.z >= box.min.z + 0.5 && avatarPos.z <= box.max.z - 0.5 &&
                         avatarPos.y >= box.min.y - 0.5 && avatarPos.y <= box.max.y + 0.5);
          } else if (node.tipe === 'gedung') {
            if (pintuPt && (pintuPt.pos || pintuPt.worldPos)) {
              var pCoordPt = pintuPt.pos || pintuPt.worldPos;
              var cBox = box.getCenter(new THREE.Vector3());
              var dirIn = new THREE.Vector3(cBox.x - pCoordPt.x, 0, cBox.z - pCoordPt.z);
              if (dirIn.lengthSq() < 0.01) { dirIn.set(0, 0, -1); }
              dirIn.normalize();
              var toAvatar = new THREE.Vector3(avatarPos.x - pCoordPt.x, 0, avatarPos.z - pCoordPt.z);
              var dotIn = toAvatar.dot(dirIn);
              // Jika avatar masih berada di depan pintu / di teras luar (dotIn < 0.8), masih dianggap AREA LUAR
              var isInInterior = (dotIn >= 0.8) &&
                                 (avatarPos.x >= box.min.x + 0.6 && avatarPos.x <= box.max.x - 0.6) &&
                                 (avatarPos.z >= box.min.z + 0.6 && avatarPos.z <= box.max.z - 0.6);
              insideObj = isInInterior;
            } else {
              // Jika tidak ada titik pintu rute, teras depan adalah area box.max.z - 2.8 hingga box.max.z
              insideObj = (avatarPos.x >= box.min.x + 0.8 && avatarPos.x <= box.max.x - 0.8 &&
                           avatarPos.z >= box.min.z + 0.8 && avatarPos.z <= box.max.z - 2.8 &&
                           avatarPos.y >= box.min.y - 0.5 && avatarPos.y <= box.max.y + 0.5);
            }
          }

          if (insideObj) {
            // Avatar berada di dalam objek: siapkan aksi KELUAR
            var dKeluar = Math.min(distToBox, distToPintu);
            if (dKeluar < jarakKeluarTerkecil) {
              jarakKeluarTerkecil = dKeluar;
              calonKeluar = {
                tipe: node.tipe,
                id: id,
                node: node,
                pintu: pintuPt,
                box: box
              };
            }
          } else {
            // Avatar di luar objek: siapkan aksi MASUK (opsional bila tidak ingin berjalan manual)
            var threshold = (node.tipe === 'ruang') ? 3.5 : 5.5;
            var isNearDoor = distToPintu < 4.5;
            var isNearBox = distToBox < threshold && (node.tipe === 'gedung' ? dy < (box.max.y - box.min.y + 1.5) : dy < 2.5);

            if (isNearDoor || isNearBox) {
              var effectiveDist = Math.min(distToBox, distToPintu);
              // Beri prioritas pada ruang dibandingkan gedung bila berada di dekat pintu ruangan
              var bobot = (node.tipe === 'ruang') ? effectiveDist * 0.75 : effectiveDist;
              if (bobot < jarakTerkecil) {
                jarakTerkecil = bobot;
                calonTerbaik = {
                  tipe: node.tipe,
                  id: id,
                  node: node,
                  pintu: pintuPt,
                  box: box
                };
              }
            }
          }
        });

        if (calonKeluar) {
          var isRuangKeluar = calonKeluar.tipe === 'ruang';
          var labelKeluar = isRuangKeluar ? 'Ruang' : 'Gedung';
          interaksiAktif = {
            tipe: 'keluar_objek',
            id: calonKeluar.id,
            node: calonKeluar.node,
            label: 'Keluar dari ' + labelKeluar + ' ' + calonKeluar.node.judul,
            badge: '🚪 Pintu Keluar',
            title: calonKeluar.node.judul,
            desc: 'Bisa berjalan langsung keluar pintu, atau klik tombol / tekan [E] untuk keluar ke halaman.',
            btnText: 'Keluar ke Halaman'
          };
        } else if (calonTerbaik) {
          var isRuang = calonTerbaik.tipe === 'ruang';
          var labelTipe = isRuang ? 'Ruangan' : 'Gedung';
          var iconBadge = isRuang ? '🚪 Pintu Ruangan' : '🏢 Pintu Gedung';
          interaksiAktif = {
            tipe: 'masuk_objek',
            id: calonTerbaik.id,
            node: calonTerbaik.node,
            label: 'Masuk ke ' + labelTipe + ' ' + calonTerbaik.node.judul,
            badge: iconBadge,
            title: calonTerbaik.node.judul,
            desc: 'Bisa berjalan langsung menaiki undakan & pintu, atau klik tombol / tekan [E] untuk masuk.',
            btnText: 'Masuk ke ' + (isRuang ? 'Ruang' : 'Gedung')
          };
        }
      }

      // 3. Cek barang di dekat avatar
      if (!interaksiAktif && stage.entries) {
        var minBarangDist = 2.2;
        stage.entries.forEach(function (entry, id) {
          var node = stage.nodeMap ? stage.nodeMap.get(id) : null;
          if (!node || !node.judul || node.tipe !== 'barang') { return; }

          var worldPos = new THREE.Vector3();
          entry.body.getWorldPosition(worldPos);
          var dist = avatarPos.distanceTo(worldPos);
          if (dist < minBarangDist) {
            minBarangDist = dist;
            interaksiAktif = {
              tipe: 'barang',
              id: id,
              label: 'Lihat Info ' + node.judul,
              badge: '📦 Barang',
              title: node.judul,
              desc: 'Tekan [E] atau klik untuk melihat detail barang.',
              btnText: 'Lihat Info',
              node: node
            };
          }
        });
      }

      // Tampilkan atau sembunyikan popup ke HUD
      perbaruiPopupInteraksi();
    }

    function perbaruiPopupInteraksi() {
      if (!interaksiAktif) {
        if (elEntryPopup) { elEntryPopup.hidden = true; }
        if (elPrompt) { elPrompt.hidden = true; }
        if (elHudActions) { elHudActions.hidden = true; }
        if (elMBtnAct) { elMBtnAct.hidden = true; }
        if (elMBtnInfo) { elMBtnInfo.hidden = true; }
        tutupModalInfoGedung();
        return;
      }

      if (interaksiAktif.tipe === 'masuk_objek' || interaksiAktif.tipe === 'keluar_objek') {
        // Pop-up informasi TIDAK muncul otomatis agar tidak menutupi layar pandangan.
        // Hanya muncul jika tombol Info Gedung diklik atau menekan tombol [I].
        if (elEntryPopup) { elEntryPopup.hidden = true; }
        if (elPrompt) { elPrompt.hidden = true; }
        if (elHudActions) {
          elHudActions.hidden = false;
          if (elActBtnText) {
            elActBtnText.textContent = (interaksiAktif.tipe === 'keluar_objek') ? 'Keluar' : 'Masuk';
          }
        }
        if (elMBtnAct) {
          elMBtnAct.hidden = false;
          elMBtnAct.textContent = (interaksiAktif.tipe === 'keluar_objek') ? 'Keluar (E)' : 'Masuk (E)';
        }
        if (elMBtnInfo) {
          elMBtnInfo.hidden = false;
        }
      } else {
        if (elEntryPopup) { elEntryPopup.hidden = true; }
        if (elHudActions) { elHudActions.hidden = true; }
        if (elPrompt) {
          elPromptText.textContent = interaksiAktif.label;
          elPrompt.hidden = false;
        }
        if (elMBtnAct) {
          elMBtnAct.hidden = false;
          elMBtnAct.textContent = interaksiAktif.tipe === 'lift' ? 'Lift' : (interaksiAktif.tipe === 'tangga' ? 'Tangga' : 'Lihat (E)');
        }
        if (elMBtnInfo) {
          elMBtnInfo.hidden = (interaksiAktif.tipe !== 'barang');
        }
      }
    }

    function lakukanInteraksi() {
      if (!interaksiAktif) { return; }

      if (interaksiAktif.tipe === 'masuk_objek') {
        masukKeObjek(interaksiAktif.id, interaksiAktif.node);
      } else if (interaksiAktif.tipe === 'keluar_objek') {
        keluarDariObjek(interaksiAktif.id, interaksiAktif.node);
      } else if (interaksiAktif.tipe === 'tangga' || interaksiAktif.tipe === 'lift') {
        var pt = interaksiAktif.titik;
        var tetangga = opts.graf ? opts.graf.tetangga(pt.id) : [];
        var targetPt = null;
        for (var i = 0; i < tetangga.length; i++) {
          var t = tetangga[i].titik;
          if ((t.jenis === 'tangga' || t.jenis === 'lift') && t.id !== pt.id) {
            targetPt = t;
            break;
          }
        }
        if (targetPt) {
          teleportKeTitik(targetPt);
          if (typeof opts.onTransitLantai === 'function') {
            opts.onTransitLantai(targetPt);
          }
        }
      } else if (interaksiAktif.tipe === 'barang') {
        if (typeof opts.onInteract === 'function') {
          opts.onInteract(interaksiAktif.id, interaksiAktif.node);
        }
      }
    }

    function teleportKeTitik(titik) {
      if (!titik || !titik.worldPos) { return; }
      avatarPos.copy(titik.worldPos);
      currentFloorY = titik.worldPos.y;
      avatarPos.y = currentFloorY;
      avatarContainer.position.copy(avatarPos);
    }

    /* ------------------------------------------------------------------
     * Pengaturan Kamera (First Person & Third Person)
     * ------------------------------------------------------------------ */
    function toggleCameraView() {
      firstPerson = !firstPerson;
      if (avatarModel && avatarModel.root) {
        // Sembunyikan avatar saat 1P agar tidak menghalangi pandangan kamera
        avatarModel.root.visible = !firstPerson;
      }
      var toast = firstPerson ? 'Kamera Orang Pertama (1P)' : 'Kamera Orang Ketiga (3P)';
      if (typeof opts.onToast === 'function') { opts.onToast(toast); }
    }

    var camRaycaster = new THREE.Raycaster();
    var camObstacles = [];
    var lastCamObstacleCheck = 0;

    function getCamObstacles() {
      var now = performance.now();
      if (now - lastCamObstacleCheck < 1000 && camObstacles.length > 0) {
        return camObstacles;
      }
      lastCamObstacleCheck = now;
      camObstacles = [];

      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        if (c.wallMeshes && c.wallMeshes.length > 0) {
          for (var j = 0; j < c.wallMeshes.length; j++) {
            camObstacles.push(c.wallMeshes[j]);
          }
        }
      }
      return camObstacles;
    }

    function updateKamera(delta) {
      var camH = setting.avatar_cam_height || 1.6;

      if (firstPerson) {
        // First Person: Kamera tepat di posisi mata avatar di dalam ruangan
        camera.position.set(avatarPos.x, avatarPos.y + camH, avatarPos.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = avatarYaw;
        camera.rotation.x = avatarPitch;
        camera.rotation.z = 0;
        if (avatarModel && avatarModel.root) {
          avatarModel.root.visible = false;
        }
      } else {
        // Third Person: Kamera di belakang avatar
        var targetDist = 3.3; // Jarak kamera di belakang tubuh
        var targetHeight = camH + 0.35; // Ketinggian kamera dari lantai

        // Titik fokus (bahu/kepala avatar)
        var lookTarget = new THREE.Vector3(avatarPos.x, avatarPos.y + camH * 0.9, avatarPos.z);

        // Vektor arah mundur kamera
        var cosPitch = Math.cos(avatarPitch);
        var sinPitch = Math.sin(avatarPitch);
        var sinYaw = Math.sin(avatarYaw);
        var cosYaw = Math.cos(avatarYaw);

        var dir = new THREE.Vector3(
          sinYaw * cosPitch,
          -sinPitch + 0.08,
          cosYaw * cosPitch
        ).normalize();

        var desiredDist = targetDist;

        // Spring-Arm Obstacle Raycasting:
        // Jika aktor berada di dalam gedung dan ada dinding solid di belakang kamera,
        // tahan posisi kamera agar tetap berada di DALAM ruangan (tidak tembus dinding ke luar gedung).
        var obstacles = getCamObstacles();
        if (obstacles.length > 0) {
          camRaycaster.set(lookTarget, dir);
          camRaycaster.near = 0.2;
          camRaycaster.far = targetDist + 0.2;
          var hits = camRaycaster.intersectObjects(obstacles, false);
          if (hits && hits.length > 0) {
            for (var hIdx = 0; hIdx < hits.length; hIdx++) {
              var hit = hits[hIdx];
              if (hit.distance > 0.25) {
                desiredDist = Math.max(0.35, Math.min(desiredDist, hit.distance - 0.25));
                break;
              }
            }
          }
        }

        var offset = dir.clone().multiplyScalar(desiredDist);
        var desiredCamPos = lookTarget.clone().add(offset);

        // Cegah kamera tembus ke bawah lantai
        if (desiredCamPos.y < avatarPos.y + 0.35) {
          desiredCamPos.y = avatarPos.y + 0.35;
        }

        // Jika kamera terpaksa sangat dekat dengan kepala (karena terhimpit dinding di dalam ruangan),
        // sembunyikan avatar agar tidak menutupi seluruh layar pandangan pengguna
        if (avatarModel && avatarModel.root) {
          avatarModel.root.visible = (desiredDist >= 0.7);
        }

        camera.position.copy(desiredCamPos);
        camera.lookAt(lookTarget);
      }
    }

    /* ------------------------------------------------------------------
     * Loop Pembaruan Frame
     * ------------------------------------------------------------------ */
    var clock = new THREE.Clock();

    function update(now) {
      if (!active) { return; }

      var delta = Math.min(clock.getDelta(), 0.1);
      isRunning = keys.sprint || mobileSprintActive;
      var currentSpeed = isRunning ? setting.avatar_run_speed : setting.avatar_speed;

      // 1. Hitung arah gerak dari Keyboard (WASD) & Joystick Virtual
      var moveZ = 0; // Maju/Mundur
      var moveX = 0; // Kiri/Kanan (Strafe)

      if (keys.forward)  { moveZ -= 1; }
      if (keys.backward) { moveZ += 1; }
      if (keys.left)     { moveX -= 1; }
      if (keys.right)    { moveX += 1; }

      // Gabungkan dengan joystick
      if (Math.abs(joyDelta.x) > 0.05 || Math.abs(joyDelta.y) > 0.05) {
        moveX += joyDelta.x;
        moveZ += joyDelta.y;
      }

      var inputLen = Math.hypot(moveX, moveZ);
      isMoving = inputLen > 0.08;

      if (isMoving) {
        if (inputLen > 1) {
          moveX /= inputLen;
          moveZ /= inputLen;
        }

        // Proyeksikan vektor gerak berdasarkan sudut hadap kamera (yaw)
        var forward = new THREE.Vector3(-Math.sin(avatarYaw), 0, -Math.cos(avatarYaw));
        var right = new THREE.Vector3(Math.cos(avatarYaw), 0, -Math.sin(avatarYaw));

        var moveDir = new THREE.Vector3()
          .addScaledVector(forward, -moveZ)
          .addScaledVector(right, moveX)
          .normalize();

        var dist = currentSpeed * delta;
        var stepX = moveDir.x * dist;
        var stepZ = moveDir.z * dist;

        // Sliding Collision: Coba kedua sumbu, atau satu sumbu jika terhalang
        var newX = avatarPos.x + stepX;
        var newZ = avatarPos.z + stepZ;
        var nextY = dapatkanElevasiTanah(newX, newZ);
        var canMoveBoth = !cekTabrakan(newX, newZ, nextY);

        if (canMoveBoth) {
          avatarPos.x = newX;
          avatarPos.z = newZ;
        } else {
          // Coba geser sumbu X saja
          var yX = dapatkanElevasiTanah(avatarPos.x + stepX, avatarPos.z);
          if (!cekTabrakan(avatarPos.x + stepX, avatarPos.z, yX)) {
            avatarPos.x += stepX;
          }
          // Coba geser sumbu Z saja
          var yZ = dapatkanElevasiTanah(avatarPos.x, avatarPos.z + stepZ);
          if (!cekTabrakan(avatarPos.x, avatarPos.z + stepZ, yZ)) {
            avatarPos.z += stepZ;
          }
        }

        // Putar avatar menghadap arah gerakan
        var targetRot = Math.atan2(moveDir.x, moveDir.z);
        // Interpolasi halus rotasi tubuh
        var diff = targetRot - avatarContainer.rotation.y;
        while (diff < -Math.PI) { diff += Math.PI * 2; }
        while (diff > Math.PI) { diff -= Math.PI * 2; }
        avatarContainer.rotation.y += diff * Math.min(1, delta * 14);

        // Langkah animasi
        walkPhase += delta * currentSpeed * (isRunning ? 2.2 : 1.8);
      } else {
        // Redam animasi kembali ke posisi diam
        walkPhase = 0;
      }

      // Ketinggian avatar mengikuti kontur tanjakan/turunan tanah atau lantai saat ini
      var targetElev = dapatkanElevasiTanah(avatarPos.x, avatarPos.z);
      var diffY = targetElev - avatarPos.y;
      if (Math.abs(diffY) > 0.005) {
        var stepSpeed = (diffY > 0) ? 24 : 16;
        avatarPos.y += diffY * Math.min(1, delta * stepSpeed);
      } else {
        avatarPos.y = targetElev;
      }
      avatarContainer.position.copy(avatarPos);

      // 2. Animasi Manekin Prosedural (Ayunan tangan & kaki)
      if (avatarModel && avatarModel.isProcedural) {
        var swing = Math.sin(walkPhase) * (isRunning ? 0.65 : 0.45);
        if (!isMoving) { swing = 0; }
        avatarModel.leftLeg.rotation.x = swing;
        avatarModel.rightLeg.rotation.x = -swing;
        avatarModel.leftArm.rotation.x = -swing;
        avatarModel.rightArm.rotation.x = swing;
      }

      // Animasi GLTF jika ada mixer
      if (gltfMixer) {
        gltfMixer.update(delta);
        var targetAnim = isMoving ? (isRunning ? (gltfAnimations.run || gltfAnimations.walk) : gltfAnimations.walk) : gltfAnimations.idle;
        if (targetAnim && gltfCurrentAction !== targetAnim) {
          if (gltfCurrentAction) { gltfCurrentAction.fadeOut(0.2); }
          targetAnim.reset().fadeIn(0.2).play();
          gltfCurrentAction = targetAnim;
        }
      }

      // 3. Perbarui Kamera
      updateKamera(delta);

      // 4. Deteksi Interaksi Sekitar
      periksaInteraksiSekitar();
    }

    // Sambungkan ke requestAnimationFrame stage
    stage.onFrame(update);

    /* ------------------------------------------------------------------
     * Aktivasi & Penonaktifan Mode Karakter
     * ------------------------------------------------------------------ */
    function mulaiJelajah(spawnPos, spawnYaw, floorY, lantaiId) {
      active = true;
      perbaruiDaftarCollider();

      // Matikan orbit controls bawaan selama mode karakter
      if (stage.orbit) {
        stage.orbit.enabled = false;
      }

      avatarPos.copy(spawnPos || new THREE.Vector3(0, 0, 0));
      currentFloorY = floorY || 0;
      currentLantaiId = lantaiId || null;
      var initElev = dapatkanElevasiTanah(avatarPos.x, avatarPos.z);
      if (currentFloorY === 0 && initElev > 0) {
        avatarPos.y = initElev;
      } else {
        avatarPos.y = currentFloorY;
      }
      avatarYaw = (spawnYaw != null) ? spawnYaw : 0;
      avatarPitch = -0.05;

      avatarContainer.position.copy(avatarPos);
      avatarContainer.rotation.y = avatarYaw;
      avatarContainer.visible = true;

      if (avatarModel && avatarModel.root) {
        avatarModel.root.visible = !firstPerson;
      }

      hudEl.hidden = false;
      clock.start();

      // Mode kursor bebas: Kursor tetap aktif dan tidak dikunci
      if (canvas) {
        canvas.style.cursor = 'grab';
      }

      if (typeof opts.onActiveChange === 'function') {
        opts.onActiveChange(true);
      }
    }

    function keluarJelajah(keSeluruhKampus) {
      if (!active) { return; }
      active = false;
      avatarContainer.visible = false;
      hudEl.hidden = true;
      resetJoystick();
      touchLookId = null;
      isDraggingMouse = false;

      if (elEntryPopup) { elEntryPopup.hidden = true; }
      if (elHudActions) { elHudActions.hidden = true; }
      if (elMBtnInfo) { elMBtnInfo.hidden = true; }
      tutupModalInfoGedung();
      if (canvas) { canvas.style.cursor = ''; }

      if (document.pointerLockElement === canvas) {
        try { document.exitPointerLock(); } catch (err) { /* diabaikan */ }
      }

      var goHome = (keSeluruhKampus !== false);

      // Aktifkan kembali orbit controls
      if (stage.orbit) {
        stage.orbit.enabled = true;
        if (goHome) {
          // Kembali ke sudut pandang seluruh kampus
          stage.home(false);
        } else {
          stage.orbit.target.copy(avatarPos);
          camera.position.set(avatarPos.x + 12, avatarPos.y + 16, avatarPos.z + 18);
          stage.orbit.update();
        }
      }

      if (typeof opts.onActiveChange === 'function') {
        opts.onActiveChange(false);
      }
      if (typeof opts.onExit === 'function') {
        opts.onExit(goHome);
      }
    }

    return {
      mulaiJelajah: mulaiJelajah,
      keluarJelajah: keluarJelajah,
      isActive: function () { return active; },
      setSetting: function (s) { Object.assign(setting, s || {}); },
      setGraf: function (g) { opts.graf = g; },
      teleport: function (pos, yaw, floorY) {
        avatarPos.copy(pos);
        if (floorY != null) { currentFloorY = floorY; }
        avatarPos.y = currentFloorY;
        if (yaw != null) { avatarYaw = yaw; }
        avatarContainer.position.copy(avatarPos);
      },
      getPosition: function () { return avatarPos.clone(); },
      getYaw: function () { return avatarYaw; }
    };
  }

  global.K3D_AVATAR = {
    buatAvatarController: buatAvatarController
  };
})(window);
