# Ai_Class-_Room
# 💬 AI Classroom Assistant

A smart, AI-powered classroom assistant designed to support interactive learning experiences. Built with modern web technologies and integrated with powerful AI features for speech, image, and document-based Q&A.



 Features

- 🎤 Voice-to-Text input using Speech Recognition
- 🧠 AI-based Question Answering (OpenAI or Ollama/Mistral)
- 📁 PDF/TXT file upload for document-based Q&A
- 🖼️ Image upload and AI-powered image analysis with follow-up Q&A
- 👥 Real-time student counting using webcam + OpenVINO
- 🔉 Text-to-Speech output with custom pitch, rate & voice
- 📝 Quiz generator from uploaded notes or custom input
- 🌓 Dark/Light theme toggle
- 💾 Export full chat history





🧰 Tech Stack

| Frontend     | Backend     | AI/ML Models     | Tools           |
|--------------|-------------|------------------|------------------|
| React + Vite | Flask       | OpenAI / Ollama  | OpenVINO         |
| JavaScript   | Python      | Mistral / LLaVA  | Git + GitHub     |
| HTML & CSS   | Flask-CORS  | CodeLLaMA        | FileSaver.js     |



Local Setup

Prerequisites

- Python 3.8+
- Node.js & npm
- Git

Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
