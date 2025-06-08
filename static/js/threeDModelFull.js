const BODY_PART_MESHES = {
  "hands and legs": "Object_11",
  heart: "Object_7", // Mesh Object_3, node 7
  innerbody: "Object_6", // Mesh Object_2, node 6
  Dermis: "Object_4", // Mesh Object_0, node 4
  skeleton: "Object_5", // Mesh Object_1, node 5 Not FInded
  bones: "Object_9", // Mesh Object_4, node 9
};

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

  // Set initial renderer size
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

  // Store the model for later manipulation
  let model = null;
  let originalMaterials = new Map(); // Store original materials for restoring

  // Function to highlight mesh based on body part
  function highlightMesh(bodyPart) {
    if (!model) return;
    // Reset previous highlights
    model.traverse((child) => {
      if (child.isMesh && originalMaterials.has(child)) {
        child.material = originalMaterials.get(child);
      }
    });
    originalMaterials.clear();

    if (bodyPart && BODY_PART_MESHES[bodyPart]) {
      model.traverse((child) => {
        if (child.isMesh && child.name === BODY_PART_MESHES[bodyPart]) {
          originalMaterials.set(child, child.material); // Save original material
          child.material = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Red highlight
            metalness: 0.5,
            roughness: 0.5,
          });
        }
      });
    } else if (bodyPart && !BODY_PART_MESHES[bodyPart]) {
      console.log(`No specific mesh available for ${bodyPart}.`);
    }
  }

  // Load model
  const loader = new THREE.GLTFLoader();
  loader.load(
    "/static/assets/3d/ecorche_-_anatomy_study/scene.gltf",
    (gltf) => {
      model = gltf.scene;

      model.traverse((child) => {
        if (child.isMesh) {
          console.log("Mesh name:", child.name);
        } else if (child.isGroup) {
          console.log("Group name:", child.name);
        }
      });

      // Compute bounding box to normalize model size
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 6 / maxDim;
      model.scale.set(scale, scale, scale);

      // Center model horizontally, position legs at bottom of container
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x * scale, 0, -center.z * scale); // Center x and z
      model.position.y = -box.min.y * scale - size.y * scale * 0.2; // Shift down

      scene.add(model);

      // Adjust camera to frame the model
      const fov = camera.fov * (Math.PI / 180);
      const distance = (maxDim * scale) / Math.tan(fov / 2);
      camera.position.z = distance * 0.55;
      camera.position.y = size.y * scale * 0.3; // Lower camera to follow model
      camera.lookAt(0, size.y * scale * 0.3, 0); // Look at new model center

      // Update orbit controls target
      controls.target.set(0, size.y * scale * 0.3, 0);
      controls.update();

      // Highlight based on initial body part
      highlightMesh(window.currentBodyPart);

      // Force render after model loads
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

  // Resize handler
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

  // Monitor container size changes
  const observer = new ResizeObserver(() => {
    onResize();
  });
  observer.observe(container);

  // Monitor body part changes
  let lastBodyPart = null;
  function checkBodyPart() {
    if (window.currentBodyPart !== lastBodyPart) {
      lastBodyPart = window.currentBodyPart;
      highlightMesh(window.currentBodyPart);
    }
  }
  setInterval(checkBodyPart, 500); // Check every 500ms

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
});
