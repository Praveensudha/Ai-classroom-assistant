

import cv2
import numpy as np
from openvino.runtime import Core
from datetime import datetime
import csv
import time

#  Configuration 
MODEL_PATH = "../student_counter_model/person-detection-retail-0013.xml"
LOG_FILE = "student_count_log.csv"
LOG_INTERVAL = 5 

# Load OpenVINO Model 
ie = Core()
model = ie.read_model(model=MODEL_PATH)
compiled_model = ie.compile_model(model=model, device_name="CPU")

input_layer = compiled_model.input(0)
output_layer = compiled_model.output(0)

# Initialize Webcam 
cap = cv2.VideoCapture(0)

# Create CSV Log File If Not Exists 
try:
    with open(LOG_FILE, "x", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Timestamp", "Student Count"])
except FileExistsError:
    pass

# Start Detection Loop 
last_log_time = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Failed to grab frame.")
        break

    # Preprocess Frame 
    input_image = cv2.resize(
        frame, (input_layer.shape[3], input_layer.shape[2])
    )
    input_image = input_image.transpose((2, 0, 1))
    input_image = np.expand_dims(input_image, axis=0)

    # Run Inference
    results = compiled_model([input_image])[output_layer]
    detections = results[0][0]

    # Count Detections and Draw Boxes
    count = 0
    for det in detections:
        if float(det[2]) > 0.5:
            count += 1
            xmin = int(det[3] * frame.shape[1])
            ymin = int(det[4] * frame.shape[0])
            xmax = int(det[5] * frame.shape[1])
            ymax = int(det[6] * frame.shape[0])
            cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)

    # Display Count on Frame 
    cv2.putText(
        frame,
        f"Students Detected: {count}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 255),
        2
    )
    cv2.imshow("Student Counter - Press 'q' to close", frame)

    # Log Student Count Every LOG_INTERVAL Seconds
    current_time = time.time()
    if current_time - last_log_time >= LOG_INTERVAL:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, count])
        last_log_time = current_time

    # Exit on 'q' Key Press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
