import axios from "axios";

// API Gateway base URL - development için direct, production için proxy
const API_BASE_URL = process.env.NODE_ENV === "production" 
    ? "/api" 
    : "http://localhost:6004"; // API Gateway port

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        console.log(`🌐 Making request to: ${config.baseURL}${config.url}`);

        // Add JWT token if available
        const token = localStorage.getItem("access_token");
        if (token) {
            // Debug: Check token format
            console.log("🔑 Using token:", token.substring(0, 50) + "...");

            // Check if token has proper JWT format
            const parts = token.split(".");
            if (parts.length !== 3) {
                console.error("❌ Invalid JWT format. Expected 3 parts, got:", parts.length);
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                return config;
            }

            config.headers.Authorization = `Bearer ${token}`;
            console.log("✅ Authorization header set");
        } else {
            console.log("⚠️ No access token found in localStorage");
        }

        return config;
    },
    (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
    },
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log("✅ API Response:", response.status, response.config.url);
        return response;
    },
    (error) => {
        console.error("🔴 API Error:", error);

        let errorMessage = "Bir hata oluştu";

        if (error.response) {
            const { status, data } = error.response;
            console.error("Response data:", data);
            console.error("Response status:", status);

            switch (status) {
                case 400:
                    errorMessage = data?.message || "Geçersiz istek";
                    break;
                case 401:
                    errorMessage = "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.";
                    // Clear auth data
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("refresh_token");
                    // Redirect to login
                    if (!window.location.pathname.includes("/login")) {
                        window.location.href = "/login";
                    }
                    break;
                case 403:
                    errorMessage = "Bu işlem için yetkiniz yok";
                    break;
                case 404:
                    errorMessage = "İstenen kaynak bulunamadı";
                    break;
                case 500:
                    errorMessage = "Sunucu hatası";
                    break;
                default:
                    errorMessage = data?.message || data?.title || `HTTP ${status} hatası`;
            }
        } else if (error.request) {
            console.error("No response received:", error.request);
            errorMessage = "Sunucuya bağlanılamıyor";
        } else {
            console.error("Error message:", error.message);
            errorMessage = error.message;
        }

        const enhancedError = new Error(errorMessage);
        enhancedError.originalError = error;

        return Promise.reject(enhancedError);
    },
);

export default api;
