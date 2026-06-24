import { Hono } from "hono";

import { cache } from "hono/cache"; // IMPORT CACHE// Mengimpor logika dari folder controllers
import { createArtikel, getArtikelById, getArtikelByUser } from "../controllers/artikelController";

// Deklarasi env agar Tipe TypeScript tidak error
type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const artikelRoute = new Hono<{ Bindings: Env }>();

// Mendaftarkan rute dan menyambungkannya ke Controller
artikelRoute.post("/", createArtikel);
artikelRoute.get(
  "/:id", 
  cache({
    cacheName: 'artikel-publik-cache',
    cacheControl: 'max-age=600',
  }),
  getArtikelById
);
artikelRoute.get("/user/:pengguna_id", getArtikelByUser);



export default artikelRoute;