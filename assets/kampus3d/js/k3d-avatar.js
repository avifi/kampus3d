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
      // Jangan mulai seret jika mengklik elemen UI tombol, popup, dialog
      if (e.target && (e.target.closest('button') || e.target.closest('.k3d-entry-popup') || e.target.closest('.k3d-avatar-mobile') || e.target.closest('dialog') || e.target.closest('.qr-dlg'))) {
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
        case 'KeyH':
        case 'KeyQ':
        case 'Escape':
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
        '<div class="k3d-entry-badge" id="avatarEntryBadge">🚪 Pintu Masuk</div>',
        '<div class="k3d-entry-title" id="avatarEntryTitle">Nama Gedung / Ruang</div>',
        '<div class="k3d-entry-desc" id="avatarEntryDesc">Klik tombol atau tekan [E] untuk masuk ke pintu masuk.</div>',
        '<div class="k3d-entry-actions">',
          '<button class="k3d-entry-btn" id="avatarEntryBtn" type="button">',
            '<span class="k3d-entry-btn-text" id="avatarEntryBtnText">Masuk Sekarang</span>',
            '<kbd>E</kbd>',
          '</button>',
        '</div>',
      '</div>',
      '<div class="k3d-avatar-prompt" id="avatarPrompt" hidden>',
        '<span class="k3d-prompt-key">E</span>',
        '<span class="k3d-prompt-text" id="avatarPromptText">Interaksi</span>',
      '</div>',
      '<div class="k3d-avatar-help" id="avatarHelp">',
        '<span><b>WASD</b>: Gerak &middot; <b>Seret Mouse</b>: Putar Kamera &middot; <b>Shift</b>: Lari &middot; <b>V</b>: Kamera 1P/3P &middot; <b>E</b>: Aksi / Masuk</span>',
        '<button class="k3d-avatar-exit-btn" id="avatarExitBtn" type="button" title="Keluar ke mode lihat seluruh kampus">Lihat Seluruh Kampus (H)</button>',
      '</div>',
      '<div class="k3d-avatar-mobile" id="avatarMobile">',
        '<div class="k3d-joystick-zone" id="joystickZone">',
          '<div class="k3d-joystick-base" id="joystickBase">',
            '<div class="k3d-joystick-stick" id="joystickStick"></div>',
          '</div>',
        '</div>',
        '<div class="k3d-mobile-buttons">',
          '<button class="k3d-mobile-btn sprint" id="mBtnSprint" type="button">Lari</button>',
          '<button class="k3d-mobile-btn cam" id="mBtnCam" type="button">3P / 1P</button>',
          '<button class="k3d-mobile-btn act" id="mBtnAct" type="button" hidden>Aksi (E)</button>',
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
    var avatarRadius = 0.35; // Radius silinder tabrakan tubuh avatar (meter)
    var colliders = [];

    function perbaruiDaftarCollider() {
      colliders = [];
      if (!stage.entries) { return; }

      stage.entries.forEach(function (entry, id) {
        var node = stage.nodeMap ? stage.nodeMap.get(id) : null;
        if (!node) { return; }

        // Bounding box dunia
        var box = new THREE.Box3().setFromObject(entry.body);
        if (box.isEmpty()) { return; }

        if (node.tipe === 'gedung') {
          colliders.push({
            id: id,
            tipe: 'gedung',
            node: node,
            box: box,
            minX: box.min.x, maxX: box.max.x,
            minY: box.min.y, maxY: box.max.y,
            minZ: box.min.z, maxZ: box.max.z
          });
        } else if (node.tipe === 'ruang') {
          colliders.push({
            id: id,
            tipe: 'ruang',
            node: node,
            box: box,
            minX: box.min.x, maxX: box.max.x,
            minY: box.min.y, maxY: box.max.y,
            minZ: box.min.z, maxZ: box.max.z
          });
        }
      });
    }

    var lastEntrancePos = null;

    /**
     * Menghitung ketinggian permukaan tanah / tanjakan jalan di titik (x, z).
     * Jika berada di atas ruas jalan berkontur/tanjakan, mengembalikan ketinggian lereng Y.
     * Jika berada di luar jalan, mengembalikan 0 (atau currentFloorY jika dalam gedung).
     */
    function dapatkanElevasiTanah(x, z) {
      if (currentLantaiId != null && currentFloorY > 0.5) {
        return currentFloorY;
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

      return ditemukan ? elevasiTertinggi : (currentFloorY || 0);
    }

    /**
     * Memeriksa apakah posisi baru menabrak dinding luar.
     * Karakter di luar gedung tidak bisa menembus dinding gedung kecuali melalui pintu masuk.
     * Begitu melintasi pintu masuk, karakter bebas menjelajahi interior ruangan/lobi.
     */
    function cekTabrakan(x, z, y) {
      var tebalDinding = 0.40;

      // Jika baru saja masuk melalui pintu / teleport pintu masuk, izinkan pergerakan bebas di area pintu
      if (lastEntrancePos && Math.hypot(x - lastEntrancePos.x, z - lastEntrancePos.z) < 2.2) {
        return false;
      }

      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];

        // Hanya periksa collider yang tingginya mencakup ketinggian avatar saat ini
        if (y < c.minY - 0.5 || y > c.maxY + 0.5) { continue; }

        if (c.tipe === 'gedung') {
          // Bounding box gedung dengan margin avatar
          var insideOuter = (x >= c.minX - avatarRadius && x <= c.maxX + avatarRadius &&
                             z >= c.minZ - avatarRadius && z <= c.maxZ + avatarRadius);

          if (insideOuter) {
            // Apakah berada di zona dinding kulit luar?
            var nearBorderX = (Math.abs(x - c.minX) <= tebalDinding + avatarRadius) || (Math.abs(x - c.maxX) <= tebalDinding + avatarRadius);
            var nearBorderZ = (Math.abs(z - c.minZ) <= tebalDinding + avatarRadius) || (Math.abs(z - c.maxZ) <= tebalDinding + avatarRadius);

            if (nearBorderX || nearBorderZ) {
              // Jika dekat pintu gedung, diizinkan melintas masuk/keluar
              if (apakahDekatPintu(x, z, c.id)) {
                continue;
              }
              // Jika avatar sudah berada di dalam gedung dan masih bergerak di interior
              var sudahDiDalam = (avatarPos.x > c.minX + tebalDinding && avatarPos.x < c.maxX - tebalDinding &&
                                  avatarPos.z > c.minZ + tebalDinding && avatarPos.z < c.maxZ - tebalDinding);
              if (sudahDiDalam && (x > c.minX + 0.1 && x < c.maxX - 0.1 && z > c.minZ + 0.1 && z < c.maxZ - 0.1)) {
                continue; // Bebas menjelajah di dalam interior ruangan/lobi
              }
              return true; // Menabrak dinding luar gedung
            }
          }
        }
      }
      return false;
    }

    /** Memeriksa apakah posisi avatar dekat dengan pintu objek (gedung/ruang) */
    function apakahDekatPintu(x, z, objekId) {
      if (!opts.graf || !opts.graf.titik) { return false; }
      var dekat = false;
      opts.graf.titik.forEach(function (pt) {
        var j = pt.jenis || (pt.t && pt.t.jenis);
        var rId = pt.ruangId || (pt.t && pt.t.ruang_id);
        var oId = pt.objekId || (pt.t && pt.t.objek_id);
        var p = pt.pos || pt.worldPos;
        if (p && j === 'pintu' && (oId === objekId || rId === objekId)) {
          var dist = Math.hypot(x - p.x, z - p.z);
          if (dist < 2.6) { dekat = true; }
        }
      });
      return dekat;
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

    /** Menghitung posisi pintu masuk terbaik untuk gedung atau ruang */
    function dapatkanPosisiPintuMasuk(targetId, targetNode) {
      var box = stage.worldBox ? stage.worldBox(targetId) : new THREE.Box3();
      var hasBox = box && !box.isEmpty();
      var c = hasBox ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();

      var pintuPt = cariPintuObjek(targetId);
      if (pintuPt) {
        var pCoord = (pintuPt.pos || pintuPt.worldPos).clone();
        var yaw = 0;
        if (hasBox) {
          // Hadapkan karakter ke bagian dalam gedung/ruang
          var dx = c.x - pCoord.x;
          var dz = c.z - pCoord.z;
          if (Math.hypot(dx, dz) > 0.1) {
            yaw = Math.atan2(dx, dz);
          }
        }
        return {
          pos: pCoord,
          floorY: pCoord.y,
          yaw: yaw,
          pintu: pintuPt
        };
      }

      // Jika belum ada titik pintu di graf rute, hitung posisi pintu masuk dari bounding box
      if (hasBox) {
        var floorY = box.min.y;

        // Cari sisi terdekat dari posisi avatar ke bounding box
        var dFront = Math.abs(avatarPos.z - box.max.z);
        var dBack = Math.abs(avatarPos.z - box.min.z);
        var dLeft = Math.abs(avatarPos.x - box.min.x);
        var dRight = Math.abs(avatarPos.x - box.max.x);
        var minD = Math.min(dFront, dBack, dLeft, dRight);

        var spawnX = c.x;
        var spawnZ = box.max.z - 0.8;

        if (minD === dBack) {
          spawnX = c.x;
          spawnZ = box.min.z + 0.8;
        } else if (minD === dLeft) {
          spawnX = box.min.x + 0.8;
          spawnZ = c.z;
        } else if (minD === dRight) {
          spawnX = box.max.x - 0.8;
          spawnZ = c.z;
        } else {
          spawnX = c.x;
          spawnZ = box.max.z - 0.8;
        }

        spawnX = Math.max(box.min.x + 0.5, Math.min(box.max.x - 0.5, spawnX));
        spawnZ = Math.max(box.min.z + 0.5, Math.min(box.max.z - 0.5, spawnZ));

        var yaw = Math.atan2(c.x - spawnX, c.z - spawnZ);
        return {
          pos: new THREE.Vector3(spawnX, floorY, spawnZ),
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

      var labelTipe = targetNode.tipe === 'ruang' ? 'Ruang' : 'Gedung';
      var nama = targetNode.judul || labelTipe;
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

    /* ------------------------------------------------------------------
     * Deteksi Interaksi & Pop-up Masuk (Pintu, Gedung, Ruang, Tangga, Lift)
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

      // 2. Cek apakah berada di dekat Gedung atau Ruang
      if (!interaksiAktif && stage.entries) {
        var calonTerbaik = null;
        var jarakTerkecil = 999;

        stage.entries.forEach(function (entry, id) {
          var node = stage.nodeMap ? stage.nodeMap.get(id) : null;
          if (!node || !node.judul) { return; }
          if (node.tipe !== 'ruang' && node.tipe !== 'gedung') { return; }

          var box = stage.worldBox ? stage.worldBox(id) : new THREE.Box3().setFromObject(entry.body);
          if (!box || box.isEmpty()) { return; }

          // Periksa apakah avatar sudah berada jauh di dalam objek ini
          var insideObj = (avatarPos.x >= box.min.x + 0.8 && avatarPos.x <= box.max.x - 0.8 &&
                           avatarPos.z >= box.min.z + 0.8 && avatarPos.z <= box.max.z - 0.8 &&
                           avatarPos.y >= box.min.y - 0.5 && avatarPos.y <= box.max.y + 0.5);

          // Jarak horizontal dan vertikal
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

          var threshold = (node.tipe === 'ruang') ? 3.5 : 5.0;
          var isNearDoor = distToPintu < 4.0;
          var isNearBox = distToBox < threshold && (node.tipe === 'gedung' ? dy < (box.max.y - box.min.y + 1.5) : dy < 2.5);

          if ((isNearDoor || isNearBox) && !insideObj) {
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
        });

        if (calonTerbaik) {
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
            desc: 'Klik tombol atau tekan [E] untuk masuk ke pintu masuk ' + labelTipe.toLowerCase() + '.',
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
        if (elMBtnAct) { elMBtnAct.hidden = true; }
        return;
      }

      if (interaksiAktif.tipe === 'masuk_objek') {
        if (elEntryBadge) { elEntryBadge.textContent = interaksiAktif.badge; }
        if (elEntryTitle) { elEntryTitle.textContent = interaksiAktif.title; }
        if (elEntryDesc) { elEntryDesc.textContent = interaksiAktif.desc; }
        if (elEntryBtnText) { elEntryBtnText.textContent = interaksiAktif.btnText || 'Masuk Sekarang'; }
        if (elEntryPopup) { elEntryPopup.hidden = false; }
        if (elPrompt) { elPrompt.hidden = true; }
        if (elMBtnAct) {
          elMBtnAct.hidden = false;
          elMBtnAct.textContent = 'Masuk (E)';
        }
      } else {
        if (elEntryPopup) { elEntryPopup.hidden = true; }
        if (elPrompt) {
          elPromptText.textContent = interaksiAktif.label;
          elPrompt.hidden = false;
        }
        if (elMBtnAct) {
          elMBtnAct.hidden = false;
          elMBtnAct.textContent = interaksiAktif.tipe === 'lift' ? 'Lift' : (interaksiAktif.tipe === 'tangga' ? 'Tangga' : 'Info (E)');
        }
      }
    }

    function lakukanInteraksi() {
      if (!interaksiAktif) { return; }

      if (interaksiAktif.tipe === 'masuk_objek') {
        masukKeObjek(interaksiAktif.id, interaksiAktif.node);
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

    function updateKamera(delta) {
      var camH = setting.avatar_cam_height || 1.6;

      if (firstPerson) {
        // First Person: Kamera tepat di posisi mata avatar
        camera.position.set(avatarPos.x, avatarPos.y + camH, avatarPos.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = avatarYaw;
        camera.rotation.x = avatarPitch;
        camera.rotation.z = 0;
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

        var offset = new THREE.Vector3(
          sinYaw * cosPitch * targetDist,
          -sinPitch * targetDist + 0.3,
          cosYaw * cosPitch * targetDist
        );

        var desiredCamPos = lookTarget.clone().add(offset);
        // Cegah kamera tembus ke bawah lantai
        if (desiredCamPos.y < avatarPos.y + 0.35) {
          desiredCamPos.y = avatarPos.y + 0.35;
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
        avatarPos.y += diffY * Math.min(1, delta * 16);
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
