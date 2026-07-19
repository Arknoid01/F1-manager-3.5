// ============================================================
//  F1 Manager — circuit-viz.js
//  Aperçu 3D Monaco (circuit showcase unique)
//  Modes : race | quali | static
// ============================================================

const CircuitViz = (function () {

  /* ── Monaco stylisé — boucle fermée sans croisement ──
     Ligne droite départ → montée Ste Dévote/Casino (droite)
     → chicane du port (bosse) → épingle du Loews (encoche gauche)
     → retour ligne droite. (x, élévation, z)                    */
  const RAW_POINTS = [
    [-14, 0.0, -8], [-6, 0.0, -11], [3, 0.0, -12], [10, 0.1, -11],
    [14, 0.25, -7], [15, 0.45, -2], [13, 0.6, 3], [14, 0.5, 8],
    [10, 0.35, 12], [4, 0.2, 13], [-2, 0.15, 14], [-8, 0.2, 12],
    [-12, 0.3, 8], [-10, 0.45, 4], [-6, 0.55, 3], [-5, 0.5, 0],
    [-8, 0.35, -2], [-13, 0.15, -4], [-14, 0.0, -8]
  ];
  /* Centre du tracé pour cadrer la caméra sur l'origine */
  const CX = 0.5, CZ = 1, ELEV = 0.6;

  const TEAM_COLORS = {
    mclaren: '#FF8000', ferrari: '#CC0000', redbull: '#1E3A6E', mercedes: '#00D2BE',
    aston: '#006F62', alpine: '#0090FF', williams: '#005AFF', haas: '#E8002D',
    sauber: '#BB0000', racingbulls: '#6692FF', cadillac: '#6F6F78'
  };

  const ROAD_W = 1.9;

  let active = false, ready = false, trackBuilt = false, mode = 'static';
  let container = null, canvas = null;
  let renderer, scene, camera, curve3D;
  let carMeshes = [], carTrails = [], sparkSys = null, sparkVels = [];
  let rafId = null;
  let _theta = 0.55, _phi = 0.42, _r = 46;
  let _tTheta = 0.55, _tPhi = 0.42, _tR = 46;
  let _dTheta = 0, _dPhi = 0, _dR = 0;
  let _autoOrbit = true;
  let _raceSync = null;
  let _lastLeaderFrac = 0, _lastLapStartT = 0;
  let _qualiAnim = null;
  let _isMobile = false;
  const TRAIL_LEN = 18, SPARK_N = 24;

  function getCurve() {
    return new THREE.CatmullRomCurve3(
      RAW_POINTS.map(p => new THREE.Vector3(p[0] - CX, p[1] * ELEV, p[2] - CZ)),
      true, 'catmullrom', 0.42
    );
  }

  function tag(m) { m.userData.cvTrack = true; return m; }
  function add(m) { scene.add(tag(m)); return m; }

  /* ── Géométrie ruban plat le long de la courbe ──
     offset : décalage latéral du centre du ruban
     width  : largeur du ruban                        */
  function ribbonGeometry(curve, width, offset, yOff, segments) {
    const half = width / 2;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const cx = p.x + n.x * offset, cz = p.z + n.z * offset;
      pos.push(cx - n.x * half, p.y + yOff, cz - n.z * half);
      pos.push(cx + n.x * half, p.y + yOff, cz + n.z * half);
      uv.push(0, t * 90, 1, t * 90);
      if (i < segments) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* Ruban partiel entre t0 et t1 (pour les vibreurs) */
  function ribbonSegmentGeometry(curve, width, offset, yOff, t0, t1, segments) {
    const half = width / 2;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const t = (t0 + (t1 - t0) * (i / segments) + 1) % 1;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const cx = p.x + n.x * offset, cz = p.z + n.z * offset;
      pos.push(cx - n.x * half, p.y + yOff, cz - n.z * half);
      pos.push(cx + n.x * half, p.y + yOff, cz + n.z * half);
      const v = (t1 - t0) * (i / segments) * 220;
      uv.push(0, v, 1, v);
      if (i < segments) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function stripeTexture() {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 8;
    const x = c.getContext('2d');
    x.fillStyle = '#d92b2b'; x.fillRect(0, 0, 16, 8);
    x.fillStyle = '#eeeeee'; x.fillRect(16, 0, 16, 8);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function checkerTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 16;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      x.fillStyle = (i + j) % 2 ? '#111' : '#eee';
      x.fillRect(i * 8, j * 8, 8, 8);
    }
    return new THREE.CanvasTexture(c);
  }

  function initThree() {
    if (ready || typeof THREE === 'undefined') return;
    canvas = container.querySelector('canvas') || document.createElement('canvas');
    if (canvas.parentElement !== container) container.appendChild(canvas);
    _isMobile = window.innerWidth < 760 || 'ontouchstart' in window;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, _isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = !_isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030510);
    scene.fog = new THREE.FogExp2(0x030610, 0.009);

    camera = new THREE.PerspectiveCamera(46, 16 / 10, 0.1, 400);

    scene.add(new THREE.AmbientLight(0x16244a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
    sun.position.set(14, 42, 20);
    if (!_isMobile) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
      sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    }
    scene.add(sun);
    const back = new THREE.DirectionalLight(0x2b5bff, 0.5);
    back.position.set(-18, 14, -14);
    scene.add(back);
    scene.add(new THREE.HemisphereLight(0x0c1c36, 0x050812, 0.6));

    if (!_isMobile) {
      const starPos = new Float32Array(700 * 3);
      for (let i = 0; i < 700; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 300;
        starPos[i * 3 + 1] = Math.random() * 60 + 10;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.55 })));
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_N * 3), 3));
    sparkSys = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffcc22, size: 0.09, transparent: true, opacity: 0.85 }));
    scene.add(sparkSys);
    sparkVels = Array.from({ length: SPARK_N }, () => ({ x: 0, y: 0, z: 0, life: 0 }));

    initOrbit(canvas);
    ready = true;
    resize();
  }

  function buildTrack() {
    if (trackBuilt) return;
    trackBuilt = true;
    curve3D = getCurve();

    /* ── SOL ── */
    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 1 })
    );
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.y = -0.18;
    gnd.receiveShadow = true;
    add(gnd);

    const grid = new THREE.GridHelper(300, 50, 0x0b1a34, 0x081024);
    grid.position.y = -0.15;
    add(grid);

    /* ── PORT — plan d'eau au-delà du virage du port ── */
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 34),
      new THREE.MeshStandardMaterial({ color: 0x0a2545, roughness: 0.15, metalness: 0.7, emissive: 0x06182f, emissiveIntensity: 0.5 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.12, 32);
    add(water);
    /* Quelques yachts */
    [[-10, 26], [-2, 29], [7, 25], [14, 28]].forEach(([yx, yz]) => {
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.35, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xdde4ee, roughness: 0.35, emissive: 0x223044, emissiveIntensity: 0.3 })
      );
      hull.position.set(yx, 0.1, yz);
      hull.rotation.y = (Math.random() - 0.5) * 0.8;
      add(hull);
    });

    /* ── HALO diffus sous la piste ── */
    const glow = new THREE.Mesh(
      ribbonGeometry(curve3D, 4.2, 0, -0.06, 260),
      new THREE.MeshBasicMaterial({ color: 0x14337a, transparent: true, opacity: 0.10, depthWrite: false })
    );
    add(glow);

    /* ── Ombre portée sous la route ── */
    add(new THREE.Mesh(
      ribbonGeometry(curve3D, ROAD_W + 0.55, 0, -0.015, 300),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })
    ));

    /* ── ROUTE plate ── */
    const road = new THREE.Mesh(
      ribbonGeometry(curve3D, ROAD_W, 0, 0.02, 380),
      new THREE.MeshStandardMaterial({ color: 0x232b38, roughness: 0.85, metalness: 0.04, emissive: 0x070a12, emissiveIntensity: 0.5 })
    );
    road.receiveShadow = true;
    add(road);

    /* ── Lignes blanches de bord ── */
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8dee8, transparent: true, opacity: 0.85 });
    add(new THREE.Mesh(ribbonGeometry(curve3D, 0.07, ROAD_W / 2 - 0.06, 0.045, 300), lineMat));
    add(new THREE.Mesh(ribbonGeometry(curve3D, 0.07, -(ROAD_W / 2 - 0.06), 0.045, 300), lineMat));

    /* ── VIBREURS rouge/blanc dans les virages ── */
    const kerbTex = stripeTexture();
    const kerbMat = new THREE.MeshBasicMaterial({ map: kerbTex });
    /* Détection de courbure */
    const zones = [];
    let inZone = false, zStart = 0;
    const STEPS = 220;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const t1 = curve3D.getTangent((t - 0.006 + 1) % 1);
      const t2 = curve3D.getTangent((t + 0.006) % 1);
      const curv = t1.angleTo(t2);
      if (curv > 0.10 && !inZone) { inZone = true; zStart = t; }
      else if (curv <= 0.10 && inZone) {
        inZone = false;
        if (t - zStart > 0.008) zones.push([zStart, t]);
      }
    }
    if (inZone) zones.push([zStart, 1]);
    zones.forEach(([a, b]) => {
      [ROAD_W / 2 + 0.13, -(ROAD_W / 2 + 0.13)].forEach(off => {
        add(new THREE.Mesh(
          ribbonSegmentGeometry(curve3D, 0.24, off, 0.035, a - 0.004, b + 0.004, 26),
          kerbMat
        ));
      });
    });

    /* ── LIGNE D'ARRIVÉE en damier ── */
    const slP = curve3D.getPoint(0), slT = curve3D.getTangent(0);
    const checker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, ROAD_W - 0.1),
      new THREE.MeshBasicMaterial({ map: checkerTexture() })
    );
    checker.rotation.x = -Math.PI / 2;
    checker.rotation.z = -Math.atan2(slT.x, slT.z);
    checker.position.set(slP.x, slP.y + 0.055, slP.z);
    add(checker);

    /* ── SECTEURS — fins néons extérieurs ── */
    function addSector(from, to, color) {
      add(new THREE.Mesh(
        ribbonSegmentGeometry(curve3D, 0.06, ROAD_W / 2 + 0.48, 0.03, from, to, 70),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
      ));
    }
    addSector(0.005, 0.33, 0x44ccff);
    addSector(0.335, 0.66, 0xcc44ff);
    addSector(0.665, 0.995, 0xffcc22);

    /* ── BARRIÈRES ── */
    function addBarrier(offset) {
      const pts = [], N = 200;
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve3D.getPoint(t), tan = curve3D.getTangent(t);
        const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(offset);
        pts.push(new THREE.Vector3(p.x + n.x, p.y + 0.16, p.z + n.z));
      }
      const bc = new THREE.CatmullRomCurve3(pts, true);
      add(new THREE.Mesh(
        new THREE.TubeGeometry(bc, N, 0.035, 5, true),
        new THREE.MeshStandardMaterial({ color: 0x9fb2c8, roughness: 0.4, metalness: 0.6 })
      ));
    }
    addBarrier(ROAD_W / 2 + 0.75);
    addBarrier(-(ROAD_W / 2 + 0.75));

    /* ── BÂTIMENTS Monaco — intérieur de la boucle + extérieurs ── */
    const bldCols = [0x0b1322, 0x091019, 0x0d172b];
    [[2, -4, 2.6, 3.2, 6], [7, 2, 2.2, 2.8, 4.5], [-1, 6, 2.8, 3.4, 7], [5, -8, 1.8, 2.2, 3.5],
     [19, -6, 2.2, 3, 5], [20, 6, 1.8, 2.4, 4], [-18, 2, 2.4, 3, 5.5], [-17, -8, 1.8, 2.2, 3.5]].forEach((b, bi) => {
      const h = b[4];
      const bm = new THREE.Mesh(
        new THREE.BoxGeometry(b[2], h, b[3]),
        new THREE.MeshStandardMaterial({ color: bldCols[bi % 3], roughness: 0.95, emissive: 0x050a14, emissiveIntensity: 0.4 })
      );
      bm.position.set(b[0] - CX, h / 2 - 0.1, b[1] - CZ);
      bm.castShadow = !_isMobile;
      add(bm);
      /* Fenêtres éclairées */
      if (!_isMobile) {
        const rows = Math.max(2, Math.floor(h / 1.1));
        for (let wr = 0; wr < rows; wr++) {
          if (Math.random() < 0.4) continue;
          const wm = new THREE.Mesh(
            new THREE.PlaneGeometry(b[2] * 0.7, 0.12),
            new THREE.MeshBasicMaterial({ color: [0xffe9b0, 0xb8d4ff][wr % 2], transparent: true, opacity: 0.22 + Math.random() * 0.2, side: THREE.DoubleSide })
          );
          wm.position.set(b[0] - CX, 0.5 + wr * 1.0, b[1] - CZ + b[3] / 2 + 0.02);
          add(wm);
        }
      }
    });

    /* ── TRIBUNES ── */
    function stand(x, z, ry, w) {
      const g = new THREE.Group();
      g.userData.cvTrack = true;
      for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(w, 0.1, 0.42),
          new THREE.MeshStandardMaterial({ color: s % 2 ? 0x16233a : 0x1b2c4a, emissive: 0x030710, emissiveIntensity: 0.5 })
        );
        step.position.set(0, 0.1 + s * 0.14, -0.5 + s * 0.36);
        g.add(step);
      }
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.15, 0.03, 1.3),
        new THREE.MeshBasicMaterial({ color: 0x1a4bbf, transparent: true, opacity: 0.22 })
      );
      roof.position.set(0, 0.72, 0);
      g.add(roof);
      g.position.set(x - CX, 0, z - CZ);
      g.rotation.y = ry;
      scene.add(g);
    }
    stand(-2, -16, 0, 8);
    stand(18, 1, 1.5, 5);
    stand(-4, 18, Math.PI, 6);

    /* ── LAMPADAIRES LED ── */
    if (!_isMobile) {
      [0.04, 0.18, 0.34, 0.5, 0.66, 0.82].forEach((f, fi) => {
        const lp = curve3D.getPoint(f), lt = curve3D.getTangent(f);
        const ln = new THREE.Vector3(-lt.z, 0, lt.x).normalize().multiplyScalar(ROAD_W / 2 + 1.15);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.035, 0.9, 5),
          new THREE.MeshStandardMaterial({ color: 0x1d2c48, metalness: 0.6, roughness: 0.4 })
        );
        pole.position.set(lp.x + ln.x, lp.y + 0.45, lp.z + ln.z);
        add(pole);
        const lampCol = fi % 2 ? 0x5b8dff : 0xfff4d6;
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 4),
          new THREE.MeshBasicMaterial({ color: lampCol })
        );
        lamp.position.set(lp.x + ln.x, lp.y + 0.92, lp.z + ln.z);
        add(lamp);
        const pl = new THREE.PointLight(lampCol, 0.35, 6);
        pl.position.set(lp.x + ln.x, lp.y + 0.85, lp.z + ln.z);
        add(pl);
      });
    }
  }

  function makeCarMesh(hex) {
    const col = new THREE.Color(hex);
    const g = new THREE.Group();
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.13, 16),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.3 })
    );
    g.add(disk);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    g.add(rim);
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.24;
    g.add(halo);
    return g;
  }

  function makeTrail(hex) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.5 }));
  }

  function ensureCars(count, colors) {
    while (carMeshes.length < count) {
      const col = colors[carMeshes.length] || '#888888';
      const mesh = makeCarMesh(col);
      mesh.userData.cvCar = true;
      const trail = makeTrail(col);
      trail.userData.cvCar = true;
      scene.add(mesh);
      scene.add(trail);
      carMeshes.push({ mesh, trail });
      carTrails.push({ pts: [] });
    }
    carMeshes.forEach((e, i) => {
      e.mesh.visible = i < count;
      if (e.trail) e.trail.visible = i < count;
    });
  }

  function placeCar(idx, frac) {
    const entry = carMeshes[idx];
    if (!entry || !curve3D) return;
    const f = ((frac % 1) + 1) % 1;
    const pos = curve3D.getPoint(f);
    const tan = curve3D.getTangent(f);
    entry.mesh.position.set(pos.x, pos.y + 0.28, pos.z);
    entry.mesh.rotation.y = Math.atan2(tan.x, tan.z);
    if (entry.trail && carTrails[idx]) {
      const td = carTrails[idx];
      /* Échantillonner le long de la courbe pour que le trail suive la route
         même quand la voiture avance beaucoup entre deux frames */
      const last = td.lastFrac;
      if (last != null) {
        let delta = f - last;
        if (delta < -0.5) delta += 1;          /* passage de la ligne */
        if (delta > 0 && delta < 0.5) {
          const steps = Math.min(8, Math.max(1, Math.ceil(delta / 0.006)));
          for (let s = 1; s <= steps; s++) {
            const ft = ((last + delta * (s / steps)) % 1 + 1) % 1;
            const p = curve3D.getPoint(ft);
            td.pts.push(new THREE.Vector3(p.x, p.y + 0.22, p.z));
          }
        } else if (delta !== 0) {
          td.pts.length = 0;                    /* saut/reset : on repart */
          td.pts.push(new THREE.Vector3(pos.x, pos.y + 0.22, pos.z));
        }
      } else {
        td.pts.push(new THREE.Vector3(pos.x, pos.y + 0.22, pos.z));
      }
      td.lastFrac = f;
      while (td.pts.length > TRAIL_LEN) td.pts.shift();
      const arr = entry.trail.geometry.attributes.position.array;
      td.pts.forEach((tp, ti) => { arr[ti * 3] = tp.x; arr[ti * 3 + 1] = tp.y; arr[ti * 3 + 2] = tp.z; });
      entry.trail.geometry.attributes.position.needsUpdate = true;
      entry.trail.geometry.setDrawRange(0, td.pts.length);
    }
  }

  function getTeamColor(teamId) {
    const tid = (teamId || '').toLowerCase();
    if (TEAM_COLORS[tid]) return TEAM_COLORS[tid];
    try {
      const t = F1Data.teams.find(x => x.id === tid);
      if (t?.color) return t.color;
    } catch (e) {}
    return '#888888';
  }

  function updateRaceCars() {
    if (!_raceSync || !curve3D) return;
    const started = _raceSync.getStarted ? _raceSync.getStarted() : false;
    if (!started) return;

    const standings = _raceSync.getStandings ? _raceSync.getStandings() : [];
    if (!standings.length) return;

    const interval = _raceSync.getInterval ? _raceSync.getInterval() : 6000;
    const lapStartT = _raceSync.getLapStartTime ? _raceSync.getLapStartTime() : performance.now();
    const rs = _raceSync.getRaceState ? _raceSync.getRaceState() : null;
    const elapsed = Math.max(0, performance.now() - lapStartT);
    let leaderFrac = Math.min(0.985, elapsed / interval);
    if (rs?.finished) leaderFrac = 0.995;

    if (lapStartT !== _lastLapStartT) {
      _lastLapStartT = lapStartT;
      _lastLeaderFrac = 0;
      carTrails.forEach(t => { t.pts = []; t.lastFrac = null; });
    }
    if (leaderFrac < _lastLeaderFrac - 0.05) leaderFrac = _lastLeaderFrac + 0.002;
    _lastLeaderFrac = leaderFrac;

    const lapTime = rs?.circuit?.baseLapTime || 90;
    const colors = standings.slice(0, 20).map(c => getTeamColor(c.driver?.teamId || c.team?.id));
    ensureCars(Math.min(standings.length, 20), colors);

    standings.slice(0, carMeshes.length).forEach((car, i) => {
      if (!car || car.status === 'dnf') { carMeshes[i].mesh.visible = false; return; }
      carMeshes[i].mesh.visible = true;
      const gap = Math.max(0, Number(car.gap || 0));
      const frac = (leaderFrac - Math.max(gap / lapTime, i * 0.006) + 1) % 1;
      placeCar(i, frac);
    });

    updateTower(standings);
    updateSparks(leaderFrac);
  }

  function updateQualiCars() {
    if (!curve3D) return;
    if (!_qualiAnim) {
      /* Idle : orbite douce */
      _tTheta += 0.0022;
      return;
    }
    const t = (performance.now() - _qualiAnim.start) / _qualiAnim.duration;
    if (t >= 1) {
      placeCar(0, 0.98);
      if (_qualiAnim.car2 != null) placeCar(1, 0.94);
      _qualiAnim = null;
      return;
    }
    const eased = 1 - Math.pow(1 - Math.min(1, t), 2.2);
    placeCar(0, eased * 0.98);
    if (_qualiAnim.car2 != null) placeCar(1, Math.max(0, eased - 0.06) * 0.94);
    updateSparks(eased * 0.98);
  }

  function updateStaticCars() {
    if (!curve3D || mode !== 'static') return;
    ensureCars(1, ['#e8003d']);
    placeCar(0, (performance.now() * 0.00004) % 1);
  }

  function updateSparks(frac) {
    if (!sparkSys || !curve3D) return;
    const lp = curve3D.getPoint(frac % 1);
    const arr = sparkSys.geometry.attributes.position.array;
    sparkVels.forEach((v, si) => {
      v.life -= 0.04;
      if (v.life <= 0) {
        arr[si * 3] = lp.x + (Math.random() - 0.5) * 0.3;
        arr[si * 3 + 1] = lp.y + 0.3;
        arr[si * 3 + 2] = lp.z + (Math.random() - 0.5) * 0.3;
        v.x = (Math.random() - 0.5) * 0.1;
        v.y = Math.random() * 0.05 + 0.02;
        v.z = (Math.random() - 0.5) * 0.1;
        v.life = Math.random() * 0.7 + 0.2;
      } else {
        arr[si * 3] += v.x * 0.5;
        arr[si * 3 + 1] += v.y * 0.35;
        arr[si * 3 + 2] += v.z * 0.5;
      }
    });
    sparkSys.geometry.attributes.position.needsUpdate = true;
  }

  function updateTower(standings) {
    const rows = document.getElementById('cv-tower-rows');
    if (!rows || !standings?.length) return;
    let pid = '';
    try { pid = (Save.load()?.playerTeamId || '').toLowerCase(); } catch (e) {}
    rows.innerHTML = standings.slice(0, 5).map(car => {
      const tid = (car.driver?.teamId || '').toLowerCase();
      const col = TEAM_COLORS[tid] || '#555';
      const isP = tid === pid;
      return `<div style="display:grid;grid-template-columns:16px 1fr auto;gap:4px;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.04);${isP ? 'background:rgba(255,255,255,.06);border-left:2px solid ' + col : ''}">
        <span style="font-size:9px;color:rgba(255,255,255,.35)">${car.position || '—'}</span>
        <span style="font-size:10px;font-weight:700;color:#e8ecf5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(car.driver?.name || '').toUpperCase().slice(0, 3)}</span>
        <span style="font-size:8px;color:rgba(255,255,255,.4)">${car.position === 1 ? 'LED' : (car.gap != null ? '+' + Number(car.gap).toFixed(1) + 's' : '—')}</span>
      </div>`;
    }).join('');
  }

  function updateCam() {
    if (_autoOrbit && mode === 'static') _tTheta += 0.0035;
    _tTheta += _dTheta * 0.04;
    _tPhi = Math.max(0.15, Math.min(1.05, _tPhi + _dPhi * 0.025));
    _tR = Math.max(18, Math.min(70, _tR + _dR * 0.5));
    _theta += (_tTheta - _theta) * 0.08;
    _phi += (_tPhi - _phi) * 0.08;
    _r += (_tR - _r) * 0.08;
    camera.position.set(
      _r * Math.sin(_phi) * Math.sin(_theta),
      _r * Math.cos(_phi),
      _r * Math.sin(_phi) * Math.cos(_theta)
    );
    camera.lookAt(0, 0.2, 0);
  }

  function initOrbit(el) {
    let pDist = 0, pR0 = 0;
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pDist = Math.sqrt(dx * dx + dy * dy);
        pR0 = _tR;
        _autoOrbit = false;
      }
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        _tR = Math.max(18, Math.min(70, pR0 * (pDist / Math.sqrt(dx * dx + dy * dy))));
      }
    }, { passive: true });
    el.addEventListener('wheel', e => { _tR = Math.max(18, Math.min(70, _tR + e.deltaY * 0.04)); _autoOrbit = false; }, { passive: true });
  }

  function buildUI() {
    const old = container.querySelector('.circuit-viz-ui');
    if (old) old.remove();
    const ui = document.createElement('div');
    ui.className = 'circuit-viz-ui';
    const btns = [
      { r: 1, c: 1, icon: '＋', s: () => { _dR = -1; _autoOrbit = false; }, e: () => { _dR = 0; } },
      { r: 1, c: 2, icon: '▲', s: () => { _dPhi = -1; _autoOrbit = false; }, e: () => { _dPhi = 0; } },
      { r: 2, c: 1, icon: '◄', s: () => { _dTheta = -1; _autoOrbit = false; }, e: () => { _dTheta = 0; } },
      { r: 2, c: 3, icon: '►', s: () => { _dTheta = 1; _autoOrbit = false; }, e: () => { _dTheta = 0; } },
      { r: 3, c: 1, icon: '－', s: () => { _dR = 1; _autoOrbit = false; }, e: () => { _dR = 0; } },
      { r: 3, c: 2, icon: '▼', s: () => { _dPhi = 1; _autoOrbit = false; }, e: () => { _dPhi = 0; } }
    ];
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.icon;
      btn.style.gridRow = b.r;
      btn.style.gridColumn = b.c;
      btn.addEventListener('mousedown', b.s);
      btn.addEventListener('mouseup', b.e);
      btn.addEventListener('mouseleave', b.e);
      btn.addEventListener('touchstart', e => { e.preventDefault(); b.s(); }, { passive: false });
      btn.addEventListener('touchend', e => { e.preventDefault(); b.e(); }, { passive: false });
      ui.appendChild(btn);
    });
    const reset = document.createElement('button');
    reset.textContent = '⌖';
    reset.className = 'cv-reset';
    reset.style.gridRow = '1';
    reset.style.gridColumn = '3';
    reset.addEventListener('click', () => { _tTheta = 0.55; _tPhi = 0.42; _tR = 46; _autoOrbit = true; });
    ui.appendChild(reset);
    container.appendChild(ui);
  }

  function buildTower() {
    const old = container.querySelector('.circuit-viz-tower');
    if (old) old.remove();
    if (mode !== 'race') return;
    const tower = document.createElement('div');
    tower.className = 'circuit-viz-tower';
    tower.innerHTML = '<div class="circuit-viz-tower-head">Classement</div><div id="cv-tower-rows"></div>';
    container.appendChild(tower);
  }

  function buildOverlays() {
    /* Le nom du circuit est déjà dans l'en-tête des panneaux course/quali */
    if (mode === 'static' && !container.querySelector('.circuit-viz-label')) {
      const lbl = document.createElement('div');
      lbl.className = 'circuit-viz-label';
      lbl.textContent = 'Circuit de Monaco';
      container.appendChild(lbl);
    }
    if (!container.querySelector('.circuit-viz-badge')) {
      const badge = document.createElement('div');
      badge.className = 'circuit-viz-badge';
      badge.textContent = '3D';
      container.appendChild(badge);
    }
  }

  function loop() {
    if (!active) { rafId = null; return; }
    rafId = requestAnimationFrame(loop);
    if (!canvas || !canvas.isConnected) return;
    updateCam();
    if (mode === 'race') updateRaceCars();
    else if (mode === 'quali') updateQualiCars();
    else updateStaticCars();
    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer || !container) return;
    const w = container.clientWidth || 400;
    const h = container.clientHeight || Math.round(w * 0.625);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return {
    init(opts = {}) {
      const sel = opts.container || '.circuit-viz-wrap';
      const newContainer = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!newContainer || typeof THREE === 'undefined') return;
      container = newContainer;

      mode = opts.mode || 'static';
      active = true;
      _autoOrbit = mode !== 'race';

      /* Le canvas peut avoir été détaché (re-render de la page) : on le remet */
      if (ready && canvas && canvas.parentElement !== container) {
        container.appendChild(canvas);
      }

      initThree();
      if (!ready) return;
      buildTrack();
      buildOverlays();
      buildUI();
      buildTower();

      if (mode === 'quali' || mode === 'static') {
        ensureCars(1, [opts.color || '#e8003d']);
        placeCar(0, 0);
      }

      requestAnimationFrame(() => {
        resize();
        if (!rafId) loop();
      });
    },

    setRaceSync(sync) {
      _raceSync = sync;
      mode = 'race';
      _autoOrbit = false;
    },

    animateLap(opts = {}) {
      mode = 'quali';
      const colors = opts.colors || [opts.color || '#e8003d'];
      ensureCars(colors.length, colors);
      carTrails.forEach(t => { t.pts = []; t.lastFrac = null; });
      _qualiAnim = {
        start: performance.now(),
        duration: opts.duration || 2800,
        car2: colors.length > 1 ? 1 : null
      };
      if (!rafId) loop();
    },

    resize() { resize(); },

    destroy() {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
})();

/* Compat race.html — alias CR3D */
const CR3D = {
  init() {
    const wrap = document.querySelector('.svg-wrap');
    if (wrap && !wrap.classList.contains('circuit-viz-wrap')) wrap.classList.add('circuit-viz-wrap');
    CircuitViz.init({ container: '.svg-wrap', mode: 'race' });
  },
  resize() { CircuitViz.resize(); }
};

window.CircuitViz = CircuitViz;
window.CR3D = CR3D;

window.addEventListener('resize', () => { if (window.CircuitViz) CircuitViz.resize(); });
