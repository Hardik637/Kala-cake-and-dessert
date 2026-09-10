import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('patisserie_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('patisserie_cart', JSON.stringify(items));
  }, [items]);

  const getItemKey = (productId, selectedVariant, selectedTopping) => {
    const varKey = selectedVariant ? (selectedVariant.id || selectedVariant.name || String(selectedVariant)) : 'default';
    const topKey = selectedTopping ? String(selectedTopping) : 'none';
    return `${productId}-${varKey}-${topKey}`;
  };

  const addToCart = (product, quantity = 1, selectedVariant = null, selectedTopping = null) => {
    if (!product || product.available === 0) return;
    const unitPrice = selectedVariant && selectedVariant.price !== undefined 
      ? Number(selectedVariant.price) 
      : Number(product.price);
    const key = getItemKey(product.id, selectedVariant, selectedTopping);

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => (item.key || item.product?.id || item.id) === key);
      if (existingIndex !== -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          key,
          product,
          quantity,
          selected_variant: selectedVariant,
          selected_topping: selectedTopping,
          unit_price: unitPrice,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (keyOrId) => {
    setItems((prev) => prev.filter((item) => (item.key !== keyOrId && item.product?.id !== keyOrId && item.id !== keyOrId)));
  };

  const updateQuantity = (keyOrId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(keyOrId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        (item.key === keyOrId || item.product?.id === keyOrId || item.id === keyOrId)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.unit_price !== undefined ? item.unit_price : Number(item.product?.price || 0)) * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      itemCount,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      toggleCart: () => setIsCartOpen((prev) => !prev)
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
