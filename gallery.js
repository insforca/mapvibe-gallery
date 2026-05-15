/**
 * MapVibe Gallery — Embedded Section
 * Three.js void gallery contained within #gallery section.
 *
 * Architecture:
 *  - Void space: dark floor, gradient horizon (CSS), fog
 *  - Artworks in a straight horizontal line (X-axis)
 *  - Scroll (inside section) → camera.x lateral strafe via lerp
 *  - Per-artwork: spotlight + volumetric cone mesh
 *  - Particles: floating dust motes
 *  - Raycaster: hover (scale) + click (focus)
 *  - Overview mode: bird-eye 45° pull-back
 *  - GSAP tweens for all transitions
 */
(function () {
  "use strict";

  // ── Artwork catalogue ──────────────────────────────────────────────────────
  const IMG = "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/";
  const ARTWORKS = [
    { file: "mv-a1b613ff7978.jpg",           title: "Urban Cartography I",    city: "London" },
    { file: "mv-57ce3abe58be.jpg",            title: "Urban Cartography II",   city: "Paris" },
    { file: "mv-aa3f41eb0ae3.jpg",            title: "Metropolitan Lines",     city: "New York" },
    { file: "mv-067904951f24.jpg",            title: "City Grid",              city: "Tokyo" },
    { file: "mv-6e944f6a8d46.jpg",            title: "Street Patterns",        city: "Barcelona" },
    { file: "mv-a0ed9a140f98.jpg",            title: "Night Circuit",          city: "Dubai" },
    { file: "mv-8272c20f5b5e.jpg",            title: "Neon Lattice",           city: "Miami" },
    { file: "mv-140964aeb845.jpg",            title: "District Lines",         city: "Amsterdam" },
    { file: "mv-4a2511d925ec.jpg",            title: "Cartographic Study",     city: "Seoul" },
    { file: "barcelona_med_vibes_mockup.jpg", title: "Barcelona Med Vibes",    city: "Barcelona" },
  ];
  const N = ARTWORKS.length;

  // ── Container references ───────────────────────────────────────────────────
  const section   = document.getElementById("gallery");
  const canvas    = document.getElementById("gl");

  // ── Layout constants ───────────────────────────────────────────────────────
  const ART_SPACING = 5.8;
  const ART_W       = 2.4;
  const ART_H       = 3.0;
  const ART_Y       = 0.4;
  const FLOOR_Y     = ART_Y - ART_H / 2 - 0.02;
  const HALF_SPAN   = ((N - 1) / 2) * ART_SPACING;

  const artX = (i) => -HALF_SPAN + i * ART_SPACING;

  // Camera gallery rail
  const CAM_Y_DEFAULT = ART_Y + 0.15;
  const CAM_Z_DEFAULT = 4.8;
  const CAM_X_MIN     = artX(0) - 3;
  const CAM_X_MAX     = artX(N - 1) + 3;

  // ── Scene / Renderer ───────────────────────────────────────────────────────
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

  function getSize() {
    return { w: section.clientWidth, h: section.clientHeight };
  }

  function onResize() {
    const { w, h } = getSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  onResize();

  const ro = new ResizeObserver(onResize);
  ro.observe(section);

  // ── Floor ──────────────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 80),
    new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.5, metalness: 0.35 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // Thin gold centerline
  const centerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_SPAN * 2 + 10, 0.025),
    new THREE.MeshBasicMaterial({ color: 0xC9A96E, transparent: true, opacity: 0.35 })
  );
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.y = FLOOR_Y + 0.002;
  scene.add(centerLine);

  // ── Lights ─────────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x10141f, 1.2));
  const fillLight = new THREE.DirectionalLight(0x1a2035, 0.4);
  fillLight.position.set(0, 4, 8);
  scene.add(fillLight);

  // ── Artwork frames ─────────────────────────────────────────────────────────
  const textureLoader = new THREE.TextureLoader();
  const frameMeshes = [];
  const artGroups   = [];

  const FRAME_BORDER = 0.06;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d0e12, roughness: 0.85, metalness: 0.1 });
  const edgeMat  = new THREE.MeshStandardMaterial({
    color: 0xC9A96E33, roughness: 0.3, metalness: 0.7,
    emissive: 0xC9A96E, emissiveIntensity: 0.08
  });
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff8e8, transparent: true, opacity: 0.055,
    side: THREE.BackSide, depthWrite: false
  });

  let loadedCount = 0;
  const ringArc  = document.getElementById("ring-arc");
  const pctText  = document.getElementById("pct-text");
  const CIRC     = 2 * Math.PI * 22; // r=22

  function updateLoader(count) {
    const pct = count / N;
    ringArc.style.strokeDashoffset = CIRC * (1 - pct);
    pctText.textContent = Math.round(pct * 100) + "%";
    if (count === N) {
      setTimeout(() => {
        document.getElementById("gl-loader").classList.add("out");
        document.getElementById("gl-section-label").classList.add("show");
        document.getElementById("gl-controls-hint").classList.add("show");
        document.getElementById("gl-btn-overview").classList.add("show");
        flyInEntrance();
      }, 500);
    }
  }

  ARTWORKS.forEach((art, i) => {
    const x = artX(i);
    const group = new THREE.Group();
    group.position.set(x, ART_Y, 0);
    group.userData = { index: i, baseX: x, baseY: ART_Y, baseZ: 0 };
    scene.add(group);
    artGroups.push(group);

    // Gold edge strip
    group.add((() => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(ART_W + FRAME_BORDER * 2 + 0.015, ART_H + FRAME_BORDER * 2 + 0.015, 0.01),
        edgeMat
      );
      m.position.z = -0.005;
      return m;
    })());

    // Black frame
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(ART_W + FRAME_BORDER * 2, ART_H + FRAME_BORDER * 2, 0.045),
      frameMat
    );
    frameMesh.castShadow = true;
    group.add(frameMesh);

    // Image plane
    const imgMat  = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.6, metalness: 0.0 });
    const imgMesh = new THREE.Mesh(new THREE.PlaneGeometry(ART_W, ART_H), imgMat);
    imgMesh.position.z = 0.025;
    group.add(imgMesh);
    frameMeshes.push({ mesh: imgMesh, index: i });

    textureLoader.load(
      IMG + art.file,
      (tex) => {
        tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        imgMat.map = tex; imgMat.color.set(0xffffff); imgMat.needsUpdate = true;
        loadedCount++; updateLoader(loadedCount);
      },
      undefined,
      () => { loadedCount++; updateLoader(loadedCount); }
    );

    // Spotlight
    const spot = new THREE.SpotLight(0xfff5e0, 1.8);
    spot.position.set(x, ART_Y + 3.5, 0.8);
    spot.angle = 0.38; spot.penumbra = 0.65;
    spot.decay = 1.6; spot.distance = 7;
    spot.castShadow = true;
    spot.shadow.mapSize.set(256, 256);
    const tgt = new THREE.Object3D();
    tgt.position.set(x, ART_Y, 0);
    scene.add(tgt); spot.target = tgt; scene.add(spot);

    // Volumetric cone
    const coneH  = 3.6;
    const cone   = new THREE.Mesh(new THREE.ConeGeometry(0.95, coneH, 18, 1, true), coneMat.clone());
    cone.position.set(x, ART_Y + 3.5 - coneH / 2, 0.4);
    cone.renderOrder = 1;
    scene.add(cone);
  });

  // ── Particle System ────────────────────────────────────────────────────────
  (function() {
    const COUNT = 280;
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * (HALF_SPAN * 2 + 20);
      pos[i*3+1] = FLOOR_Y + Math.random() * 6;
      pos[i*3+2] = (Math.random() - 0.5) * 20;
      spd[i]     = 0.002 + Math.random() * 0.004;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo._spd = spd;
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xfff5e0, size: 0.025,
      transparent: true, opacity: 0.45,
      sizeAttenuation: true, depthWrite: false
    }));
    scene.add(pts);
    window._mv_particles = pts;
  })();

  // ── Camera state ───────────────────────────────────────────────────────────
  const cam = {
    targetX: CAM_X_MIN, currentX: CAM_X_MIN,
    targetY: CAM_Y_DEFAULT, currentY: CAM_Y_DEFAULT,
    targetZ: CAM_Z_DEFAULT, currentZ: CAM_Z_DEFAULT,
    lookY: ART_Y, lookZ: 0, lerp: 0.08,
  };

  let overviewMode = false, focusedIndex = -1, lastHovered = -1;
  let scrollAccum  = 0;
  const breathe    = { y: 0, z: 0 };

  setInterval(() => {
    gsap.to(breathe, { y: (Math.random()-0.5)*0.06, z: (Math.random()-0.5)*0.04,
      duration: 3+Math.random()*2, ease: "sine.inOut" });
  }, 3000);

  // ── Fly-in ─────────────────────────────────────────────────────────────────
  function flyInEntrance() {
    artGroups.forEach((g, i) => {
      g.position.z = -40;
      gsap.to(g.position, { z: 0, duration: 1.6, delay: i * 0.085, ease: "expo.out" });
    });
    cam.targetX = cam.currentX = CAM_X_MIN;
    camera.position.x = CAM_X_MIN;
  }

  // ── Scroll (scoped to section) ─────────────────────────────────────────────
  const SCROLL_SPEED = 0.0012;

  section.addEventListener("wheel", (e) => {
    if (overviewMode || focusedIndex >= 0) return;
    e.preventDefault();
    scrollAccum += e.deltaY * SCROLL_SPEED;
    scrollAccum = Math.max(0, Math.min(1, scrollAccum));
    updateScrollX(scrollAccum);
  }, { passive: false });

  let touchStartX = 0;
  section.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  section.addEventListener("touchmove", (e) => {
    if (overviewMode || focusedIndex >= 0) return;
    const dx = touchStartX - e.touches[0].clientX;
    touchStartX = e.touches[0].clientX;
    scrollAccum += dx * 0.003;
    scrollAccum = Math.max(0, Math.min(1, scrollAccum));
    updateScrollX(scrollAccum);
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (focusedIndex >= 0 && e.key === "Escape") { unfocus(); return; }
    if (overviewMode && e.key === "Escape") { exitOverview(); return; }
    const d = e.key === "ArrowRight" || e.key === "d" ? 1 : e.key === "ArrowLeft" || e.key === "a" ? -1 : 0;
    if (d) {
      scrollAccum = Math.max(0, Math.min(1, scrollAccum + d * 0.08));
      updateScrollX(scrollAccum);
    }
  });

  function updateScrollX(t) {
    scrollX = t;
    cam.targetX = CAM_X_MIN + t * (CAM_X_MAX - CAM_X_MIN);
    document.getElementById("gl-prog").style.width = (t * 100) + "%";
    updateNearestInfo();
  }
  let scrollX = 0;

  function updateNearestInfo() {
    if (focusedIndex >= 0) return;
    let nearest = 0, dist = Infinity;
    artGroups.forEach((g, i) => {
      const d = Math.abs(cam.targetX - artX(i));
      if (d < dist) { dist = d; nearest = i; }
    });
    if (dist < ART_SPACING * 0.6) showArtworkInfo(nearest);
    else document.getElementById("gl-artwork-info").classList.remove("show");
  }

  function showArtworkInfo(i) {
    const art = ARTWORKS[i];
    document.getElementById("aw-num").textContent = `${String(i+1).padStart(2,"0")} / ${N}`;
    document.getElementById("aw-title").textContent = art.title;
    document.getElementById("aw-city").textContent  = art.city;
    document.getElementById("gl-artwork-info").classList.add("show");
  }

  // ── Raycaster ──────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2(-9, -9);

  section.addEventListener("mousemove", (e) => {
    const r  = section.getBoundingClientRect();
    mouse.x  = ((e.clientX - r.left) / r.width)  * 2 - 1;
    mouse.y  = -((e.clientY - r.top)  / r.height) * 2 + 1;
  });

  section.addEventListener("click", (e) => {
    if (overviewMode) return;
    if (e.target === document.getElementById("gl-btn-overview")) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(frameMeshes.map(f => f.mesh));
    if (hits.length > 0) {
      const idx = frameMeshes.find(f => f.mesh === hits[0].object)?.index;
      if (idx !== undefined) { focusedIndex >= 0 ? unfocus() : focusArtwork(idx); }
    } else if (focusedIndex >= 0) { unfocus(); }
  });

  function focusArtwork(i) {
    focusedIndex = i;
    showArtworkInfo(i);
    document.getElementById("gl-focus-overlay").classList.add("active");
    const fx = artX(i);
    gsap.to(cam, { targetX: fx, targetZ: CAM_Z_DEFAULT - 2.2, duration: 1.1, ease: "power3.inOut" });
    artGroups.forEach((g, j) => {
      gsap.to(g.scale, { x: j===i?1.04:0.96, y: j===i?1.04:0.96, z:1, duration:0.8, ease:"power2.out" });
      gsap.to(g.position, { z: j===i?0.15:-0.1, duration:0.8, ease:"power2.out" });
    });
  }

  function unfocus() {
    focusedIndex = -1;
    document.getElementById("gl-focus-overlay").classList.remove("active");
    artGroups.forEach(g => {
      gsap.to(g.scale, { x:1, y:1, z:1, duration:0.6, ease:"power2.out" });
      gsap.to(g.position, { z:0, duration:0.6, ease:"power2.out" });
    });
    gsap.to(cam, { targetZ: CAM_Z_DEFAULT, duration:0.8, ease:"power2.inOut" });
  }

  // ── Overview ───────────────────────────────────────────────────────────────
  document.getElementById("gl-btn-overview").addEventListener("click", () => {
    overviewMode ? exitOverview() : enterOverview();
  });

  function enterOverview() {
    overviewMode = true;
    const btn = document.getElementById("gl-btn-overview");
    btn.classList.add("active"); btn.textContent = "Close";
    gsap.to(cam, { targetX:0, targetY:18, targetZ:12, lookY:ART_Y, lookZ:-8, lerp:0.05, duration:1.6, ease:"power3.inOut" });
    gsap.to(scene.fog, { density:0.012, duration:1.2 });
    document.getElementById("gl-artwork-info").classList.remove("show");
  }

  function exitOverview() {
    overviewMode = false;
    const btn = document.getElementById("gl-btn-overview");
    btn.classList.remove("active"); btn.textContent = "Overview";
    gsap.to(cam, { targetY:CAM_Y_DEFAULT, targetZ:CAM_Z_DEFAULT, lookY:ART_Y, lookZ:0, lerp:0.08, duration:1.3, ease:"power3.inOut" });
    gsap.to(scene.fog, { density:0.028, duration:1.2 });
    updateNearestInfo();
  }

  // ── Hover ──────────────────────────────────────────────────────────────────
  function checkHover() {
    if (focusedIndex >= 0 || overviewMode) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(frameMeshes.map(f => f.mesh));
    const hi   = hits.length > 0 ? (frameMeshes.find(f => f.mesh === hits[0].object)?.index ?? -1) : -1;
    if (hi !== lastHovered) {
      if (lastHovered >= 0) {
        gsap.to(artGroups[lastHovered].scale,    { x:1, y:1, z:1, duration:0.4, ease:"power2.out" });
        gsap.to(artGroups[lastHovered].position, { z:0, duration:0.4 });
      }
      if (hi >= 0) {
        gsap.to(artGroups[hi].scale,    { x:1.025, y:1.025, z:1, duration:0.35 });
        gsap.to(artGroups[hi].position, { z:0.12, duration:0.35 });
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
      lastHovered = hi;
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  function animateParticles() {
    const pts = window._mv_particles;
    if (!pts) return;
    const pos = pts.geometry.attributes.position;
    const spd = pts.geometry._spd;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i*3+1] += spd[i];
      if (pos.array[i*3+1] > FLOOR_Y + 7) pos.array[i*3+1] = FLOOR_Y;
      pos.array[i*3] += Math.sin(Date.now()*0.0003+i)*0.0008;
    }
    pos.needsUpdate = true;
  }

  // ── Render loop ────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    const lf = cam.lerp;
    cam.currentX += (cam.targetX - cam.currentX) * lf;
    cam.currentY += (cam.targetY - cam.currentY) * lf;
    cam.currentZ += (cam.targetZ - cam.currentZ) * lf;
    camera.position.set(cam.currentX, cam.currentY + breathe.y, cam.currentZ + breathe.z);
    camera.lookAt(cam.currentX, cam.lookY + breathe.y*0.3, cam.lookZ);
    checkHover();
    animateParticles();
    renderer.render(scene, camera);
  }
  animate();

})();
