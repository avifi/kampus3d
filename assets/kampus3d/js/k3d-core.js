/* Kampus 3D: inti adegan 3D yang dipakai editor admin dan halaman publik.
   Membuat adegan, kamera, pemuatan model .glb dari pustaka, kotak pengganti, pemilihan objek, dan animasi kamera.
   Satuan: meter dan derajat. Posisi, rotasi, dan skala setiap objek relatif terhadap induknya. */
(function (global) {
  'use strict';

  var TYPES = {
    gedung: { label: 'Gedung', color: 0xc9a26b, size: [20, 10, 12], opacity: 0.28, target: 20 },
    lantai: { label: 'Lantai', color: 0x8fbf9f, size: [18, 0.3, 10], opacity: 0.4, target: 18 },
    ruang:  { label: 'Ruang',  color: 0x6a9bd1, size: [6, 3, 5],    opacity: 0.5,  target: 6 },
    barang: { label: 'Barang', color: 0xb883cc, size: [1, 1, 1],    opacity: 1,    target: 1 },
    area:   { label: 'Area',   color: 0x7aa86a, size: [10, 0.1, 10], opacity: 1,   target: 10 },
    layar:  { label: 'Layar',  color: 0x06b6d4, size: [4, 2.4, 0.2], opacity: 1,   target: 4 }
  };
  // Jenis area outdoor. 'garis' = jalur dengan lebar, 'bidang' = poligon tertutup. tinggi = tebal lapisan (m).
  var AREA = {
    jalan:    { label: 'Jalan',    kind: 'garis',  color: 0x585e66, tinggi: 0.08 },
    sungai:   { label: 'Sungai',   kind: 'garis',  color: 0x3ba682, tinggi: 0.02 },
    taman:    { label: 'Taman',    kind: 'bidang', color: 0x6fae6a, tinggi: 0.04 },
    lapangan: { label: 'Lapangan', kind: 'bidang', color: 0x76b852, tinggi: 0.05 },
    parkir:   { label: 'Parkir',   kind: 'bidang', color: 0x8b9099, tinggi: 0.06 }
  };
  // Tipe induk yang boleh untuk setiap tipe (sama dengan aturan di server).
  var ALLOWED_PARENT = {
    gedung: [],
    lantai: ['gedung'],
    ruang:  ['lantai', 'gedung'],
    barang: ['ruang', 'lantai', 'gedung'],
    area:   [],
    layar:  ['ruang', 'lantai', 'gedung']
  };
  /** Nama tampilan sebuah objek: untuk area dipakai jenisnya (Jalan, Taman, ...). */
  function labelOf(n) {
    if (n.tipe === 'area') { return (AREA[n.subtipe] || AREA.taman).label; }
    return (TYPES[n.tipe] || TYPES.barang).label;
  }

  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };

  function createStage(canvas, stageEl, cfg) {
    cfg = cfg || {};
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
    var HOME_DIR = new THREE.Vector3(0.6, 0.55, 0.8).normalize();
    camera.position.set(48, 40, 58);

    var orbit = new THREE.OrbitControls(camera, canvas);
    orbit.target.set(0, 0, -4);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.minDistance = 1;
    orbit.maxDistance = 800;
    orbit.update();

    // Pencahayaan realistis: hemisphere langit-tanah & directional matahari dengan bayangan lembut
    var hemiLight = new THREE.HemisphereLight(0xeef5fc, 0x5a6358, 0.85);
    scene.add(hemiLight);

    var sun = new THREE.DirectionalLight(0xfff5e6, 0.95);
    sun.position.set(60, 95, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 450;
    var dSun = 150;
    sun.shadow.camera.left = -dSun;
    sun.shadow.camera.right = dSun;
    sun.shadow.camera.top = dSun;
    sun.shadow.camera.bottom = -dSun;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    var col = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };

    /* ---------- tanah dan tema ---------- */
    var groundMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);
    var gridMinor = null;
    var gridMajor = null;

    function applyTheme() {
      var cs = getComputedStyle(document.documentElement);
      var v = function (name) { return cs.getPropertyValue(name).trim() || '#888888'; };
      renderer.setClearColor(col(v('--vp-bg')));
      ground.material.color.copy(col(v('--ground')));
      [gridMinor, gridMajor].forEach(function (g) {
        if (g) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); }
      });
      gridMinor = new THREE.GridHelper(400, 400, col(v('--grid-b')), col(v('--grid-b')));
      gridMajor = new THREE.GridHelper(400, 40, col(v('--grid-a')), col(v('--grid-a')));
      gridMinor.position.y = 0.005;
      gridMajor.position.y = 0.01;
      gridMinor.receiveShadow = false;
      gridMajor.receiveShadow = false;
      scene.add(gridMinor, gridMajor);
    }
    applyTheme();
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { /* peramban lama */ }

    var root = new THREE.Group();
    scene.add(root);

    var selBox = new THREE.Box3();
    var selHelper = new THREE.Box3Helper(selBox, col(0xffb020));
    selHelper.visible = false;
    scene.add(selHelper);

    /* ---------- pemuat model ---------- */
    var loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader && cfg.dracoPath) {
      var draco = new THREE.DRACOLoader();
      draco.setDecoderPath(cfg.dracoPath);
      loader.setDRACOLoader(draco);
    }

    // Titik asal model dipindah ke tengah alasnya agar sama dengan kotak pengganti.
    function wrapGltf(gltfScene) {
      var box = new THREE.Box3().setFromObject(gltfScene);
      if (box.isEmpty()) { throw new Error('Model tidak berisi geometri.'); }
      var c = box.getCenter(new THREE.Vector3());
      var s = box.getSize(new THREE.Vector3());
      gltfScene.position.set(-c.x, -box.min.y, -c.z);
      gltfScene.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      var wrap = new THREE.Group();
      wrap.add(gltfScene);
      wrap.userData.size = s;
      wrap.userData.gltfScene = gltfScene;
      return wrap;
    }
    var toError = function (err) {
      return err instanceof Error ? err : new Error((err && err.message) || 'Berkas model tidak dapat dibaca.');
    };

    var instancedGroup = new THREE.Group();
    instancedGroup.name = 'K3DInstancedGroup';
    scene.add(instancedGroup);

    var stage = {
      THREE: THREE, renderer: renderer, scene: scene, camera: camera, orbit: orbit, root: root,
      instancedGroup: instancedGroup,
      nodes: [], nodeMap: new Map(), entries: new Map(), library: new Map(),
      selectedId: null, onError: null,
      qualityLevel: 'tinggi',
      lodDistance: 140,
      enableLod: true
    };
    var modelCache = new Map(); // id pustaka -> Promise<Group>

    /** Menerapkan ulang tema warna dan grid */
    stage.applyTheme = applyTheme;

    /** Mengatur tema terang/gelap ('light' atau 'dark') */
    stage.setTheme = function (theme) {
      theme = (theme === 'dark') ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('k3d_theme', theme); } catch (e) {}
      applyTheme();
      return theme;
    };

    /** Mendapatkan tema aktif saat ini ('light' atau 'dark') */
    stage.getTheme = function () {
      return document.documentElement.getAttribute('data-theme') || 'light';
    };

    /** Mengatur kualitas grafis (tinggi, sedang, rendah) */
    stage.setQuality = function (level) {
      level = level || 'sedang';
      stage.qualityLevel = level;

      if (level === 'rendah') {
        renderer.shadowMap.enabled = false;
        sun.castShadow = false;
        renderer.setPixelRatio(1.0);
        stage.lodDistance = 60;
      } else if (level === 'sedang') {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
        stage.lodDistance = 100;
      } else { // tinggi
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        stage.lodDistance = 160;
      }

      scene.traverse(function (obj) {
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(function (m) { m.needsUpdate = true; });
          } else {
            obj.material.needsUpdate = true;
          }
        }
      });
      stage.resize();
      try { localStorage.setItem('k3d_quality', level); } catch (e) { /* diabaikan */ }
    };

    stage.setLibrary = function (list) {
      var next = new Map();
      (list || []).forEach(function (l) {
        var old = stage.library.get(l.id);
        if (old && old.url !== l.url) { modelCache.delete(l.id); }
        next.set(l.id, l);
      });
      stage.library = next;
    };

    function loadLibraryModel(id) {
      if (!modelCache.has(id)) {
        var lib = stage.library.get(id);
        modelCache.set(id, new Promise(function (resolve, reject) {
          loader.load(lib.url, function (gltf) {
            try { resolve(wrapGltf(gltf.scene)); } catch (e) { reject(e); }
          }, undefined, function (err) { reject(toError(err)); });
        }));
      }
      return modelCache.get(id);
    }

    /** Membaca berkas .glb dari memori (untuk memeriksa sebelum diunggah). Mengembalikan Promise<{size: Vector3}>. */
    stage.parseGlb = function (arrayBuffer) {
      return new Promise(function (resolve, reject) {
        loader.parse(arrayBuffer.slice(0), '', function (gltf) {
          try { resolve({ size: wrapGltf(gltf.scene).userData.size }); } catch (e) { reject(e); }
        }, function (err) { reject(toError(err)); });
      });
    };

    /* ---------- objek ---------- */
    function makePlaceholder(n, missing) {
      var t = TYPES[n.tipe] || TYPES.barang;
      var size = n.ukuran || t.size;
      var g = new THREE.BoxGeometry(size[0], size[1], size[2]);
      g.translate(0, size[1] / 2, 0);
      var opacity = missing ? Math.min(t.opacity, 0.45) : t.opacity;
      var mat = new THREE.MeshStandardMaterial({
        color: col(t.color), roughness: 0.85, metalness: 0,
        transparent: opacity < 1, opacity: opacity, depthWrite: opacity >= 1
      });
      var mesh = new THREE.Mesh(g, mat);
      mesh.userData.own = true;
      mesh.castShadow = (opacity >= 0.35);
      mesh.receiveShadow = true;
      var lines = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: col(t.color) }));
      lines.userData.own = true;
      lines.userData.noPick = true;
      var grp = new THREE.Group();
      grp.add(mesh, lines);
      return grp;
    }

    /* ---------- area outdoor ---------- */
    function areaGeometry(n, st) {
      var g = n.geometri;
      if (!g || !g.titik || g.titik.length < (st.kind === 'garis' ? 2 : 3)) { return null; }
      var pts = g.titik;
      var h = st.tinggi;
      if (st.kind === 'bidang') {
        var maxElev = 0;
        pts.forEach(function (p) { if ((p[2] || 0) > maxElev) { maxElev = p[2] || 0; } });
        var shape = new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0], -p[1]); }));
        var geo = new THREE.ExtrudeGeometry(shape, { depth: h + maxElev, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        if (maxElev > 0) { geo.translate(0, maxElev, 0); }
        return geo;
      }
      // jalan / tanjakan: ruas dengan elevasi Y per titik, ditambah dinding samping jika elevated
      var half = (g.lebar || 6) / 2;
      var pos = [];
      var idx = [];
      var quad = function (a, b, c, d) {
        var o = pos.length / 3;
        pos.push.apply(pos, a.concat(b, c, d));
        idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
      };
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i];
        var p1 = pts[i + 1];
        var y0 = (p0[2] || 0) + h;
        var y1 = (p1[2] || 0) + h;
        var dx = p1[0] - p0[0];
        var dz = p1[1] - p0[1];
        var len = Math.sqrt(dx * dx + dz * dz) || 1;
        var nx = -dz / len * half;
        var nz = dx / len * half;

        // Permukaan utama jalan (tanjakan / turunan mulus mengikuti y0 dan y1)
        quad([p0[0] + nx, y0, p0[1] + nz], [p0[0] - nx, y0, p0[1] - nz],
             [p1[0] - nx, y1, p1[1] - nz], [p1[0] + nx, y1, p1[1] + nz]);

        // Dinding penopang samping jika ada tanjakan di atas tanah
        if (y0 > h + 0.05 || y1 > h + 0.05) {
          quad([p0[0] + nx, 0, p0[1] + nz], [p0[0] + nx, y0, p0[1] + nz],
               [p1[0] + nx, y1, p1[1] + nz], [p1[0] + nx, 0, p1[1] + nz]);
          quad([p0[0] - nx, y0, p0[1] - nz], [p0[0] - nx, 0, p0[1] - nz],
               [p1[0] - nx, 0, p1[1] - nz], [p1[0] - nx, y1, p1[1] - nz]);
        }
      }
      for (var j = 1; j < pts.length - 1; j++) {
        var yj = (pts[j][2] || 0) + h;
        var o = pos.length / 3;
        pos.push(pts[j][0], yj, pts[j][1]);
        for (var k = 0; k <= 16; k++) {
          var a = k / 16 * Math.PI * 2;
          pos.push(pts[j][0] + Math.cos(a) * half, yj, pts[j][1] + Math.sin(a) * half);
        }
        for (var m = 0; m < 16; m++) { idx.push(o, o + 2 + m, o + 1 + m); }

        if (yj > h + 0.05) {
          for (var c = 0; c < 16; c++) {
            var a1 = c / 16 * Math.PI * 2;
            var a2 = (c + 1) / 16 * Math.PI * 2;
            var x1 = pts[j][0] + Math.cos(a1) * half, z1 = pts[j][1] + Math.sin(a1) * half;
            var x2 = pts[j][0] + Math.cos(a2) * half, z2 = pts[j][1] + Math.sin(a2) * half;
            quad([x1, 0, z1], [x1, yj, z1], [x2, yj, z2], [x2, 0, z2]);
          }
        }
      }
      var bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bg.setIndex(idx);
      bg.computeVertexNormals();
      return bg;
    }
    function makeArea(n) {
      var st = AREA[n.subtipe] || AREA.taman;
      var geo = areaGeometry(n, st);
      var grp = new THREE.Group();
      if (!geo) { return grp; }
      var mat = new THREE.MeshStandardMaterial({
        color: col(st.color), roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.userData.own = true;
      mesh.userData.isArea = true;
      mesh.userData.areaNode = n;
      mesh.receiveShadow = true;
      grp.add(mesh);
      return grp;
    }

    function disposeOwn(obj) {
      obj.traverse(function (o) {
        if (o.userData && o.userData.own) {
          if (o.geometry) { o.geometry.dispose(); }
          if (o.material) { o.material.dispose(); }
        }
      });
    }

    /* ---------- layar / videotron 3d ---------- */
    function createStandbyTexture(title) {
      var cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 288;
      var ctx = cv.getContext('2d');

      var grad = ctx.createLinearGradient(0, 0, 512, 288);
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 288);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (var gx = 12; gx < 500; gx += 16) {
        for (var gy = 12; gy < 276; gy += 16) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 492, 268);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      ctx.arc(256, 120, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(246, 98);
      ctx.lineTo(276, 120);
      ctx.lineTo(246, 142);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var text = title || 'LAYAR VIDEOTRON';
      if (text.length > 28) { text = text.slice(0, 26) + '...'; }
      ctx.fillText(text, 256, 196);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Mendekat untuk memutar video otomatis', 256, 226);

      var tex = new THREE.CanvasTexture(cv);
      tex.encoding = THREE.sRGBEncoding;
      return tex;
    }

    function makeLayarMesh(n) {
      var w = (n.ukuran && n.ukuran[0]) || 4.0;
      var h = (n.ukuran && n.ukuran[1]) || 2.4;
      var d = (n.ukuran && n.ukuran[2]) || 0.2;

      var grp = new THREE.Group();
      grp.userData.isScreenGroup = true;
      grp.userData.nodeId = n.id;

      var frameGeo = new THREE.BoxGeometry(w + 0.16, h + 0.16, d);
      frameGeo.translate(0, (h + 0.16) / 2, 0);
      var frameMat = new THREE.MeshStandardMaterial({
        color: 0x181a1f,
        roughness: 0.5,
        metalness: 0.8
      });
      var frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.userData.own = true;
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      grp.add(frameMesh);

      var poleH = 2.0;
      var poleGeo = new THREE.CylinderGeometry(0.12, 0.14, poleH, 16);
      poleGeo.translate(0, -poleH / 2, 0);
      var poleMat = new THREE.MeshStandardMaterial({ color: 0x27292e, roughness: 0.6, metalness: 0.6 });
      var poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.userData.own = true;
      poleMesh.castShadow = true;
      poleMesh.receiveShadow = true;
      grp.add(poleMesh);

      var baseGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.08, 16);
      baseGeo.translate(0, -poleH + 0.04, 0);
      var baseMesh = new THREE.Mesh(baseGeo, poleMat);
      baseMesh.userData.own = true;
      baseMesh.receiveShadow = true;
      grp.add(baseMesh);

      var screenGeo = new THREE.PlaneGeometry(w, h);
      screenGeo.translate(0, (h + 0.16) / 2, d / 2 + 0.005);
      var screenMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: createStandbyTexture(n.judul),
        toneMapped: false,
        side: THREE.DoubleSide
      });
      var screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.userData.own = true;
      screenMesh.userData.isScreen = true;
      screenMesh.userData.nodeId = n.id;
      grp.add(screenMesh);

      return grp;
    }

    stage.media = new Map();
    stage.screens = new Map();

    stage.setMedia = function (list) {
      stage.media = new Map();
      (list || []).forEach(function (m) { stage.media.set(m.id, m); });
    };

    stage.registerScreen = function (n, entry, modelRoot) {
      stage.unregisterScreen(n.id);

      var targetMesh = null;
      var targetMatName = (n.layar_target || 'LAYAR').trim().toUpperCase();

      if (modelRoot) {
        modelRoot.traverse(function (o) {
          if (!targetMesh && o.isMesh && o.material) {
            var mNames = Array.isArray(o.material) ? o.material : [o.material];
            for (var i = 0; i < mNames.length; i++) {
              var mn = (mNames[i].name || '').toUpperCase();
              if (mn.indexOf(targetMatName) !== -1 || (o.name || '').toUpperCase().indexOf(targetMatName) !== -1) {
                targetMesh = o;
                break;
              }
            }
          }
        });
        if (!targetMesh) {
          modelRoot.traverse(function (o) {
            if (!targetMesh && o.isMesh) { targetMesh = o; }
          });
        }
      } else {
        entry.body.traverse(function (o) {
          if (!targetMesh && o.userData && o.userData.isScreen) {
            targetMesh = o;
          }
        });
      }

      if (!targetMesh) { return; }

      var mediaObj = n.media_id ? stage.media.get(n.media_id) : null;
      var standbyTex = createStandbyTexture(n.judul || (mediaObj ? mediaObj.nama : 'Layar'));

      var originalMat = targetMesh.material;
      var activeMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: standbyTex,
        toneMapped: false,
        side: THREE.DoubleSide
      });
      targetMesh.material = activeMat;

      var screenItem = {
        node: n,
        entry: entry,
        targetMesh: targetMesh,
        originalMat: originalMat,
        activeMat: activeMat,
        standbyTex: standbyTex,
        videoEl: null,
        videoTexture: null,
        posterTexture: null,
        isPlaying: false,
        mediaObj: mediaObj,
        maxDist: Number(n.layar_jarak) || 20.0,
        loop: n.layar_loop !== 0,
        isMuted: true,
        volume: 0.8
      };

      if (mediaObj && mediaObj.url) {
        if (mediaObj.poster_url) {
          var texLoader = new THREE.TextureLoader();
          screenItem.posterTexture = texLoader.load(mediaObj.poster_url);
          screenItem.posterTexture.encoding = THREE.sRGBEncoding;
          activeMat.map = screenItem.posterTexture;
          activeMat.needsUpdate = true;
        }

        var video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = true;
        video.loop = screenItem.loop;
        video.volume = 0.8;
        video.src = mediaObj.url;
        video.preload = 'metadata';
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.style.display = 'none';

        var vTex = new THREE.VideoTexture(video);
        vTex.minFilter = THREE.LinearFilter;
        vTex.magFilter = THREE.LinearFilter;
        vTex.format = THREE.RGBAFormat;
        vTex.encoding = THREE.sRGBEncoding;

        screenItem.videoEl = video;
        screenItem.videoTexture = vTex;
      }

      stage.screens.set(n.id, screenItem);
    };

    stage.unregisterScreen = function (nodeId) {
      var item = stage.screens.get(nodeId);
      if (!item) { return; }
      if (item.videoEl) {
        try { item.videoEl.pause(); } catch (e) {}
        item.videoEl.removeAttribute('src');
        item.videoEl.load();
      }
      if (item.videoTexture) { item.videoTexture.dispose(); }
      if (item.posterTexture) { item.posterTexture.dispose(); }
      if (item.standbyTex) { item.standbyTex.dispose(); }
      stage.screens.delete(nodeId);
    };

    var lastScreenCheckTime = 0;
    var _screenWorldPos = new THREE.Vector3();

    stage.updateScreens = function (now) {
      if (now - lastScreenCheckTime < 180) { return; }
      lastScreenCheckTime = now;

      var camPos = camera.position;
      stage.screens.forEach(function (s) {
        if (!s.videoEl || !s.videoTexture) { return; }
        if (!s.targetMesh || !s.targetMesh.visible) {
          if (s.isPlaying) {
            s.videoEl.pause();
            s.activeMat.map = s.posterTexture || s.standbyTex;
            s.activeMat.needsUpdate = true;
            s.isPlaying = false;
          }
          return;
        }

        s.targetMesh.getWorldPosition(_screenWorldPos);
        var dist = camPos.distanceTo(_screenWorldPos);

        if (dist <= s.maxDist) {
          if (!s.isPlaying) {
            s.activeMat.map = s.videoTexture;
            s.activeMat.needsUpdate = true;
            s.videoEl.muted = s.isMuted;
            s.videoEl.play().then(function () {
              s.isPlaying = true;
            }).catch(function () {
              s.videoEl.muted = true;
              s.isMuted = true;
              s.videoEl.play().catch(function () {});
            });
          }
        } else {
          if (s.isPlaying) {
            s.videoEl.pause();
            s.activeMat.map = s.posterTexture || s.standbyTex;
            s.activeMat.needsUpdate = true;
            s.isPlaying = false;
          }
        }
      });
    };

    stage.setScreenAudio = function (nodeId, muted, volume) {
      var s = stage.screens.get(nodeId);
      if (!s || !s.videoEl) { return null; }
      if (muted != null) {
        s.isMuted = !!muted;
        s.videoEl.muted = s.isMuted;
      }
      if (volume != null) {
        s.volume = Math.max(0, Math.min(1, volume));
        s.videoEl.volume = s.volume;
      }
      return { isMuted: s.isMuted, volume: s.volume, isPlaying: s.isPlaying };
    };

    stage.getScreenAudio = function (nodeId) {
      var s = stage.screens.get(nodeId);
      if (!s || !s.videoEl) { return null; }
      return { isMuted: s.isMuted, volume: s.volume, isPlaying: s.isPlaying, media: s.mediaObj };
    };

    function fillBody(entry, n) {
      disposeOwn(entry.body);
      entry.body.clear();
      stage.unregisterScreen(n.id);

      if (n.tipe === 'area') {
        entry.body.add(makeArea(n));
      } else if (n.tipe === 'layar' && (n.library_id == null || !stage.library.has(n.library_id))) {
        entry.body.add(makeLayarMesh(n));
        stage.registerScreen(n, entry, null);
      } else if (n.library_id != null && stage.library.has(n.library_id)) {
        loadLibraryModel(n.library_id).then(function (m) {
          if (stage.entries.get(n.id) === entry) {
            entry.body.clear();
            var modelClone = m.clone(true);
            entry.body.add(modelClone);
            if (n.tipe === 'layar') {
              stage.registerScreen(n, entry, modelClone);
            }
          }
        }).catch(function (err) {
          if (stage.entries.get(n.id) === entry) { entry.body.add(makePlaceholder(n, true)); }
          if (stage.onError) { stage.onError('Model untuk "' + (n.judul || 'objek') + '" gagal dibuka: ' + (err.message || err)); }
        });
      } else {
        entry.body.add(makePlaceholder(n, n.library_id != null));
      }
    }

    stage.applyTransform = function (n) {
      var e = stage.entries.get(n.id);
      if (!e) { return; }
      var d = THREE.MathUtils.degToRad;
      e.group.position.set(n.pos_x, n.pos_y, n.pos_z);
      e.group.rotation.set(d(n.rot_x), d(n.rot_y), d(n.rot_z));
      e.group.scale.set(n.scale_x, n.scale_y, n.scale_z);
    };

    /** Menyalin posisi, rotasi, dan skala dari objek 3D ke data. */
    stage.syncFromObj = function (n) {
      var e = stage.entries.get(n.id);
      if (!e) { return; }
      var g = e.group;
      var deg = THREE.MathUtils.radToDeg;
      n.pos_x = r3(g.position.x); n.pos_y = r3(g.position.y); n.pos_z = r3(g.position.z);
      n.rot_x = r2(deg(g.rotation.x)); n.rot_y = r2(deg(g.rotation.y)); n.rot_z = r2(deg(g.rotation.z));
      n.scale_x = r3(g.scale.x); n.scale_y = r3(g.scale.y); n.scale_z = r3(g.scale.z);
    };

    stage.refresh = function (n) {
      var e = stage.entries.get(n.id);
      if (e) { fillBody(e, n); }
    };

    stage.rebuild = function (nodes) {
      stage.nodes = nodes;
      stage.nodeMap = new Map();
      nodes.forEach(function (n) { stage.nodeMap.set(n.id, n); });
      disposeOwn(root);
      root.clear();
      disposeOwn(instancedGroup);
      instancedGroup.clear();
      stage.entries.clear();

      // Hitung pemakaian model pustaka untuk instancing objek berulang (kursi, pohon, meja, dll)
      var libCounts = new Map();
      nodes.forEach(function (n) {
        if (n.tipe === 'barang' && n.library_id != null && stage.library.has(n.library_id)) {
          libCounts.set(n.library_id, (libCounts.get(n.library_id) || 0) + 1);
        }
      });

      var instancedLibIds = new Set();
      libCounts.forEach(function (count, libId) {
        if (count >= 2) { instancedLibIds.add(libId); }
      });

      nodes.forEach(function (n) {
        var group = new THREE.Group();
        group.userData.nodeId = n.id;
        var body = new THREE.Group();
        group.add(body);
        var entry = { group: group, body: body, isInstanced: (n.library_id != null && instancedLibIds.has(n.library_id)) };
        stage.entries.set(n.id, entry);
        stage.applyTransform(n);
        if (!entry.isInstanced) {
          fillBody(entry, n);
        }
      });
      nodes.forEach(function (n) {
        var e = stage.entries.get(n.id);
        var p = n.parent_id != null ? stage.entries.get(n.parent_id) : null;
        (p ? p.group : root).add(e.group);
      });

      // Bangun InstancedMesh untuk objek berulang dalam 1 draw call
      if (instancedLibIds.size > 0) {
        scene.updateMatrixWorld(true);
        instancedLibIds.forEach(function (libId) {
          var items = nodes.filter(function (n) { return n.tipe === 'barang' && n.library_id === libId; });
          if (!items.length) { return; }
          loadLibraryModel(libId).then(function (wrap) {
            var gltfScene = wrap.userData.gltfScene;
            if (!gltfScene) { return; }
            var meshes = [];
            gltfScene.traverse(function (o) {
              if (o.isMesh && o.geometry) { meshes.push(o); }
            });
            if (!meshes.length) { return; }

            scene.updateMatrixWorld(true);
            meshes.forEach(function (srcMesh) {
              var count = items.length;
              var iMesh = new THREE.InstancedMesh(srcMesh.geometry, srcMesh.material, count);
              iMesh.castShadow = true;
              iMesh.receiveShadow = true;
              iMesh.userData.instanceToNodeId = [];

              items.forEach(function (itemNode, idx) {
                var entry = stage.entries.get(itemNode.id);
                if (entry) {
                  entry.group.updateWorldMatrix(true, false);
                  var m = new THREE.Matrix4().multiplyMatrices(entry.group.matrixWorld, srcMesh.matrix);
                  iMesh.setMatrixAt(idx, m);
                  iMesh.userData.instanceToNodeId[idx] = itemNode.id;
                }
              });
              iMesh.instanceMatrix.needsUpdate = true;
              instancedGroup.add(iMesh);
            });
          }).catch(function (err) {
            console.warn('Gagal membuat instance untuk library #' + libId, err);
          });
        });
      }

      if (stage.selectedId != null && !stage.entries.has(stage.selectedId)) { stage.selectedId = null; }
    };

    /** Memindahkan objek ke induk baru dengan posisi dunia tetap. */
    stage.reparent = function (n, pid) {
      var e = stage.entries.get(n.id);
      var target = pid == null ? root : stage.entries.get(pid).group;
      scene.updateMatrixWorld(true);
      target.attach(e.group);
      n.parent_id = pid;
      stage.syncFromObj(n);
    };

    stage.isDescendant = function (id, ancestorId) {
      var cur = stage.nodeMap.get(id);
      var guard = 0;
      while (cur && cur.parent_id != null && guard++ < 1000) {
        if (cur.parent_id === ancestorId) { return true; }
        cur = stage.nodeMap.get(cur.parent_id);
      }
      return false;
    };

    stage.worldBox = function (id, target) {
      var e = stage.entries.get(id);
      var b = target || new THREE.Box3();
      if (!e) { return b.makeEmpty(); }
      scene.updateMatrixWorld(true);
      return b.setFromObject(e.body);
    };

    /* ---------- pemilihan ---------- */
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    /** Urutan id objek di bawah titik layar: yang terdepan dulu, lalu isinya di belakangnya. */
    stage.pickChain = function (clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var targets = root.children.concat(instancedGroup.children);
      var hits = ray.intersectObjects(targets, true);
      var ids = [];
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i];
        if (h.object.userData.noPick) { continue; }
        var nodeId = null;
        if (h.object.isInstancedMesh && h.object.userData.instanceToNodeId && h.instanceId !== undefined) {
          nodeId = h.object.userData.instanceToNodeId[h.instanceId];
        } else {
          var o = h.object;
          while (o && o.userData.nodeId == null) { o = o.parent; }
          if (o) { nodeId = o.userData.nodeId; }
        }
        if (nodeId != null && ids.indexOf(nodeId) === -1) { ids.push(nodeId); }
      }
      if (!ids.length) { return []; }
      var first = ids[0];
      return [first].concat(ids.slice(1).filter(function (id) { return stage.isDescendant(id, first); }));
    };


    stage.setSelected = function (id) { stage.selectedId = id; };

    /** Titik pada tanah (y = 0) di bawah titik layar, atau NULL bila sinar tidak mengenai tanah. */
    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    stage.groundPoint = function (clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var out = new THREE.Vector3();
      return ray.ray.intersectPlane(groundPlane, out) ? out : null;
    };
    /** Titik pada bidang datar setinggi y (dunia) di bawah titik layar, atau NULL. */
    var anyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    stage.planePoint = function (clientX, clientY, y) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      anyPlane.constant = -(y || 0);
      var out = new THREE.Vector3();
      return ray.ray.intersectPlane(anyPlane, out) ? out : null;
    };
    /** Raycast ke daftar objek bebas (dipakai lapisan jalur). */
    stage.raycast = function (clientX, clientY, objects) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(objects, false);
    };

    /* Pegangan titik untuk menyunting bentuk area. Ukurannya dijaga tetap di layar. */
    var handleGroup = new THREE.Group();
    scene.add(handleGroup);
    var handleGeo = new THREE.SphereGeometry(1, 12, 8);
    var outline = null;
    stage.setHandles = function (points, active, closed) {
      handleGroup.children.slice().forEach(function (m) { handleGroup.remove(m); m.material.dispose(); });
      if (outline) { scene.remove(outline); outline.geometry.dispose(); outline.material.dispose(); outline = null; }
      if (points && points.length > 1) {
        var arr = [];
        points.forEach(function (p) { arr.push(p[0], (p[2] || 0) + 0.25, p[1]); });
        if (closed) { arr.push(points[0][0], (points[0][2] || 0) + 0.25, points[0][1]); }
        var og = new THREE.BufferGeometry();
        og.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        outline = new THREE.Line(og, new THREE.LineBasicMaterial({ color: col(0xffb020), depthTest: false, transparent: true }));
        outline.renderOrder = 9;
        scene.add(outline);
      }
      (points || []).forEach(function (p, i) {
        var py = (p[2] || 0);
        var m = new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: col(i === active ? 0xffb020 : 0xffffff), depthTest: false, transparent: true }));
        m.renderOrder = 10;
        m.position.set(p[0], py + 0.3, p[1]);
        m.userData.index = i;
        handleGroup.add(m);
      });
    };
    /** Indeks pegangan di bawah titik layar, atau -1. */
    stage.pickHandle = function (clientX, clientY) {
      if (!handleGroup.children.length) { return -1; }
      var r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      handleGroup.updateMatrixWorld(true);
      var hits = ray.intersectObjects(handleGroup.children, false);
      return hits.length ? hits[0].object.userData.index : -1;
    };

    /* ---------- kamera ---------- */
    var tween = null;
    stage.flyToPoint = function (toP, toT, instant) {
      if (instant) {
        camera.position.copy(toP);
        orbit.target.copy(toT);
        tween = null;
        return;
      }
      tween = { t0: performance.now(), dur: 650, fromP: camera.position.clone(), fromT: orbit.target.clone(), toP: toP, toT: toT };
    };
    function fitDistance(box) {
      var s = box.getSize(new THREE.Vector3());
      var rad = Math.max(s.x, s.y, s.z, 0.5) * 0.5;
      return rad / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.6 + rad;
    }
    stage.flyTo = function (id) {
      var b = stage.worldBox(id);
      if (b.isEmpty()) { return false; }
      var c = b.getCenter(new THREE.Vector3());
      var dir = camera.position.clone().sub(orbit.target).normalize();
      stage.flyToPoint(c.clone().addScaledVector(dir, fitDistance(b)), c);
      return true;
    };
    /** Membingkai seluruh kampus. Bila belum ada objek, kembali ke sudut pandang awal. */
    stage.home = function (instant) {
      scene.updateMatrixWorld(true);
      var b = new THREE.Box3().setFromObject(root);
      if (b.isEmpty()) {
        stage.flyToPoint(new THREE.Vector3(48, 40, 58), new THREE.Vector3(0, 0, -4), instant);
        return;
      }
      var c = b.getCenter(new THREE.Vector3());
      stage.flyToPoint(c.clone().addScaledVector(HOME_DIR, fitDistance(b)), c, instant);
    };

    stage.resize = function () {
      var r = stageEl.getBoundingClientRect();
      var w = Math.max(1, Math.floor(r.width));
      var h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(stage.resize).observe(stageEl);
    stage.resize();

    var frameCallbacks = [];
    stage.onFrame = function (fn) { frameCallbacks.push(fn); };
    var tmpBox = new THREE.Box3();

    var lastLodCheck = 0;
    function updateLod(now) {
      if (!stage.enableLod || (now - lastLodCheck < 250)) { return; }
      lastLodCheck = now;
      var camPos = camera.position;
      var maxDistSq = stage.lodDistance * stage.lodDistance;

      stage.entries.forEach(function (entry, id) {
        var n = stage.nodeMap.get(id);
        if (!n || n.tipe !== 'gedung') { return; }

        var gPos = new THREE.Vector3();
        entry.group.getWorldPosition(gPos);
        var distSq = camPos.distanceToSquared(gPos);
        var isSelected = (stage.selectedId != null && (stage.selectedId === id || stage.isDescendant(stage.selectedId, id)));
        var shouldShowInterior = isSelected || (distSq < maxDistSq);

        var children = (stage.nodes || []).filter(function (c) { return c.parent_id === id; });
        children.forEach(function (cNode) {
          var cEntry = stage.entries.get(cNode.id);
          if (cEntry && cEntry.group) {
            cEntry.group.visible = shouldShowInterior;
          }
        });
      });
    }

    function frame(now) {
      requestAnimationFrame(frame);
      updateLod(now);
      stage.updateScreens(now);
      if (tween) {
        var k = Math.min(1, (now - tween.t0) / tween.dur);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        camera.position.lerpVectors(tween.fromP, tween.toP, e);
        orbit.target.lerpVectors(tween.fromT, tween.toT, e);
        if (k >= 1) { tween = null; }
      }
      orbit.update();
      var sel = stage.selectedId != null ? stage.entries.get(stage.selectedId) : null;
      if (sel) {
        selBox.setFromObject(sel.body);
        selHelper.visible = !selBox.isEmpty();
      } else {
        selHelper.visible = false;
      }
      handleGroup.children.forEach(function (m) {
        m.scale.setScalar(Math.max(0.15, camera.position.distanceTo(m.position) * 0.011));
      });
      frameCallbacks.forEach(function (fn) { fn(now); });
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return stage;
  }

  global.K3D = { TYPES: TYPES, AREA: AREA, labelOf: labelOf, ALLOWED_PARENT: ALLOWED_PARENT, createStage: createStage, r2: r2, r3: r3 };
})(window);
