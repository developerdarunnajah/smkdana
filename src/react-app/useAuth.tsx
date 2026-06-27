import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const navigate = useNavigate();
  const [namaPengguna, setNamaPengguna] = useState<string>("");
  const [penggunaId, setPenggunaId] = useState<number>(0);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = sessionStorage.getItem("jwt_token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decodedToken = JSON.parse(jsonPayload);
      setNamaPengguna(decodedToken.nama_lengkap || decodedToken.username);
      setPenggunaId(decodedToken.pengguna_id);
    } catch (error) {
      sessionStorage.removeItem("jwt_token");
      navigate("/login");
    } finally {
      setIsAuthLoading(false);
    }
  }, [navigate]);

  const logout = () => {
    sessionStorage.removeItem("jwt_token");
    navigate("/login");
  };

  return { namaPengguna, penggunaId, isAuthLoading, logout };
};