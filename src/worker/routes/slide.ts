import { Hono } from "hono";

// Menggunakan tipe Env agar typescript mengenali BUCKET
const slide = new Hono<{ Bindings: Env }>();

// Endpoint menangkap nama file secara dinamis
slide.get("/:filename", async (c) => {
  const filename = c.req.param("filename");
  const key = `slideshow/${filename}`; // Folder slideshow di dalam R2
  
  const object = await c.env.BUCKET.get(key);
  
  if (!object) {
    return c.text("File tidak ditemukan", 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
});

export default slide;