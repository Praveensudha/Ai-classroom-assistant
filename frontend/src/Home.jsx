

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { saveAs } from "file-saver";
import {
  FaMicrophone,
  FaArrowRight,
  FaPaperclip,
  FaVolumeUp,
} from "react-icons/fa";
import "./App.css";

function Home() {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [typingText, setTypingText] = useState("");
  const [studentLog, setStudentLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [fileName, setFileName] = useState("");
  const [useNotes, setUseNotes] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voiceURI, setVoiceURI] = useState("");
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [imageToAnalyze, setImageToAnalyze] = useState(null);
  const [imagePreviewURL, setImagePreviewURL] = useState(null);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        setQuestion(voiceText);
        handleAsk(voiceText);
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
    } else {
      alert("Speech recognition not supported in this browser.");
    }
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    if (!muted && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = speechSynthesis
        .getVoices()
        .find((v) => v.voiceURI === voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      window.speechSynthesis.speak(utterance);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAsk = async (customQuestion) => {
    if (loading) return;
    const input = customQuestion || question;
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setChatHistory((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    scrollToBottom();

    try {
      if (imageToAnalyze) {
        const formData = new FormData();
        formData.append("image", imageToAnalyze);
        formData.append("question", input);
        const res = await axios.post("http://127.0.0.1:5000/analyze-image", formData);
        const botMessage = { sender: "bot", text: res.data.answer };
        setChatHistory((prev) => [...prev, botMessage]);
        speak(res.data.answer);
        setImageToAnalyze(null);
        setImagePreviewURL(null);
        scrollToBottom();
        setLoading(false);
        return;
      }

      const endpoint = useNotes ? "ask-notes" : "ask";
      const response = await axios.post(`http://127.0.0.1:5000/${endpoint}`, {
        question: input,
      });
      const fullAnswer = response.data.answer;
      let i = 0;
      setTypingText("");

      const typeInterval = setInterval(() => {
        if (i <= fullAnswer.length) {
          setTypingText(fullAnswer.slice(0, i));
          i++;
        } else {
          clearInterval(typeInterval);
          const botMessage = { sender: "bot", text: fullAnswer };
          setChatHistory((prev) => [...prev, botMessage]);
          setTypingText("");
          scrollToBottom();
          speak(fullAnswer);
          setLoading(false);
        }
      }, 15);
    } catch (error) {
      const errorMessage = {
        sender: "bot",
        text: "⚠️ Error fetching answer.",
      };
      setChatHistory((prev) => [...prev, errorMessage]);
      setTypingText("");
      scrollToBottom();
      setLoading(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !loading) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://127.0.0.1:5000/upload-notes", formData);
      if (res.data.status === "success") {
        setFileName(file.name);
        setUseNotes(true);
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "user",
            text: `📎 You uploaded: **${file.name}**\nYou can now ask questions based on this document.`,
          },
        ]);
        scrollToBottom();
      }
    } catch (error) {
      alert("❌ File upload failed.");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImageToAnalyze(file);
    setImagePreviewURL(URL.createObjectURL(file));
    setShowUploadOptions(false);
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "user",
        text: "🖼️ Image uploaded. Please type your question about this image.",
      },
    ]);
    scrollToBottom();
  };

  const exportChat = () => {
    const content = chatHistory
      .map((msg) => `${msg.sender === "user" ? "You" : "Assistant"}: ${msg.text}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "ai-classroom-chat.txt");
  };

  const openStudentCounterWindow = async () => {
    const res = await fetch("http://127.0.0.1:5000/open-student-counter");
    const data = await res.json();
    alert(data.status === "started" ? "📸 Webcam opened." : "⚠️ Could not start counter.");
  };

  const closeStudentCounterWindow = async () => {
    const res = await fetch("http://127.0.0.1:5000/close-student-counter");
    const data = await res.json();
    alert(
      data.status === "terminated"
        ? `✅ Counter closed. Total detected: ${data.count}`
        : `ℹ️ Not running. Last detected: ${data.count}`
    );
  };

  const toggleStudentLog = async () => {
    if (showLog) return setShowLog(false);
    const res = await fetch("http://127.0.0.1:5000/student-count-log");
    const data = await res.json();
    const filtered = data.filter((entry) => parseInt(entry["Student Count"]) > 0);
    setStudentLog(filtered.reverse());
    setShowLog(true);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const styles = {
    backgroundColor: theme === "dark" ? "#0e0e0e" : "#f9f9f9",
    color: theme === "dark" ? "#f0f0f0" : "#121212",
    userBubble: theme === "dark" ? "#0077ff" : "#d1eaff",
    botBubble: theme === "dark" ? "#333" : "#eee",
    textColor: theme === "dark" ? "#ffffff" : "#000000",
  };

  return (
    <div className="app-container" style={{ backgroundColor: styles.backgroundColor, color: styles.color }}>
      {/* header */}
      <div className="header">
        <h2 className="assistant-title">💬 AI Classroom Assistant</h2>
        <div>
          <button onClick={toggleTheme}>🌓 {theme === "dark" ? "Light" : "Dark"} Mode</button>
          <button onClick={exportChat}>💾 Export Chat</button>
          <button onClick={() => setShowTTSSettings(!showTTSSettings)}>🔊</button>
        </div>
      </div>

      {/* chat window */}
      <div className="chat-window">
        {chatHistory.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.sender === "user" ? "right" : "left", margin: "10px 0" }}>
            <div
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: "18px",
                background: msg.sender === "user" ? styles.userBubble : styles.botBubble,
                color: styles.textColor,
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontSize: "15px",
              }}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}

        {imagePreviewURL && (
          <div style={{ textAlign: "left", margin: "10px 0" }}>
            <img src={imagePreviewURL} alt="Preview" style={{ maxWidth: "300px", borderRadius: "10px" }} />
          </div>
        )}

        {typingText && (
          <div style={{ textAlign: "left", margin: "10px 0" }}>
            <div
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: "18px",
                background: styles.botBubble,
                color: "#000",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontSize: "15px",
              }}
            >
              <ReactMarkdown>{typingText}</ReactMarkdown>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* input area */}
      <div className="chat-input">
        <label className="icon-button" onClick={() => setShowUploadOptions(!showUploadOptions)}>
          <FaPaperclip />
        </label>

        {showUploadOptions && (
          <div className="upload-popup-menu">
            <button onClick={() => docInputRef.current.click()}>📄 Upload Document</button>
            <button onClick={() => imgInputRef.current.click()}>🖼️ Upload Image</button>
          </div>
        )}

        <input type="file" ref={docInputRef} style={{ display: "none" }} accept=".pdf,.txt" onChange={handleFileUpload} />
        <input type="file" ref={imgInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />

        <textarea
          className="text-box"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault();
              handleAsk();
            }
          }}
        />
        <button className="icon-button" onClick={startListening} disabled={listening || loading}>
          <FaMicrophone />
        </button>
        <button className="icon-button" onClick={() => handleAsk()} disabled={loading}>
          <FaArrowRight />
        </button>
      </div>

      {/* TTS Popup */}
      {showTTSSettings && (
        <div className="tts-settings-popup">
          <label>
            🔇 Mute:
            <input
              type="checkbox"
              checked={muted}
              onChange={() => {
                if (!muted) window.speechSynthesis.cancel();
                setMuted(!muted);
              }}
            />
          </label>
          <label>
            🎚️ Rate:
            <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} />
          </label>
          <label>
            🎛️ Pitch:
            <input type="range" min="0" max="2" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} />
          </label>
          <label>
            🗣️ Voice:
            <select onChange={(e) => setVoiceURI(e.target.value)}>
              <option value="">Default</option>
              {speechSynthesis.getVoices().map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Student Control Buttons */}
      <div className="footer-buttons">
        <button onClick={openStudentCounterWindow}>👥 Open Student Counter</button>
        <button onClick={closeStudentCounterWindow}>❌ Close Student Counter</button>
        <button onClick={toggleStudentLog}>
          {showLog ? "❌ Hide Log" : "📜 View Student Count Log"}
        </button>
      </div>

      {showLog && (
        <div className="student-log">
          <table>
            <thead>
              <tr>
                <th>🕒 Timestamp</th>
                <th>👥 Student Count</th>
              </tr>
            </thead>
            <tbody>
              {studentLog.map((entry, idx) => (
                <tr key={idx}>
                  <td>{entry.Timestamp}</td>
                  <td>{entry["Student Count"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Home;
