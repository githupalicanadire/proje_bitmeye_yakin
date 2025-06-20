import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { basketService } from "../services/basketService";
import { useAuth } from "../contexts/AuthContext";
import "./CheckoutPage.css";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { getCurrentUser, getCurrentUserId, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [basket, setBasket] = useState(null);
  const [basketLoading, setBasketLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    addressLine: "",
    country: "Turkey",
    state: "",
    zipCode: "",
    cardName: "",
    cardNumber: "",
    expiration: "",
    cvv: "",
    paymentMethod: 1,
    userName: getCurrentUser(),
  });

  const fetchBasket = async () => {
    try {
      setBasketLoading(true);
      const response = await basketService.getBasket();
      setBasket(response);

      if (!response.items || response.items.length === 0) {
        setError("Sepetiniz boş. Önce ürün ekleyin.");
        setTimeout(() => {
          navigate("/products");
        }, 3000);
      }
    } catch (err) {
      console.error("❌ Checkout basket fetch error:", err);
      setError("Sepet bilgileri alınamadı");
    } finally {
      setBasketLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔄 Form submitted!");

    if (!basket || !basket.items || basket.items.length === 0) {
      setError("Sepetiniz boş. Önce ürün ekleyin.");
      return;
    }

    // Form validation
    const requiredFields = [
      "firstName",
      "lastName",
      "emailAddress",
      "addressLine",
      "state",
      "zipCode",
      "cardName",
      "cardNumber",
      "expiration",
      "cvv",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field].trim(),
    );

    if (missingFields.length > 0) {
      setError(`Lütfen şu alanları doldurun: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🛒 Starting checkout process...");

      const basketCheckout = {
        userName: formData.userName,
        customerId:
          getCurrentUserId() ||
          user?.id ||
          "00000000-0000-0000-0000-000000000000",
        totalPrice: basket.totalPrice,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        emailAddress: formData.emailAddress.trim(),
        addressLine: formData.addressLine.trim(),
        country: formData.country.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        cardName: formData.cardName.trim(),
        cardNumber: formData.cardNumber.replace(/\s/g, ""),
        expiration: formData.expiration.trim(),
        cvv: formData.cvv.trim(),
        paymentMethod: formData.paymentMethod,
      };

      console.log("💳 Checkout data:", basketCheckout);

      // DİREKT API ÇAĞRISI - BAM BAM BAM!
      const token = localStorage.getItem("access_token");
      console.log("🔑 Token:", token ? token.substring(0, 50) + "..." : "NO TOKEN");

      const checkoutData = {
        BasketCheckoutDto: {
          userName: "",
          customerId: "00000000-0000-0000-0000-000000000000",
          totalPrice: basketCheckout.totalPrice,
          firstName: basketCheckout.firstName,
          lastName: basketCheckout.lastName,
          emailAddress: basketCheckout.emailAddress,
          addressLine: basketCheckout.addressLine,
          country: basketCheckout.country,
          state: basketCheckout.state,
          zipCode: basketCheckout.zipCode,
          cardName: basketCheckout.cardName,
          cardNumber: basketCheckout.cardNumber,
          expiration: basketCheckout.expiration,
          cvv: basketCheckout.cvv,
          paymentMethod: basketCheckout.paymentMethod,
        },
      };

      console.log("🎯 Making DIRECT API call to: http://localhost:6004/basket-service/basket/checkout");
      console.log("🎯 Request data:", checkoutData);

      const response = await fetch("http://localhost:6004/basket-service/basket/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(checkoutData),
      });

      console.log("🎯 Response status:", response.status);
      console.log("🎯 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🎯 Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Checkout result:", result);

      // Store checkout data for confirmation page
      sessionStorage.setItem(
        "lastOrder",
        JSON.stringify({
          orderNumber: `TOY-${Date.now()}`,
          totalPrice: basket.totalPrice,
          itemCount: basket.items.reduce((sum, item) => sum + item.quantity, 0),
          customerName: `${formData.firstName} ${formData.lastName}`,
        }),
      );

      navigate("/confirmation");
    } catch (err) {
      console.error("❌ Checkout error:", err);
      setError(`Sipariş tamamlanırken hata oluştu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBasket();
  }, []);

  if (basketLoading) {
    return <div className="loading">🛒 Sepet bilgileri yükleniyor... ✨</div>;
  }

  return (
    <div className="checkout-page">
      <div className="page-header">
        <h1>🎉 Siparişi Tamamla 🛒</h1>
      </div>

      {basket && basket.items && basket.items.length > 0 && (
        <div className="checkout-summary">
          <h3>📋 Sipariş Özeti</h3>
          <div className="summary-items">
            {basket.items.map((item, index) => (
              <div key={index} className="summary-item">
                <span>{item.productName}</span>
                <span>{item.quantity} adet</span>
                <span>${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-total">
            <strong>Toplam: ${basket.totalPrice.toFixed(2)}</strong>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="checkout-form">
        <div className="form-sections">
          <div className="form-section">
            <h2>🏠 Teslimat Bilgileri</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Ad</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Soyad</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="emailAddress">E-posta</label>
              <input
                type="email"
                id="emailAddress"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="addressLine">Adres</label>
              <input
                type="text"
                id="addressLine"
                name="addressLine"
                value={formData.addressLine}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="country">Ülke</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">Şehir</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">Posta Kodu</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>💳 Ödeme Bilgileri</h2>
            <div className="form-group">
              <label htmlFor="cardName">Kart Sahibi Adı</label>
              <input
                type="text"
                id="cardName"
                name="cardName"
                value={formData.cardName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cardNumber">Kart Numarası</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                placeholder="1234 5678 9012 3456"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiration">Son Kullanma</label>
                <input
                  type="text"
                  id="expiration"
                  name="expiration"
                  value={formData.expiration}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">Hata: {error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/cart")}
          >
            ⬅️ Sepete Dön
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "🎁 Sipariş Veriliyor..." : "🎉 Sipariş Ver"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
