import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Tambahkan ini
import "./Login.css"; // Impor CSS yang sudah dipisah

const Login: React.FC = () => {
  const navigate = useNavigate(); // Inisialisasi useNavigate
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [errorMsg, setErrorMsg] = useState(""); // State untuk pesan error

  // Hanya memanggil nama file, karena foldernya sudah diatur di backend (slide.ts)
  const slides = ["1.JPG", "2.JPG", "3.JPG", "4.JPG", "5.jpg"];

  useEffect(() => {
    // Jika sudah ada token, langsung arahkan ke dashboard
    if (sessionStorage.getItem("jwt_token")) {
      navigate("/dashboard");
    }

    const interval = setInterval(() => {
      setCurrentSlide((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, navigate]);

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Simpan JWT ke sessionStorage browser
        // Saat login berhasil
sessionStorage.setItem("jwt_token", data.token);
        // Arahkan ke halaman dashboard
        navigate("/dashboard");
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg("Koneksi ke server gagal.");
    }
  };

  return (
    <div className="login-container">
      {/* SISI KIRI (Slideshow) */}
      <div className="login-left-panel">
        <div className="slideshow-wrapper">
          {slides.map((slide, index) => (
            <img 
              key={index}
              src={`/api/slide/${slide}`} 
              alt={`Slideshow ${index + 1}`} 
              className={`slideshow-image ${index === currentSlide ? "active" : ""}`}
            />
          ))}
          <div className="slideshow-overlay">
            <h2>Selamat Datang di SMK Dana</h2>
            <p>Membentuk generasi unggul, kompeten, dan berakhlak mulia di era digital.</p>
            <div className="slideshow-dots">
              {slides.map((_, index) => (
                <span key={index} className={`dot ${index === currentSlide ? "active" : ""}`} onClick={() => setCurrentSlide(index)}></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SISI KANAN (Form) */}
      <div className="login-right-panel">
        <div className="form-wrapper">
          <div className="form-header">
            <h1>Log In</h1>
            <p>Silakan masuk menggunakan akun sekolah Anda</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            {errorMsg && <div style={{color: 'red', fontSize: '0.875rem'}}>{errorMsg}</div>}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input type="text" id="username" placeholder="Masukkan username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-login">Masuk Aplikasi</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;