import React, { useState, useEffect } from 'react';

interface JenisArtikel {
  jenis_artikel_id: number;
  nama_jenis_artikel: string;
}

const FormTambahArtikel: React.FC = () => {
  const [judulArtikel, setJudulArtikel] = useState("");
  const [jenisArtikelId, setJenisArtikelId] = useState("");
  const [listJenis, setListJenis] = useState<JenisArtikel[]>([]);
  const [barisList, setBarisList] = useState<any[]>([]);

  useEffect(() => {
    // PERBAIKAN: Mengambil token dari sessionStorage
    const token = sessionStorage.getItem("jwt_token");
    fetch("/api/jenis-artikel", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setListJenis(data.data);
      })
      .catch(console.error);
  }, []);

  const tambahBaris = (tipe: 'teks' | 'gambar') => {
    setBarisList([...barisList, { tipe, isi: '', file: null, deskripsi_foto: '' }]);
  };

  const handleBarisChange = (index: number, field: string, value: any) => {
    const newBaris = [...barisList];
    newBaris[index][field] = value;
    setBarisList(newBaris);
  };

  const hapusBaris = (index: number) => {
    setBarisList(barisList.filter((_, i) => i !== index));
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
    if (!judulArtikel || !jenisArtikelId) {
      alert("Peringatan: Judul dan Kategori harus diisi!");
      return;
    }

    // Aksi Preview
    if (actionType === 'preview') {
      const previewBlocks = await Promise.all(barisList.map(async (blok, index) => {
        let base64Foto = "";
        if (blok.file) base64Foto = await fileToBase64(blok.file);
        return { urutan: index + 1, tipe: blok.tipe, isi: blok.isi, foto: base64Foto, deskripsi_foto: blok.deskripsi_foto };
      }));

      // Preview tetap menggunakan localStorage karena hanya sebagai penyimpanan data tampilan sementara
      localStorage.setItem("preview_artikel", JSON.stringify({ judul_artikel: judulArtikel, blocks: previewBlocks }));
      window.open("/artikel/preview", "_blank"); 
      return;
    }

    const formData = new FormData();
    formData.append('judul_artikel', judulArtikel);
    formData.append('jenis_artikel_id', jenisArtikelId);
    formData.append('baris_count', barisList.length.toString());

    barisList.forEach((baris, i) => {
      formData.append(`baris_${i}_tipe`, baris.tipe);
      if (baris.tipe === 'teks') {
        formData.append(`baris_${i}_isi`, baris.isi);
      } else if (baris.tipe === 'gambar' && baris.file) {
        formData.append(`baris_${i}_file`, baris.file);
        formData.append(`baris_${i}_deskripsi_foto`, baris.deskripsi_foto);
      }
    });

    try {
      // PERBAIKAN: Mengambil token dari sessionStorage untuk autentikasi API
      const token = sessionStorage.getItem("jwt_token");
      const response = await fetch(actionType === 'draft' ? "/api/draft" : "/api/artikel", {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Sukses: ${result.message}`);
        setJudulArtikel("");
        setJenisArtikelId("");
        setBarisList([]);
      } else {
        alert(`Gagal: ${result.message}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan saat mengirim data ke server.");
    }
  };

  return (
    <div>
      <div className="form-group">
        <label>Judul Artikel</label>
        <input 
          type="text" 
          className="form-control" 
          value={judulArtikel} 
          onChange={e => setJudulArtikel(e.target.value)} 
          placeholder="Tuliskan judul artikel..." 
        />
      </div>

      <div className="form-group">
        <label>Kategori</label>
        <select 
          className="form-control" 
          value={jenisArtikelId} 
          onChange={e => setJenisArtikelId(e.target.value)}
        >
          <option value="">-- Pilih Kategori --</option>
          {listJenis.map(j => (
            <option key={j.jenis_artikel_id} value={j.jenis_artikel_id}>{j.nama_jenis_artikel}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '32px', marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Konten Artikel
        </label>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => tambahBaris('teks')}>+ Paragraf</button>
          <button className="btn btn-secondary" onClick={() => tambahBaris('gambar')}>+ Gambar</button>
        </div>

        {barisList.map((baris, i) => (
          <div key={i} className="baris-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                {baris.tipe === 'teks' ? 'Blok Teks' : 'Blok Gambar'}
              </strong>
              <button 
                onClick={() => hapusBaris(i)} 
                style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Hapus
              </button>
            </div>
            
            {baris.tipe === 'teks' ? (
              <textarea 
                className="form-control" 
                style={{ width: '100%', minHeight: '120px', boxSizing: 'border-box', resize: 'vertical' }}
                value={baris.isi} 
                onChange={e => handleBarisChange(i, 'isi', e.target.value)} 
                placeholder="Mulai menulis paragraf di sini..." 
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*"
                  onChange={e => handleBarisChange(i, 'file', e.target.files ? e.target.files[0] : null)} 
                />
                <input 
                  type="text" 
                  className="form-control" 
                  value={baris.deskripsi_foto} 
                  onChange={e => handleBarisChange(i, 'deskripsi_foto', e.target.value)} 
                  placeholder="Tambahkan keterangan untuk gambar ini..." 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => handleAction('preview')}>Preview</button>
        <button type="button" className="btn btn-secondary" onClick={() => handleAction('draft')}>Draft</button>
        <button type="button" className="btn btn-primary" onClick={() => handleAction('publish')}>Publish</button>
      </div>
    </div>
  );
};

export default FormTambahArtikel;