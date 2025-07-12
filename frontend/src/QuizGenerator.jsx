

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import "./QuizGenerator.css";

function QuizGenerator() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [quiz, setQuiz] = useState("");
  const [loading, setLoading] = useState(false);

  const quizRef = useRef(null);


  useEffect(() => {
    if (quiz && quizRef.current) {
      quizRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [quiz]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:5000/upload-notes", formData);
      if (res.data.status === "success") {
        setNotes(res.data.notes || "");
        alert("📎 File uploaded successfully! Now enter a topic and generate quiz.");
      }
    } catch (error) {
      alert("❌ Failed to upload file.");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      alert("⚠️ Please enter a topic.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:5000/generate-quiz", {
        topic,
        notes,
      });
      setQuiz(response.data.quiz);
    } catch (error) {
      setQuiz("❌ Failed to generate quiz.");
    }
    setLoading(false);
  };

  const handleExportQuiz = () => {
    if (!quiz) return;
    const blob = new Blob([quiz], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "generated_quiz.txt");
  };

  return (
    <div className="quiz-generator-container">
      <h2>📝 Quiz Generator</h2>

      <div className="input-section">
        <label htmlFor="file-upload" className="file-label">📎 Upload File:</label>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileUpload}
        />

        <label>📘 Topic:</label>
        <input
          type="text"
          placeholder="Enter quiz topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <label>🗒️ Notes (optional):</label>
        <textarea
          placeholder="Paste your notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button onClick={handleGenerateQuiz} disabled={loading}>
          {loading ? "Generating..." : "⚡ Generate Quiz"}
        </button>
      </div>

      {quiz && (
        <div className="quiz-result" ref={quizRef}>
          <h3>📋 Generated Quiz:</h3>
          <pre>{quiz}</pre>
          <button className="export-button" onClick={handleExportQuiz}>
            💾 Export Quiz
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizGenerator;
