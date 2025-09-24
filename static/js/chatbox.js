window.is3DRenderActive = false;

document.addEventListener("DOMContentLoaded", () => {
  // Elements
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
  const chatSection = document.getElementById("chat-section");
  const logoContainer = document.getElementById("logo-container");

  const promptContainer = document.getElementById("prompt-container");
  const expandedPromptContainer = document.getElementById(
    "expanded-prompt-container"
  );
  const chatMessages = document.getElementById("chat-messages");
  const expandedChatMessages = document.getElementById(
    "expanded-chat-messages"
  );

  const introVideo = document.getElementById("intro-video");
  let introVideoDestroyed = false;

  function destroyIntroVideoOnce() {
    if (introVideoDestroyed || !introVideo) return;
    try {
      introVideo.pause();
      introVideo.removeAttribute("src");
      while (introVideo.firstChild)
        introVideo.removeChild(introVideo.firstChild);
      introVideo.load();
      const container = document.getElementById("intro-video-container");
      if (container && container.parentNode)
        container.parentNode.removeChild(container);
      else introVideo.remove();
      introVideoDestroyed = true;
    } catch (e) {
      console.warn("[intro-video] destroy error:", e);
    }
  }

  function updateBottomPad() {
    if (chatMessages && promptContainer) {
      const h = promptContainer.getBoundingClientRect().height || 0;
      chatMessages.style.setProperty("--bottom-pad", `${h + 24}px`);
    }
    if (expandedChatMessages && expandedPromptContainer) {
      const h = expandedPromptContainer.getBoundingClientRect().height || 0;
      expandedChatMessages.style.setProperty("--bottom-pad", `${h + 24}px`);
    }
  }
  updateBottomPad();
  window.addEventListener("resize", updateBottomPad);
  if (promptContainer)
    new ResizeObserver(updateBottomPad).observe(promptContainer);
  if (expandedPromptContainer)
    new ResizeObserver(updateBottomPad).observe(expandedPromptContainer);

  function toggle3DRender() {
    window.is3DRenderActive = !window.is3DRenderActive;
    initialRender3DBtn.classList.toggle("active", window.is3DRenderActive);
    render3DBtn.classList.toggle("active", window.is3DRenderActive);
    expandedRender3DBtn.classList.toggle("active", window.is3DRenderActive);
  }
  initialRender3DBtn.addEventListener("click", toggle3DRender);
  render3DBtn.addEventListener("click", toggle3DRender);
  expandedRender3DBtn.addEventListener("click", toggle3DRender);

  function expandToChat() {
    destroyIntroVideoOnce();
    initialPromptContainer.style.display = "none";
    chatInterface.style.display = "flex";
    expandedChat.style.display = "flex";
    if (chatSection) chatSection.style.display = "none";
    expandedChatInput.focus();
    syncMessages("chat-messages", "expanded-chat-messages");
    updateBottomPad();
  }

  function collapseToInitial() {
    expandedChat.style.display = "none";
    if (chatSection) chatSection.style.display = "none";
    chatInterface.style.display = "none";
    initialPromptContainer.style.display = "flex";

    initialChatInput.value = "";
    chatInput.value = "";
    expandedChatInput.value = "";

    if (logoContainer) logoContainer.style.display = "flex";
    initialChatInput.focus();
    updateBottomPad();
  }

  function submitFrom(inputEl, targetMessagesId) {
    const val = (inputEl.value || "").trim();
    if (!val) return;
    submitPrompt(val, targetMessagesId);
    inputEl.value = "";
  }
  function handleInitialSubmit() {
    submitFrom(initialChatInput, "chat-messages");
    expandToChat();
  }
  function handleCompactSubmit() {
    submitFrom(chatInput, "chat-messages");
    expandToChat();
  }
  function handleExpandedSubmit() {
    submitFrom(expandedChatInput, "expanded-chat-messages");
  }

  // Wire buttons
  initialSendBtn.addEventListener("click", handleInitialSubmit);
  sendBtn.addEventListener("click", handleCompactSubmit);
  expandedSendBtn.addEventListener("click", handleExpandedSubmit);
  collapseBtn.addEventListener("click", collapseToInitial);

  // Enter-to-send
  initialChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleInitialSubmit();
  });
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleCompactSubmit();
  });
  expandedChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleExpandedSubmit();
  });
});

function syncMessages(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  target.innerHTML = source.innerHTML;
  target.scrollTop = target.scrollHeight;
}

