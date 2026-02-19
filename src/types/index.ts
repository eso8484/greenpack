// === CATEGORY ===
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  shopCount: number;
}

// === SHOP / VENDOR ===
export interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  owner: string;
  rating: number;
  reviewCount: number;
  location: {
    address: string;
    city: string;
    state: string;
  };
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
  };
  hours: {
    open: string;
    close: string;
    days: string;
  };
  images: {
    thumbnail: string;
    banner: string;
    gallery: string[];
  };
  video: {
    url: string;
    thumbnail: string;
  };
  tags: string[];
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: string;
}

// === SERVICE ===
export interface Service {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  priceType: "fixed" | "starting_from" | "per_hour" | "negotiable";
  duration?: string;
  categoryId: string;
  image?: string;
  isAvailable: boolean;
}

// === PRODUCT ===
export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  categoryId: string;
  inStock: boolean;
  quantity?: number;
}

// === REVIEW ===
export interface Review {
  id: string;
  shopId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  date: string;
}

// === CART ===
export type CartItemType = "product" | "service";

export interface CartItem {
  id: string;
  type: CartItemType;
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

// === CHECKOUT ===
export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  message?: string;
}

// === SEARCH & FILTER ===
export interface SearchFilters {
  query: string;
  categoryId: string | null;
  sortBy: "relevance" | "rating" | "price_low" | "price_high" | "newest";
  verifiedOnly: boolean;
}

// === SELLER ===
export interface SellerUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  shopId?: string;
  avatar?: string;
}

export interface DashboardStats {
  totalViews: number;
  totalOrders: number;
  revenue: number;
  averageRating: number;
}
