const ACTIVITY_LABELS = {
  movie: "movie",
  dance: "dance",
  reels: "reels",
  cuddling: "cuddling",
  "so-much-cuddling": "so v much cuddling",
  suppai: "suppai",
};

const ACTIVITY_CONTENT = {
  dance: {
    type: "options",
    items: ["beat it", "othaiyadi pathayila", "phir milenge chalte chalte"],
    responses: {
      "beat it": "i'm only better",
      "othaiyadi pathayila": "sarle you're better",
      "phir milenge chalte chalte": "avsrama manaki",
    },
  },
  reels: {
    type: "options",
    items: ["food jutsu", "say kalshi cheptha in 4 ways", "first bite"],
    responses: {
      "food jutsu": "neek thelsu",
      "first bite": "nen cheptha le",
      "say kalshi cheptha in 4 ways": "idhi kuda neek thelsu",
    },
  },
  movie: {
    type: "options",
    items: ["rom", "thriller", "horror"],
    responses: {
      rom: "anything is romantic w u",
      horror: "anything is scary w u",
      thriller: "anything is thrilling w u",
    },
  },
  cuddling: {
    type: "text",
    text: "hihi",
    className: "",
  },
  "so-much-cuddling": {
    type: "text",
    text: "oiii",
    className: "spicy",
  },
  suppai: {
    type: "text",
    text: "close ur eyes",
    className: "gentle",
  },
};

let currentQuestion = 0;
let score = 0;
let answeredQuestions = new Set();
let questionResults = [];
let activityOrder = [];
let activityIndex = 0;

const pages = {
  welcome: document.getElementById("page-welcome"),
  face: document.getElementById("page-face"),
  quiz: document.getElementById("page-quiz"),
  planner: document.getElementById("page-planner"),
  activities: document.getElementById("page-activities"),
  finale: document.getElementById("page-finale"),
};

function showPage(pageId) {
  if (pageId !== "face") {
    stopWebcam();
    resetCameraUi();
  }

  Object.values(pages).forEach((p) => {
    if (p.classList.contains("active")) {
      p.classList.add("exit");
      setTimeout(() => p.classList.remove("exit", "active"), 350);
    }
  });

  setTimeout(() => {
    Object.values(pages).forEach((p) => p.classList.remove("active"));
    pages[pageId].classList.add("active");
  }, 360);
}

/* ── Webcam & face verify ── */
const webcam = document.getElementById("webcam");
const captureCanvas = document.getElementById("capture-canvas");
const verifyBtn = document.getElementById("verify-btn");
const faceMessage = document.getElementById("face-message");
const scanRing = document.getElementById("scan-ring");
const cameraOverlay = document.getElementById("camera-overlay");
const cameraLoader = document.getElementById("camera-loader");
const startCameraBtn = document.getElementById("start-camera-btn");
const skipFaceBtn = document.getElementById("skip-face-btn");

let cameraStream = null;
let cameraReady = false;
const hasVarshiniPhoto = window.HAS_VARSHINI_PHOTO === true;

function stopWebcam() {
  const streams = [cameraStream, webcam.srcObject].filter(Boolean);
  streams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  });
  cameraStream = null;
  webcam.srcObject = null;
  webcam.removeAttribute("src");
  webcam.load();
  cameraReady = false;
}

function resetCameraUi() {
  cameraLoader.classList.add("hidden");
  startCameraBtn.classList.remove("hidden");
  startCameraBtn.textContent = "enable camera";
  cameraOverlay.classList.remove("hidden");
  scanRing.classList.add("hidden");
  verifyBtn.disabled = true;
  skipFaceBtn.classList.add("hidden");
}

