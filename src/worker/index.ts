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
  const object = await c.env.BUCKET.get(`resource/${filename}`);
  if (!object) return c.text("Not found", 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
});

export default app;