import { Context } from "hono";

// Tipe Env agar TypeScript tahu kita punya DB dan BUCKET (R2)
type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

// FUNGSI KEAMANAN BANTUAN: Membersihkan input dari tag HTML berbahaya (Sanitasi XSS Ringan)
const sanitizeText = (text: string | null | undefined) => {
  if (!text) return text;
  // Menghapus karakter kurung siku HTML untuk mencegah injeksi script
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// 1. Fungsi untuk Membuat Artikel Baru (POST)
export const createArtikel = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.parseBody();
    
    // SANITASI INPUT UTAMA
    const judul_artikel = sanitizeText(body['judul_artikel'] as string);
    const jenis_artikel_id = parseInt(body['jenis_artikel_id'] as string);
    
    // KEAMANAN: Pastikan baris_count adalah angka yang valid untuk mencegah eksploitasi looping memori (DDoS)
    let baris_count = parseInt(body['baris_count'] as string);
    if (isNaN(baris_count) || baris_count < 0 || baris_count > 100) {
       return c.json({ success: false, message: "Jumlah baris tidak valid atau melebihi batas maksimal." }, 400);
    }
    
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
    
    if (!artikel_id) {
      return c.json({ success: false, message: "Gagal membuat ID referensi artikel pada database." }, 500);
    }
    
    const barisQueries = [];
    
    for (let i = 0; i < baris_count; i++) {
      const tipe = body[`baris_${i}_tipe`] as string;
      const urutan = i + 1; 
      
      let isi = null; let foto = null; let deskripsi_foto = null;
      
      if (tipe === 'teks') {
        // SANITASI ISI TEKS
        isi = sanitizeText(body[`baris_${i}_isi`] as string);
      } 
      else if (tipe === 'gambar') {
        // SANITASI DESKRIPSI FOTO
        deskripsi_foto = sanitizeText(body[`baris_${i}_deskripsi_foto`] as string);
        const file = body[`baris_${i}_file`] as File;
        
        // Mulai Proses Upload & Validasi Keamanan
        if (file && file.name) {
          
          // 1. Validasi Ekstensi / MIME Type (Hanya izinkan gambar)
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          if (!allowedTypes.includes(file.type)) {
            // Hentikan proses jika ada file jahat/tidak sesuai
            return c.json({ success: false, message: `Gagal: File "${file.name}" bukan format gambar yang diizinkan.` }, 400);
          }

          // 2. Validasi Ukuran File (Contoh: Maksimal 5MB)
          const MAX_SIZE = 5 * 1024 * 1024; // 5MB dalam satuan Bytes
          if (file.size > MAX_SIZE) {
            return c.json({ success: false, message: `Gagal: Ukuran gambar "${file.name}" terlalu besar. Maksimal 5MB.` }, 400);
          }

          // 3. Sanitasi Nama File (Mencegah Path Traversal)
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
          const uniqueFilename = `${Date.now()}-${safeFileName}`;
          const key = `resource/${uniqueFilename}`; 
          
          // 4. Upload ke R2 Bucket dengan aman
          await c.env.BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type } // Memastikan browser merender sebagai gambar
          });
          foto = key; 
        }
      }
      
      // Menggunakan Prepared Statement untuk mencegah SQL Injection
      barisQueries.push(
        c.env.DB.prepare(
          "INSERT INTO baris (artikel_id, urutan, isi, foto, deskripsi_foto) VALUES (?, ?, ?, ?, ?)"
        ).bind(artikel_id, urutan, isi, foto, deskripsi_foto)
      );
    }
    
    // Gunakan D1 Batch API agar eksekusi penulisan ke database sangat ringan dan cepat
    if (barisQueries.length > 0) await c.env.DB.batch(barisQueries);
    
    return c.json({ success: true, message: "Artikel dan gambar berhasil diunggah!", artikel_id });
    
  } catch (error: any) {
    console.error("Gagal menyimpan artikel:", error);
    // KEAMANAN: Sembunyikan error.message di production agar struktur/skema DB tidak bocor
    return c.json({ success: false, message: "Terjadi kesalahan pada server saat menyimpan artikel." }, 500); 
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
    console.error("Error getArtikelById:", error);
    return c.json({ success: false, message: "Terjadi kesalahan pada server saat mengambil artikel." }, 500);
  }
};

// 3. Fungsi untuk Mendapatkan List Artikel Milik User (GET)
export const getArtikelByUser = async (c: Context<{ Bindings: Env }>) => {
  try {
    // AMAN: Mengambil ID pengguna dari token JWT yang divalidasi oleh Hono, bukan dari URL
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
    console.error("Error getArtikelByUser:", error);
    return c.json({ success: false, message: "Terjadi kesalahan pada server saat mengambil daftar artikel." }, 500);
  }
};