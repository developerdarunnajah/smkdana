import { Hono } from "hono";
import { createArtikel, getArtikelById, getArtikelByUser } from "../controllers/artikelController";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const artikelRoute = new Hono<{ Bindings: Env }>();

artikelRoute.post("/", createArtikel);
artikelRoute.get("/:id", getArtikelById);
// PERBAIKAN: Ubah rute menjadi '/saya' karena kita mengambil ID murni dari JWT yang aman, bukan dari URL
artikelRoute.get("/saya/semua", getArtikelByUser); 

// PERBAIKAN: Proteksi IDOR (Hanya pemilik yang bisa ubah status)
artikelRoute.post("/update-status/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;
    
    if (status !== 'publish' && status !== 'draft') {
      return c.json({ success: false, message: "Status tidak valid" }, 400);
    }

    // Ambil UID dari token JWT
    const jwtPayload = c.get("jwtPayload") as { uid: number } | undefined;
    if (!jwtPayload || !jwtPayload.uid) {
      return c.json({ success: false, message: "Akses ditolak." }, 401);
    }
    const pengguna_id = jwtPayload.uid;

    // Pastikan UPDATE hanya terjadi jika artikel tersebut memang milik pengguna_id yang sedang login
    const result = await c.env.DB.prepare(
      "UPDATE artikel SET status = ? WHERE artikel_id = ? AND pengguna_id = ?"
    )
      .bind(status, id, pengguna_id)
      .run();
      
    // Mengecek apakah ada baris yang berubah (jika 0, berarti ID salah atau bukan milik dia)
    if (result.meta.changes === 0) {
        return c.json({ success: false, message: "Gagal: Artikel tidak ditemukan atau Anda tidak memiliki akses ke artikel ini." }, 403);
    }

    return c.json({ success: true, message: `Status berhasil diubah menjadi ${status}` });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default artikelRoute;