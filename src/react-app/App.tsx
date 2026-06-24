import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BacaArtikel from "./pages/BacaArtikel"; // <--- Import ini

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Rute baru untuk halaman pembaca artikel */}
        <Route path="/artikel/:id" element={<BacaArtikel />} /> 
      </Routes>
    </Router>
  );
};

export default App;