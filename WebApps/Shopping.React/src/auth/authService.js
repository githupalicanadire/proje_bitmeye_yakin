// OIDC yerine direct JWT authentication kullanın
class AuthService {
    constructor() {
        this.apiUrl = "http://localhost:6007/api";
    }

    async login(username, password) {
        try {
            console.log("🔐 Starting login process...");

            const response = await fetch(`${this.apiUrl}/account/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("❌ Login failed:", error);
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            console.log("✅ Login successful:", data);
            
            // Store token and user data
            localStorage.setItem('access_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            console.log("🚪 Logging out...");
            
            const token = localStorage.getItem('access_token');
            if (token) {
                // Notify backend about logout
                await fetch(`${this.apiUrl}/account/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }).catch(() => {}); // Ignore errors
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            localStorage.removeItem('refresh_token');
        }
    }

    getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    getAccessToken() {
        return localStorage.getItem('access_token');
    }

    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            // Check if token is expired
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
                console.log("⏰ Token expired, clearing session");
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error("❌ Token validation error:", error);
            this.logout();
            return false;
        }
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error("No refresh token available");
            }

            const response = await fetch(`${this.apiUrl}/account/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                throw new Error("Token refresh failed");
            }

            const data = await response.json();
            
            // Update stored tokens
            localStorage.setItem('access_token', data.token);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            
            console.log("✅ Token refreshed successfully");
            return true;
        } catch (error) {
            console.error("❌ Token refresh failed:", error);
            this.logout();
            return false;
        }
    }
}

export const authService = new AuthService(); 