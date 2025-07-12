

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import subprocess
import cv2
import numpy as np
from openvino.runtime import Core
import os
import signal
import csv
import PyPDF2
import base64

app = Flask(__name__)
CORS(app)

chat_history = []
OLLAMA_URL = "http://localhost:11434/api/generate"
student_counter_process = None
temp_notes_content = ""

# Load OpenVINO model
MODEL_PATH = "../student_counter_model/person-detection-retail-0013.xml"
ie = Core()
model = ie.read_model(model=MODEL_PATH)
compiled_model = ie.compile_model(model=model, device_name="CPU")
input_layer = compiled_model.input(0)
output_layer = compiled_model.output(0)


# Intelligent model selector
def choose_model(question):
    q = question.lower()
    if any(keyword in q for keyword in [
        "code", "python", "algorithm", "function", "program", "compile"
    ]):
        return "codellama"
    return "mistral"


# /ask
@app.route("/ask", methods=["POST"])
def ask_question():
    global chat_history
    data = request.get_json()
    question = data.get("question", "")

    if not question:
        return jsonify({"error": "No question provided"}), 400

    chat_history.append(f"User: {question}")
    chat_history[:] = chat_history[-10:]

    instruction = (
        "You are a fast, smart AI classroom assistant.\n"
        "Your job is to answer questions clearly and briefly **unless** "
        "the user asks for detailed notes or explanation.\n\n"
        "🟢 If the question is short like 'What is X?', 'Define Y', or "
        "'Explain Z', answer in **1–2 sentences** only.\n"
        "🛑 DO NOT give examples, types, advantages, etc. unless the user "
        "asks for them specifically.\n\n"
        "🔍 Only add extra points (like types, pros/cons, examples) **if** "
        "the question includes keywords like:\n"
        "'types', 'benefits', 'examples', 'list', 'explain', 'summary', "
        "'detailed'.\n\n"
        "🔗 Only provide references or links if the user includes words like:\n"
        "'reference', 'source', 'any link', 'where to read', 'give website', etc.\n"
        "✅ If a reference is requested, return 1–2 reliable links in markdown:\n"
        "- [Wikipedia - AI](https://en.wikipedia.org/wiki/Artificial_intelligence)\n"
        "- [Khan Academy - Machine Learning]"
        "(https://www.khanacademy.org/computing/computer-science/ai)\n\n"
        "📌 Format lists like this:\n"
        "1. **Item Title**: Explanation here.\n"
        "2. **Next Title**: Continue...\n\n"
        "✏️ Do not assume or elaborate more than asked. Use plain language, "
        "no unnecessary repetition, no headings unless asked.\n"
    )

    prompt = instruction + "\n\n---\n\n" + "\n".join(chat_history[-5:]) + "\nAssistant:"
    selected_model = choose_model(question)

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": selected_model, "prompt": prompt, "stream": False},
            timeout=120
        )
        output = response.json()["response"].strip()
    except Exception as e:
        output = f"⚠️ Error talking to {selected_model}: {str(e)}"

    chat_history.append(f"Assistant: {output}")
    return jsonify({"answer": output})


