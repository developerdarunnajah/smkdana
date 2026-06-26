import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [penggunaId, setPenggunaId] = useState<number | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>("");
  const [namaPengguna, setNamaPengguna] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      try {
        // Memecah token JWT dan mengambil bagian payload (tengah)
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64);
        const payload = JSON.parse(decodedJson);
        
        // Memasukkan data dari token ke dalam state React
        setPenggunaId(payload.uid || payload.pengguna_id);
        setNamaLengkap(payload.nama_lengkap || "Pengguna");
        setNamaPengguna(payload.username || "");
      } catch (error) {
        console.error("Token tidak valid atau rusak", error);
        localStorage.removeItem('jwt_token'); // Hapus token jika rusak
      }
    }
    
    setIsAuthLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('jwt_token');
    window.location.href = '/login'; 
  };

  return { 
    penggunaId, 
    namaLengkap, 
    namaPengguna, 
    isAuthLoading, 
    logout 
  };
};