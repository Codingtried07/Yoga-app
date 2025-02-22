import cv2
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
import time
import pickle
import os
from sklearn.ensemble import RandomForestClassifier

class YogaPoseDetector:
    def __init__(self):
        """Initialize the pose detector"""
        print("Initializing pose detector...")
        
        # Load MoveNet model
        try:
            self.model = hub.load('https://tfhub.dev/google/movenet/singlepose/lightning/4')
            self.movenet = self.model.signatures['serving_default']
        except Exception as e:
            raise Exception(f"Failed to load MoveNet model: {str(e)}")
        
        # Initialize video capture
        try:
            self.cap = cv2.VideoCapture(0)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        except Exception as e:
            raise Exception(f"Failed to initialize camera: {str(e)}")
        
        # Initialize pose classifier
        self.classifier = None
        self.load_classifier()
        
        # Training data storage
        self.training_data = []
        self.training_labels = []
        
        # Define keypoints
        self.KEYPOINTS = {
            0: 'nose', 1: 'left_eye', 2: 'right_eye', 3: 'left_ear', 4: 'right_ear',
            5: 'left_shoulder', 6: 'right_shoulder', 7: 'left_elbow', 8: 'right_elbow',
            9: 'left_wrist', 10: 'right_wrist', 11: 'left_hip', 12: 'right_hip',
            13: 'left_knee', 14: 'right_knee', 15: 'left_ankle', 16: 'right_ankle'
        }
        
        # Initialize pose database
        self.poses = self.initialize_poses()
        print("Pose detector initialized successfully!")

    def initialize_poses(self):
        """Initialize database of yoga poses with levels"""
        return {
            'level_1': {
                'name': 'Mountain Pose',
                'keypoints': {
                    'shoulders': {'alignment': 'horizontal', 'threshold': 0.15},
                    'hips': {'alignment': 'horizontal', 'threshold': 0.15},
                    'spine': {'alignment': 'vertical', 'threshold': 0.2}
                },
                'instructions': """
                Level 1: Mountain Pose (Tadasana)
                1. Stand with feet together or hip-width apart
                2. Arms at sides, palms forward
                3. Spine straight, shoulders relaxed
                4. Hold for 10 seconds to complete level
                """,
                'hold_time': 10,
                'points': 100
            },
            'level_2': {
                'name': 'Tree Pose',
                'keypoints': {
                    'standing_leg': {'alignment': 'vertical', 'threshold': 0.1},
                    'raised_knee': {'angle': 90, 'threshold': 15},
                    'hips': {'alignment': 'horizontal', 'threshold': 0.1}
                },
                'instructions': """
                Level 2: Tree Pose (Vrksasana)
                1. Stand on one leg
                2. Place other foot on inner thigh
                3. Hands in prayer position
                4. Hold for 15 seconds to complete level
                """,
                'hold_time': 15,
                'points': 200
            },
            'level_3': {
                'name': 'Warrior I',
                'keypoints': {
                    'front_knee': {'angle': 90, 'threshold': 15},
                    'back_leg': {'alignment': 'straight', 'threshold': 0.1},
                    'arms': {'alignment': 'raised', 'threshold': 0.1}
                },
                'instructions': """
                Level 3: Warrior I (Virabhadrasana I)
                1. Step one foot back, feet hip-width apart
                2. Bend front knee to 90 degrees
                3. Raise arms overhead
                4. Hold for 20 seconds to complete level
                """,
                'hold_time': 20,
                'points': 300
            },
            'level_4': {
                'name': 'Chair Pose',
                'keypoints': {
                    'knees': {'angle': 120, 'threshold': 15},
                    'arms': {'alignment': 'raised', 'threshold': 0.1},
                    'back': {'alignment': 'straight', 'threshold': 0.1}
                },
                'instructions': """
                Level 4: Chair Pose (Utkatasana)
                1. Feet together or hip-width apart
                2. Bend knees, lower hips
                3. Raise arms overhead
                4. Hold for 20 seconds to complete level
                """,
                'hold_time': 20,
                'points': 400
            },
            'level_5': {
                'name': 'Triangle Pose',
                'keypoints': {
                    'legs': {'angle': 120, 'threshold': 15},
                    'torso': {'alignment': 'lateral', 'threshold': 0.1},
                    'arms': {'alignment': 'vertical', 'threshold': 0.1}
                },
                'instructions': """
                Level 5: Triangle Pose (Trikonasana)
                1. Wide stance, front foot forward
                2. Extend sideways, lower hand to shin
                3. Top arm reaches up
                4. Hold for 25 seconds to complete level
                """,
                'hold_time': 25,
                'points': 500
            }
        }

    def load_classifier(self):
        """Load trained classifier if it exists"""
        if os.path.exists('yoga_classifier.pkl'):
            try:
                with open('yoga_classifier.pkl', 'rb') as f:
                    self.classifier = pickle.load(f)
                print("Loaded trained classifier")
            except Exception as e:
                print(f"Error loading classifier: {e}")
                self.classifier = None

    def save_classifier(self):
        """Save trained classifier"""
        if self.classifier is not None:
            try:
                with open('yoga_classifier.pkl', 'wb') as f:
                    pickle.dump(self.classifier, f)
                print("Saved trained classifier")
            except Exception as e:
                print(f"Error saving classifier: {e}")

    def preprocess_image(self, frame):
        """Preprocess image for MoveNet"""
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = tf.cast(tf.image.resize_with_pad(
            tf.expand_dims(image, axis=0), 192, 192), dtype=tf.int32)
        return image

    def detect_pose(self, image):
        """Detect pose using MoveNet"""
        outputs = self.movenet(image)
        keypoints = outputs['output_0'].numpy()[0][0]
        return keypoints

    def calculate_angle(self, point1, point2, point3):
        """Calculate angle between three points"""
        try:
            ba = point1 - point2
            bc = point3 - point2
            
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
            return np.degrees(angle)
        except Exception as e:
            print(f"Error calculating angle: {str(e)}")
            return 0

    def collect_training_data(self, pose_name, num_samples=30):
        """Collect training data for a pose"""
        print(f"Collecting data for {pose_name}. Press 'c' to start collection.")
        samples_collected = 0
        
        while samples_collected < num_samples:
            ret, frame = self.cap.read()
            if not ret:
                continue
                
            # Show instructions
            cv2.putText(frame, f"Collecting {pose_name}: {samples_collected}/{num_samples}",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "Press 'c' to collect sample, 'q' to quit",
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Process and show frame
            image = self.preprocess_image(frame)
            keypoints = self.detect_pose(image)
            self.draw_keypoints(frame, keypoints)
            
            cv2.imshow('Training Collection', frame)
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('c'):
                # Get pose features
                features = self.extract_features(keypoints)
                
                # Store data
                self.training_data.append(features)
                self.training_labels.append(pose_name)
                samples_collected += 1
                print(f"Collected sample {samples_collected}/{num_samples}")
                
            elif key == ord('q'):
                break
                
        cv2.destroyWindow('Training Collection')
        return samples_collected

    def extract_features(self, keypoints):
        """Extract relevant features from keypoints"""
        features = []
        
        # Normalize coordinates relative to hip center
        hip_center = np.mean(keypoints[11:13], axis=0)[:2]
        
        # Add relative positions of all keypoints
        for kp in keypoints:
            rel_pos = kp[:2] - hip_center
            features.extend(rel_pos)
            features.append(kp[2])  # Add confidence
            
        # Add angles between key joints
        angles = []
        # Shoulders to hips angle
        angles.append(self.calculate_angle(
            keypoints[5][:2], hip_center, keypoints[6][:2]))
        # Left leg angle
        angles.append(self.calculate_angle(
            keypoints[11][:2], keypoints[13][:2], keypoints[15][:2]))
        # Right leg angle
        angles.append(self.calculate_angle(
            keypoints[12][:2], keypoints[14][:2], keypoints[16][:2]))
        # Left arm angle
        angles.append(self.calculate_angle(
            keypoints[5][:2], keypoints[7][:2], keypoints[9][:2]))
        # Right arm angle
        angles.append(self.calculate_angle(
            keypoints[6][:2], keypoints[8][:2], keypoints[10][:2]))
        
        features.extend(angles)
        return features

    def train_classifier(self):
        """Train the pose classifier"""
        if len(self.training_data) < 2 or len(set(self.training_labels)) < 2:
            print("Not enough training data!")
            return False
            
        print("Training classifier...")
        self.classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.classifier.fit(self.training_data, self.training_labels)
        self.save_classifier()
        print("Classifier trained successfully!")
        return True

    def predict_pose(self, keypoints):
        """Predict pose using trained classifier"""
        if self.classifier is None:
            return "No trained classifier", 0
            
        features = self.extract_features(keypoints)
        prediction = self.classifier.predict([features])[0]
        confidence = np.max(self.classifier.predict_proba([features])) * 100
        return prediction, confidence

    def process_frame(self, frame):
        """Process a single frame and return results"""
        try:
            # Detect pose
            image = self.preprocess_image(frame)
            keypoints = self.detect_pose(image)
            
            # Draw keypoints
            self.draw_keypoints(frame, keypoints)
            
            # Use trained classifier if available
            if self.classifier is not None:
                pose_name, confidence = self.predict_pose(keypoints)
            else:
                # Fallback to basic confidence
                confidence = np.mean([k[2] for k in keypoints]) * 100
                pose_name = "Unknown Pose"
            
            return frame, pose_name, confidence
            
        except Exception as e:
            print(f"Error processing frame: {str(e)}")
            return frame, "Error", 0.0

    def draw_keypoints(self, frame, keypoints):
        """Draw detected keypoints on frame"""
        y, x, _ = frame.shape
        for idx, point in enumerate(keypoints):
            if point[2] > 0.2:  # Confidence threshold
                cx, cy = int(point[1] * x), int(point[0] * y)
                cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)
                cv2.putText(frame, str(idx), (cx + 10, cy + 10),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

    def get_pose_instructions(self, pose_name):
        """Get instructions for the current pose"""
        for pose_key, pose_data in self.poses.items():
            if pose_data['name'] == pose_name:
                return pose_data['instructions']
        return "Pose not recognized. Please try to stand in frame clearly."

    def __del__(self):
        """Cleanup when object is deleted"""
        if hasattr(self, 'cap') and self.cap is not None:
            self.cap.release()