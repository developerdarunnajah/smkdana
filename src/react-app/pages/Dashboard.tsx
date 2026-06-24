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

  // State untuk form artikel
  const [judulArtikel, setJudulArtikel] = useState("");
  const [barisList, setBarisList] = useState<Baris[]>([]);
  
  // State untuk kebutuhan Jenis Artikel dan Anti Spam-click
  const [jenisArtikelId, setJenisArtikelId] = useState<number>(1); 
  const [listJenisArtikel, setListJenisArtikel] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State BARU untuk Manajemen Artikel
  const [listArtikel, setListArtikel] = useState<any[]>([]);
  const [loadingArtikel, setLoadingArtikel] = useState<boolean>(false);

  // Effect 1: Validasi Login dari JWT Token
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

  // Effect 2: Mengambil daftar Kategori / Jenis Artikel
  useEffect(() => {
    fetch("/api/jenis-artikel")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data.length > 0) {
          setListJenisArtikel(result.data);
          setJenisArtikelId(result.data[0].jenis_artikel_id);
        }
      })
      .catch((err) => console.error("Gagal memuat jenis artikel:", err));
  }, []);

  // Effect 3: Mengambil daftar artikel milik pengguna yang sedang login saat menu "status" aktif
  useEffect(() => {
    if (activeMenu === "status" && penggunaId > 0) {
      setLoadingArtikel(true);
      fetch(`/api/artikel/user/${penggunaId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setListArtikel(result.data);
          }
          setLoadingArtikel(false);
        })
        .catch((err) => {
          console.error("Gagal memuat daftar artikel:", err);
          setLoadingArtikel(false);
        });
    }
  }, [activeMenu, penggunaId]);

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
    
    if (isSubmitting) return; 
    setIsSubmitting(true);

    try {
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
        localStorage.setItem("preview_artikel", JSON.stringify(previewData));
        window.open("/artikel/preview", "_blank"); 
        return;
      }

      const formData = new FormData();
      formData.append('judul_artikel', judulArtikel);
      formData.append('jenis_artikel_id', jenisArtikelId.toString());
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

      const endpoint = actionType === 'draft' ? "/api/draft" : "/api/artikel";
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.success) {
        if (actionType === 'publish') {
           window.open(`/artikel/${result.artikel_id}`, "_blank");
        } else {
           alert("Sukses: " + result.message);
        }
        setJudulArtikel("");
        setBarisList([]);
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTambahArtikel = () => (
    <div className="view-card">
      <h3>Tulis Artikel Baru</h3>
      <div className="article-form">
        <div className="form-row-group">
          <div className="input-group flex-2">
            <label>Judul Artikel</label>
            <input type="text" value={judulArtikel} onChange={e => setJudulArtikel(e.target.value)} placeholder="Masukkan judul..." required disabled={isSubmitting} />
          </div>
          
          <div className="input-group flex-1">
            <label>Jenis Artikel</label>
            <select
              value={jenisArtikelId}
              onChange={(e) => setJenisArtikelId(parseInt(e.target.value))}
              className="status-select"
              style={{ width: "100%", padding: "10px", borderRadius: "4px" }}
              disabled={isSubmitting || listJenisArtikel.length === 0}
            >
              {listJenisArtikel.length === 0 ? (
                <option value={1}>Memuat Kategori...</option>
              ) : (
                listJenisArtikel.map((jenis) => (
                  <option key={jenis.jenis_artikel_id} value={jenis.jenis_artikel_id}>
                    {jenis.nama_jenis_artikel}
                  </option>
                ))
              )}
            </select>
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
                  <button type="button" onClick={() => geserBlok(index, 'atas')} disabled={index === 0 || isSubmitting}>⬆️</button>
                  <button type="button" onClick={() => geserBlok(index, 'bawah')} disabled={index === barisList.length - 1 || isSubmitting}>⬇️</button>
                  <button type="button" onClick={() => hapusBlok(blok.id)} className="btn-delete-block" disabled={isSubmitting}>❌</button>
                </div>
              </div>
              <div className="block-body">
                {blok.tipe === 'teks' ? (
                  <textarea rows={4} value={blok.isi} onChange={e => ubahIsiBlok(blok.id, 'isi', e.target.value)} placeholder="Tulis paragraf di sini..." required disabled={isSubmitting} />
                ) : (
                  <div className="image-inputs">
                    {blok.previewUrl && (
                      <div className="image-preview-wrapper">
                        <img src={blok.previewUrl} alt="Preview" className="image-preview" />
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={e => handleFileChange(blok.id, e)} className="input-file" required={!blok.previewUrl} disabled={isSubmitting} />
                    <input type="text" value={blok.deskripsi_foto} onChange={e => ubahIsiBlok(blok.id, 'deskripsi_foto', e.target.value)} placeholder="Masukkan Alt Text (Deskripsi Foto Opsional)" disabled={isSubmitting} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="builder-controls">
            <button type="button" onClick={tambahBlokTeks} className="btn-add-block" disabled={isSubmitting}>➕ Tambah Paragraf Teks</button>
            <button type="button" onClick={tambahBlokGambar} className="btn-add-block" disabled={isSubmitting}>➕ Tambah Gambar</button>
          </div>
        </div>

        <div className="action-buttons-group">
          <button type="button" className="btn-action preview" onClick={() => handleAction('preview')} disabled={isSubmitting}>👁️ Lihat Preview</button>
          <button type="button" className="btn-action draft" onClick={() => handleAction('draft')} disabled={isSubmitting}>📝 {isSubmitting ? 'Menyimpan...' : 'Simpan sbg Draft'}</button>
          <button type="button" className="btn-action publish" onClick={() => handleAction('publish')} disabled={isSubmitting}>🚀 {isSubmitting ? 'Memproses...' : 'Publish Artikel'}</button>
        </div>
      </div>
    </div>
  );

  // TAMPILAN MANAJEMEN ARTIKEL DINAMIS
  const renderUbahStatus = () => (
    <div className="view-card">
      <h3>Manajemen Status Artikel</h3>
      <div className="table-responsive">
        <table className="article-table">
          <thead>
            <tr>
              <th>Judul Artikel</th>
              <th>Jenis Artikel</th>
              <th>Tanggal</th>
              <th>Status Saat Ini</th>
            </tr>
          </thead>
          <tbody>
            {loadingArtikel ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Memuat artikel...</td>
              </tr>
            ) : listArtikel.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Belum ada artikel yang Anda buat.</td>
              </tr>
            ) : (
              listArtikel.map((art) => (
                <tr key={art.artikel_id}>
                  <td>{art.judul_artikel}</td>
                  <td>{art.nama_jenis_artikel || "Tanpa Kategori"}</td>
                  <td>{art.tanggal_dibuat ? new Date(art.tanggal_dibuat).toLocaleDateString('id-ID') : "-"}</td>
                  <td>
                    <span className={`badge ${art.status}`}>
                      {art.status === 'publish' ? 'Publish' : art.status === 'draft' ? 'Draft' : art.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
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