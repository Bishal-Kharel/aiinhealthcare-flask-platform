function syncMessages(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  target.innerHTML = source.innerHTML;
  target.scrollTop = target.scrollHeight;
}

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

  const loader = new THREE.GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 6 / maxDim;
      gltf.scene.scale.set(scale, scale, scale);
      gltf.scene.position.sub(center.multiplyScalar(scale));

      scene.add(gltf.scene);

      const fov = camera.fov * (Math.PI / 180);
      const scaledMaxDim = maxDim * scale; // <--- Use scaled dimension here
      const distance = scaledMaxDim / (2 * Math.tan(fov / 2));
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
}

function submitPrompt(prompt, messagesId) {
  prompt = prompt.trim();
  if (!prompt) return;

  const messages = document.getElementById(messagesId);
  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.textContent = `${prompt}`;
  messages.appendChild(userMsg);
  messages.scrollTop = messages.scrollHeight;

  const aiMsg = document.createElement("div");
  aiMsg.className = "ai-message";
  aiMsg.textContent = "";
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
    .then((response) => {
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = "";

      function read() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            messages.scrollTop = messages.scrollHeight;
            syncMessages(
              messagesId,
              messagesId === "chat-messages"
                ? "expanded-chat-messages"
                : "chat-messages"
            );
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((line) => line.startsWith("data: "));

          lines.forEach((line) => {
            const data = line.replace(/^data: /, "");
            try {
              const parsed = JSON.parse(data);

              if (parsed.text) {
                responseText += parsed.text;
                aiMsg.textContent = "" + responseText;
              }

              if (parsed.model_path && window.is3DRenderActive) {
                const viewer = document.createElement("div");
                viewer.className = "three-viewer";
                messages.appendChild(viewer);
                load3DModel(parsed.model_path, viewer);
              }
            } catch (err) {
              console.error("JSON parse error:", err, data);
            }

            messages.scrollTop = messages.scrollHeight;
          });

          return read();
        });
      }

      return read();
    })
    .catch((error) => {
      console.error("Error in fetch stream:", error);
      const errorMsg = document.createElement("div");
      errorMsg.className = "error-message";
      errorMsg.textContent = "Error: " + error.message;
      messages.appendChild(errorMsg);
      messages.scrollTop = messages.scrollHeight;
      syncMessages(
        messagesId,
        messagesId === "chat-messages"
          ? "expanded-chat-messages"
          : "chat-messages"
      );
    });
}
