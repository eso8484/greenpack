import { useContext } from "react";
import WishlistContext, {
  WishlistItemType,
} from "@/context/WishlistContext";
import { Shop, Product } from "@/types";

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  const { state, dispatch } = context;

  const addToWishlist = (
    id: string,
    type: WishlistItemType,
    data: Shop | Product
  ) => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id,
        type,
        data,
        addedAt: new Date().toISOString(),
      },
    });
  };

  const removeFromWishlist = (id: string, type: WishlistItemType) => {
    dispatch({
      type: "REMOVE_ITEM",
      payload: { id, type },
    });
  };

  const isInWishlist = (id: string, type: WishlistItemType): boolean => {
    return state.items.some((item) => item.id === id && item.type === type);
  };

  const toggleWishlist = (
    id: string,
    type: WishlistItemType,
    data: Shop | Product
  ) => {
    if (isInWishlist(id, type)) {
      removeFromWishlist(id, type);
    } else {
      addToWishlist(id, type, data);
    }
  };

  const clearWishlist = () => {
    dispatch({ type: "CLEAR_WISHLIST" });
  };

  return {
    items: state.items,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
    wishlistCount: state.items.length,
  };
}
