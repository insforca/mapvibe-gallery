/**
 * MapVibe Gallery
 * Recreation of Kamimae 365days interactive experience
 *
 * Architecture:
 *  - Void space: dark floor, gradient horizon (CSS), fog
 *  - Artworks in a straight horizontal line (X-axis)
 *  - Scroll → camera.x lateral strafe via lerp
 *  - Per-artwork: spotlight + volumetric cone mesh
 *  - Particles: floating dust motes
 *  - Raycaster: hover (scale) + click (focus)
 *  - Overview mode: bird-eye 45° pull-back
 *  - GSAP tweens for all transitions
 */
(function () {
  "use strict";

  // ── Artwork catalogue ──────────────────────────────────────────────────────
  const ARTWORKS = [
    { file: "mv-a1b613ff7978.jpg",          title: "Urban Cartography I",    city: "London" },
    { file: "mv-57ce3abe58be.jpg",           title: "Urban Cartography II",   city: "Paris" },
    { file: "mv-aa3f41eb0ae3.jpg",           title: "Metropolitan Lines",     city: "New York" },
    { file: "mv-067904951f24.jpg",           title: "City Grid",              city: "Tokyo" },
    { file: "mv-6e944f6a8d46.jpg",           title: "Street Patterns",        city: "Barcelona" },
    { file: "mv-a0ed9a140f98.jpg",           title: "Night Circuit",          city: "Dubai" },
    { file: "mv-8272c20f5b5e.jpg",           title: "Neon Lattice",           city: "Miami" },
    { file: "mv-140964aeb845.jpg",           title: "District Lines",         city: "Amsterdam" },
    { file: "mv-4a2511d925ec.jpg",           title: "Cartographic Study",     city: "Seoul" },
    { file: "barcelona_med_vibes_mockup.jpg", title: "Barcelona Med Vibes",   city: "Barcelona" },
  ];
  const N = ARTWORKS.length;

  // ── Layout constants ───────────────────────────────────────────────────────
  const ART_SPACING = 5.8;           // X gap between frame centres
  const ART_W       = 2.4;           // Frame width
  const ART_H       = 3.0;           // Frame height
  const ART_Y       = 0.4;           // Frame centre Y (above floor)
  const FLOOR_Y     = ART_Y - ART_H / 2 - 0.02;  // just below bottom of frame
  const HALF_SPAN   = ((N - 1) / 2) * ART_SPACING; // = 26.1

  const artX = (i) => -HALF_SPAN + i * ART_SPACING;

  // Camera gallery rail
  const CAM_Y_DEFAULT  = ART_Y + 0.15;       // eye level
  const CAM_Z_DEFAULT  = 4.8;               // distance from artworks
  const CAM_X_MIN      = artX(0) - 3;
  const CAM_X_MAX      = artX(N - 1) + 3;

  // ── Scene / Renderer ───────────────────────────────────────────────────────
  const canvas   = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050507, 0.028);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 300);
  camera.position.set(CAM_X_MIN, CAM_Y_DEFAULT, CAM_Z_DEFAULT);
  camera.lookAt(CAM_X_MIN, ART_Y, 0);

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  onResize();
  window.addEventListener("resize", onResize);

  // ── Floor ──────────────────────────────────────────────────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d12,
    roughness: 0.5,
    metalness: 0.35,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 80),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // Thin gold centerline
  const lineGeo = new THREE.PlaneGeometry(HALF_SPAN * 2 + 10, 0.025);
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xC9A96E, transparent: true, opacity: 0.35
  });
  const centerLine = new THREE.Mesh(lineGeo, lineMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.y = FLOOR_Y + 0.002;
  scene.add(centerLine);

  // ── Lights ─────────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0x10141f, 1.2);
  scene.add(ambientLight);

  // Fill light from front
  const fillLight = new THREE.DirectionalLight(0x1a2035, 0.4);
  fillLight.position.set(0, 4, 8);
  scene.add(fillLight);

  // ── Artwork frames + spot/cone per artwork ─────────────────────────────────
  const textureLoader = new THREE.TextureLoader();
  const frameMeshes = [];    // for raycasting
  const artGroups   = [];    // for hover/focus animations

  const FRAME_BORDER = 0.06;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e12,
    roughness: 0.85,
    metalness: 0.1,
  });
  // Thin gold edge
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xC9A96E33,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0xC9A96E,
    emissiveIntensity: 0.08,
  });

  // Cone material (volumetric light)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff8e8,
    transparent: true,
    opacity: 0.055,
    side: THREE.BackSide,
    depthWrite: false,
  });

  let loadedCount = 0;
  const ringArc  = document.getElementById("ring-arc");
  const pctText  = document.getElementById("pct-text");
  const CIRC     = 2 * Math.PI * 25; // 157

  function updateLoader(count) {
    const pct = count / N;
    ringArc.style.strokeDashoffset = CIRC * (1 - pct);
    pctText.textContent = Math.round(pct * 100) + "%";
    if (count === N) {
      setTimeout(() => {
        document.getElementById("loader").classList.add("out");
        document.getElementById("brand").classList.add("show");
        document.getElementById("controls-hint").classList.add("show");
        document.getElementById("btn-overview").classList.add("show");
        // Fly-in entrance
        flyInEntrance();
      }, 500);
    }
  }

  ARTWORKS.forEach((art, i) => {
    const x = artX(i);
    const group = new THREE.Group();
    group.position.set(x, ART_Y, 0);
    group.userData = { index: i, baseX: x, baseY: ART_Y, baseZ: 0, scale: 1 };
    scene.add(group);
    artGroups.push(group);

    // ── Outer thin gold strip (2px edge)
    const edgeGeo = new THREE.BoxGeometry(ART_W + FRAME_BORDER * 2 + 0.015,
                                           ART_H + FRAME_BORDER * 2 + 0.015, 0.01);
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.position.z = -0.005;
    group.add(edgeMesh);

    // ── Black frame surround
    const frameGeo = new THREE.BoxGeometry(ART_W + FRAME_BORDER * 2,
                                            ART_H + FRAME_BORDER * 2, 0.045);
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.castShadow = true;
    group.add(frameMesh);

    // ── Image plane
    const imgGeo = new THREE.PlaneGeometry(ART_W, ART_H);
    const imgMat = new THREE.MeshStandardMaterial({
      color: 0x222228,
      roughness: 0.6,
      metalness: 0.0,
    });
    const imgMesh = new THREE.Mesh(imgGeo, imgMat);
    imgMesh.position.z = 0.025;
    imgMesh.castShadow = false;
    group.add(imgMesh);
    frameMeshes.push({ mesh: imgMesh, index: i });

    // Load texture
    textureLoader.load(
      `images/${art.file}`,
      (tex) => {
        tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        imgMat.map = tex;
        imgMat.color.set(0xffffff);
        imgMat.needsUpdate = true;
        loadedCount++;
        updateLoader(loadedCount);
      },
      undefined,
      () => { loadedCount++; updateLoader(loadedCount); }
    );

    // ── Spotlight above each artwork
    const spot = new THREE.SpotLight(0xfff5e0, 1.8);
    spot.position.set(x, ART_Y + 3.5, 0.8);
    spot.angle = 0.38;
    spot.penumbra = 0.65;
    spot.decay = 1.6;
    spot.distance = 7;
    spot.castShadow = true;
    spot.shadow.mapSize.set(256, 256);
    const tgt = new THREE.Object3D();
    tgt.position.set(x, ART_Y, 0);
    scene.add(tgt);
    spot.target = tgt;
    scene.add(spot);

    // ── Volumetric cone
    const coneHeight = 3.6;
    const coneGeo = new THREE.ConeGeometry(0.95, coneHeight, 18, 1, true);
    const cone = new THREE.Mesh(coneGeo, coneMat.clone());
    // Apex up, base down → ConeGeometry default is apex UP (+Y), base DOWN (−Y)
    // We want apex near spotlight, base near artwork
    // Spot is at ART_Y + 3.5, artwork at ART_Y
    // Center cone at ART_Y + 3.5 - coneHeight/2
    cone.position.set(x, ART_Y + 3.5 - coneHeight / 2, 0.4);
    cone.renderOrder = 1;
    scene.add(cone);
  });

  // ── Particle System ────────────────────────────────────────────────────────
  (function buildParticles() {
    const COUNT = 280;
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * (HALF_SPAN * 2 + 20);
      pos[i * 3 + 1] = FLOOR_Y + Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      spd[i]         = 0.002 + Math.random() * 0.004;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo._spd = spd;

    const mat = new THREE.PointsMaterial({
      color: 0xfff5e0,
      size: 0.025,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    window._particles = pts;
  })();

  // ── Camera state & scroll ──────────────────────────────────────────────────
  const cam = {
    targetX:   CAM_X_MIN,
    currentX:  CAM_X_MIN,
    targetY:   CAM_Y_DEFAULT,
    currentY:  CAM_Y_DEFAULT,
    targetZ:   CAM_Z_DEFAULT,
    currentZ:  CAM_Z_DEFAULT,
    lookY:     ART_Y,
    lookZ:     0,
    lerp:      0.08,
  };

  let overviewMode = false;
  let focusedIndex = -1;
  let lastHovered  = -1;
  let scrollX      = 0; // 0..1
  const breathe    = { y: 0, z: 0 };

  // Breathing idle sway
  setInterval(() => {
    gsap.to(breathe, {
      y: (Math.random() - 0.5) * 0.06,
      z: (Math.random() - 0.5) * 0.04,
      duration: 3 + Math.random() * 2,
      ease: "sine.inOut",
    });
  }, 3000);

  // ── Fly-in entrance ─────────────────────────────────────────────────────────
  function flyInEntrance() {
    // All artworks start 40 units behind (Z=-40), fly to Z=0
    artGroups.forEach((g, i) => {
      g.position.z = -40;
      g.userData.flownIn = false;
      gsap.to(g.position, {
        z: 0,
        duration: 1.6,
        delay: i * 0.085,
        ease: "expo.out",
        onComplete: () => { g.userData.flownIn = true; },
      });
    });
    // Camera: start centered, then let scroll take over
    gsap.fromTo(cam,
      { targetX: 0, currentX: 0 },
      { targetX: CAM_X_MIN, duration: 0, onComplete: () => {
        cam.currentX = CAM_X_MIN;
        camera.position.x = CAM_X_MIN;
      }
    });
  }

  // ── Scroll handler ─────────────────────────────────────────────────────────
  let scrollAccum = 0;
  const SCROLL_SPEED = 0.0012;

  window.addEventListener("wheel", (e) => {
    if (overviewMode || focusedIndex >= 0) return;
    scrollAccum += e.deltaY * SCROLL_SPEED;
    scrollAccum = Math.max(0, Math.min(1, scrollAccum));
    updateScrollX(scrollAccum);
  }, { passive: true });

  // Touch support
  let touchStartX = 0;
  window.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (overviewMode || focusedIndex >= 0) return;
    const dx = touchStartX - e.touches[0].clientX;
    touchStartX = e.touches[0].clientX;
    scrollAccum += dx * 0.003;
    scrollAccum = Math.max(0, Math.min(1, scrollAccum));
    updateScrollX(scrollAccum);
  }, { passive: true });

  // Arrow keys
  window.addEventListener("keydown", (e) => {
    if (focusedIndex >= 0 && e.key === "Escape") { unfocus(); return; }
    if (overviewMode && e.key === "Escape") { exitOverview(); return; }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      scrollAccum = Math.min(1, scrollAccum + 0.08);
      updateScrollX(scrollAccum);
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      scrollAccum = Math.max(0, scrollAccum - 0.08);
      updateScrollX(scrollAccum);
    }
  });

  function updateScrollX(t) {
    scrollX = t;
    cam.targetX = CAM_X_MIN + t * (CAM_X_MAX - CAM_X_MIN);
    document.getElementById("prog").style.width = (t * 100) + "%";
    updateNearestInfo();
  }

  function updateNearestInfo() {
    if (focusedIndex >= 0) return;
    let nearest = 0, dist = Infinity;
    artGroups.forEach((g, i) => {
      const d = Math.abs(cam.targetX - artX(i));
      if (d < dist) { dist = d; nearest = i; }
    });
    if (dist < ART_SPACING * 0.6) {
      showArtworkInfo(nearest);
    } else {
      document.getElementById("artwork-info").classList.remove("show");
    }
  }

  function showArtworkInfo(i) {
    const art = ARTWORKS[i];
    document.getElementById("aw-num").textContent = `${String(i + 1).padStart(2, "0")} / ${N}`;
    document.getElementById("aw-title").textContent = art.title;
    document.getElementById("aw-city").textContent = art.city;
    document.getElementById("artwork-info").classList.add("show");
  }

  // ── Raycaster: hover + click ────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2(-9, -9);

  window.addEventListener("mousemove", (e) => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("click", () => {
    if (overviewMode) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(frameMeshes.map(f => f.mesh));
    if (hits.length > 0) {
      const idx = frameMeshes.find(f => f.mesh === hits[0].object)?.index;
      if (idx !== undefined) {
        focusedIndex >= 0 ? unfocus() : focusArtwork(idx);
      }
    } else if (focusedIndex >= 0) {
      unfocus();
    }
  });

  function focusArtwork(i) {
    focusedIndex = i;
    showArtworkInfo(i);
    document.getElementById("focus-overlay").classList.add("active");
    const fx = artX(i);
    gsap.to(cam, {
      targetX: fx, targetZ: CAM_Z_DEFAULT - 2.2,
      duration: 1.1, ease: "power3.inOut"
    });
    // Scale up selected, push back others
    artGroups.forEach((g, j) => {
      gsap.to(g.scale, {
        x: j === i ? 1.04 : 0.96,
        y: j === i ? 1.04 : 0.96,
        z: 1,
        duration: 0.8, ease: "power2.out"
      });
      gsap.to(g.position, {
        z: j === i ? 0.15 : -0.1,
        duration: 0.8, ease: "power2.out"
      });
    });
  }

  function unfocus() {
    focusedIndex = -1;
    document.getElementById("focus-overlay").classList.remove("active");
    artGroups.forEach((g) => {
      gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "power2.out" });
      gsap.to(g.position, { z: 0, duration: 0.6, ease: "power2.out" });
    });
    gsap.to(cam, { targetZ: CAM_Z_DEFAULT, duration: 0.8, ease: "power2.inOut" });
  }

  // ── Overview mode ──────────────────────────────────────────────────────────
  const btn = document.getElementById("btn-overview");
  btn.addEventListener("click", () => {
    overviewMode ? exitOverview() : enterOverview();
  });

  function enterOverview() {
    overviewMode = true;
    btn.classList.add("active");
    btn.textContent = "Close";
    gsap.to(cam, {
      targetX: 0,
      targetY: 18,
      targetZ: 12,
      lookY: ART_Y,
      lookZ: -8,
      lerp: 0.05,
      duration: 1.6, ease: "power3.inOut"
    });
    gsap.to(scene.fog, { density: 0.012, duration: 1.2 });
    document.getElementById("artwork-info").classList.remove("show");
  }

  function exitOverview() {
    overviewMode = false;
    btn.classList.remove("active");
    btn.textContent = "Overview";
    gsap.to(cam, {
      targetY: CAM_Y_DEFAULT,
      targetZ: CAM_Z_DEFAULT,
      lookY: ART_Y,
      lookZ: 0,
      lerp: 0.08,
      duration: 1.3, ease: "power3.inOut"
    });
    gsap.to(scene.fog, { density: 0.028, duration: 1.2 });
    updateNearestInfo();
  }

  // ── Hover: subtle scale ────────────────────────────────────────────────────
  function checkHover() {
    if (focusedIndex >= 0 || overviewMode) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(frameMeshes.map(f => f.mesh));
    const hoveredIdx = hits.length > 0
      ? (frameMeshes.find(f => f.mesh === hits[0].object)?.index ?? -1)
      : -1;

    if (hoveredIdx !== lastHovered) {
      if (lastHovered >= 0) {
        gsap.to(artGroups[lastHovered].scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
        gsap.to(artGroups[lastHovered].position, { z: 0, duration: 0.4 });
      }
      if (hoveredIdx >= 0) {
        gsap.to(artGroups[hoveredIdx].scale, { x: 1.025, y: 1.025, z: 1, duration: 0.35 });
        gsap.to(artGroups[hoveredIdx].position, { z: 0.12, duration: 0.35 });
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
      lastHovered = hoveredIdx;
    }
  }

  // ── Animate particles ──────────────────────────────────────────────────────
  function animateParticles(dt) {
    const pts = window._particles;
    if (!pts) return;
    const pos = pts.geometry.attributes.position;
    const spd = pts.geometry._spd;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i * 3 + 1] += spd[i];
      if (pos.array[i * 3 + 1] > FLOOR_Y + 7) {
        pos.array[i * 3 + 1] = FLOOR_Y;
      }
      pos.array[i * 3] += Math.sin(Date.now() * 0.0003 + i) * 0.0008;
    }
    pos.needsUpdate = true;
  }

  // ── Render loop ────────────────────────────────────────────────────────────
  let lastTime = 0;
  function animate(time) {
    requestAnimationFrame(animate);
    const dt = time - lastTime;
    lastTime = time;

    const lf = cam.lerp;
    cam.currentX += (cam.targetX - cam.currentX) * lf;
    cam.currentY += (cam.targetY - cam.currentY) * lf;
    cam.currentZ += (cam.targetZ - cam.currentZ) * lf;

    camera.position.set(
      cam.currentX,
      cam.currentY + breathe.y,
      cam.currentZ + breathe.z
    );
    camera.lookAt(cam.currentX, cam.lookY + breathe.y * 0.3, cam.lookZ);

    checkHover();
    animateParticles(dt);
    renderer.render(scene, camera);
  }
  animate(0);

})();
