import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./BacaArtikel.css";

const BacaArtikel: React.FC = () => {
  const { id } = useParams(); // Menangkap ID dari URL
  const [artikel, setArtikel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // LOGIKA 1: Jika URL-nya adalah /artikel/preview (Tab Baru untuk Preview)
    if (id === 'preview') {
      const previewData = localStorage.getItem("preview_artikel");
      if (previewData) setArtikel(JSON.parse(previewData));
      setLoading(false);
      return;
    }

    // LOGIKA 2: Jika URL-nya angka (Artikel asli dari Database)
    fetch(`/api/artikel/${id}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) setArtikel(result.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="reader-container"><p>Memuat artikel...</p></div>;
  if (!artikel) return <div className="reader-container"><p>Artikel tidak ditemukan atau belum disimpan.</p></div>;

  return (
    <div className="reader-container">
      <div className="reader-content">
        <h1 className="reader-title">{artikel.judul_artikel}</h1>
        <div className="reader-meta">
  <span>{artikel.penulis ? `Ditulis oleh: ${artikel.penulis}` : "Mode Pratinjau (Preview)"}</span>
  {/* Tambahan untuk menampilkan jenis artikel secara dinamis */}
  {artikel.nama_jenis_artikel && <span className="reader-category"> • Kategori: {artikel.nama_jenis_artikel}</span>}
  {artikel.tanggal_dibuat && <span> • {new Date(artikel.tanggal_dibuat).toLocaleDateString('id-ID')}</span>}
</div>
        
        <div className="reader-body">
          {artikel.blocks.map((block: any, idx: number) => {
            if (block.tipe === 'teks' || block.isi) {
              return <p key={idx} className="reader-text">{block.isi}</p>;
            } 
            else if (block.tipe === 'gambar' || block.foto) {
              // Menentukan apakah gambar berasal dari Preview (Base64) atau dari R2 Bucket Server
              const isBase64 = block.foto.startsWith('data:image');
              const imgSrc = isBase64 ? block.foto : `/api/${block.foto}`;
              
              return (
                <div key={idx} className="reader-image-box">
                  <img src={imgSrc} alt={block.deskripsi_foto || "Gambar Artikel"} />
                  {block.deskripsi_foto && <span className="reader-caption">{block.deskripsi_foto}</span>}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export default BacaArtikel;