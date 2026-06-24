import { Hono } from "hono";
import auth from "./routes/auth";
import slide from "./routes/slide";
import artikel from "./routes/artikel";
import draft from "./routes/draft";       // Import baru
import preview from "./routes/preview";   // Import baru
import jenisArtikel from "./routes/jenisartikel"; // Tambahan untuk jenis artikel

const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", auth);
app.route("/api/slide", slide);
app.route("/api/artikel", artikel);
app.route("/api/draft", draft);           // Route baru
app.route("/api/preview", preview);       // Route baru
app.route("/api/jenis-artikel", jenisArtikel); // Route baru

// ... (Sisa kode get/resource biarkan sama)
// OPSI TAMBAHAN: Buat endpoint agar frontend bisa membaca gambar dari folder resource
app.get("/api/resource/:filename", async (c) => {
  const filename = c.req.param("filename");
  
  // 1. Cek apakah gambar sudah ada di Cache Cloudflare
  const cache = caches.default;
  const cacheKey = new Request(c.req.url);
  let response = await cache.match(cacheKey);

  if (response) {
    // Jika ada di cache, langsung kembalikan tanpa menyentuh R2 Bucket!
    return response; 
  }

  // 2. Jika tidak ada di cache, barulah ambil dari R2 Bucket
  const object = await c.env.BUCKET.get(`resource/${filename}`);
  if (!object) return c.text("Not found", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  
  // 3. Tambahkan instruksi Cache selama 1 Tahun (31536000 detik)
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  response = new Response(object.body, { headers });

  // 4. Simpan hasilnya ke Cache Cloudflare secara background (agar request berikutnya cepat)
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
});

export default app;