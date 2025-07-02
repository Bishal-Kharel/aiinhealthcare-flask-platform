const header = document.getElementById("main-header");
const initialPrompt = document.getElementById("initial-prompt-container");
const chatInterface = document.getElementById("chat-interface");
const expandedChat = document.getElementById("expanded-chat");
const collapseBtn = document.getElementById("collapse-btn");
const sendButtons = [
  document.getElementById("initial-send-btn"),
  document.getElementById("send-btn"),
  document.getElementById("expanded-send-btn"),
];
const renderButtons = [
  document.getElementById("initial-render-3d-btn"),
  document.getElementById("render-3d-btn"),
  document.getElementById("expanded-render-3d-btn"),
];

// Function to toggle header visibility
function toggleHeader() {
  const isInitialPromptVisible =
    getComputedStyle(initialPrompt).display !== "none";
  const isExpandedChatVisible =
    expandedChat.style.display === "block" ||
    expandedChat.style.display === "flex";
  const isModelContainerActive = window.is3DRenderActive;

  if (
    isInitialPromptVisible &&
    !isExpandedChatVisible &&
    !isModelContainerActive
  ) {
    header.style.display = "block";
  } else {
    header.style.display = "none";
  }
}

// Handle back arrow click to return to initial chat and show header
if (collapseBtn) {
  collapseBtn.addEventListener("click", () => {
    // Show initial prompt container
    if (initialPrompt) {
      initialPrompt.style.display = "flex";
    }

    // Hide expanded chat
    if (expandedChat) {
      expandedChat.style.display = "none";
    }

    // Hide chat interface (optional, if it's a wrapper)
    if (chatInterface) {
      chatInterface.style.display = "none";
    }

    // Show the header again
    if (header) {
      header.style.display = "block";
    }

    // Optionally deactivate 3D render state if it's active
    window.is3DRenderActive = false;
  });
}

// Observe changes to expanded-chat display style
if (expandedChat) {
  const observer = new MutationObserver(toggleHeader);
  observer.observe(expandedChat, {
    attributes: true,
    attributeFilter: ["style"],
  });
}

// Hide header on send button clicks
sendButtons.forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", () => {
      setTimeout(toggleHeader, 0); // Delay to allow display change
    });
  }
});

// Hide header on 3D render button clicks
renderButtons.forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", () => {
      setTimeout(toggleHeader, 0); // Delay to allow display change
    });
  }
});

// Initial check
toggleHeader();
