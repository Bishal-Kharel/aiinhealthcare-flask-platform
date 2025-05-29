// Progressive UI enhancement
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("prompt");
  const oldButton = textarea.nextElementSibling;
  const oldResponse = document.getElementById("response");

  const chatWidget = document.createElement("section");
  chatWidget.id = "chat-widget";

  const messagesDiv = document.createElement("div");
  messagesDiv.id = "chat-messages";
  chatWidget.appendChild(messagesDiv);

  const inputWrapper = document.createElement("div");
  inputWrapper.classList.add("input-wrapper");

  const input = document.createElement("input");
  input.type = "text";
  input.id = "chat-input";
  input.placeholder = "Ask a health question...";
  input.autocomplete = "off";

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.onclick = () => {
    submitPrompt(input.value);
    input.value = "";
    input.focus();
  };

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(sendBtn);
  chatWidget.appendChild(inputWrapper);

  textarea.style.display = "none";
  oldButton.style.display = "none";
  oldResponse.replaceWith(chatWidget);
});

function submitPrompt(prompt) {
  prompt = prompt.trim();
  if (!prompt) return;

  const messages = document.getElementById("chat-messages");

  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.textContent = `You: ${prompt}`;
  messages.appendChild(userMsg);
  messages.scrollTop = messages.scrollHeight;

  const aiMsg = document.createElement("div");
  aiMsg.className = "ai-message";
  aiMsg.textContent = "Health Assistant: ";
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
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((line) => line.startsWith("data: "));
          lines.forEach((line) => {
            const data = line.replace(/^data: /, "");
            responseText += data;
            aiMsg.textContent = responseText;
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
    });
}
