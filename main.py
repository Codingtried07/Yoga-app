import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

import tkinter as tk
from tkinter import ttk, messagebox
import cv2
from PIL import Image, ImageTk
import sys
import time
from yoga_detector import YogaPoseDetector

class YogaApp:
    def __init__(self, window):
        self.window = window
        self.window.title("Yoga Pose Challenge")
        self.window.geometry("1024x768")
        
        # Game state variables
        self.current_level = 1
        self.total_score = 0
        self.pose_timer = 0
        self.pose_hold_start = None
        self.is_game_active = False
        
        # Check camera availability
        if not self.check_camera():
            messagebox.showerror("Error", "No camera detected!")
            sys.exit(1)
            
        try:
            # Initialize detector
            self.detector = YogaPoseDetector()
            
            # Create GUI elements
            self.create_widgets()
            
            # Initialize video display
            self.delay = 15
            self.is_running = True
            self.update()
            
        except Exception as e:
            messagebox.showerror("Initialization Error", f"Failed to start: {str(e)}")
            sys.exit(1)

    def check_camera(self):
        """Check if camera is available"""
        cap = cv2.VideoCapture(0)
        if cap is None or not cap.isOpened():
            return False
        cap.release()
        return True

    def create_widgets(self):
        """Create all GUI elements"""
        # Main container
        self.main_container = ttk.Frame(self.window, padding="10")
        self.main_container.grid(row=0, column=0, sticky="nsew")
        
        # Configure grid weights
        self.window.grid_rowconfigure(0, weight=1)
        self.window.grid_columnconfigure(0, weight=1)
        
        # Video display
        self.video_frame = ttk.Frame(self.main_container)
        self.video_frame.grid(row=0, column=0, padx=5, pady=5, sticky="nsew")
        
        self.video_label = ttk.Label(self.video_frame)
        self.video_label.grid(row=0, column=0)
        
        # Control panel
        self.control_frame = ttk.Frame(self.main_container)
        self.control_frame.grid(row=0, column=1, padx=5, pady=5, sticky="nsew")
        
        # Current pose info
        self.pose_label = ttk.Label(self.control_frame, text="Current Pose: Unknown", font=('Arial', 12))
        self.pose_label.grid(row=0, column=0, pady=5, padx=5, sticky="w")
        
        self.confidence_label = ttk.Label(self.control_frame, text="Confidence: 0%", font=('Arial', 12))
        self.confidence_label.grid(row=1, column=0, pady=5, padx=5, sticky="w")
        
        # Instructions box
        instruction_frame = ttk.LabelFrame(self.control_frame, text="Instructions", padding="5")
        instruction_frame.grid(row=2, column=0, pady=10, padx=5, sticky="ew")
        
        self.instruction_text = tk.Text(instruction_frame, height=8, width=30, wrap=tk.WORD)
        self.instruction_text.pack(fill=tk.BOTH, expand=True)
        self.instruction_text.insert(tk.END, "Welcome to Yoga Pose Challenge\nPress 'Start Game' to begin.")
        self.instruction_text.config(state='disabled')
        
        # Game frame
        self.game_frame = ttk.LabelFrame(self.control_frame, text="Game Progress", padding="5")
        self.game_frame.grid(row=3, column=0, pady=10, padx=5, sticky="ew")
        
        # Level info
        self.level_label = ttk.Label(self.game_frame, text="Level 1", font=('Arial', 14, 'bold'))
        self.level_label.pack(pady=5)
        
        # Timer
        self.timer_label = ttk.Label(self.game_frame, text="Time: 0s", font=('Arial', 12))
        self.timer_label.pack(pady=5)
        
        # Score
        self.score_label = ttk.Label(self.game_frame, text="Score: 0", font=('Arial', 12))
        self.score_label.pack(pady=5)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            self.game_frame, 
            variable=self.progress_var,
            maximum=100
        )
        self.progress_bar.pack(fill=tk.X, pady=5)
        
        # Game controls
        game_buttons = ttk.Frame(self.game_frame)
        game_buttons.pack(pady=5)
        
        self.start_game_btn = ttk.Button(game_buttons, text="Start Challenge", command=self.start_game)
        self.start_game_btn.pack(side=tk.LEFT, padx=5)
        
        self.next_level_btn = ttk.Button(game_buttons, text="Next Level", command=self.next_level)
        self.next_level_btn.pack(side=tk.LEFT, padx=5)
        self.next_level_btn.state(['disabled'])
        
        # Main controls
        control_buttons = ttk.Frame(self.control_frame)
        control_buttons.grid(row=4, column=0, pady=10, padx=5, sticky="ew")
        
        self.quit_button = ttk.Button(control_buttons, text="Quit", command=self.quit_app)
        self.quit_button.pack(side=tk.LEFT, padx=5)

    def update_instruction_text(self, text):
        """Update the instruction text box"""
        self.instruction_text.config(state='normal')
        self.instruction_text.delete(1.0, tk.END)
        self.instruction_text.insert(tk.END, text)
        self.instruction_text.config(state='disabled')

    def start_game(self):
        """Start the yoga game"""
        self.current_level = 1
        self.total_score = 0
        self.pose_timer = 0
        self.is_game_active = True
        self.start_game_btn.state(['disabled'])
        self.next_level_btn.state(['disabled'])
        self.update_game_ui()

    def next_level(self):
        """Advance to next level"""
        if self.current_level < 5:  # Assuming 5 levels total
            self.current_level += 1
            self.pose_timer = 0
            self.pose_hold_start = None
            self.next_level_btn.state(['disabled'])
            self.update_game_ui()
        else:
            messagebox.showinfo("Congratulations!", 
                f"You've completed all levels!\nFinal Score: {self.total_score}")
            self.reset_game()

    def reset_game(self):
        """Reset game state"""
        self.current_level = 1
        self.total_score = 0
        self.pose_timer = 0
        self.is_game_active = False
        self.start_game_btn.state(['!disabled'])
        self.next_level_btn.state(['disabled'])
        self.update_game_ui()

    def update_game_ui(self):
        """Update game interface"""
        self.level_label.config(text=f"Level {self.current_level}")
        self.score_label.config(text=f"Score: {self.total_score}")
        
        # Get current level pose
        pose_info = self.detector.poses[f'level_{self.current_level}']
        self.update_instruction_text(pose_info['instructions'])

    def update(self):
        """Update video frame and game state"""
        if self.is_running:
            try:
                ret, frame = self.detector.cap.read()
                if ret:
                    # Process frame
                    frame, pose_name, confidence = self.detector.process_frame(frame)
                    
                    # Update UI
                    self.pose_label.config(text=f"Current Pose: {pose_name}")
                    self.confidence_label.config(text=f"Confidence: {confidence:.1f}%")
                    
                    # Game logic
                    if self.is_game_active:
                        current_pose = self.detector.poses[f'level_{self.current_level}']
                        if pose_name == current_pose['name'] and confidence > 70:
                            if self.pose_hold_start is None:
                                self.pose_hold_start = time.time()
                            
                            self.pose_timer = time.time() - self.pose_hold_start
                            progress = (self.pose_timer / current_pose['hold_time']) * 100
                            self.progress_var.set(min(progress, 100))
                            
                            if self.pose_timer >= current_pose['hold_time']:
                                self.total_score += current_pose['points']
                                self.score_label.config(text=f"Score: {self.total_score}")
                                self.next_level_btn.state(['!disabled'])
                                messagebox.showinfo("Level Complete!", 
                                    f"You've completed level {self.current_level}!")
                        else:
                            self.pose_hold_start = None
                            self.progress_var.set(0)
                        
                        self.timer_label.config(text=f"Time: {self.pose_timer:.1f}s")
                    
                    # Convert frame for display
                    cv2image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(cv2image)
                    imgtk = ImageTk.PhotoImage(image=img)
                    self.video_label.imgtk = imgtk
                    self.video_label.configure(image=imgtk)
                    
            except Exception as e:
                messagebox.showerror("Error", f"Video processing error: {str(e)}")
                self.stop_detection()
        
        self.window.after(self.delay, self.update)

    def quit_app(self):
        """Clean up and quit application"""
        if hasattr(self, 'detector'):
            self.detector.cap.release()
        self.window.quit()

    def __del__(self):
        """Destructor to ensure cleanup"""
        if hasattr(self, 'detector'):
            self.detector.cap.release()

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = YogaApp(root)
        root.protocol("WM_DELETE_WINDOW", app.quit_app)
        root.mainloop()
    except Exception as e:
        messagebox.showerror("Fatal Error", f"Application failed: {str(e)}")
        sys.exit(1)