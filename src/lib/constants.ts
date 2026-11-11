export const APP_NAME = "NexCart";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nexcart.vercel.app";

export const CATEGORY_PREFIXES: Record<string, string> = {
  electronics: "TECH",
  fashion:     "FASH",
  "home-living": "HOME",
  books:       "BOOK",
  sports:      "SPRT",
  beauty:      "BEAU",
  toys:        "TOYS",
  automotive:  "AUTO",
  garden:      "GRDN",
  jewellery:   "JEWL",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:    "Pending",
  CONFIRMED:  "Confirmed",
  PROCESSING: "Processing",
  SHIPPED:    "Shipped",
  DELIVERED:  "Delivered",
  CANCELLED:  "Cancelled",
  REFUNDED:   "Refunded",
};

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

export const MAX_PRODUCT_IMAGES = 8;
export const DEFAULT_PAGE_SIZE = 20;
