import type { Seller, Product, Order, Category } from "@prisma/client";

export type ProductWithSeller = Product & {
  seller: Pick<Seller, "sellerId" | "storeName">;
  category?: Pick<Category, "name" | "slug"> | null;
};

export type OrderWithItems = Order & {
  items: OrderItemExpanded[];
};

export interface OrderItemExpanded {
  id: string;
  quantity: number;
  price: number;
  status: string;
  product: Pick<Product, "name" | "images" | "productId">;
  seller: Pick<Seller, "storeName" | "sellerId">;
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CartItemLocal {
  productId: string;
  sellerId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  storeName: string;
  variantId?: string;
}

export interface ProductCard {
  id: string;
  productId: string;
  name: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  images: string[];
  rating: number;
  reviews: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  condition?: string | null;
  deliveryInfo?: string | null;
  cardDesign?: string | null;
  cardFont?: string | null;
  cardDisplayText?: string | null;
  cardBorderColor?: string | null;
  cardImagePosition?: string | null;
  cardImageAutoSlide?: boolean | null;
  variants?: {
    id: string;
    name: string;
    value: string;
    price?: number | null;
    stock: number;
  }[];
  seller: {
    sellerId: string;
    storeName: string;
  };
}