function cameraErrorMessage(err) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return "camera needs localhost — open http://127.0.0.1:5000 (not an IP address)";
  }
  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    return "camera blocked — allow access in your browser settings";
  }
  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    return "no camera found on this device";
  }
  if (err.name === "NotReadableError" || err.name === "TrackStartError") {
    return "camera busy — close other tabs/apps using it, then tap retry";
  }
  if (err.message === "Camera timed out") {
    return "camera took too long — tap retry";
  }
  return "could not start camera — tap retry";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestCameraStream(retries = 3) {
  stopWebcam();
  await wait(300);

  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      lastError = err;
      const retryable =
        err.name === "NotReadableError" ||
        err.name === "TrackStartError" ||
        err.name === "AbortError";

      if (!retryable || attempt === retries - 1) {
        throw err;
      }

      faceMessage.textContent = `camera busy — retrying (${attempt + 2}/${retries})...`;
      stopWebcam();
      await wait(800 * (attempt + 1));
    }
  }

  throw lastError;
}

async function startWebcam() {
  if (!hasVarshiniPhoto) {
    faceMessage.textContent = "verification is not set up yet";
    faceMessage.className = "message error";
    return;
  }

  startCameraBtn.classList.add("hidden");
  cameraLoader.classList.remove("hidden");
  faceMessage.textContent = "starting camera...";
  faceMessage.className = "message";

  try {
    const stream = await requestCameraStream();

    cameraStream = stream;
    webcam.srcObject = stream;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Camera timed out")), 12000);
      webcam.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
      webcam.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Video failed to load"));
      };
    });

    await webcam.play();

    cameraReady = webcam.videoWidth > 0 && webcam.videoHeight > 0;
    if (!cameraReady) {
      throw new Error("Camera returned no video");
    }

    cameraOverlay.classList.add("hidden");
    scanRing.classList.remove("hidden");
    verifyBtn.disabled = false;
    startCameraBtn.textContent = "enable camera";
    faceMessage.textContent = "camera ready — click verify when you're in frame";
    faceMessage.className = "message success";
  } catch (err) {
    console.error("Camera error:", err);
    stopWebcam();
    resetCameraUi();
    startCameraBtn.textContent = "retry camera";
    faceMessage.textContent = cameraErrorMessage(err);
    faceMessage.className = "message error";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      skipFaceBtn.classList.remove("hidden");
    }
  }
}

startCameraBtn.addEventListener("click", startWebcam);
skipFaceBtn.addEventListener("click", async () => {
  skipFaceBtn.disabled = true;
  try {
    await fetch("/api/skip-face", { method: "POST" });
    showWelcomePopup();
  } catch {
    faceMessage.textContent = "could not continue — try again";
    faceMessage.className = "message error";
    skipFaceBtn.disabled = false;
  }
});

const welcomePopup = document.getElementById("welcome-popup");
const popupContinueBtn = document.getElementById("popup-continue-btn");
const tulipCorners = document.getElementById("tulip-corners");

document.getElementById("welcome-next-btn").addEventListener("click", () => {
  showPage("face");
});

function showWelcomePopup() {
  welcomePopup.classList.remove("hidden");
}

function hideWelcomePopup() {
  welcomePopup.classList.add("hidden");
}

popupContinueBtn.addEventListener("click", () => {
  hideWelcomePopup();
  initQuiz();
  showPage("quiz");
});

verifyBtn.addEventListener("click", async () => {
  if (!cameraReady || !webcam.videoWidth) {
    faceMessage.textContent = "camera not ready yet — enable it first";
    faceMessage.className = "message error";
    return;
  }

  verifyBtn.disabled = true;
  scanRing.classList.add("scanning");
  faceMessage.textContent = "checking...";
  faceMessage.className = "message";

  const ctx = captureCanvas.getContext("2d");
  captureCanvas.width = webcam.videoWidth;
  captureCanvas.height = webcam.videoHeight;
  ctx.drawImage(webcam, 0, 0);
  const imageData = captureCanvas.toDataURL("image/jpeg", 0.85);

  try {
    const res = await fetch("/api/verify-face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData }),
    });
    const data = await res.json();

    if (data.success) {
      faceMessage.textContent = "extremely pretty face detected⚠️";
      faceMessage.className = "message success";
      stopWebcam();
      setTimeout(() => {
        showWelcomePopup();
      }, 1600);
    } else {
      faceMessage.textContent = data.message;
      faceMessage.className = "message error";
      verifyBtn.disabled = false;
    }
  } catch {
    faceMessage.textContent = "something went wrong — try again";
    faceMessage.className = "message error";
    verifyBtn.disabled = false;
  }

  scanRing.classList.remove("scanning");
});

