import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import FormTambahArtikel from '../features/artikel/FormTambahArtikel';
import TabelManajemenArtikel from '../features/artikel/TabelManajemenArtikel';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { namaLengkap, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tulis' | 'manajemen'>('tulis');

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">Jurnalis</div>
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'tulis' ? 'active' : ''}`}
            onClick={() => setActiveTab('tulis')}
          >
            Tambah Artikel
          </div>
          <div 
            className={`nav-item ${activeTab === 'manajemen' ? 'active' : ''}`}
            onClick={() => setActiveTab('manajemen')}
          >
            Artikel List
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="user-info">
            <span className="user-name">Halo, {namaLengkap || 'Pengguna'}</span>
            <button onClick={logout} className="logout-btn">Keluar</button>
          </div>
        </header>

        <div className="content-area">
          <div className="view-card">
            <h3>{activeTab === 'tulis' ? 'Tulis Artikel Baru' : 'Artikel List'}</h3>
            {activeTab === 'tulis' ? <FormTambahArtikel /> : <TabelManajemenArtikel />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;