# /upload-notes
@app.route("/upload-notes", methods=["POST"])
def upload_notes():
    global temp_notes_content
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded."}), 400

    try:
        if file.filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(file)
            text = "\n".join(
                [page.extract_text() or "" for page in reader.pages]
            )
        elif file.filename.endswith(".txt"):
            text = file.read().decode("utf-8")
        else:
            return jsonify({"error": "Unsupported file type."}), 400

        temp_notes_content = text
        return jsonify({
            "status": "success",
            "message": "Notes uploaded successfully!"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# /ask-notes
@app.route("/ask-notes", methods=["POST"])
def ask_from_notes():
    global temp_notes_content
    data = request.get_json()
    question = data.get("question", "").strip()

    if not temp_notes_content:
        return jsonify({
            "answer": "❗ No notes uploaded yet. Please upload a file before asking questions."
        })

    if not question:
        return jsonify({
            "answer": "❗ Please enter a question to ask from the uploaded notes."
        })

    prompt = (
        f"You are a helpful assistant. Use ONLY this document to answer:\n\n"
        f"{temp_notes_content[:4000]}\n\n"
        f"Question: {question}"
    )

    selected_model = choose_model(question)

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": selected_model, "prompt": prompt, "stream": False},
            timeout=120
        )
        output = response.json()["response"].strip()
    except Exception as e:
        output = f"⚠️ Error answering from notes: {str(e)}"

    return jsonify({"answer": output})


# /analyze-image
@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    try:
        image = request.files.get("image")
        question = request.form.get("question", "").strip()

        if not image:
            return jsonify({"error": "No image uploaded."}), 400
        if not question:
            return jsonify({"error": "No question provided."}), 400

        image_bytes = image.read()
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")

        prompt = (
            "You are an AI that answers questions based on images.\n"
            f"Image: (base64 encoded)\n{encoded_image[:1000]}...\n\n"
            f"Question: {question}\n"
            "Answer in a short, clear sentence."
        )

        response = requests.post(
            OLLAMA_URL,
            json={"model": "llava", "prompt": prompt, "stream": False},
            timeout=60
        )
        output = response.json()["response"].strip()
        return jsonify({"answer": output})

    except Exception as e:
        return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 500


# /generate-quiz
@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    data = request.get_json()
    topic = data.get("topic", "")
    notes = data.get("notes", "")

    if not topic:
        return jsonify({"quiz": "❗ Please enter a quiz topic."})

    notes_text = f"Use the following notes:\n{notes[:4000]}\n\n" if notes else ""

    prompt = (
        "You are a quiz generator bot.\n"
        f"Generate 5 MCQs on: '{topic}'.\n"
        f"{notes_text}"
        "Format:\n"
        "1. **Question**\n"
        "   a) ...\n"
        "   b) ...\n"
        "Answer: a/b/c/d"
    )

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=120
        )
        quiz = response.json()["response"].strip()
    except Exception as e:
        quiz = f"⚠️ Error generating quiz: {str(e)}"

    return jsonify({"quiz": quiz})


# /student-count
@app.route("/student-count", methods=["GET"])
def get_student_count():
    try:
        cap = cv2.VideoCapture(0)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return jsonify({"count": 0})

        input_image = cv2.resize(
            frame, (input_layer.shape[3], input_layer.shape[2])
        )
        input_image = input_image.transpose((2, 0, 1))
        input_image = np.expand_dims(input_image, axis=0)

        results = compiled_model([input_image])[output_layer]
        detections = results[0][0]
        count = sum(1 for det in detections if float(det[2]) > 0.5)

        return jsonify({"count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/student-count-log", methods=["GET"])
def get_student_count_log():
    try:
        log_file = "student_count_log.csv"
        data = []
        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                reader = csv.DictReader(f)
                data = list(reader)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/open-student-counter", methods=["GET"])
def open_student_counter_window():
    global student_counter_process
    try:
        if student_counter_process is None or student_counter_process.poll() is not None:
            student_counter_process = subprocess.Popen(["python", "student_counter.py"])
        return jsonify({"status": "started"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/close-student-counter", methods=["GET"])
def close_student_counter():
    global student_counter_process
    count = 0
    status = "not running"

    if student_counter_process and student_counter_process.poll() is None:
        student_counter_process.terminate()
        student_counter_process.wait()
        student_counter_process = None
        status = "terminated"

    log_file = "student_count_log.csv"
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            lines = f.readlines()
            data_lines = [line.strip() for line in lines[1:] if line.strip()]
            if data_lines:
                last_line = data_lines[-1].split(",")
                if len(last_line) == 2:
                    try:
                        count = int(last_line[1])
                    except ValueError:
                        count = 0

    return jsonify({"status": status, "count": count})


# Run app
if __name__ == "__main__":
    app.run(debug=True)
