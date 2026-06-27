import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface Artikel {
  artikel_id: number;
  judul_artikel: string;
  nama_jenis_artikel: string | null;
  status: string;
  tanggal_dibuat: string;
}

const TabelManajemenArtikel: React.FC = () => {
  const { penggunaId, namaLengkap } = useAuth();
  const [listArtikel, setListArtikel] = useState<Artikel[]>([]);
  const [loadingArtikel, setLoadingArtikel] = useState(true);

  // --- STATE PENCARIAN & PAGINASI ---
  const [searchInput, setSearchInput] = useState(""); // Teks yang sedang diketik
  const [activeSearchTerm, setActiveSearchTerm] = useState(""); // Teks yang sudah diklik "Cari"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchArtikel = () => {
    if (!penggunaId) return;
    const token = sessionStorage.getItem("jwt_token");
    
    fetch(`/api/artikel/saya/semua?t=${new Date().getTime()}`, {
      method: 'GET',
      // 'no-store' secara native memaksa browser mengabaikan semua jenis cache HTTP
      cache: 'no-store', 
      headers: { 
        "Authorization": `Bearer ${token}`,
        // Memaksa proxy/CDN (seperti Cloudflare) untuk melewatinya
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setListArtikel(data.data);
        }
        setLoadingArtikel(false);
      })
      .catch(err => {
        console.error("Gagal mengambil data:", err);
        setLoadingArtikel(false);
      });
  };

  useEffect(() => {
    fetchArtikel();
  }, [penggunaId]);

  // Fungsi untuk mengeksekusi pencarian saat tombol diklik
  const handleSearch = () => {
    setActiveSearchTerm(searchInput);
    setCurrentPage(1); // Kembalikan ke halaman 1 setiap kali pencarian baru dilakukan
  };

  // Eksekusi pencarian jika menekan tombol Enter di keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleStatus = async (artikel_id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'publish' ? 'draft' : 'publish';
    const token = sessionStorage.getItem("jwt_token");

    try {
      const res = await fetch(`/api/artikel/update-status/${artikel_id}`, {
        method: 'POST',
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchArtikel(); 
      } else {
        alert("Gagal merubah status: " + data.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handlePreview = async (artikel_id: number) => {
    try {
      const token = sessionStorage.getItem("jwt_token");
      const res = await fetch(`/api/artikel/${artikel_id}`, {
        method: 'GET',
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const previewData = {
          judul_artikel: data.data.judul_artikel,
          penulis: data.data.penulis || namaLengkap || "Penulis",
          blocks: data.data.blocks || []
        };
        
        sessionStorage.setItem("preview_artikel", JSON.stringify(previewData));
        window.open("/artikel/preview", "_blank");
      } else {
        alert("Gagal memuat data preview dari server: " + (data.message || "Artikel tidak ditemukan"));
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan saat memuat preview.");
    }
  };

  // --- LOGIKA FILTER PENCARIAN & SLICING HALAMAN ---
  // Sekarang menggunakan activeSearchTerm, bukan searchInput
  const filteredArtikel = listArtikel.filter(art => 
    art.judul_artikel.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
    (art.nama_jenis_artikel && art.nama_jenis_artikel.toLowerCase().includes(activeSearchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredArtikel.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentArtikel = filteredArtikel.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      {/* Kolom Pencarian dengan Tombol Cari */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Cari judul atau kategori..." 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', maxWidth: '300px', padding: '10px 16px', borderRadius: '8px' }}
        />
        <button 
          className="btn btn-primary" 
          onClick={handleSearch}
          style={{ padding: '10px 20px', borderRadius: '8px', whiteSpace: 'nowrap' }}
        >
          Cari
        </button>
      </div>

      <div className="table-responsive">
        <table className="article-table">
          <thead>
            <tr>
              <th>Judul Artikel</th>
              <th>Kategori</th>
              <th>Tanggal Dibuat</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loadingArtikel ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                  <span>Memuat data artikel...</span>
                </td>
              </tr>
            ) : filteredArtikel.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                  <span>{activeSearchTerm ? "Artikel yang dicari tidak ditemukan." : "Belum ada artikel. Mulai tulis sesuatu!"}</span>
                </td>
              </tr>
            ) : (
              currentArtikel.map((art) => (
                <tr key={art.artikel_id}>
                  <td style={{ fontWeight: 500, color: "#111827", whiteSpace: "normal" }}>
                    {art.judul_artikel}
                  </td>
                  <td>{art.nama_jenis_artikel || "Tanpa Kategori"}</td>
                  <td>
                    {art.tanggal_dibuat 
                      ? new Date(art.tanggal_dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) 
                      : "-"}
                  </td>
                  <td>
                    <span className={`badge ${art.status}`}>
                      {art.status === 'publish' ? 'Publish' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', backgroundColor: '#ffffff' }}
                        onClick={() => handlePreview(art.artikel_id)}
                        title="Lihat Preview"
                      >
                        Preview
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}
                        onClick={() => toggleStatus(art.artikel_id, art.status)}
                      >
                        {art.status === 'publish' ? 'Jadikan Draft' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Kontrol Paginasi */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
            Menampilkan halaman {currentPage} dari {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              ← Sebelumnya
            </button>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabelManajemenArtikel;