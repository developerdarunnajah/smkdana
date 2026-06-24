import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

interface Baris {
  id: string;
  tipe: "teks" | "gambar";
  isi: string;
  foto: string;
  deskripsi_foto: string;
  fileObject?: File | null;
  previewUrl?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [namaPengguna, setNamaPengguna] = useState<string>("");
  const [penggunaId, setPenggunaId] = useState<number>(0);
  const [activeMenu, setActiveMenu] = useState<"tambah" | "status">("tambah");

  const [judulArtikel, setJudulArtikel] = useState("");
  const [jenisArtikel] = useState<number>(1); 
  const [barisList, setBarisList] = useState<Baris[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decodedToken = JSON.parse(jsonPayload);
      setNamaPengguna(decodedToken.nama_lengkap || decodedToken.username);
      setPenggunaId(decodedToken.pengguna_id);
    } catch (error) {
      localStorage.removeItem("jwt_token");
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    navigate("/login");
  };

  const tambahBlokTeks = () => setBarisList([...barisList, { id: Date.now().toString(), tipe: "teks", isi: "", foto: "", deskripsi_foto: "" }]);
  const tambahBlokGambar = () => setBarisList([...barisList, { id: Date.now().toString(), tipe: "gambar", isi: "", foto: "", deskripsi_foto: "", fileObject: null, previewUrl: "" }]);
  
