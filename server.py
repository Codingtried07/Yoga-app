from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from yoga_detector import YogaPoseDetector

app = Flask(__name__)
CORS(app)

# Initialize the YogaPoseDetector
detector = YogaPoseDetector()

@app.route("/analyze", methods=["POST"])
def analyze_condition():
    try:
        data = request.json
        health_condition = data.get('healthCondition', '')
        
        # This is a simple template for yoga recommendations
        # In a production environment, you might want to use a more sophisticated
        # analysis system or AI model to generate personalized recommendations
        recommendations = generate_recommendations(health_condition)
        
        return jsonify({
            "success": True,
            "recommendations": recommendations
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/predict", methods=["POST"])
def predict_pose():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400

        # Read the image file
        file = request.files["image"]
        img_array = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        # Process the frame using the detector
        frame, pose_name, confidence = detector.process_frame(frame)

        return jsonify({
            "success": True,
            "pose": pose_name,
            "confidence": confidence
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def generate_recommendations(health_condition):
    # Simple keyword-based recommendation system
    condition_lower = health_condition.lower()
    
    # Base template for yoga pose description
    template = """1. Child's Pose (Balasana)
Benefits: Relieves stress and fatigue, gentle stretch for back and hips
Steps: 1) Kneel on the floor 2) Sit back on your heels 3) Fold forward, extending arms
Precautions: Avoid if you have knee injuries
Duration: Hold for 3-5 minutes

2. Cat-Cow Stretch (Marjaryasana-Bitilasana)
Benefits: Improves spine flexibility, relieves back pain
Steps: 1) Start on hands and knees 2) Alternate between arching and rounding your back
Precautions: Keep movements gentle and controlled
Duration: 5-10 cycles

3. Corpse Pose (Savasana)
Benefits: Deep relaxation, reduces stress and anxiety
Steps: 1) Lie on your back 2) Arms and legs extended, palms up 3) Close eyes and breathe deeply
Precautions: Place small pillow under head if needed
Duration: 5-10 minutes"""
    
    # In a production environment, you would want to implement more sophisticated
    # recommendation logic based on the specific health conditions
    
    return template

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)