window.addEventListener("beforeunload", stopWebcam);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopWebcam();
  }
});

/* ── Quiz ── */
const quizScore = document.getElementById("quiz-score");
const progressDots = document.getElementById("progress-dots");
const questionText = document.getElementById("question-text");
const answerInput = document.getElementById("answer-input");
const answerFeedback = document.getElementById("answer-feedback");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const quizFail = document.getElementById("quiz-fail");
const quizPass = document.getElementById("quiz-pass");
const questionArea = document.getElementById("question-area");
const retryQuizBtn = document.getElementById("retry-quiz-btn");
const enterDashboardBtn = document.getElementById("enter-dashboard-btn");
const hiVMessage = document.getElementById("hi-v-message");
const quizContent = document.getElementById("quiz-content");
let hiVTimer = null;
let quizRevealTimer = null;

function initQuiz() {
  currentQuestion = 0;
  score = 0;
  answeredQuestions = new Set();
  questionResults = [];
  quizScore.textContent = "0";
  quizFail.classList.add("hidden");
  quizPass.classList.add("hidden");
  questionArea.classList.remove("hidden");
  quizContent.classList.add("hidden");
  hiVMessage.classList.remove("hidden", "fade-away");
  tulipCorners.classList.add("visible");
  clearTimeout(hiVTimer);
  clearTimeout(quizRevealTimer);
  hiVTimer = setTimeout(() => {
    hiVMessage.classList.add("fade-away");
    quizRevealTimer = setTimeout(() => {
      hiVMessage.classList.add("hidden");
      quizContent.classList.remove("hidden");
      showQuestion();
    }, 500);
  }, 3000);
  renderProgressDots();
}

function renderProgressDots() {
  progressDots.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const dot = document.createElement("span");
    dot.className = "dot";
    if (answeredQuestions.has(i)) {
      dot.classList.add(questionResults[i] ? "correct" : "wrong");
    }
    if (i === currentQuestion && !answeredQuestions.has(i)) dot.classList.add("current");
    progressDots.appendChild(dot);
  }
}

function showQuestion() {
  if (currentQuestion >= 5) {
    finishQuiz();
    return;
  }

  questionText.textContent = window.QUIZ_QUESTIONS[currentQuestion];
  answerInput.value = "";
  answerFeedback.textContent = "";
  answerFeedback.className = "feedback";
  answerInput.focus();
  renderProgressDots();
}

async function submitAnswer() {
  const answer = answerInput.value.trim();
  if (!answer) return;

  submitAnswerBtn.disabled = true;

  try {
    const res = await fetch("/api/check-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex: currentQuestion, answer }),
    });
    const data = await res.json();

    if (data.correct) {
      score++;
      quizScore.textContent = score;
      if (currentQuestion === 4) { answerFeedback.textContent = "YuHhh!"; }
      else if (currentQuestion === 6) { answerFeedback.textContent = "you don't want to kiss him? 🥺"; }
      else { answerFeedback.textContent = "correst! 🫰"; }
      answerFeedback.className = "feedback correct";

      questionResults[currentQuestion] = true;
      answeredQuestions.add(currentQuestion);
      renderProgressDots();

      setTimeout(() => {
        currentQuestion++;
        submitAnswerBtn.disabled = false;
        showQuestion();
      }, 900);
    } else {
      answerFeedback.textContent = "ehe!";
      answerFeedback.className = "feedback wrong";
      submitAnswerBtn.disabled = false;
      answerInput.select();
    }
  } catch {
    answerFeedback.textContent = "error — try again";
    answerFeedback.className = "feedback wrong";
    submitAnswerBtn.disabled = false;
  }
}

