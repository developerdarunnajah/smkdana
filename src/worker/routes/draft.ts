import { Hono, Context } from "hono";

// Tipe Env agar TypeScript tahu kita punya DB dan BUCKET (R2)
type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const draft = new Hono<{ Bindings: Env }>();

// Fungsi bantuan sanitasi (sama seperti di artikelController untuk mencegah XSS)
const sanitizeText = (text: string | null | undefined) => {
  if (!text) return text;
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

draft.post("/", async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.parseBody();
    
    // PERBAIKAN 1: Gunakan 'jenis_artikel_id' sesuai frontend dan skema D1
    const judul_artikel = sanitizeText(body['judul_artikel'] as string);
    const jenis_artikel_id = parseInt(body['jenis_artikel_id'] as string);
    
    let baris_count = parseInt(body['baris_count'] as string);
    if (isNaN(baris_count) || baris_count < 0 || baris_count > 100) {
       return c.json({ success: false, message: "Jumlah baris tidak valid." }, 400);
    }
    
    // PERBAIKAN 2: Ambil pengguna_id langsung dari Token JWT, bukan dari input form
    const jwtPayload = c.get("jwtPayload") as { uid: number } | undefined;
    if (!jwtPayload || !jwtPayload.uid) {
      return c.json({ success: false, message: "Sesi tidak valid atau Anda belum login." }, 401);
    }
    const pengguna_id = jwtPayload.uid;
    
    // PERBAIKAN 3: Query disesuaikan dengan skema terbaru (jenis_artikel_id)
    const insertArtikel = await c.env.DB.prepare(
      "INSERT INTO artikel (judul_artikel, jenis_artikel_id, pengguna_id, status) VALUES (?, ?, ?, 'draft')"
    )
    .bind(judul_artikel, jenis_artikel_id, pengguna_id)
    .run();
    
    // PERBAIKAN 4: Kompatibilitas respons Cloudflare D1
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
        isi = sanitizeText(body[`baris_${i}_isi`] as string);
      } else if (tipe === 'gambar') {
        deskripsi_foto = sanitizeText(body[`baris_${i}_deskripsi_foto`] as string);
        const file = body[`baris_${i}_file`] as File;
        
        if (file && file.name) {
          // Validasi keamanan gambar
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          if (!allowedTypes.includes(file.type)) {
            return c.json({ success: false, message: `Format gambar tidak diizinkan.` }, 400);
          }
          
          // Sanitasi nama file dan tambahkan prefix draft
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
          const uniqueFilename = `draft-${Date.now()}-${safeFileName}`;
          const key = `resource/${uniqueFilename}`;
          
          await c.env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
          foto = key;
        }
      }
      barisQueries.push(
        c.env.DB.prepare("INSERT INTO baris (artikel_id, urutan, isi, foto, deskripsi_foto) VALUES (?, ?, ?, ?, ?)")
        .bind(artikel_id, urutan, isi, foto, deskripsi_foto)
      );
    }
    
    if (barisQueries.length > 0) await c.env.DB.batch(barisQueries);
    
    return c.json({ success: true, message: "Draft berhasil disimpan dengan aman!", artikel_id });
  } catch (error: any) {
    console.error("Gagal simpan draft:", error);
    return c.json({ success: false, message: "Terjadi kesalahan server saat menyimpan draft." }, 500);
  }
});

export default draft;