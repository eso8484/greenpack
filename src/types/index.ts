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

// === AUTH / PROFILE ===
export type UserRole = "customer" | "vendor" | "courier" | "admin";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

// === ORDER ===
export type OrderStatus = "pending" | "confirmed" | "processing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  total_amount: number;
  customer_info: CustomerInfo;
  needs_delivery: boolean;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  shop_id: string;
  item_type: "product" | "service";
  item_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

// === COURIER & DELIVERY ===
export type VehicleType = "bike" | "car" | "bicycle";
export type DeliveryStatus = "pending" | "assigned" | "picking_up" | "at_shop" | "returning" | "delivered" | "cancelled";

export interface Courier {
  id: string;
  vehicle_type: VehicleType;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  current_lat?: number;
  current_lng?: number;
  nin?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  area_of_operation?: string;
  availability_hours?: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  courier_id?: string;
  status: DeliveryStatus;
  pickup_address: {
    address: string;
    city?: string;
    instructions?: string;
  };
  shop_address?: {
    address: string;
    city?: string;
  };
  delivery_address: {
    address: string;
    city?: string;
    instructions?: string;
  };
  courier_fee: number;
  items_description?: string;
  special_instructions?: string;
  pickup_time?: string;
  estimated_return_time?: string;
  completed_at?: string;
  created_at: string;
}

// === NOTIFICATION ===
export type NotificationType = "info" | "order" | "delivery" | "review" | "system";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// === FAQ / HELP CENTER ===
export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
}

export interface FAQItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  keywords: string[];
}

// === SUPPORT ===
export type SupportTicketStatus = "open" | "queued" | "assigned" | "resolved" | "closed";
export type SupportChannel = "web_chat" | "whatsapp" | "email" | "phone";
export type SupportPriority = "low" | "normal" | "high" | "urgent";
export type SupportMessageSender = "customer" | "assistant" | "agent" | "system";

export interface SupportTicket {
  id: string;
  customer_id: string;
  order_id?: string | null;
  status: SupportTicketStatus;
  channel: SupportChannel;
  priority: SupportPriority;
  issue_summary: string;
  assigned_agent_name?: string | null;
  metadata?: Record<string, unknown>;
  assigned_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: SupportMessageSender;
  sender_id?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
