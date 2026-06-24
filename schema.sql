-- 3. Buat tabel artikel
CREATE TABLE IF NOT EXISTS artikel (
    artikel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul_artikel TEXT NOT NULL,
    isi TEXT NOT NULL,
    pengguna_id INTEGER,
    lembaga_id INTEGER,
    tanggal_dibuat DATETIME DEFAULT CURRENT_TIMESTAMP, -- Otomatis mengisi waktu saat artikel dibuat
    status TEXT DEFAULT 'draft',                       -- Contoh status: 'draft', 'publish', 'arsip'
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(pengguna_id) ON DELETE SET NULL,
    FOREIGN KEY (lembaga_id) REFERENCES nama_lembaga(lembaga_id) ON DELETE CASCADE
);

-- Memastikan fitur foreign key aktif di SQLite/D1
PRAGMA foreign_keys = ON;

-- 1. Buat tabel lembaga terlebih dahulu karena akan direferensikan oleh tabel pengguna
CREATE TABLE IF NOT EXISTS nama_lembaga (
    lembaga_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_lembaga TEXT NOT NULL UNIQUE
);

-- 2. Buat tabel pengguna
CREATE TABLE IF NOT EXISTS pengguna (
    pengguna_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,          -- Disarankan menyimpan dalam bentuk hash (bcrypt/argon2)
    nama_lengkap TEXT NOT NULL,
    lembaga_id INTEGER,
    foto TEXT,                       -- Menyimpan URL atau key nama file dari R2 Bucket
    FOREIGN KEY (lembaga_id) REFERENCES nama_lembaga(lembaga_id) ON DELETE SET NULL
);
-- 1. Hapus tabel lama jika sudah ada (PERINGATAN: Ini akan menghapus semua data artikel sebelumnya)
DROP TABLE IF EXISTS baris;
DROP TABLE IF EXISTS artikel;

-- 2. Buat ulang tabel artikel (tanpa kolom 'isi' dan ditambah 'jenis_artikel')
CREATE TABLE artikel (
    artikel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul_artikel TEXT NOT NULL,
    jenis_artikel INTEGER,                             -- Tipe numeric untuk membedakan kategori/jenis artikel
    pengguna_id INTEGER,
    lembaga_id INTEGER,
    tanggal_dibuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'draft',
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(pengguna_id) ON DELETE SET NULL,
    FOREIGN KEY (lembaga_id) REFERENCES nama_lembaga(lembaga_id) ON DELETE CASCADE
);

-- 3. Buat tabel baris (Sebagai blok-blok konten dinamis)
CREATE TABLE baris (
    baris_id INTEGER PRIMARY KEY AUTOINCREMENT,
    isi TEXT,                                          -- Paragraf/teks (bisa NULL jika baris ini hanya gambar)
    foto TEXT,                                         -- Key gambar di R2 Bucket (bisa NULL jika baris ini hanya teks)
    deskripsi_foto TEXT,                               -- Caption/Alt text untuk gambar
    artikel_id INTEGER,
    urutan INTEGER NOT NULL,                           -- Urutan tampil blok (1, 2, 3, dst)
    FOREIGN KEY (artikel_id) REFERENCES artikel(artikel_id) ON DELETE CASCADE
);

-- Hapus tabel lama jika sudah ada (sesuaikan urutan untuk menghindari error foreign key)
DROP TABLE IF EXISTS baris;
DROP TABLE IF EXISTS artikel;
DROP TABLE IF EXISTS jenis_artikel; -- Tabel baru

-- (Tabel nama_lembaga dan pengguna diasumsikan sudah ada di atas baris ini sesuai schema awal)

-- Buat tabel jenis_artikel
CREATE TABLE IF NOT EXISTS jenis_artikel (
    jenis_artikel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_jenis_artikel TEXT NOT NULL UNIQUE
);

-- Buat ulang tabel artikel
CREATE TABLE artikel (
    artikel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul_artikel TEXT NOT NULL,
    jenis_artikel_id INTEGER,                          -- Menggantikan kolom jenis_artikel sebelumnya
    pengguna_id INTEGER,
    lembaga_id INTEGER,
    tanggal_dibuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'draft',
    FOREIGN KEY (jenis_artikel_id) REFERENCES jenis_artikel(jenis_artikel_id) ON DELETE SET NULL,
    FOREIGN KEY (pengguna_id) REFERENCES pengguna(pengguna_id) ON DELETE SET NULL,
    FOREIGN KEY (lembaga_id) REFERENCES nama_lembaga(lembaga_id) ON DELETE CASCADE
);

-- Buat tabel baris (Tetap sama seperti sebelumnya)
CREATE TABLE baris (
    baris_id INTEGER PRIMARY KEY AUTOINCREMENT,
    isi TEXT,                                          
    foto TEXT,                                         
    deskripsi_foto TEXT,                               
    artikel_id INTEGER,
    urutan INTEGER NOT NULL,                           
    FOREIGN KEY (artikel_id) REFERENCES artikel(artikel_id) ON DELETE CASCADE
);