  const hapusBlok = (id: string) => setBarisList(barisList.filter(b => b.id !== id));
  const ubahIsiBlok = (id: string, field: keyof Baris, value: string) => setBarisList(barisList.map(b => b.id === id ? { ...b, [field]: value } : b));

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setBarisList(barisList.map(b => b.id === id ? { ...b, fileObject: file, previewUrl: previewUrl, foto: file.name } : b));
    }
  };

  const geserBlok = (index: number, arah: "atas" | "bawah") => {
    const newList = [...barisList];
    if (arah === "atas" && index > 0) {
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      setBarisList(newList);
    } else if (arah === "bawah" && index < barisList.length - 1) {
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
      setBarisList(newList);
    }
  };

  // Fungsi utilitas untuk mengubah File gambar menjadi teks Base64 (Untuk ditransfer ke Tab Baru saat Preview)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAction = async (actionType: 'publish' | 'draft' | 'preview') => {
    if (!judulArtikel) { alert("Judul artikel wajib diisi!"); return; }
    if (barisList.length === 0) { alert("Tambahkan minimal 1 blok teks atau gambar!"); return; }

    // ==== LOGIKA KHUSUS PREVIEW (Buka di Tab Baru tanpa Hit API Database) ====
    if (actionType === 'preview') {
      const previewBlocks = await Promise.all(barisList.map(async (blok, index) => {
        if (blok.tipe === 'teks') {
          return { urutan: index + 1, tipe: 'teks', isi: blok.isi };
        } else {
          let base64Foto = "";
          if (blok.fileObject) {
            base64Foto = await fileToBase64(blok.fileObject);
          }
          return { urutan: index + 1, tipe: 'gambar', foto: base64Foto, deskripsi_foto: blok.deskripsi_foto };
        }
      }));

      const previewData = { judul_artikel: judulArtikel, blocks: previewBlocks, penulis: namaPengguna };
      
      // Simpan sementara di LocalStorage browser
      localStorage.setItem("preview_artikel", JSON.stringify(previewData));
      
      // Buka Halaman Baru
      window.open("/artikel/preview", "_blank"); 
      return; 
    }

    // ==== LOGIKA UNTUK PUBLISH & DRAFT (Kirim ke API Hono & Database) ====
    const formData = new FormData();
    formData.append('judul_artikel', judulArtikel);
    formData.append('jenis_artikel', jenisArtikel.toString());
    formData.append('pengguna_id', penggunaId.toString());
    formData.append('baris_count', barisList.length.toString());

    barisList.forEach((blok, index) => {
      formData.append(`baris_${index}_tipe`, blok.tipe);
      if (blok.tipe === 'teks') formData.append(`baris_${index}_isi`, blok.isi);
      else if (blok.tipe === 'gambar') {
        formData.append(`baris_${index}_deskripsi_foto`, blok.deskripsi_foto);
        if (blok.fileObject) formData.append(`baris_${index}_file`, blok.fileObject);
      }
    });

    try {
      const endpoint = actionType === 'draft' ? "/api/draft" : "/api/artikel";
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.success) {
        if (actionType === 'publish') {
           // Buka Tab Baru menuju Artikel yang asli!
           window.open(`/artikel/${result.artikel_id}`, "_blank");
        } else {
           alert("Sukses: " + result.message);
        }
        
        // Reset form
        setJudulArtikel("");
        setBarisList([]);
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan atau server.");
    }
  };

  const renderTambahArtikel = () => (
    <div className="view-card">
      <h3>Tulis Artikel Baru</h3>
      <div className="article-form">
        <div className="form-row-group">
          <div className="input-group flex-2">
            <label>Judul Artikel</label>
            <input type="text" value={judulArtikel} onChange={e => setJudulArtikel(e.target.value)} placeholder="Masukkan judul..." required />
          </div>
          <div className="input-group flex-1">
            <label>Jenis Artikel</label>
            <input type="text" value="Berita" readOnly className="input-readonly" />
          </div>
        </div>

        <div className="builder-area">
          <label className="builder-title">Komposisi Konten (Urutan Baris)</label>
          
          {barisList.length === 0 && (
            <div className="empty-blocks">Mulai tambahkan teks atau gambar untuk menyusun artikel Anda.</div>
          )}

          {barisList.map((blok, index) => (
            <div key={blok.id} className="block-item">
              <div className="block-header">
                <span className="block-type">{blok.tipe === 'teks' ? '📝 Blok Teks' : '🖼️ Blok Gambar'}</span>
                <div className="block-actions">
                  <button type="button" onClick={() => geserBlok(index, 'atas')} disabled={index === 0}>⬆️</button>
                  <button type="button" onClick={() => geserBlok(index, 'bawah')} disabled={index === barisList.length - 1}>⬇️</button>
                  <button type="button" onClick={() => hapusBlok(blok.id)} className="btn-delete-block">❌</button>
                </div>
              </div>
              <div className="block-body">
                {blok.tipe === 'teks' ? (
                  <textarea rows={4} value={blok.isi} onChange={e => ubahIsiBlok(blok.id, 'isi', e.target.value)} placeholder="Tulis paragraf di sini..." required />
                ) : (
                  <div className="image-inputs">
                    {blok.previewUrl && (
                      <div className="image-preview-wrapper">
                        <img src={blok.previewUrl} alt="Preview" className="image-preview" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => handleFileChange(blok.id, e)} 
                      className="input-file"
                      required={!blok.previewUrl} 
                    />
                    <input 
                      type="text" 
                      value={blok.deskripsi_foto} 
                      onChange={e => ubahIsiBlok(blok.id, 'deskripsi_foto', e.target.value)} 
                      placeholder="Masukkan Alt Text (Deskripsi Foto Opsional)" 
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="builder-controls">
            <button type="button" onClick={tambahBlokTeks} className="btn-add-block">➕ Tambah Paragraf Teks</button>
            <button type="button" onClick={tambahBlokGambar} className="btn-add-block">➕ Tambah Gambar</button>
          </div>
        </div>

        <div className="action-buttons-group">
          <button type="button" className="btn-action preview" onClick={() => handleAction('preview')}>👁️ Lihat Preview</button>
          <button type="button" className="btn-action draft" onClick={() => handleAction('draft')}>📝 Simpan sbg Draft</button>
          <button type="button" className="btn-action publish" onClick={() => handleAction('publish')}>🚀 Publish Artikel</button>
        </div>
      </div>
    </div>
  );

  const renderUbahStatus = () => (
    <div className="view-card">
      <h3>Manajemen Status Artikel</h3>
      <div className="table-responsive">
        <table className="article-table">
          <thead>
            <tr><th>Judul Artikel</th><th>Tanggal</th><th>Status Saat Ini</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Penerimaan Siswa Baru 2026</td>
              <td>19 Juni 2026</td>
              <td><span className="badge draft">Draft</span></td>
              <td>
                <select className="status-select">
                  <option value="draft">Draft</option><option value="publish">Publish</option><option value="arsip">Arsip</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">SMK Dana</div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeMenu === "tambah" ? "active" : ""}`} onClick={() => setActiveMenu("tambah")}>📝 Tambah Artikel</button>
          <button className={`nav-btn ${activeMenu === "status" ? "active" : ""}`} onClick={() => setActiveMenu("status")}>📋 Manajemen Artikel</button>
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <h2>{activeMenu === "tambah" ? "Sistem Pembuatan Artikel" : "Manajemen Status"}</h2>
          <div className="user-profile">
            <span>Halo, <strong>{namaPengguna}</strong></span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </header>
        <section className="content-area">
          {activeMenu === "tambah" ? renderTambahArtikel() : renderUbahStatus()}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;