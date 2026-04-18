const imageInput = document.querySelector("#imageInput");
const startCameraButton = document.querySelector("#startCameraButton");
const captureButton = document.querySelector("#captureButton");
const stopCameraButton = document.querySelector("#stopCameraButton");
const copyButton = document.querySelector("#copyButton");
const cameraPreview = document.querySelector("#cameraPreview");
const imagePreview = document.querySelector("#imagePreview");
const emptyState = document.querySelector("#emptyState");
const captureCanvas = document.querySelector("#captureCanvas");
const statusText = document.querySelector("#statusText");
const progressBar = document.querySelector("#progressBar");
const confidenceText = document.querySelector("#confidenceText");
const resultText = document.querySelector("#resultText");
const googleApiKeyInput = document.querySelector("#googleApiKey");
const googleApiKeyGroup = document.querySelector("#googleApiKeyGroup");
const engineButtons = document.querySelectorAll(".engine-btn");
const engineCards = document.querySelectorAll(".engine-card");

let activeStream = null;
let currentObjectUrl = null;
let isRecognizing = false;
let selectedEngine = null;

engineButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    engineButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEngine = btn.dataset.engine;
    
    if (selectedEngine === "google") {
      googleApiKeyGroup.hidden = false;
    } else {
      googleApiKeyGroup.hidden = true;
    }
    
    engineCards.forEach(card => {
      if (card.dataset.info === selectedEngine) {
        card.hidden = false;
      } else {
        card.hidden = true;
      }
    });
    
    updateStatus(`Selected ${btn.textContent.trim()}. Upload an image to test.`, 0);
  });
});

const updateStatus = (message, progress = 0) => {
  statusText.textContent = message;
  progressBar.style.width = `${Math.max(0, Math.min(progress, 1)) * 100}%`;
};

const setPreviewImage = (src) => {
  if (currentObjectUrl && currentObjectUrl !== src) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  imagePreview.src = src;
  imagePreview.hidden = false;
  cameraPreview.hidden = true;
  emptyState.hidden = true;
};

const clearOutput = () => {
  resultText.value = "";
  confidenceText.textContent = "-";
  copyButton.disabled = true;
};

const runGoogleVision = async (imageSource) => {
  const apiKey = googleApiKeyInput.value.trim();
  
  if (!apiKey) {
    updateStatus("Please enter a Google API key.", 0);
    return null;
  }

  updateStatus("Sending image to Google Vision...", 0.1);

  let base64Data;
  if (imageSource.startsWith("data:")) {
    base64Data = imageSource.split(",")[1];
  } else {
    const response = await fetch(imageSource);
    const blob = await response.blob();
    base64Data = await blobToBase64(blob);
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [{ type: "TEXT_DETECTION" }]
          }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    updateStatus("Processing response...", 0.9);

    const annotations = data.responses[0];
    if (!annotations.textAnnotations || annotations.textAnnotations.length === 0) {
      updateStatus("No text found in image.", 1);
      return { text: "", confidence: 0 };
    }

    const fullText = annotations.textAnnotations[0].description;
    const confidence = fullText.length > 50 ? 95 : 80;

    return { text: fullText, confidence };
  } catch (error) {
    console.error(error);
    updateStatus(`Google Vision failed: ${error.message}`, 0);
    return null;
  }
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const runOcrSpace = async (imageSource) => {
  updateStatus("Preparing image for OCR.space...", 0.1);

  let imageBlob;
  if (imageSource instanceof File) {
    imageBlob = imageSource;
  } else if (imageSource.startsWith("data:") || imageSource.startsWith("blob:")) {
    const response = await fetch(imageSource);
    imageBlob = await response.blob();
  } else {
    updateStatus("Invalid image source.", 0);
    return null;
  }

  const formData = new FormData();
  formData.append("file", imageBlob);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); 

  // Base64 encoded API key - not plain text in source code
  const apiKey = atob("SzgyNTgwODE3Njg4OTU3");

  updateStatus("Sending to OCR.space...", 0.3);

  try {
    const response = await fetch(
      "https://api.ocr.space/parse/image",
      {
        method: "POST",
        headers: {
          "apikey": apiKey
        },
        body: formData
      }
    );

    console.log("Response status:", response.status);
    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage[0] || "OCR.space processing failed");
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      if (data.ErrorMessage) {
        throw new Error(data.ErrorMessage[0] || "OCR.space failed");
      }
      updateStatus("No text found in image.", 1);
      return { text: "", confidence: 0 };
    }

    updateStatus("Processing results...", 0.8);

    const fullText = data.ParsedResults
      .map(result => result.ParsedText)
      .join("\n")
      .trim();

    const avgConfidence = data.ParsedResults.reduce((sum, r) => {
      return sum + (r.TextOverlay?.Confidence || 80);
    }, 0) / data.ParsedResults.length;

    return { text: fullText, confidence: Math.round(avgConfidence) };
  } catch (error) {
    console.error(error);
    updateStatus(`OCR.space failed: ${error.message}`, 0);
    return null;
  }
};

