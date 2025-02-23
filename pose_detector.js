// Global variables
let isCapturing = false;
let stream = null;
let poseTimer = 0;
let poseStartTime = null;
let currentPoseName = "";
let currentLevelIndex = 0;
const thresholdConfidence = 70; // percent

// Define levels for 5 yoga poses
const levels = [
  {
    level: 1,
    pose: "Mountain Pose",
    requiredTime: 10, // seconds
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
    requiredTime: 15,
    instructions: [
      "Stand on one leg",
      "Place the other foot on the inner thigh",
      "Balance and hold for 15 seconds"
    ],
    image: "images/tree_pose.jpeg"
  },
  {
    level: 3,
    pose: "Warrior I",
    requiredTime: 20,
    instructions: [
      "Step one foot back",
      "Bend the front knee",
      "Raise arms overhead",
      "Hold for 20 seconds"
    ],
    image: "images/warrior1.jpeg"
  },
  {
    level: 4,
    pose: "Chair Pose",
    requiredTime: 25,
    instructions: [
      "Stand with feet together or hip-width apart",
      "Bend knees and lower hips",
      "Raise arms overhead",
      "Hold for 25 seconds"
    ],
    image: "images/chair_pose.jpeg"
  },
  {
    level: 5,
    pose: "Triangle Pose",
    requiredTime: 30,
    instructions: [
      "Wide stance with front foot forward",
      "Extend sideways and lower one hand to the shin",
      "Raise the top arm",
      "Hold for 30 seconds"
    ],
    image: "images/triangle_pose.jpeg"
  }
];

// Grab UI elements from the HTML
const video = document.getElementById("video");
const canvas = document.getElementById("poseCanvas");
const currentPoseElement = document.getElementById("currentPose");
const poseConfidenceElement = document.getElementById("poseConfidence");
const poseTimerElement = document.getElementById("poseTimer");
const progressBar = document.getElementById("progressBar");

// Level UI elements (right column)
const levelTitleElement = document.getElementById("levelTitle");
const poseTitleElement = document.getElementById("poseTitle");
const instructionsElement = document.querySelector(".instructions ul");
const poseImageElement = document.querySelector(".pose-image img");

// Bottom buttons for level control
const nextLevelButton = document.getElementById("nextLevelButton");
const skipLevelButton = document.getElementById("skipLevelButton");

// Update the right-column UI with current level data
function updateLevelUI() {
  const currentLevel = levels[currentLevelIndex];
  levelTitleElement.textContent = "Level " + currentLevel.level;
  poseTitleElement.textContent = currentLevel.pose;
  
  // Update instructions list
  instructionsElement.innerHTML = "";
  currentLevel.instructions.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    instructionsElement.appendChild(li);
  });
  
  // Update pose image
  poseImageElement.src = currentLevel.image;
  
  // Reset detection variables for new level
  poseStartTime = null;
  poseTimer = 0;
  updatePoseTimer();
  updateProgressBar(0);
  nextLevelButton.disabled = true;
}

// Update the timer display
function updatePoseTimer() {
  if (poseStartTime) {
    poseTimer = (Date.now() - poseStartTime) / 1000;
  }
  poseTimerElement.textContent = poseTimer.toFixed(1) + "s";
}

// Update the progress bar width based on percentage
function updateProgressBar(percentage) {
  progressBar.style.width = percentage + "%";
}

// Start pose detection (access camera)
async function startPoseDetection() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    isCapturing = true;
    detectPose();
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Please allow camera access to use pose detection.");
  }
}

// Stop pose detection
function stopPoseDetection() {
  isCapturing = false;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  currentPoseElement.textContent = "Not detected";
  poseConfidenceElement.textContent = "0%";
  poseTimer = 0;
  poseStartTime = null;
  updatePoseTimer();
  updateProgressBar(0);
}

// The main detection loop
async function detectPose() {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  async function analyze() {
    if (!isCapturing) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      // Convert current frame to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
      const formData = new FormData();
      formData.append("image", blob);

      // Send to backend for analysis (update URL if needed)
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      
      // Update current pose & confidence in UI
      currentPoseElement.textContent = result.pose;
      poseConfidenceElement.textContent = result.confidence.toFixed(1) + "%";
      
      // Check if the detected pose matches the current level
      const currentLevel = levels[currentLevelIndex];
      if (result.pose === currentLevel.pose && result.confidence >= thresholdConfidence) {
        if (!poseStartTime) {
          poseStartTime = Date.now();
        }
      } else {
        // If not matching, reset timer & progress
        poseStartTime = null;
        poseTimer = 0;
        updateProgressBar(0);
      }
      updatePoseTimer();

      // Update progress bar based on time held
      if (poseStartTime) {
        const progress = Math.min((poseTimer / currentLevel.requiredTime) * 100, 100);
        updateProgressBar(progress);
        // Enable "Next Level" button when required time is met
        nextLevelButton.disabled = (poseTimer < currentLevel.requiredTime);
      } else {
        nextLevelButton.disabled = true;
      }
    } catch (error) {
      console.error("Error analyzing pose:", error);
    }
    if (isCapturing) {
      requestAnimationFrame(analyze);
    }
  }
  analyze();
}

// Move to the next level if available
function nextLevel() {
  if (currentLevelIndex < levels.length - 1) {
    currentLevelIndex++;
    updateLevelUI();
  } else {
    alert("Congratulations! You have completed all levels.");
    stopPoseDetection();
  }
}

// Skip the current level and move to next
function skipLevel() {
  if (currentLevelIndex < levels.length - 1) {
    currentLevelIndex++;
    updateLevelUI();
  } else {
    alert("No more levels to skip.");
  }
}

// Attach event listeners for Next and Skip buttons
nextLevelButton.addEventListener("click", nextLevel);
skipLevelButton.addEventListener("click", skipLevel);

// Initialize UI with first level data and start detection
updateLevelUI();
startPoseDetection();
