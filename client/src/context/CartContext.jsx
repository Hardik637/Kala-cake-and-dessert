import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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
  const isCartOpenRef = useRef(false);
  isCartOpenRef.current = isCartOpen;

  const isPoppingRef = useRef(false);

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
    // NOTE: Removed setIsCartOpen(true) so adding items does not auto-open the cart drawer
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

  // History-aware Cart Navigation
  const openCart = useCallback(() => {
    if (isCartOpenRef.current) return;
    setIsCartOpen(true);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ ...window.history.state, cartOpen: true }, '', window.location.href);
      } catch (e) {}
    }
  }, []);

  const closeCart = useCallback((skipHistory = false) => {
    if (!isCartOpenRef.current) return;
    setIsCartOpen(false);
    if (!skipHistory && !isPoppingRef.current && typeof window !== 'undefined') {
      try {
        if (window.history.state && window.history.state.cartOpen) {
          window.history.back();
        }
      } catch (e) {}
    }
  }, []);

  const toggleCart = useCallback(() => {
    if (isCartOpenRef.current) {
      closeCart();
    } else {
      openCart();
    }
  }, [openCart, closeCart]);

  // Synchronize cart state on browser popstate (phone back button or forward button)
  useEffect(() => {
    const handlePopState = (e) => {
      isPoppingRef.current = true;
      if (e.state && e.state.cartOpen) {
        setIsCartOpen(true);
      } else if (isCartOpenRef.current) {
        setIsCartOpen(false);
      }
      setTimeout(() => {
        isPoppingRef.current = false;
      }, 60);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      openCart,
      closeCart,
      toggleCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
