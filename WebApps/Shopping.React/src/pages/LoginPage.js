import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./LoginPage.css";

const LoginPage = () => {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { login, error: authError, clearError } = useAuth();
    const navigate = useNavigate();
  const location = useLocation();

    // Get redirect path from location state or default to home
    const from = location.state?.from?.pathname || "/";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (error || authError) {
            setError("");
            clearError();
        }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
        setLoading(true);
    setError("");

    try {
            console.log("🔐 Attempting login...");
            const result = await login(formData.username, formData.password);

      if (result.success) {
        console.log("✅ Login successful, redirecting to:", from);
        navigate(from, { replace: true });
      } else {
        setError(result.message || "Giriş başarısız");
      }
    } catch (error) {
            console.error("❌ Login error:", error);
            setError(error.message || "Giriş sırasında bir hata oluştu");
    } finally {
            setLoading(false);
    }
  };

    const handleDemoLogin = async (demoType) => {
        setLoading(true);
        setError("");

        const demoCredentials = {
            admin: { username: "admin", password: "Admin123!" },
            customer: { username: "swn", password: "Password123!" },
        };

        const credentials = demoCredentials[demoType];
        if (!credentials) {
            setError("Geçersiz demo hesabı");
            setLoading(false);
            return;
        }

        setFormData(credentials);

        try {
            console.log(`🔐 Attempting ${demoType} demo login...`);
            const result = await login(credentials.username, credentials.password);

            if (result.success) {
                console.log("✅ Demo login successful, redirecting to:", from);
                navigate(from, { replace: true });
            } else {
                setError(result.message || "Demo giriş başarısız");
            }
        } catch (error) {
            console.error("❌ Demo login error:", error);
            setError(error.message || "Demo giriş sırasında bir hata oluştu");
        } finally {
            setLoading(false);
  }
    };

  return (
      <div className="login-container">
            <div className="login-card">
        <div className="login-header">
                    <h1>🔐 Giriş Yap</h1>
                    <p>ToyLand Alışveriş Uygulaması</p>
        </div>

                <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
              required
                            disabled={loading}
                            placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
              required
                            disabled={loading}
                            placeholder="Şifrenizi girin"
            />
          </div>

                    {(error || authError) && (
                        <div className="error-message">
                            ❌ {error || authError}
                        </div>
                    )}

          <button
            type="submit"
                        className="login-button"
                        disabled={loading}
          >
                        {loading ? "🔄 Giriş yapılıyor..." : "🔐 Giriş Yap"}
          </button>
        </form>

                <div className="demo-section">
                    <h3>🧪 Demo Hesaplar</h3>
                    <p>Test için aşağıdaki hesapları kullanabilirsiniz:</p>
                    
                    <div className="demo-buttons">
                        <button
                            onClick={() => handleDemoLogin("admin")}
                            disabled={loading}
                            className="demo-button admin"
                        >
                            👑 Admin Girişi
                        </button>
                        <button
                            onClick={() => handleDemoLogin("customer")}
                            disabled={loading}
                            className="demo-button customer"
                        >
                            👤 Müşteri Girişi
                        </button>
                    </div>

                    <div className="demo-info">
                        <div className="demo-account">
                            <strong>Admin:</strong> admin / Admin123!
                        </div>
                        <div className="demo-account">
                            <strong>Müşteri:</strong> swn / Password123!
                        </div>
                    </div>
                </div>

        <div className="login-footer">
          <p>
            Hesabınız yok mu?{" "}
                        <button
                            onClick={() => navigate("/register")}
                            className="link-button"
                        >
                            Kayıt Ol
                        </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