function finishQuiz() {
  questionArea.classList.add("hidden");

  if (score === 5) {
    fetch("/api/quiz-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    quizPass.classList.remove("hidden");
  } else {
    quizFail.classList.remove("hidden");
  }
}

submitAnswerBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});

retryQuizBtn.addEventListener("click", initQuiz);

enterDashboardBtn.addEventListener("click", () => {
  showPage("planner");
});

/* ── Drag-to-reorder planner ── */
const activityList = document.getElementById("activity-list");
const plannerNextBtn = document.getElementById("planner-next-btn");
let dragItem = null;
let touchItem = null;

activityList.querySelectorAll(".activity-item").forEach((item) => {
  item.addEventListener("dragstart", (e) => {
    dragItem = item;
    item.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
    activityList.querySelectorAll(".activity-item").forEach((i) =>
      i.classList.remove("drag-over")
    );
    dragItem = null;
  });

  item.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (item === dragItem) return;
    item.classList.add("drag-over");
  });

  item.addEventListener("dragleave", () => {
    item.classList.remove("drag-over");
  });

  item.addEventListener("drop", (e) => {
    e.preventDefault();
    item.classList.remove("drag-over");
    if (!dragItem || dragItem === item) return;

    const items = [...activityList.children];
    const dragIdx = items.indexOf(dragItem);
    const dropIdx = items.indexOf(item);

    if (dragIdx < dropIdx) {
      item.after(dragItem);
    } else {
      item.before(dragItem);
    }
  });

  /* Mobile tap-to-swap */
  item.addEventListener("click", () => {
    if (!touchItem) {
      touchItem = item;
      item.style.outline = "2px solid #9ec9eb";
      return;
    }
    if (touchItem === item) {
      touchItem.style.outline = "";
      touchItem = null;
      return;
    }
    const parent = activityList;
    const ref = touchItem.nextSibling === item ? item : item.nextSibling;
    parent.insertBefore(touchItem, ref);
    touchItem.style.outline = "";
    touchItem = null;
  });
});

plannerNextBtn.addEventListener("click", () => {
  activityOrder = [...activityList.querySelectorAll(".activity-item")].map(
    (el) => el.dataset.activity
  );
  activityIndex = 0;
  showActivity();
  showPage("activities");
});

/* ── Activity sequence ── */
const activityStep = document.getElementById("activity-step");
const activityTitle = document.getElementById("activity-title");
const activityContent = document.getElementById("activity-content");
const activityNextBtn = document.getElementById("activity-next-btn");

function showActivity() {
  if (activityIndex >= activityOrder.length) {
    showPage("finale");
    return;
  }

  const key = activityOrder[activityIndex];
  const label = ACTIVITY_LABELS[key];
  const content = ACTIVITY_CONTENT[key];

  activityStep.textContent = `${activityIndex + 1} / ${activityOrder.length}`;
  activityTitle.textContent = label;
  activityContent.innerHTML = "";

  if (content.type === "options") {
    const grid = document.createElement("div");
    grid.className = "option-grid";
    const responseEl = document.createElement("div");
    responseEl.className = "option-response hidden";
    content.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "option-card";
      card.textContent = item;
      card.addEventListener("click", () => {
        grid.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        responseEl.textContent = content.responses?.[item] || "";
        responseEl.classList.toggle("hidden", !responseEl.textContent);
      });
      grid.appendChild(card);
    });
    activityContent.appendChild(grid);
    activityContent.appendChild(responseEl);
  } else {
    const textEl = document.createElement("div");
    textEl.className = `special-text ${content.className || ""}`;
    textEl.textContent = content.text;
    activityContent.appendChild(textEl);
  }
}

activityNextBtn.addEventListener("click", () => {
  activityIndex++;
  showActivity();
});

/* ── Restart ── */
document.getElementById("restart-btn").addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
  activityIndex = 0;
  initQuiz();
  hideWelcomePopup();
  tulipCorners.classList.remove("visible");
  stopWebcam();
  resetCameraUi();
  faceMessage.textContent = "tap enable camera to begin";
  faceMessage.className = "message";
  showPage("welcome");
});
