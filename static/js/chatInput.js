window.is3DRenderActive = false;

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

  function toggle3DRender() {
    window.is3DRenderActive = !window.is3DRenderActive;
    initialRender3DBtn.classList.toggle("active", window.is3DRenderActive);
    render3DBtn.classList.toggle("active", window.is3DRenderActive);
    expandedRender3DBtn.classList.toggle("active", window.is3DRenderActive);
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
    // Hide all chat UIs
    expandedChat.style.display = "none";
    document.getElementById("chat-section").style.display = "none";
    chatInterface.style.display = "none";

    // Show initial chat prompt again
    initialPromptContainer.style.display = "flex";

    // Clear inputs (optional)
    initialChatInput.value = "";
    chatInput.value = "";
    expandedChatInput.value = "";

    // Show logo again (optional, if hidden)
    const logoContainer = document.getElementById("logo-container");
    if (logoContainer) logoContainer.style.display = "flex";

    // Focus back on the initial input
    initialChatInput.focus();
  };
});
