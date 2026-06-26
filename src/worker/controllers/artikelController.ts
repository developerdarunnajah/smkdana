import { Context } from "hono";

// Tipe Env agar TypeScript tahu kita punya DB dan BUCKET (R2)
type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

// 1. Fungsi untuk Membuat Artikel Baru (POST)
export const createArtikel = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.parseBody();
    
    const judul_artikel = body['judul_artikel'] as string;
    const jenis_artikel_id = parseInt(body['jenis_artikel_id'] as string);
    const baris_count = parseInt(body['baris_count'] as string);
    
    // AMAN: Mengambil ID pengguna langsung dari token JWT yang sudah terverifikasi
    const jwtPayload = c.get("jwtPayload") as { uid: number } | undefined;
    if (!jwtPayload || !jwtPayload.uid) {
      return c.json({ success: false, message: "Akses ditolak: Sesi tidak valid atau Anda belum login." }, 401);
    }
    const pengguna_id = jwtPayload.uid;
    
    // Simpan Data Utama Artikel ke Database D1
    const insertArtikel = await c.env.DB.prepare(
      "INSERT INTO artikel (judul_artikel, jenis_artikel_id, pengguna_id, status) VALUES (?, ?, ?, 'publish')"
    )
    .bind(judul_artikel, jenis_artikel_id, pengguna_id)
    .run();
    
    // Memeriksa kedua kemungkinan format nama properti dari Cloudflare D1
    const artikel_id = insertArtikel.meta.last_row_id ?? (insertArtikel.meta as any).lastRowId;

    // Membantu pelacakan ID pada terminal konsol backend
    console.log("Artikel Berhasil Disimpan. ID:", artikel_id);
    
    if (!artikel_id) {
      return c.json({ success: false, message: "Gagal membuat ID referensi artikel pada database." }, 500);
    }
    const barisQueries = [];
    
    for (let i = 0; i < baris_count; i++) {
      const tipe = body[`baris_${i}_tipe`] as string;
      const urutan = i + 1; 
      
      let isi = null; let foto = null; let deskripsi_foto = null;
      
      if (tipe === 'teks') {
        isi = body[`baris_${i}_isi`] as string;
      } 
      else if (tipe === 'gambar') {
        deskripsi_foto = body[`baris_${i}_deskripsi_foto`] as string;
        const file = body[`baris_${i}_file`] as File;
        
        // Mulai Proses Upload & Validasi Keamanan
        if (file && file.name) {
          
          // 1. Validasi Ekstensi / MIME Type (Hanya izinkan gambar)
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          if (!allowedTypes.includes(file.type)) {
            // Hentikan proses jika ada file jahat/tidak sesuai
            return c.json({ success: false, message: `Gagal: File "${file.name}" bukan format gambar yang diizinkan (Hanya JPG, PNG, WEBP, GIF).` }, 400);
          }

          // 2. Validasi Ukuran File (Contoh: Maksimal 5MB)
          const MAX_SIZE = 5 * 1024 * 1024; // 5MB dalam satuan Bytes
          if (file.size > MAX_SIZE) {
            return c.json({ success: false, message: `Gagal: Ukuran gambar "${file.name}" terlalu besar. Maksimal 5MB.` }, 400);
          }

          // 3. Sanitasi Nama File (Mencegah Path Traversal pada nama file asal)
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
          const uniqueFilename = `${Date.now()}-${safeFileName}`;
          const key = `resource/${uniqueFilename}`; 
          
          // 4. Upload ke R2 Bucket dengan aman
          await c.env.BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type } // Memastikan browser merender sebagai gambar, bukan mengunduhnya
          });
          foto = key; 
        }
      }
      
      barisQueries.push(
        c.env.DB.prepare(
          "INSERT INTO baris (artikel_id, urutan, isi, foto, deskripsi_foto) VALUES (?, ?, ?, ?, ?)"
        ).bind(artikel_id, urutan, isi, foto, deskripsi_foto)
      );
    }
    
    if (barisQueries.length > 0) await c.env.DB.batch(barisQueries);
    return c.json({ success: true, message: "Artikel dan gambar berhasil diunggah!", artikel_id });
    
  } catch (error: any) {
    console.error("Gagal menyimpan artikel:", error);
    return c.json({ success: false, message: "Terjadi kesalahan server: " + error.message }, 500);
  }
};

// 2. Fungsi untuk Mendapatkan 1 Artikel Berdasarkan ID (GET)
export const getArtikelById = async (c: Context<{ Bindings: Env }>) => {
  const id = c.req.param("id");
  try {
    const dataArtikel = await c.env.DB.prepare(
      `SELECT a.*, p.nama_lengkap AS penulis, j.nama_jenis_artikel 
       FROM artikel a 
       LEFT JOIN pengguna p ON a.pengguna_id = p.pengguna_id 
       LEFT JOIN jenis_artikel j ON a.jenis_artikel_id = j.jenis_artikel_id 
       WHERE a.artikel_id = ?`
    ).bind(id).first();
    
    if (!dataArtikel) return c.json({ success: false, message: "Artikel tidak ditemukan" }, 404);
    
    const { results: baris } = await c.env.DB.prepare(
      "SELECT * FROM baris WHERE artikel_id = ? ORDER BY urutan ASC"
    ).bind(id).all();
    
    return c.json({ success: true, data: { ...dataArtikel, blocks: baris } });
  } catch (error: any) {
    return c.json({ success: false, message: "Terjadi kesalahan server: " + error.message }, 500);
  }
};

// 3. Fungsi untuk Mendapatkan List Artikel Milik User (GET)
// 3. Fungsi untuk Mendapatkan List Artikel Milik User (GET)
export const getArtikelByUser = async (c: Context<{ Bindings: Env }>) => {
  try {
    // AMAN: Mengambil ID pengguna dari token JWT, bukan dari parameter URL
    const jwtPayload = c.get("jwtPayload") as { uid: number };
    const pengguna_id = jwtPayload.uid;

    const { results } = await c.env.DB.prepare(
      `SELECT a.*, j.nama_jenis_artikel 
       FROM artikel a 
       LEFT JOIN jenis_artikel j ON a.jenis_artikel_id = j.jenis_artikel_id 
       WHERE a.pengguna_id = ? 
       ORDER BY a.tanggal_dibuat DESC`
    ).bind(pengguna_id).all();
    
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, message: "Terjadi kesalahan server: " + error.message }, 500);
  }
};