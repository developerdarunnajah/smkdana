import { Hono } from "hono";
import { jwt } from "hono/jwt"; // 1. Import middleware JWT bawaan Hono
import auth from "./routes/auth";
import slide from "./routes/slide";
import artikelRoute from "./routes/artikel";
import draft from "./routes/draft";       
import preview from "./routes/preview";   
import jenisArtikel from "./routes/jenisartikel"; 

const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", auth);

// 2. Pasang proteksi JWT untuk semua rute artikel dan draft
// Hanya token valid yang diizinkan lewat, jika tidak valid Hono otomatis mengembalikan error 401
// 2. Pasang proteksi JWT untuk semua rute artikel dan draft (Tepat untuk URL dengan atau tanpa garis miring)
app.use("/api/artikel", (c, next) => jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next));
app.use("/api/artikel/*", (c, next) => jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next));

app.use("/api/draft", (c, next) => jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next));
app.use("/api/draft/*", (c, next) => jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next));

// Jalur rute utama (Sekarang sudah terproteksi oleh middleware di atas)
app.route("/api/slide", slide);
app.route("/api/artikel",  artikelRoute); // Gunakan artikelRoute yang sudah diimpor dari routes/artikel.ts
app.route("/api/draft", draft);           
app.route("/api/preview", preview);       
app.route("/api/jenis-artikel", jenisArtikel);

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