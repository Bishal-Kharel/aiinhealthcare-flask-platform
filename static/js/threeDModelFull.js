import BODY_PART_MESHES from "./bodyPartMeshes.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("model-container");
  if (!container) {
    console.error("Model container not found");
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f7);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight || 1,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const setRendererSize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    } else {
      setTimeout(setRendererSize, 100);
    }
  };
  setRendererSize();
  container.appendChild(renderer.domElement);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 5, 5);
  scene.add(directionalLight);

  let model = null;
  let originalMaterials = new Map();

  // ✅ Updated highlightMesh function
  function highlightMesh(bodyPart) {
    if (!model) return;

    // Reset previous highlights
    model.traverse((child) => {
      if (child.isMesh && originalMaterials.has(child)) {
        child.material = originalMaterials.get(child);
      }
    });
    originalMaterials.clear();

    const targetMeshes = BODY_PART_MESHES[bodyPart];
    if (bodyPart && targetMeshes) {
      model.traverse((child) => {
        if (
          child.isMesh &&
          Array.isArray(targetMeshes) &&
          targetMeshes.includes(child.name)
        ) {
          originalMaterials.set(child, child.material);
          child.material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.5,
          });
        }
      });
    } else {
      console.log(`No specific mesh available for ${bodyPart}.`);
    }
  }

  // Load model
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

      highlightMesh(window.currentBodyPart);

      setRendererSize();
      renderer.render(scene, camera);
    },
    undefined,
    (error) => {
      console.error("An error occurred while loading the model:", error);
    }
  );

  // Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  // Resize handling
  const onResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    }
  };
  window.addEventListener("resize", onResize);

  const observer = new ResizeObserver(() => {
    onResize();
  });
  observer.observe(container);

  let lastBodyPart = null;
  function checkBodyPart() {
    if (window.currentBodyPart !== lastBodyPart) {
      lastBodyPart = window.currentBodyPart;
      highlightMesh(window.currentBodyPart);
    }
  }
  setInterval(checkBodyPart, 500);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
});
