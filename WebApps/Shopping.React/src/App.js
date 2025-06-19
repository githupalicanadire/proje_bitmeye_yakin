import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext.js";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import TokenDebug from "./components/TokenDebug";
import AdminPanel from "./components/AdminPanel";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DebugPage from "./pages/DebugPage";
import JwtDebugPage from "./pages/JwtDebugPage";
import AuthDebugPage from "./pages/AuthDebugPage";
import CallbackPage from "./pages/CallbackPage";

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <TokenDebug />
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/callback" element={<CallbackPage />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confirmation"
              element={
                <ProtectedRoute>
                  <ConfirmationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            {/* User profile routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div className="container mt-4">
                    <h2>👤 Kullanıcı Profili</h2>
                    <p>Profil sayfası geliştirme aşamasında...</p>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <div className="container mt-4">
                    <h2>⚙️ Ayarlar</h2>
                    <p>Ayarlar sayfası geliştirme aşamasında...</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            {/* Debug routes - development only */}
            {process.env.NODE_ENV === "development" && (
              <>
                <Route
                  path="/debug"
                  element={
                    <ProtectedRoute>
                      <DebugPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jwt-debug"
                  element={
                    <ProtectedRoute>
                      <JwtDebugPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/auth-debug" element={<AuthDebugPage />} />
              </>
            )}

            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
