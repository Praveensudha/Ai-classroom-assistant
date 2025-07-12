

import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import QuizGenerator from "./QuizGenerator";
import "./App.css";

function App() {
  return (
    <>
      <div className="navbar">
        <Link to="/" className="nav-link">🏠 Home</Link>
        <Link to="/quiz-generator" className="nav-link">📝 Quiz Generator</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz-generator" element={<QuizGenerator />} />
      </Routes>
    </>
  );
}

export default App;
