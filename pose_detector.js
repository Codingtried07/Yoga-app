let isCapturing = false;
let stream = null;
let poseTimer = 0;
let poseStartTime = null;
let currentPoseName = null;

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const video = document.getElementById('video');
const canvas = document.getElementById('poseCanvas');
const currentPoseElement = document.getElementById('currentPose');
const poseConfidenceElement = document.getElementById('poseConfidence');
const poseTimerElement = document.getElementById('poseTimer');

startButton.addEventListener('click', startPoseDetection);
stopButton.addEventListener('click', stopPoseDetection);

async function startPoseDetection() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();

        // Show/hide appropriate buttons
        startButton.style.display = 'none';
        stopButton.style.display = 'inline-block';

        isCapturing = true;
        detectPose();
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Please allow camera access to use pose detection.');
    }
}

function stopPoseDetection() {
    isCapturing = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    // Reset UI
    startButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
    currentPoseElement.textContent = 'Not detected';
    poseConfidenceElement.textContent = '0%';
    poseTimer = 0;
    poseStartTime = null;
    updatePoseTimer();
}

async function detectPose() {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    async function analyze() {
        if (!isCapturing) return;

        // Capture current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            const formData = new FormData();
            formData.append('image', blob);

            // Send to backend for analysis
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            // Update UI with results
            currentPoseElement.textContent = result.pose;
            poseConfidenceElement.textContent = `${result.confidence.toFixed(1)}%`;

            // Update pose timer
            if (result.pose === currentPoseName && result.confidence > 70) {
                if (!poseStartTime) {
                    poseStartTime = Date.now();
                }
            } else {
                currentPoseName = result.pose;
                poseStartTime = null;
                poseTimer = 0;
            }

            updatePoseTimer();

        } catch (error) {
            console.error('Error analyzing pose:', error);
        }

        // Continue the detection loop
        if (isCapturing) {
            requestAnimationFrame(analyze);
        }
    }

    analyze();
}

function updatePoseTimer() {
    if (poseStartTime) {
        poseTimer = (Date.now() - poseStartTime) / 1000;
    }
    poseTimerElement.textContent = `${poseTimer.toFixed(1)}s`;
}