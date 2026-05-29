/**
 * Cart Context — Shopping cart for POS billing
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem } from '@/database/repositories';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateDiscount: (productId: number, discount: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  overallDiscount: number;
  setOverallDiscount: (d: number) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  updateDiscount: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  totalTax: 0,
  grandTotal: 0,
  overallDiscount: 0,
  setOverallDiscount: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState(0);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.currentStock) }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.currentStock)) }
          : i
      )
    );
  }, []);

  const updateDiscount = useCallback((productId: number, discount: number) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, discount: Math.max(0, discount) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setOverallDiscount(0);
  }, []);

  // Calculate totals
  let subtotal = 0;
  let totalTax = 0;
  for (const item of items) {
    const lineBase = item.unitPrice * item.quantity - item.discount;
    subtotal += lineBase;
    totalTax += (lineBase * item.gstRate) / 100;
  }
  const grandTotal = subtotal + totalTax - overallDiscount;
  const totalItems = items.reduce((a, i) => a + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, updateDiscount, clearCart,
      totalItems, subtotal, totalTax, grandTotal, overallDiscount, setOverallDiscount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