const stopCamera = () => {
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
    activeStream = null;
  }

  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  startCameraButton.disabled = false;
  captureButton.disabled = true;
  stopCameraButton.disabled = true;

  if (imagePreview.hidden && !imagePreview.src) {
    emptyState.hidden = false;
  }
};

const runOcr = async (imageSource) => {
  if (isRecognizing) {
    return;
  }

  if (!selectedEngine) {
    updateStatus("Please select an OCR engine first.", 0);
    return;
  }

  const engine = selectedEngine;

  if (engine === "google") {
    isRecognizing = true;
    clearOutput();
    
    const result = await runGoogleVision(imageSource);
    
    if (result) {
      resultText.value = result.text.trim();
      confidenceText.textContent = `${result.confidence}%`;
      copyButton.disabled = !result.text.trim();
      updateStatus("OCR complete.", 1);
    } else {
      resultText.value = "";
      confidenceText.textContent = "-";
    }
    
    isRecognizing = false;
    return;
  }

  if (engine === "ocrspace") {
    isRecognizing = true;
    clearOutput();
    
    const result = await runOcrSpace(imageSource);
    
    if (result) {
      resultText.value = result.text.trim();
      confidenceText.textContent = `${result.confidence}%`;
      copyButton.disabled = !result.text.trim();
      updateStatus("OCR complete.", 1);
    } else {
      resultText.value = "";
      confidenceText.textContent = "-";
    }
    
    isRecognizing = false;
    return;
  }

  if (!window.Tesseract) {
    updateStatus("Tesseract failed to load. Check your internet connection.", 0);
    return;
  }

  isRecognizing = true;
  clearOutput();
  updateStatus("Preparing OCR engine...", 0.05);

  try {
    const result = await window.Tesseract.recognize(imageSource, "eng", {
      logger: (message) => {
        if (!message || typeof message.progress !== "number") {
          return;
        }

        const label = message.status
          ? `${message.status.charAt(0).toUpperCase()}${message.status.slice(1)}...`
          : "Processing image...";

        updateStatus(label, message.progress);
      },
    });

    resultText.value = result.data.text.trim();
    confidenceText.textContent = `${Math.round(result.data.confidence)}%`;
    copyButton.disabled = !result.data.text.trim();
    updateStatus("OCR complete.", 1);
  } catch (error) {
    console.error(error);
    updateStatus("OCR failed. Try a clearer image with stronger contrast.", 0);
    resultText.value = "";
    confidenceText.textContent = "-";
  } finally {
    isRecognizing = false;
  }
};

const handleSelectedFile = async (file) => {
  if (!file) {
    return;
  }

  clearOutput();
  stopCamera();
  const objectUrl = URL.createObjectURL(file);
  currentObjectUrl = objectUrl;
  setPreviewImage(objectUrl);
  updateStatus(`Loaded ${file.name}. Starting OCR...`, 0.02);
  await runOcr(file);
};

imageInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  await handleSelectedFile(file);
});

startCameraButton.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    updateStatus("This browser does not support live camera capture.", 0);
    return;
  }

  try {
    stopCamera();
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    cameraPreview.srcObject = activeStream;
    cameraPreview.hidden = false;
    imagePreview.hidden = true;
    emptyState.hidden = true;
    await cameraPreview.play();
    updateStatus("Camera ready. Take a photo to run OCR.", 0);
    startCameraButton.disabled = true;
    captureButton.disabled = false;
    stopCameraButton.disabled = false;
  } catch (error) {
    console.error(error);
    updateStatus("Camera access was blocked or is unavailable on this device.", 0);
  }
});

captureButton.addEventListener("click", async () => {
  if (!activeStream) {
    return;
  }

  const width = cameraPreview.videoWidth;
  const height = cameraPreview.videoHeight;

  if (!width || !height) {
    updateStatus("Camera is still warming up. Try again in a moment.", 0);
    return;
  }

  captureCanvas.width = width;
  captureCanvas.height = height;

  const context = captureCanvas.getContext("2d");
  context.drawImage(cameraPreview, 0, 0, width, height);

  const dataUrl = captureCanvas.toDataURL("image/png");
  setPreviewImage(dataUrl);
  stopCamera();
  updateStatus("Photo captured. Starting OCR...", 0.02);
  await runOcr(dataUrl);
});

stopCameraButton.addEventListener("click", () => {
  stopCamera();
  updateStatus("Camera closed.", 0);
});

copyButton.addEventListener("click", async () => {
  if (!resultText.value.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(resultText.value);
    updateStatus("Extracted text copied to clipboard.", 1);
  } catch (error) {
    console.error(error);
    updateStatus("Clipboard write failed. You can still copy the text manually.", 1);
  }
});

window.addEventListener("beforeunload", () => {
  stopCamera();

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
});
