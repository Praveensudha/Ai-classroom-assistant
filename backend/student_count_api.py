

from flask import Flask, jsonify
import cv2
import numpy as np
from openvino.runtime import Core

# Initialize OpenVINO Model 
ie = Core()
MODEL_PATH = "../student_counter_model/person-detection-retail-0013.xml"
model = ie.read_model(model=MODEL_PATH)
compiled_model = ie.compile_model(model=model, device_name="CPU")

input_layer = compiled_model.input(0)
output_layer = compiled_model.output(0)


def count_students():
    """
    Capture webcam image and count number of students (persons) detected
    using OpenVINO object detection model.
    """
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return 0

    # Preprocess the image
    input_image = cv2.resize(
        frame,
        (input_layer.shape[3], input_layer.shape[2])
    )
    input_image = input_image.transpose((2, 0, 1))  # HWC to CHW
    input_image = np.expand_dims(input_image, axis=0)

    # Run inference
    results = compiled_model([input_image])[output_layer]
    detections = results[0][0]

    # Count detections with confidence > 0.5
    count = sum(1 for det in detections if float(det[2]) > 0.5)
    return count