function startLoading(targetEl, text = "Thinking…") {
  const loader = document.createElement("div");
  loader.className = "loading";
  const spinner = document.createElement("span");
  spinner.className = "spinner";
  const label = document.createElement("span");
  label.className = "loading-text";
  label.textContent = text;
  loader.appendChild(spinner);
  loader.appendChild(label);
  targetEl.appendChild(loader);
  return loader;
}

function stopLoading(loaderEl) {
  if (loaderEl && loaderEl.parentNode)
    loaderEl.parentNode.removeChild(loaderEl);
}

function setInputsDisabled(disabled) {
  const ids = [
    "initial-chat-input",
    "initial-send-btn",
    "chat-input",
    "send-btn",
    "expanded-chat-input",
    "expanded-send-btn",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = disabled;
    if (disabled) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
  });
}

function submitPrompt(prompt, messagesId) {
  prompt = prompt.trim();
  if (!prompt) return;

  const messages = document.getElementById(messagesId);

  // user bubble
  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.textContent = `${prompt}`;
  messages.appendChild(userMsg);
  messages.scrollTop = messages.scrollHeight;

  // ai bubble
  const aiMsg = document.createElement("div");
  aiMsg.className = "ai-message skeleton";
  aiMsg.textContent = "";
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  const loaderEl = startLoading(aiMsg, "Thinking…");
  setInputsDisabled(true);

  fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
    .then((response) => {
      if (!response.body)
        throw new Error("ReadableStream not supported in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let sseCarry = "";
      let pendingText = "";
      let responseText = "";
      let rafScheduled = false;
      let streamingDone = false;
      let seenAnyText = false;

      const autoscrollThreshold = 40;
      function isNearBottom(container) {
        return (
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          autoscrollThreshold
        );
      }
      let shouldAutoscroll = isNearBottom(messages);

      function scheduleFlush() {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
          rafScheduled = false;

          if (pendingText) {
            if (!seenAnyText) {
              seenAnyText = true;
              if (loaderEl) {
                loaderEl.classList.add("removing");
                setTimeout(() => stopLoading(loaderEl), 140);
              }
              aiMsg.classList.remove("skeleton");
            }

            responseText += pendingText;
            pendingText = "";

            const html = DOMPurify.sanitize(marked.parse(responseText));
            aiMsg.innerHTML = html;

            if (shouldAutoscroll) messages.scrollTop = messages.scrollHeight;
          }
        });
      }

      function handleEvent(jsonStr) {
        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          sseCarry += "\n" + jsonStr;
          return;
        }

        if (parsed.text) {
          pendingText += parsed.text;
          scheduleFlush();
        }

        if (parsed.body_part) {
          window.currentBodyPart = parsed.body_part;
        }

        if (parsed.model_path && window.is3DRenderActive) {
          const viewer = document.createElement("div");
          viewer.className = "three-viewer";
          messages.appendChild(viewer);
          load3DModel(parsed.model_path, viewer);
          if (shouldAutoscroll) messages.scrollTop = messages.scrollHeight;
        }
      }

      function finalizeStream() {
        streamingDone = true;

        if (pendingText) {
          if (!seenAnyText) {
            stopLoading(loaderEl);
            aiMsg.classList.remove("skeleton");
            seenAnyText = true;
          }
          responseText += pendingText;
          pendingText = "";
        }

        aiMsg.innerHTML = DOMPurify.sanitize(marked.parse(responseText));

        stopLoading(loaderEl);
        aiMsg.classList.remove("skeleton");
        setInputsDisabled(false);

        messages.scrollTop = messages.scrollHeight;
        syncMessages(
          messagesId,
          messagesId === "chat-messages"
            ? "expanded-chat-messages"
            : "chat-messages"
        );
      }

      function read() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            finalizeStream();
            return;
          }

          shouldAutoscroll = isNearBottom(messages);

          const chunk = decoder.decode(value, { stream: true });
          const combined = sseCarry + chunk;
          const lines = combined.split("\n");

          sseCarry = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6);
              if (payload === "[DONE]") {
                finalizeStream();
                return;
              } else if (payload.trim() !== "") {
                handleEvent(payload);
              }
            }
          }

          return read();
        });
      }

      return read();
    })
    .catch((error) => {
      console.error("Error in fetch stream:", error);

      stopLoading(loaderEl);
      aiMsg.classList.remove("skeleton");
      setInputsDisabled(false);

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
