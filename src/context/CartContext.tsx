"use client";

import {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "UPDATE_NOTES"; payload: { id: string; notes: string } }
  | { type: "CLEAR_CART" }
  | { type: "RESTORE_CART"; payload: CartItem[] };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(1, action.payload.quantity) }
            : item
        ),
      };
    case "UPDATE_NOTES":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, notes: action.payload.notes }
            : item
        ),
      };
    case "CLEAR_CART":
      return state.items.length === 0 ? state : { ...state, items: [] };
    case "RESTORE_CART":
      return { ...state, items: action.payload, hydrated: true };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    hydrated: false,
  });

  // Load cart from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("greenpack:cart");
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        dispatch({ type: "RESTORE_CART", payload: items });
      } else {
        dispatch({ type: "RESTORE_CART", payload: [] });
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      dispatch({ type: "RESTORE_CART", payload: [] });
    }
  }, []);

  // Save cart to localStorage whenever items change (after hydration).
  useEffect(() => {
    if (state.hydrated) {
      try {
        localStorage.setItem("greenpack:cart", JSON.stringify(state.items));
      } catch (error) {
        console.error("Failed to save cart to localStorage:", error);
      }
    }
  }, [state.items, state.hydrated]);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Memoize the action creators. `dispatch` is stable, so these keep a stable
  // identity across renders — consumers that put them in effect dependency
  // arrays (e.g. checkout's payment-verify effect) won't re-fire on every
  // render.
  const addItem = useCallback(
    (item: CartItem) => dispatch({ type: "ADD_ITEM", payload: item }),
    []
  );
  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", payload: id }),
    []
  );
  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } }),
    []
  );
  const updateNotes = useCallback(
    (id: string, notes: string) =>
      dispatch({ type: "UPDATE_NOTES", payload: { id, notes } }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const value = useMemo(
    () => ({
      items: state.items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      updateNotes,
      clearCart,
    }),
    [state.items, itemCount, subtotal, addItem, removeItem, updateQuantity, updateNotes, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
