// === DOM ELEMENTS ===
const messageInput = document.querySelector(".message-input");
const chatBody = document.querySelector(".chat-body");
const sendMessageButton = document.querySelector("#send-message");

const fileInput = document.querySelector("#file-input");
const imageGenButton = document.querySelector("#generate-image");
const attachFileButton = document.querySelector("#attach-file");
const chatForm = document.querySelector(".chat-form");

// === API SETUP (⚠ keep key on server in production) ===
const API_KEY = "AIzaSyCBB7T5d0PZDrI9E5Am-e7fhjZyxGX8pnk"; // <-- replace with your key

// text + images + docs (multimodal)
const MULTI_MODEL_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// image generation
const IMAGE_MODEL_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

const userData = { message: "", files: [] };
let currentThinkingDiv = null;

// === HELPERS ===
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const fileToGenerativePart = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result;
        const base64Data =
          typeof result === "string" ? result.split(",")[1] : "";
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type || "application/octet-stream"
          }
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
};

const buildInputParts = async () => {
  const parts = [];
  const files = userData.files || [];
  for (const file of files) {
    const filePart = await fileToGenerativePart(file);
    parts.push(filePart);
  }
  if (userData.message) {
    parts.push({ text: userData.message });
  }
  return parts;
};

// === BOT "THINKING" BUBBLE ===
const showThinkingBubble = () => {
  const bubbleHTML = `
    <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
    </svg>
    <div class="message-text">
      <div class="thinking-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  currentThinkingDiv = createMessageElement(bubbleHTML, "bot-message", "thinking");
  chatBody.appendChild(currentThinkingDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
};

// === TEXT RESPONSE (multimodal model) ===
const generateTextResponse = async () => {
  try {
    const parts = await buildInputParts();
    const body = { contents: [{ role: "user", parts }] };

    const res = await fetch(MULTI_MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log("text response:", data);

    if (!res.ok) throw new Error(data.error?.message || "API error");

    const botText =
      data.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join(" ")
        .trim() || "I couldn't generate a response.";

    if (currentThinkingDiv) {
      currentThinkingDiv.remove();
      currentThinkingDiv = null;
    }

    const botHTML = `
      <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
        <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
      </svg>
      <div class="message-text">${botText.replace(/\n/g, "<br>")}</div>
    `;
    chatBody.appendChild(createMessageElement(botHTML, "bot-message"));
    chatBody.scrollTop = chatBody.scrollHeight;
  } catch (err) {
    console.error(err);
    if (currentThinkingDiv) {
      currentThinkingDiv.remove();
      currentThinkingDiv = null;
    }
    const errorHTML = `
      <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"></svg>
      <div class="message-text">Sorry, something went wrong: ${err.message}</div>
    `;
    chatBody.appendChild(createMessageElement(errorHTML, "bot-message"));
    chatBody.scrollTop = chatBody.scrollHeight;
  } finally {
    userData.files = [];
  }
};

// === IMAGE RESPONSE (Nano Banana) ===
const generateImageResponse = async (prompt) => {
  if (!prompt) return;
  try {
    // Body format exactly as in official REST example
    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    const res = await fetch(IMAGE_MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("image response:", data);

    if (!res.ok) {
      throw new Error(data.error?.message || "Image API error");
    }

    let base64Data = null;
    let mimeType = "image/png";

    const candidates = data.candidates || [];
    if (candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }
    }

    if (currentThinkingDiv) {
      currentThinkingDiv.remove();
      currentThinkingDiv = null;
    }

    if (!base64Data) {
      const fallbackHTML = `
        <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"></svg>
        <div class="message-text">The image model responded, but no image was included.</div>
      `;
      chatBody.appendChild(createMessageElement(fallbackHTML, "bot-message"));
      chatBody.scrollTop = chatBody.scrollHeight;
      return;
    }

    const src = `data:${mimeType};base64,${base64Data}`;
    const imgHTML = `
      <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"></svg>
      <div class="message-text">
        <img src="${src}" alt="Generated image" class="generated-image" />
      </div>
    `;
    chatBody.appendChild(createMessageElement(imgHTML, "bot-message"));
    chatBody.scrollTop = chatBody.scrollHeight;
  } catch (err) {
    console.error(err);
    if (currentThinkingDiv) {
      currentThinkingDiv.remove();
      currentThinkingDiv = null;
    }
    const errorHTML = `
      <svg class="chatbot-avatar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"></svg>
      <div class="message-text">Sorry, something went wrong while generating the image: ${err.message}</div>
    `;
    chatBody.appendChild(createMessageElement(errorHTML, "bot-message"));
    chatBody.scrollTop = chatBody.scrollHeight;
  }
};

// === MESSAGE FLOW ===
const handleOutgoingMessage = (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const text = messageInput.value.trim();
  const files = fileInput?.files ? Array.from(fileInput.files) : [];

  if (!text && files.length === 0) return;

  userData.message = text;
  userData.files = files;

  // detect "generate ... image" with no files => send straight to image model
  const wantsTextOnlyImage =
    files.length === 0 &&
    /image/i.test(text) &&
    /^generate\b/i.test(text);

  const parts = [];

  if (text) {
    parts.push(`<div class="message-text">${text}</div>`);
  }

  if (files.length > 0) {
    const attachmentsHtml = files
      .map(file => {
        if (file.type && file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          return `
            <div class="message-attachment">
              <img src="${url}" class="attachment-image" alt="${file.name}" />
              <span class="attachment-label">${file.name}</span>
            </div>
          `;
        } else {
          return `
            <div class="message-attachment">
              <span class="attachment-icon">📄</span>
              <span class="attachment-label">${file.name}</span>
            </div>
          `;
        }
      })
      .join("");

    parts.push(`<div class="message-attachments">${attachmentsHtml}</div>`);
  }

  const userDiv = createMessageElement(parts.join(""), "user-message");
  chatBody.appendChild(userDiv);

  if (currentThinkingDiv) {
    currentThinkingDiv.remove();
    currentThinkingDiv = null;
  }

  messageInput.value = "";
  if (fileInput) fileInput.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;

  setTimeout(() => {
    showThinkingBubble();
    if (wantsTextOnlyImage) {
      generateImageResponse(text);
    } else {
      generateTextResponse();
    }
  }, 400);
};

// === EVENT LISTENERS ===
if (chatForm) {
  chatForm.addEventListener("submit", handleOutgoingMessage);
}

if (messageInput && chatForm) {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });
}

if (attachFileButton && fileInput) {
  attachFileButton.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput.click();
  });
}

if (imageGenButton) {
  imageGenButton.addEventListener("click", (e) => {
    e.preventDefault();
    const prompt = messageInput.value.trim();
    if (!prompt) return;

    const userDiv = createMessageElement(
      `<div class="message-text">${prompt}</div>`,
      "user-message"
    );
    chatBody.appendChild(userDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    messageInput.value = "";

    if (currentThinkingDiv) {
      currentThinkingDiv.remove();
      currentThinkingDiv = null;
    }
    showThinkingBubble();
    generateImageResponse(prompt);
  });
}













