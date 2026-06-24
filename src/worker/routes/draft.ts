import { Hono } from "hono";

const draft = new Hono<{ Bindings: Env }>();

draft.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    
    const judul_artikel = body['judul_artikel'] as string;
    const jenis_artikel = parseInt(body['jenis_artikel'] as string);
    const pengguna_id = parseInt(body['pengguna_id'] as string);
    const baris_count = parseInt(body['baris_count'] as string);
    
    // Simpan Data dengan status 'draft'
    const insertArtikel = await c.env.DB.prepare(
      "INSERT INTO artikel (judul_artikel, jenis_artikel, pengguna_id, status) VALUES (?, ?, ?, 'draft')"
    ).bind(judul_artikel, jenis_artikel, pengguna_id).run();
    
    const artikel_id = insertArtikel.meta.last_row_id;
    const barisQueries = [];
    
    for (let i = 0; i < baris_count; i++) {
      const tipe = body[`baris_${i}_tipe`] as string;
      const urutan = i + 1;
      let isi = null; let foto = null; let deskripsi_foto = null;
      
      if (tipe === 'teks') {
        isi = body[`baris_${i}_isi`] as string;
      } else if (tipe === 'gambar') {
        deskripsi_foto = body[`baris_${i}_deskripsi_foto`] as string;
        const file = body[`baris_${i}_file`] as File;
        
        if (file && file.name) {
          // Tambahkan prefix 'draft-' pada nama file gambar
          const uniqueFilename = `draft-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
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
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default draft;