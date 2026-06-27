import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BacaArtikel from "./pages/BacaArtikel"; 

// --- KOMPONEN PROTECTED ROUTE ---
// Komponen ini bertugas mengecek sesi sebelum merender halaman yang dituju
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Mengecek apakah ada token JWT di sessionStorage
  const token = sessionStorage.getItem("jwt_token");
  
  // Jika token tidak ada (belum login atau sesi habis), arahkan paksa ke /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Jika ada, izinkan masuk ke komponen tujuan (children)
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rute Publik (Bisa diakses siapa saja) */}
        <Route path="/login" element={<Login />} />
        <Route path="/artikel/:id" element={<BacaArtikel />} /> 
        
        {/* Rute Terlindungi (Wajib Login) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;