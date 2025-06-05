function syncMessages(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  target.innerHTML = source.innerHTML;
  target.scrollTop = target.scrollHeight;
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

              if (parsed.body_part) {
                window.currentBodyPart = parsed.body_part; // Export body_part globally
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
