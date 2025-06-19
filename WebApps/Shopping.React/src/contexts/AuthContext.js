import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../auth/authService.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔐 Starting login process...");
      const result = await authService.login(username, password);
      
      if (result.success) {
        setUser(result.user);
        console.log("✅ Login successful for:", result.user.username);
        return { success: true, user: result.user };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("❌ Login failed:", error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      console.log("🚪 Logging out...");
      await authService.logout();
      setUser(null);
      setError(null);
      navigate("/");
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  }, [navigate]);

  // Check authentication status
  const isAuthenticated = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  // Get current user info
  const getCurrentUser = useCallback(() => {
    return user?.fullName || user?.username || authService.getUser()?.fullName || authService.getUser()?.username || null;
  }, [user]);

  const getCurrentUserId = useCallback(() => {
    return user?.id || authService.getUser()?.id || null;
  }, [user]);

  const getUserRoles = useCallback(() => {
    return user?.roles || authService.getUser()?.roles || [];
  }, [user]);

  const hasRole = useCallback(
    (role) => {
      return getUserRoles().includes(role);
    },
    [getUserRoles],
  );

  const getAccessToken = useCallback(() => {
    return authService.getAccessToken();
  }, []);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        if (authService.isAuthenticated()) {
          const currentUser = authService.getUser();
          setUser(currentUser);
          console.log("✅ User session restored:", currentUser?.username);
        } else {
          console.log("ℹ️ No valid session found");
          setUser(null);
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value = {
    // State
    user,
    loading,
    error,

    // Actions
    login,
    logout,

    // Getters
    isAuthenticated,
    getCurrentUser,
    getCurrentUserId,
    getUserRoles,
    hasRole,
    getAccessToken,

    // Utilities
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
