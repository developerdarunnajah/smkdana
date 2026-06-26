import { Hono } from "hono";
import { createArtikel, getArtikelById, getArtikelByUser } from "../controllers/artikelController";

// Deklarasi router dengan nama artikelRoute
const artikelRoute = new Hono<{ Bindings: Env }>();

artikelRoute.post("/", createArtikel);
artikelRoute.get("/user/:pengguna_id", getArtikelByUser);
artikelRoute.get("/:id", getArtikelById);

artikelRoute.post("/update-status/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;
    
    if (status !== 'publish' && status !== 'draft') {
      return c.json({ success: false, message: "Status tidak valid" }, 400);
    }

    await c.env.DB.prepare("UPDATE artikel SET status = ? WHERE artikel_id = ?")
      .bind(status, id)
      .run();
      
    return c.json({ success: true, message: `Status berhasil diubah menjadi ${status}` });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// WAJIB ADA: Ekspor sebagai default agar bisa ditangkap oleh index.ts
export default artikelRoute;