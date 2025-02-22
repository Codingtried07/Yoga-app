import pickle
import numpy as np
from collections import Counter

def analyze_classifier(pkl_file='yoga_classifier.pkl'):
    """Analyze the contents of the trained yoga classifier"""
    try:
        # Load the classifier
        with open(pkl_file, 'rb') as f:
            classifier = pickle.load(f)
            
        # Print basic information
        print("\n=== Classifier Analysis ===")
        print(f"\nType of classifier: {type(classifier).__name__}")
        
        # Get features used
        n_features = classifier.n_features_in_
        print(f"\nNumber of features used: {n_features}")
        
        # Get classes (poses)
        classes = classifier.classes_
        print("\nTrained poses:")
        for i, pose in enumerate(classes, 1):
            print(f"{i}. {pose}")
            
        # Get feature importances
        if hasattr(classifier, 'feature_importances_'):
            print("\nTop 10 most important features:")
            importances = classifier.feature_importances_
            indices = np.argsort(importances)[::-1][:10]
            for i, idx in enumerate(indices, 1):
                print(f"{i}. Feature {idx}: {importances[idx]:.4f}")
        
        # Get number of trees (if RandomForest)
        if hasattr(classifier, 'n_estimators'):
            print(f"\nNumber of trees in forest: {classifier.n_estimators}")
            
        # Print additional model parameters
        print("\nModel parameters:")
        params = classifier.get_params()
        for param, value in params.items():
            print(f"- {param}: {value}")
            
    except FileNotFoundError:
        print(f"\nError: Could not find {pkl_file}")
    except Exception as e:
        print(f"\nError analyzing classifier: {str(e)}")

if __name__ == "__main__":
    analyze_classifier()