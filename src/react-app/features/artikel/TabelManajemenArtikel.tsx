import React, { useEffect, useState } from "react";

interface Props {
  penggunaId: number;
}

const TabelManajemenArtikel: React.FC<Props> = ({ penggunaId }) => {
  const [listArtikel, setListArtikel] = useState<any[]>([]);
  const [loadingArtikel, setLoadingArtikel] = useState<boolean>(false);

  useEffect(() => {
    if (penggunaId > 0) {
      setLoadingArtikel(true);
      fetch(`/api/artikel/user/${penggunaId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) setListArtikel(result.data);
          setLoadingArtikel(false);
        })
        .catch((err) => {
          console.error("Gagal memuat daftar artikel:", err);
          setLoadingArtikel(false);
        });
    }
  }, [penggunaId]);

  return (
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
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Memuat artikel...</td></tr>
            ) : listArtikel.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Belum ada artikel yang Anda buat.</td></tr>
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
};

export default TabelManajemenArtikel;