function load3DModel(modelPath, container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  scene.add(light);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.enableZoom = true;
  controls.enablePan = false;

  function finalizeModel(modelObject) {
    const box = new THREE.Box3().setFromObject(modelObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 4 / maxDim;
    modelObject.scale.set(scale, scale, scale);
    modelObject.position.sub(center.multiplyScalar(scale));

    scene.add(modelObject);

    const fov = camera.fov * (Math.PI / 180);
    const distance = (maxDim * scale) / (2 * Math.tan(fov / 2));
    camera.position.set(0, 0, distance * 1.2);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    window.addEventListener("resize", () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    });

    const animate = function () {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }

  if (modelPath) {
    const loader = new THREE.GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        finalizeModel(gltf.scene);
      },
      undefined,
      (error) => {
        console.error("Error loading 3D model:", error);
        const errorMsg = document.createElement("div");
        errorMsg.className = "error-message";
        errorMsg.textContent = "Failed to load 3D model.";
        container.appendChild(errorMsg);
      }
    );
  } else if (window.selectedBodyPartModel) {
    const subModel = Array.isArray(window.selectedBodyPartModel)
      ? new THREE.Group().add(
          ...window.selectedBodyPartModel.map((mesh) => mesh.clone())
        )
      : window.selectedBodyPartModel.clone();
    finalizeModel(subModel);
  } else {
    const errorMsg = document.createElement("div");
    errorMsg.className = "error-message";
    errorMsg.textContent = "No model available to display.";
    container.appendChild(errorMsg);
  }
}
