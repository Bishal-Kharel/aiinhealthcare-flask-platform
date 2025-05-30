document.addEventListener("DOMContentLoaded", () => {
  const initialChatInput = document.getElementById("initial-chat-input");
  const initialSendBtn = document.getElementById("initial-send-btn");
  const initialRender3DBtn = document.getElementById("initial-render-3d-btn");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const render3DBtn = document.getElementById("render-3d-btn");
  const expandedChat = document.getElementById("expanded-chat");
  const collapseBtn = document.getElementById("collapse-btn");
  const expandedChatInput = document.getElementById("expanded-chat-input");
  const expandedSendBtn = document.getElementById("expanded-send-btn");
  const expandedRender3DBtn = document.getElementById("expanded-render-3d-btn");
  const initialPromptContainer = document.getElementById(
    "initial-prompt-container"
  );
  const chatInterface = document.getElementById("chat-interface");
  let is3DRenderActive = false;

  function toggle3DRender() {
    is3DRenderActive = !is3DRenderActive;
    initialRender3DBtn.classList.toggle("active", is3DRenderActive);
    render3DBtn.classList.toggle("active", is3DRenderActive);
    expandedRender3DBtn.classList.toggle("active", is3DRenderActive);
  }

  initialRender3DBtn.addEventListener("click", toggle3DRender);
  render3DBtn.addEventListener("click", toggle3DRender);
  expandedRender3DBtn.addEventListener("click", toggle3DRender);

  initialSendBtn.onclick = () => {
    if (initialChatInput.value.trim()) {
      submitPrompt(initialChatInput.value, "chat-messages");
      initialPromptContainer.style.display = "none";
      chatInterface.style.display = "flex";
      expandedChat.style.display = "flex";
      document.getElementById("chat-section").style.display = "none";
      expandedChatInput.focus();
      syncMessages("chat-messages", "expanded-chat-messages");
      initialChatInput.value = "";
    }
  };

  initialChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && initialChatInput.value.trim()) {
      submitPrompt(initialChatInput.value, "chat-messages");
      initialPromptContainer.style.display = "none";
      chatInterface.style.display = "flex";
      expandedChat.style.display = "flex";
      document.getElementById("chat-section").style.display = "none";
      expandedChatInput.focus();
      syncMessages("chat-messages", "expanded-chat-messages");
      initialChatInput.value = "";
    }
  });

  sendBtn.onclick = () => {
    if (chatInput.value.trim()) {
      submitPrompt(chatInput.value, "chat-messages");
      document.getElementById("chat-section").style.display = "none";
      expandedChat.style.display = "flex";
      expandedChatInput.focus();
      syncMessages("chat-messages", "expanded-chat-messages");
      chatInput.value = "";
    }
  };

  expandedSendBtn.onclick = () => {
    if (expandedChatInput.value.trim()) {
      submitPrompt(expandedChatInput.value, "expanded-chat-messages");
      expandedChatInput.value = "";
    }
  };

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) {
      submitPrompt(chatInput.value, "chat-messages");
      document.getElementById("chat-section").style.display = "none";
      expandedChat.style.display = "flex";
      expandedChatInput.focus();
      syncMessages("chat-messages", "expanded-chat-messages");
      chatInput.value = "";
    }
  });

  expandedChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && expandedChatInput.value.trim()) {
      submitPrompt(expandedChatInput.value, "expanded-chat-messages");
      expandedChatInput.value = "";
    }
  });

  collapseBtn.onclick = () => {
    expandedChat.style.display = "none";
    document.getElementById("chat-section").style.display = "flex";
    chatInput.focus();
    syncMessages("expanded-chat-messages", "chat-messages");
  };

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

    // Add OrbitControls for manual rotation
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
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6 / maxDim; // Increased scale for larger model
        gltf.scene.scale.set(scale, scale, scale);
        gltf.scene.position.sub(center.multiplyScalar(scale)); // Center model

        scene.add(gltf.scene);

        // Adjust camera to show entire model
        const fov = camera.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2));
        camera.position.set(0, 0, distance * 1.2); // Reduced distance for larger appearance
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

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
    userMsg.textContent = `You: ${prompt}`;
    messages.appendChild(userMsg);
    messages.scrollTop = messages.scrollHeight;

    const aiMsg = document.createElement("div");
    aiMsg.className = "ai-message";
    aiMsg.textContent = "Grok: ";
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
                  aiMsg.textContent = "Grok: " + responseText;
                }

                if (parsed.model_path && is3DRenderActive) {
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
});
