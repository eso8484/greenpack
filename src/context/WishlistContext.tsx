"use client";

import { createContext, useReducer, useEffect, ReactNode } from "react";
import { Shop, Product } from "@/types";

export type WishlistItemType = "shop" | "product";

export interface WishlistItem {
  id: string;
  type: WishlistItemType;
  data: Shop | Product;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
}

type WishlistAction =
  | { type: "ADD_ITEM"; payload: WishlistItem }
  | { type: "REMOVE_ITEM"; payload: { id: string; type: WishlistItemType } }
  | { type: "CLEAR_WISHLIST" }
  | { type: "LOAD_WISHLIST"; payload: WishlistItem[] };

const WishlistContext = createContext<{
  state: WishlistState;
  dispatch: React.Dispatch<WishlistAction>;
} | null>(null);

function wishlistReducer(
  state: WishlistState,
  action: WishlistAction
): WishlistState {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.items.some(
        (item) =>
          item.id === action.payload.id && item.type === action.payload.type
      );
      if (exists) return state;
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }
    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter(
          (item) =>
            !(item.id === action.payload.id && item.type === action.payload.type)
        ),
      };
    }
    case "CLEAR_WISHLIST": {
      return {
        ...state,
        items: [],
      };
    }
    case "LOAD_WISHLIST": {
      return {
        ...state,
        items: action.payload,
      };
    }
    default:
      return state;
  }
}

const WISHLIST_STORAGE_KEY = "greenpack_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      try {
        const items = JSON.parse(stored);
        dispatch({ type: "LOAD_WISHLIST", payload: items });
      } catch (error) {
        console.error("Failed to load wishlist:", error);
      }
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  return (
    <WishlistContext.Provider value={{ state, dispatch }}>
      {children}
    </WishlistContext.Provider>
  );
}

export default WishlistContext;
