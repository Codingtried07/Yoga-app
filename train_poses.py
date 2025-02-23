import cv2
from yoga_detector import YogaPoseDetector

def train_yoga_detector():
    """Train the yoga pose detector with custom poses"""
    detector = YogaPoseDetector()
    
    poses_to_train = [
        "Mountain Pose",
        "Tree Pose",
        "Warrior I",
        "Chair Pose",
        "Triangle Pose"
    ]
    
    print("\n=== Yoga Pose Detector Training ===")
    print("\nThis script will help you train the detector with your poses.")
    print("\nFor each pose:")
    print("1. Get into the correct position")
    print("2. Make sure your full body is visible in the camera")
    print("3. Press 'c' to capture a sample")
    print("4. Move slightly and repeat to capture different angles")
    print("5. Press 'q' when done with the current pose")
    print("\nImportant tips:")
    print("- Stand 6-8 feet from the camera")
    print("- Ensure good lighting")
    print("- Wear clothes that contrast with the background")
    print("- Try to keep background clutter minimal")
    
    while True:
        print("\nSelect a pose to train:")
        for i, pose in enumerate(poses_to_train, 1):
            print(f"{i}. {pose}")
        print("6. Train classifier with collected data")
        print("7. Exit")
        
        choice = input("\nEnter your choice (1-7): ")
        
        try:
            choice = int(choice)
            if choice == 7:
                break
            elif choice == 6:
                if detector.train_classifier():
                    print("\nClassifier trained successfully!")
                    print("You can now run the main app to try the improved detection.")
                else:
                    print("\nNot enough data collected. Please collect more samples.")
            elif 1 <= choice <= len(poses_to_train):
                pose_name = poses_to_train[choice - 1]
                print(f"\nCollecting data for: {pose_name}")
                print("Get into position and press Enter when ready...")
                input()
                
                # Get pose instructions
                pose_info = None
                for level_info in detector.poses.values():
                    if level_info['name'] == pose_name:
                        pose_info = level_info
                        break
                
                if pose_info:
                    print("\nPose Instructions:")
                    print(pose_info['instructions'])
                
                # Collect samples
                samples = detector.collect_training_data(pose_name, num_samples=90)
                print(f"\nCollected {samples} samples for {pose_name}")
            else:
                print("\nInvalid choice. Please try again.")
        except ValueError:
            print("\nInvalid input. Please enter a number.")
        except Exception as e:
            print(f"\nError: {str(e)}")
    
    print("\nTraining session completed!")
    cv2.destroyAllWindows()

if __name__ == "__main__":
    try:
        train_yoga_detector()
    except KeyboardInterrupt:
        print("\nTraining interrupted by user.")
    except Exception as e:
        print(f"\nError: {str(e)}")
    finally:
        cv2.destroyAllWindows()