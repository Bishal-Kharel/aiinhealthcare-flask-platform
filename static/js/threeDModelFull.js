import BODY_PART_MESHES from "./bodyPartMeshes.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("model-container");
  if (!container) return console.error("Model container not found");

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f7);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    2000
  );
  camera.position.set(0, 1.5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const labelRenderer = new THREE.CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0";
  labelRenderer.domElement.style.left = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(labelRenderer.domElement);

  function setRendererSize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    }
  }
  setRendererSize();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const d = new THREE.DirectionalLight(0xffffff, 1);
  d.position.set(0, 5, 5);
  scene.add(d);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enabled = false;
  controls.target.set(0, 0, 0);
  controls.update();

  renderer.domElement.addEventListener("pointerdown", () => {
    controls.enabled = true;
    rotate.enabled = false;
  });

  // Model
  let model = null;

  let annotationGroup = null;
  function clearAnnotation() {
    if (!annotationGroup) return;
    annotationGroup.traverse((o) => {
      if (o.isCSS2DObject && o.element?.parentNode) {
        o.element.parentNode.removeChild(o.element);
      }
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) o.material.dispose?.();
    });
    scene.remove(annotationGroup);
    annotationGroup = null;

    labelRenderer.render(scene, camera);
  }

  const originalMaterials = new Map();
  let blinkTargets = [];
  let blinkStart = performance.now();

  function clearBlinkTargets() {
    blinkTargets.forEach((m) => {
      const orig = originalMaterials.get(m);
      if (orig) {
        m.material.dispose?.();
        m.material = orig;
      }
    });
    blinkTargets = [];
    originalMaterials.clear();
  }

  function setBlinkTargets(meshes) {
    clearBlinkTargets();
    meshes.forEach((mesh) => {
      if (!mesh.isMesh) return;
      if (!originalMaterials.has(mesh))
        originalMaterials.set(mesh, mesh.material);
      const cloned = mesh.material.clone?.() || mesh.material;
      if ("emissive" in cloned) {
        cloned.emissive = new THREE.Color(0xff0000);
        cloned.emissiveIntensity = 0.0;
      }
      mesh.material = cloned;
      blinkTargets.push(mesh);
    });
    blinkStart = performance.now();
  }

  function computeBounds(meshes) {
    const box = new THREE.Box3();
    let any = false;
    meshes.forEach((m) => {
      if (!m) return;
      const b = new THREE.Box3().setFromObject(m);
      if (!any) {
        box.copy(b);
        any = true;
      } else {
        box.union(b);
      }
    });
    if (!any) return null;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    return { box, center, size, radius };
  }

  function tween(duration, onUpdate, onComplete) {
    const start = performance.now();
    const ease = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const k = ease(p);
      onUpdate(k, p);
      if (p < 1) requestAnimationFrame(step);
      else onComplete && onComplete();
    }
    requestAnimationFrame(step);
  }

  let focusSeq = 0;

  function frameOn(bounds, { fitOffset = 1.4, duration = 1400 } = {}) {
    if (!bounds) return;
    const seq = focusSeq;
    const { center, radius } = bounds;

    const fov = (camera.fov * Math.PI) / 180;
    const targetDist = Math.max(
      (radius * fitOffset) / Math.tan(fov / 2),
      radius * 1.6
    );

    const dir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();
    const newPos = new THREE.Vector3().addVectors(
      center,
      dir.multiplyScalar(targetDist)
    );

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    rotate.enabled = false;

    tween(
      duration,
      (k) => {
        if (seq !== focusSeq) return;
        camera.position.lerpVectors(startPos, newPos, k);
        controls.target.lerpVectors(startTarget, center, k);
        controls.update();
      },
      () => {
        if (seq !== focusSeq) return;
        if (!controls.enabled) {
          rotate.center.copy(center);
          const rel = camera.position.clone().sub(center);
          rotate.spherical.setFromVector3(rel);
          rotate.enabled = true;
        }
      }
    );
  }

  // Continuous rotation (pre-click only)
  const rotate = {
    enabled: false,
    center: new THREE.Vector3(),
    spherical: new THREE.Spherical(),
    speed: 0.2,
  };

  function showAnnotation(bounds, labelText) {
    clearAnnotation();
    if (!bounds) return;
    const seq = focusSeq;

    annotationGroup = new THREE.Group();
    scene.add(annotationGroup);

    const { center, radius } = bounds;

    const camDir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
    const upCam = new THREE.Vector3().crossVectors(right, camDir).normalize();

    const anchorPos = new THREE.Vector3()
      .copy(center)
      .add(right.multiplyScalar(radius * 1.9))
      .add(upCam.multiplyScalar(radius * 1.2));

    const lineMat = new THREE.LineBasicMaterial({ color: 0x111111 });
    const startPts = [center.clone(), center.clone()];
    const endPts = [center.clone(), anchorPos.clone()];
    let line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(startPts),
      lineMat
    );
    annotationGroup.add(line);

    const el = document.createElement("div");
    el.className = "label";
    el.textContent = labelText;
    el.style.opacity = "0";
    const labelObj = new THREE.CSS2DObject(el);
    labelObj.position.copy(anchorPos);
    annotationGroup.add(labelObj);

    tween(
      600,
      (k) => {
        if (seq !== focusSeq || !annotationGroup) return; // cancel stale tween
        const p = new THREE.Vector3().lerpVectors(startPts[1], endPts[1], k);
        const g = new THREE.BufferGeometry().setFromPoints([startPts[0], p]);
        line.geometry.dispose();
        line.geometry = g;
        el.style.opacity = String(k);
      },
      () => {}
    );
  }

  // Mesh lookup
  function getMeshesForBodyPart(bodyPart) {
    const names = BODY_PART_MESHES[bodyPart];
    if (!model || !Array.isArray(names)) return [];
    const targets = [];
    model.traverse((child) => {
      if (child.isMesh && names.includes(child.name)) targets.push(child);
    });
    return targets;
  }

  function prettyName(s) {
    if (!s) return "";
    return s
      .replace(/^VH_M_/i, "")
      .replace(/_/g, " ")
      .replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
  }

  function focusBodyPart(bodyPart) {
    if (!bodyPart) return;

    focusSeq++;
    controls.enabled = false;
    rotate.enabled = false;
    clearAnnotation();
    clearBlinkTargets();

    const meshes = getMeshesForBodyPart(bodyPart);
    if (!meshes.length) return;

    const bounds = computeBounds(meshes);
    const labelText =
      meshes.length === 1 ? prettyName(meshes[0].name) : prettyName(bodyPart);

    showAnnotation(bounds, labelText);
    setBlinkTargets(meshes);
    frameOn(bounds, { fitOffset: 2.8, duration: 1400 });
  }

  const loader = new THREE.GLTFLoader();
  loader.load(
    "/static/assets/3d/3d-vh-m-united.glb",
    (gltf) => {
      model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 6 / maxDim;
      model.scale.set(scale, scale, scale);

      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x * scale, 0, -center.z * scale);
      model.position.y = -box.min.y * scale - size.y * scale * 0.2;

      scene.add(model);

      const fov = camera.fov * (Math.PI / 180);
      const distance = (maxDim * scale) / Math.tan(fov / 2);
      camera.position.z = distance * 0.55;
      camera.position.y = size.y * scale * 0.3;
      camera.lookAt(0, size.y * scale * 0.3, 0);

      controls.target.set(0, size.y * scale * 0.3, 0);
      controls.update();

      focusBodyPart(window.currentBodyPart);

      setRendererSize();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    },
    undefined,
    (error) =>
      console.error("An error occurred while loading the model:", error)
  );

  function onResize() {
    setRendererSize();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  window.addEventListener("resize", onResize);
  new ResizeObserver(onResize).observe(container);

  let lastBodyPart = null;
  setInterval(() => {
    if (window.currentBodyPart !== lastBodyPart) {
      lastBodyPart = window.currentBodyPart;
      focusBodyPart(window.currentBodyPart); // resets and restarts auto mode
    }
  }, 500);

  let lastTime = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (blinkTargets.length) {
      const t = (now - blinkStart) / 1000;
      const pulse = 0.5 + 0.45 * Math.sin(2 * Math.PI * 1.0 * t); // 1 Hz
      const v = Math.max(0.05, Math.min(0.95, pulse));
      blinkTargets.forEach((mesh) => {
        const m = mesh.material;
        if (m && "emissiveIntensity" in m) m.emissiveIntensity = v;
      });
    }

    if (rotate.enabled && !controls.enabled) {
      rotate.spherical.theta += rotate.speed * dt;
      const rel = new THREE.Vector3().setFromSpherical(rotate.spherical);
      camera.position.copy(rotate.center).add(rel);
      camera.lookAt(rotate.center);
      controls.target.copy(rotate.center);
    }

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();
});
