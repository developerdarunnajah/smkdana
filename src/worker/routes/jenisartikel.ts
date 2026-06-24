import { Hono } from "hono";
import { cache } from "hono/cache";

const jenisArtikel = new Hono<{ Bindings: Env }>();

jenisArtikel.get(
  "/", 
  cache({
    cacheName: 'kategori-cache',
    cacheControl: 'max-age=86400', // Cache selama 1 Hari (86400 detik)
  }),
  async (c) => {
    try {
      // Query D1 ini HANYA AKAN DIJALANKAN 1 KALI SEHARI per lokasi server Cloudflare
      const { results } = await c.env.DB.prepare(
        "SELECT * FROM jenis_artikel"
      ).all();
      
      return c.json({ success: true, data: results });
    } catch (error: any) {
      return c.json({ success: false, message: "Terjadi kesalahan: " + error.message }, 500);
    }
  }
);

jenisArtikel.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const nama_jenis_artikel = body.nama_jenis_artikel;

    const { success } = await c.env.DB.prepare(
      "INSERT INTO jenis_artikel (nama_jenis_artikel) VALUES (?)"
    ).bind(nama_jenis_artikel).run();

    return c.json({ success });
  } catch (error: any) {
    return c.json({ success: false, message: "Terjadi kesalahan: " + error.message }, 500);
  }
});

export default jenisArtikel;