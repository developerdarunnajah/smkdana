import { Hono } from "hono";

const artikel = new Hono<{ Bindings: Env }>();

artikel.post("/", async (c) => {
  try {
    // 1. Parsing FormData dari Frontend (mendukung file dan teks)
    const body = await c.req.parseBody();
    
    const judul_artikel = body['judul_artikel'] as string;
    const jenis_artikel = parseInt(body['jenis_artikel'] as string);
    const pengguna_id = parseInt(body['pengguna_id'] as string); // Didapat dari frontend
    const baris_count = parseInt(body['baris_count'] as string);
    
    // 2. Simpan Data Utama Artikel ke Database D1
    const insertArtikel = await c.env.DB.prepare(
      "INSERT INTO artikel (judul_artikel, jenis_artikel, pengguna_id, status) VALUES (?, ?, ?, 'publish')"
    )
    .bind(judul_artikel, jenis_artikel, pengguna_id)
    .run();
    
    // Ambil ID artikel yang baru saja dibuat
    const artikel_id = insertArtikel.meta.last_row_id;
    
    // 3. Proses Setiap Baris/Blok Konten
    const barisQueries = [];
    
    for (let i = 0; i < baris_count; i++) {
      const tipe = body[`baris_${i}_tipe`] as string;
      const urutan = i + 1; // Urutan sesuai urutan di array frontend
      
      let isi = null;
      let foto = null;
      let deskripsi_foto = null;
      
      if (tipe === 'teks') {
        isi = body[`baris_${i}_isi`] as string;
      } 
      else if (tipe === 'gambar') {
        deskripsi_foto = body[`baris_${i}_deskripsi_foto`] as string;
        const file = body[`baris_${i}_file`] as File;
        
        // 4. Jika ada file fisik, Upload ke R2 Bucket (Folder: resource)
        if (file && file.name) {
          // Buat nama file unik untuk menghindari bentrok nama yang sama
          const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
          const key = `resource/${uniqueFilename}`; // Masuk ke folder resource
          
          // Proses upload file ke R2
          await c.env.BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type }
          });
          
          foto = key; // Simpan path R2 ke database D1
        }
      }
      
      // Siapkan Query untuk memasukkan baris ini (tapi jangan dieksekusi dulu)
      barisQueries.push(
        c.env.DB.prepare(
          "INSERT INTO baris (artikel_id, urutan, isi, foto, deskripsi_foto) VALUES (?, ?, ?, ?, ?)"
        ).bind(artikel_id, urutan, isi, foto, deskripsi_foto)
      );
    }
    
    // 5. Eksekusi semua query baris sekaligus (Batch) agar lebih cepat & aman
    if (barisQueries.length > 0) {
      await c.env.DB.batch(barisQueries);
    }
    
    return c.json({ success: true, message: "Artikel dan gambar berhasil diunggah!", artikel_id });
    
  } catch (error: any) {
    console.error("Gagal menyimpan artikel:", error);
    return c.json({ success: false, message: "Terjadi kesalahan server: " + error.message }, 500);
  }
});
// Endpoint GET (Untuk membaca artikel yang sudah di-publish berdasarkan ID)
artikel.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    // Mengambil data utama artikel
    const dataArtikel = await c.env.DB.prepare(
      "SELECT a.*, p.nama_lengkap AS penulis FROM artikel a LEFT JOIN pengguna p ON a.pengguna_id = p.pengguna_id WHERE a.artikel_id = ?"
    ).bind(id).first();
    
    if (!dataArtikel) {
      return c.json({ success: false, message: "Artikel tidak ditemukan" }, 404);
    }
    
    // Mengambil semua blok baris milik artikel tersebut
    const { results: baris } = await c.env.DB.prepare(
      "SELECT * FROM baris WHERE artikel_id = ? ORDER BY urutan ASC"
    ).bind(id).all();
    
    return c.json({ success: true, data: { ...dataArtikel, blocks: baris } });
  } catch (error: any) {
    return c.json({ success: false, message: "Terjadi kesalahan server: " + error.message }, 500);
  }
});

export default artikel;