import { Hono } from "hono";

const preview = new Hono<{ Bindings: Env }>();

preview.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    
    const judul_artikel = body['judul_artikel'] as string;
    const baris_count = parseInt(body['baris_count'] as string);
    const blocks = [];
    
    // Susun format data untuk dikirim balik ke modal preview Frontend
    for (let i = 0; i < baris_count; i++) {
      const tipe = body[`baris_${i}_tipe`] as string;
      
      if (tipe === 'teks') {
        blocks.push({
          urutan: i + 1,
          tipe: 'teks',
          isi: body[`baris_${i}_isi`] as string
        });
      } else if (tipe === 'gambar') {
        // Karena tidak disimpan ke R2, backend hanya memberi instruksi ke frontend
        // agar menggunakan URL lokal sementaranya sendiri
        blocks.push({
          urutan: i + 1,
          tipe: 'gambar',
          deskripsi_foto: body[`baris_${i}_deskripsi_foto`] as string,
          foto: "USE_LOCAL_PREVIEW" 
        });
      }
    }
    
    return c.json({
      success: true,
      message: "Preview berhasil dibuat",
      data: { judul_artikel, blocks }
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});


export default preview;