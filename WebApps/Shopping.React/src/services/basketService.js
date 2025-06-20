import api from "./api";

const basketService = {
  // Get current user's basket (using JWT authentication)
  getBasket: async () => {
    try {
      console.log(`🛒 Fetching current user's basket via JWT...`);

      // Check if token exists before making request
      const token = localStorage.getItem("access_token");
      console.log("🔑 Token exists:", !!token);
      if (token) {
        console.log("🔑 Token preview:", token.substring(0, 50) + "...");
      }

      const response = await api.get(`/basket-service/basket`);

      // Backend GetBasketResponse formatında { cart: ShoppingCart } döner
      const basket = response.data.cart || response.data;

      // Backend'den gelen basket formatını normalize et
      return {
        userName: basket.userName || "",
        items: basket.items || [],
        totalPrice: basket.totalPrice || 0,
      };
    } catch (error) {
      console.error("❌ Get basket error:", error);

      // Eğer basket bulunamazsa (404), boş basket döndür
      if (error.response?.status === 404) {
        console.log("📦 Creating new empty basket for current user");
        return {
          userName: "", // Backend will set from JWT
          items: [],
          totalPrice: 0,
        };
      }

      throw error;
    }
  },

  // Store/Update basket
  storeBasket: async (basket) => {
    try {
      console.log("💾 Storing basket:", basket);

      // Backend'in beklediği StoreBasketRequest format
      // Note: Backend will set userName from JWT claims
      const basketData = {
        cart: {
          userName: "", // Backend will override this with JWT claims
          items: basket.items.map((item) => ({
            quantity: item.quantity,
            color: item.color || "Default",
            price: item.price,
            productId: item.productId,
            productName: item.productName,
          })),
        },
      };

      const response = await api.post("/basket-service/basket", basketData);
      return response.data;
    } catch (error) {
      console.error("❌ Store basket error:", error);
      throw error;
    }
  },

  // Delete current user's basket (using JWT authentication)
  deleteBasket: async () => {
    try {
      console.log(`🗑️ Deleting current user's basket via JWT...`);
      const response = await api.delete(`/basket-service/basket`);
      return response.data;
    } catch (error) {
      console.error("❌ Delete basket error:", error);
      throw error;
    }
  },

  // Checkout basket
  checkoutBasket: async (basketCheckout) => {
    try {
      console.log("🎯 Checking out basket:", basketCheckout);

      // Backend'in beklediği CheckoutBasketRequest formatı
      // Note: Backend will set userName and customerId from JWT claims
      const checkoutData = {
        BasketCheckoutDto: {
          userName: "", // Backend will override with JWT claims
          customerId: "00000000-0000-0000-0000-000000000000", // Backend will override with JWT claims
          totalPrice: basketCheckout.totalPrice,

          // Shipping Address
          firstName: basketCheckout.firstName,
          lastName: basketCheckout.lastName,
          emailAddress: basketCheckout.emailAddress,
          addressLine: basketCheckout.addressLine,
          country: basketCheckout.country,
          state: basketCheckout.state,
          zipCode: basketCheckout.zipCode,

          // Payment
          cardName: basketCheckout.cardName,
          cardNumber: basketCheckout.cardNumber,
          expiration: basketCheckout.expiration,
          cvv: basketCheckout.cvv,
          paymentMethod: basketCheckout.paymentMethod || 1,
        },
      };

      console.log("🎯 Sending checkout data:", checkoutData);

      const response = await api.post(
        "/basket-service/basket/checkout",
        checkoutData,
      );
      
      console.log("✅ Checkout response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Checkout basket error:", error);
      throw error;
    }
  },

  // Add item to current user's basket (using JWT authentication)
  addItemToBasket: async (item) => {
    try {
      console.log(`➕ Adding item to current user's basket:`, item);

      // Önce mevcut basket'i al (JWT kullanarak)
      const currentBasket = await basketService.getBasket();

      // Item'ı basket'e ekle veya miktarını artır
      const existingItemIndex = currentBasket.items.findIndex(
        (basketItem) => basketItem.productId === item.productId,
      );

      if (existingItemIndex >= 0) {
        // Mevcut item'ın miktarını artır
        currentBasket.items[existingItemIndex].quantity += item.quantity || 1;
        currentBasket.items[existingItemIndex].price =
          currentBasket.items[existingItemIndex].quantity * item.unitPrice;
      } else {
        // Yeni item ekle
        currentBasket.items.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity || 1,
          price: (item.quantity || 1) * item.unitPrice,
          color: item.color || "Default",
        });
      }

      // Toplam fiyatı hesapla
      currentBasket.totalPrice = currentBasket.items.reduce(
        (total, basketItem) => total + basketItem.price,
        0,
      );

      // Güncellenmiş basket'i kaydet
      return await basketService.storeBasket(currentBasket);
    } catch (error) {
      console.error("❌ Add item to basket error:", error);
      throw error;
    }
  },
};

// Debug: Log the service when it's loaded
console.log("🔧 basketService loaded:", basketService);
console.log("🔧 basketService.checkoutBasket:", basketService.checkoutBasket);

export { basketService };
