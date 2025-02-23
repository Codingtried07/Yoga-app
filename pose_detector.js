// Global variables
let isCapturing = false;
let stream = null;
let timerInterval = null;
let timeRemaining = 10; // 10 seconds countdown
let currentLevelIndex = 0;
let consecutiveCorrectFrames = 0;
const FRAMES_NEEDED_FOR_SUCCESS = 15; // About 0.5 seconds of correct pose
const thresholdConfidence = 70; // percent
const REQUIRED_HOLD_TIME = 10;

// Define levels for yoga poses
const levels = [
  {
    level: 1,
    pose: "Mountain Pose",
    requiredTime: 10,
    instructions: [
      "Arms at sides, palms forward",
      "Feet hip-width apart",
      "Spine straight, shoulders relaxed",
      "Hold for 10 seconds"
    ],
    image: "images/mountain_pose.jpeg"
  },
  {
    level: 2,
    pose: "Tree Pose",
    requiredTime: 10,
    instructions: [
      "Stand on one leg",
      "Place other foot on inner thigh",
      "Hands in prayer position",
      "Hold for 10 seconds"
    ],
    image: "images/tree_pose.jpeg"
  },
  {
    level: 3,
    pose: "Warrior I",
    requiredTime: 10,
    instructions: [
      "Step one foot back",
      "Bend front knee to 90 degrees",
      "Raise arms overhead",
      "Hold for 10 seconds"
    ],
    image: "images/warrior1.jpeg"
  },
  {
    level: 4,
    pose: "Chair Pose",
    requiredTime: 10,
    instructions: [
      "Stand with feet together",
      "Bend knees, lower hips",
      "Raise arms overhead",
      "Hold for 10 seconds"
    ],
    image: "images/chair_pose.jpeg"
  },
  {
    level: 5,
    pose: "Triangle Pose",
    requiredTime: 10,
    instructions: [
      "Wide stance with front foot forward",
      "Extend sideways, lower hand to shin",
      "Raise top arm toward ceiling",
      "Hold for 10 seconds"
    ],
    image: "images/triangle_pose.jpeg"
  }
];

// Get DOM elements
const video = document.getElementById("video");
const canvas = document.getElementById("poseCanvas");
const currentPoseElement = document.getElementById("currentPose");
const poseConfidenceElement = document.getElementById("poseConfidence");
const levelTitleElement = document.getElementById("levelTitle");
const poseTitleElement = document.getElementById("poseTitle");
const instructionsElement = document.querySelector(".instructions ul");
const poseImageElement = document.querySelector(".pose-image img");
const startButton = document.getElementById("startButton");
const nextLevelButton = document.getElementById("nextLevelButton");
const skipLevelButton = document.getElementById("skipLevelButton");
const quitButton = document.getElementById("quitButton");

function showFeedback(message, isSuccess = true) {
  const existingFeedback = document.querySelector(".pose-feedback");
  if (existingFeedback) {
    existingFeedback.remove();
  }

  const feedbackElement = document.createElement("div");
  feedbackElement.classList.add("pose-feedback");
  feedbackElement.className = `pose-feedback ${isSuccess ? 'success' : 'error'}`;
  feedbackElement.textContent = message;
  document.querySelector(".pose-info").appendChild(feedbackElement);

  setTimeout(() => {
    feedbackElement.remove();
  }, 3000);
}

function startTimer() {
  if (timerInterval) return; // Don't start if already running

  timeRemaining = REQUIRED_HOLD_TIME;
  updateTimerDisplay(timeRemaining);

  timerInterval = setInterval(() => {
    timeRemaining -= 0.1; // Update every 100ms

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timeRemaining = 0;
      handlePoseComplete();
    }

    updateTimerDisplay(timeRemaining);
  }, 100);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timeRemaining = REQUIRED_HOLD_TIME;
  updateTimerDisplay(timeRemaining);
}

function updateTimerDisplay(time) {
  // Update the time text
  const timeRemainingElement = document.getElementById('timeRemaining');
  timeRemainingElement.textContent = `${Math.max(0, time.toFixed(1))}s`;

  // Update the progress bar
  const timerBar = document.getElementById('timerBar');
  const percentRemaining = (time / REQUIRED_HOLD_TIME) * 100;
  timerBar.style.width = `${percentRemaining}%`;
}

function handlePoseComplete() {
  showFeedback("Great job! Pose completed!", true);
  nextLevel();
}

function updateLevelUI() {
  const currentLevel = levels[currentLevelIndex];
  levelTitleElement.textContent = `Level ${currentLevel.level}`;
  poseTitleElement.textContent = currentLevel.pose;

  instructionsElement.innerHTML = "";
  currentLevel.instructions.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    instructionsElement.appendChild(li);
  });

  poseImageElement.src = currentLevel.image;
  poseImageElement.alt = currentLevel.pose;

  document.querySelectorAll('.level-circle').forEach((circle, index) => {
    circle.classList.toggle('active', index === currentLevelIndex);
  });

  resetPoseDetection();
}

function resetPoseDetection() {
  stopTimer();
  consecutiveCorrectFrames = 0;
  nextLevelButton.disabled = true;
}

async function detectPose() {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  async function analyze() {
    if (!isCapturing) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
      const formData = new FormData();
      formData.append("image", blob);

      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      // Update pose information
      currentPoseElement.textContent = result.pose;
      poseConfidenceElement.textContent = `${result.confidence.toFixed(1)}%`;

      // Check if pose is correct
      const isPoseCorrect = result.pose === levels[currentLevelIndex].pose &&
        result.confidence >= thresholdConfidence;

      if (isPoseCorrect) {
        consecutiveCorrectFrames++;

        if (consecutiveCorrectFrames >= FRAMES_NEEDED_FOR_SUCCESS && !timerInterval) {
          showFeedback("Great! Hold this pose!", true);
          startTimer();
        }
      } else {
        if (consecutiveCorrectFrames >= FRAMES_NEEDED_FOR_SUCCESS) {
          showFeedback("Pose broken - get back into position!", false);
          stopTimer();
        }
        consecutiveCorrectFrames = 0;
      }

    } catch (error) {
      console.error("Error analyzing pose:", error);
      showFeedback("Error detecting pose. Please try again.", false);
    }

    if (isCapturing) {
      requestAnimationFrame(analyze);
    }
  }

  analyze();
}

async function startPoseDetection() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    isCapturing = true;
    detectPose();
    showFeedback("Camera started successfully! Get into position.", true);
    startButton.textContent = "Reset Challenge";
  } catch (error) {
    console.error("Error accessing camera:", error);
    showFeedback("Camera access denied. Please allow camera access.", false);
  }
}

function stopPoseDetection() {
  isCapturing = false;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  resetPoseDetection();
  currentPoseElement.textContent = "Not detected";
  poseConfidenceElement.textContent = "0%";
  startButton.textContent = "Start Challenge";
}

function nextLevel() {
  if (currentLevelIndex < levels.length - 1) {
    currentLevelIndex++;
    updateLevelUI();
    showFeedback(`Starting Level ${currentLevelIndex + 1}`, true);
  } else {
    showFeedback("Congratulations! You've completed all levels!", true);
    stopPoseDetection();
  }
}

// Event Listeners
startButton.addEventListener("click", () => {
  if (isCapturing) {
    stopPoseDetection();
  } else {
    startPoseDetection();
  }
});

skipLevelButton.addEventListener("click", nextLevel);

quitButton.addEventListener("click", () => {
  window.location.href = "index.html";
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateLevelUI();
});