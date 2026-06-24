import { Hono } from "hono";
import { sign } from "hono/jwt";

const auth = new Hono<{ Bindings: Env }>();

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const { username, password } = body;
  
  try {
    // Mencari pengguna di database D1 berdasarkan username & password
    // Catatan: Untuk tahap production, password sebaiknya disimpan dalam bentuk hash.
    const user: any = await c.env.DB.prepare(
      "SELECT * FROM pengguna WHERE username = ? AND password = ?"
    )
    .bind(username, password)
    .first(); // .first() mengambil satu baris data saja

    if (user) {
      // Jika pengguna ditemukan, buat payload JWT (Tanpa sistem role)
      const payload = {
        pengguna_id: user.pengguna_id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        lembaga_id: user.lembaga_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Kedaluwarsa dalam 24 jam
      };
      
      const secret = "rahasia-super-aman-smkdana"; // Kunci rahasia JWT
      const token = await sign(payload, secret);

      return c.json({ 
        success: true, 
        token: token,
        message: "Login berhasil"
      });
    } else {
      // Jika pengguna tidak ditemukan atau password salah
      return c.json({ 
        success: false, 
        message: "Username atau password salah!" 
      }, 401);
    }
  } catch (error: any) {
    // Menangkap error jika tabel belum ada atau database bermasalah
    return c.json({ 
      success: false, 
      message: "Terjadi kesalahan pada server",
      error: error.message 
    }, 500);
  }
});

export default auth;