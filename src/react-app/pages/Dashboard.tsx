import React, { useState } from "react";
import "./Dashboard.css"; // Mundur 1 folder untuk memanggil CSS

// Import komponen dan hook menggunakan ../
import { useAuth } from "../hooks/useAuth"; 
import FormTambahArtikel from "../features/artikel/FormTambahArtikel";
import TabelManajemenArtikel from "../features/artikel/TabelManajemenArtikel";

const Dashboard: React.FC = () => {
  const { namaPengguna, penggunaId, isAuthLoading, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState<"tambah" | "status">("tambah");

  if (isAuthLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Memverifikasi sesi Anda...</div>;
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">SMK Dana</div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeMenu === "tambah" ? "active" : ""}`} 
            onClick={() => setActiveMenu("tambah")}
          >
            📝 Tambah Artikel
          </button>
          <button 
            className={`nav-btn ${activeMenu === "status" ? "active" : ""}`} 
            onClick={() => setActiveMenu("status")}
          >
            📋 Manajemen Artikel
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>{activeMenu === "tambah" ? "Sistem Pembuatan Artikel" : "Manajemen Status"}</h2>
          <div className="user-profile">
            <span>Halo, <strong>{namaPengguna}</strong></span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </header>

        <section className="content-area">
          {activeMenu === "tambah" ? (
            <FormTambahArtikel penggunaId={penggunaId} namaPengguna={namaPengguna} />
          ) : (
            <TabelManajemenArtikel penggunaId={penggunaId} />
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;