# NexCart Software Requirements Document (SRD)

## 1. Project Overview

NexCart is a multi-vendor e-commerce marketplace application built with Next.js 14 using the App Router and TypeScript. It supports four user roles: `CUSTOMER`, `SELLER`, `ADMIN`, and `DELIVERY_AGENT`.

The project includes storefront functionality, seller onboarding and management, admin controls, delivery agent workflows, payment processing, shipping integration, email notifications, and a relational database backend.

## 2. Purpose

This document captures the functional and non-functional software requirements for the NexCart application as implemented in the codebase.

## 3. Technology Stack

- Frontend / backend framework: `Next.js 14` (App Router)
- Language: `TypeScript`
- Styling: `Tailwind CSS`
- Database: `PostgreSQL` via `Prisma`
- Authentication: `Firebase Auth`
- Image hosting: `Cloudinary`
- Payment gateway: `Razorpay`
- Shipping/courier integration: `Shiprocket`
- Email delivery: `Resend`
- Rate limiting / caching (optional): `Upstash Redis`
- PWA support: `@ducanh2912/next-pwa`

## 4. Actors

- `CUSTOMER`
- `SELLER`
- `ADMIN`
- `DELIVERY_AGENT`

## 5. Functional Requirements

### 5.1 User Management

- Users must register and sign in via Firebase Authentication.
- Users have roles and profile metadata, including email verification status, avatar, phone, and addresses.
- Sellers can register and provide store details, GSTIN, bank account information, and pickup options.
- Delivery agents can access delivery-specific dashboards and accept delivery assignments.

### 5.2 Product Catalog

- Support product listings with variants, categories, offers, and collections.
- Support product condition states: `ORIGINAL`, `REFURBISHED`, `BOX_OPEN`.
- Support search and autocomplete functionality.
- Support product details pages and seller storefront pages.

### 5.3 Cart and Checkout

- Customers can add variants to cart, update quantities, and remove items.
- Customers can maintain a wishlist.
- Checkout includes address selection and order placement.
- Order total calculation includes discounts, taxes, and shipping.

### 5.4 Orders

- Orders belong to customers and reference sellers via order items.
- Orders support statuses: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`.
- Order delivery method may be `SELF`, `COURIER`, or `PICKUP`.
- Orders track payment status as `PENDING`, `SUCCESS`, `FAILED`, or `REFUNDED`.
- Order delivery tracking and invoice generation are supported.

### 5.5 Payments

- Razorpay integration for order payment creation and verification.
- Server-side validation of order amounts before creating Razorpay orders.
- Webhook processing for payment capture and order status updates.
- Support subscription plans: `TRIAL`, `MONTHLY`, `HALF_YEARLY`, `YEARLY`.
- Support subscription statuses: `ACTIVE`, `EXPIRED`, `CANCELLED`, `PENDING`.

### 5.6 Payouts and Seller Wallet

- The system calculates seller payouts net of platform commission percentages.
- Payout records are created and processed via Razorpay Route.
- `Payout` uniqueness is enforced by seller and order to avoid duplicates.
- Sellers have wallet balance, transactions, and payout history.

### 5.7 Returns and Refunds

- Customers can request returns with reasons such as defective, wrong item, not as described, damaged, change of mind, or other.
- Return requests have statuses: `REQUESTED`, `APPROVED`, `REJECTED`, `REFUNDED`.
- Return eligibility is computed from delivery timestamp or order update date.
- Refund and stock restoration are handled appropriately when returns are approved and processed.

### 5.8 Reviews and Q&A

- Customers can create product reviews and ask product questions.
- Sellers can reply to questions.
- Reviews can receive votes, and seller replies are linked.

### 5.9 Admin Functions

- Admin dashboard manages seller approvals, products, orders, payouts, returns, and analytics.
- Admin can approve or reject sellers and monitor seller status.

### 5.10 Delivery Agent Workflow

- Delivery agents can view assigned orders and track delivery status.
- The system supports delivery status transitions: `PENDING`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `PACKED`, `READY_FOR_PICKUP`, `PICKED_UP`.

### 5.11 Notifications and Messaging

- The system sends notifications on order updates, shipping updates, low stock, subscription reminders, seller approvals, returned orders, new reviews, and other events.
- Firebase Cloud Messaging tokens are stored for real-time notifications.
- Email notifications are sent via Resend.

### 5.12 Image Upload and Media

- Product and seller images are uploaded to Cloudinary.
- Remote image URLs are allowed for Cloudinary, Unsplash, Google user content, Firebase Storage, and placeholder services.

### 5.13 Additional Use Cases

- Gift registry support.
- Store follows and seller ratings.
- Coupons and seller offers.
- Seller gallery and highlights.
- PWA manifest and offline support.

## 6. Data Requirements

### 6.1 Database Models

The Prisma schema defines models for:
- `User`, `Seller`, `DeliveryAgent`
- `Product`, `ProductVariant`, `ProductType`, `ProductSpecification`, `ProductQA`
- `Category`, `StoreCollection`
- `Order`, `OrderItem`, `Payment`, `Payout`, `SellerTransaction`
- `Cart`, `CartItem`, `Wishlist`, `WishlistItem`, `Address`
- `Review`, `ReviewVote`, `SellerRating`
- `Return`, `ReturnItem`
- `Coupon`, `SellerOffer`
- `Notification`, `FcmToken`
- `GiftRegistry`, `StoreFollow`
- `SellerBankAccount`

### 6.2 Key Business Rules

- `User.email` and `User.firebaseUid` are unique.
- `Seller.sellerId` and `Seller.userId` are unique.
- Payouts are unique by `sellerId` and `orderId`.
- Coupons must not discount more than the order total.
- Product stock updates are concurrency-safe and prevent overselling.
- Returns use delivery or update timestamps to compute eligibility.

## 7. External Dependencies and Integrations

### 7.1 Database

- PostgreSQL database via Prisma.
- Recommended hosting: Supabase, though any PostgreSQL-compatible provider works.

### 7.2 Authentication

- Firebase Authentication for user login.
- Firebase Admin SDK for server-side token verification and auth operations.

### 7.3 Payments

- Razorpay for payments and payout routing.
- Webhook support for payment capture events.

### 7.4 Shipping

- Shiprocket for courier assignment, shipment creation, tracking, and label generation.

### 7.5 Media Storage

- Cloudinary for image uploads and storage.

### 7.6 Email

- Resend for transactional email delivery.

### 7.7 Rate Limiting / Cache

- Optional Upstash Redis for rate limiting.

## 8. Non-functional Requirements

### 8.1 Performance

- Image caching and optimization through Next.js remote image patterns.
- Static asset caching for `_next/static` and icon assets.

### 8.2 Security

- HTTP security headers set globally for all pages and API routes.
- Webhooks verify signatures when required.
- Cron routes require a secret bearer token.
- Production environment must disable non-production Firebase auth fallback.

### 8.3 Reliability

- Health check endpoint verifies database connectivity.
- Prisma client is initialized safely with a singleton pattern.
- Webhook duplicate processing is prevented at the database level where applicable.

### 8.4 Maintainability

- Code is organized by route group and feature area.
- Zod schemas validate API inputs.
- Third-party integration clients are isolated in `src/lib`.

## 9. Environment and Deployment Requirements

### 9.1 Required Environment Variables

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_ROUTE_ACCOUNT_NUMBER`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SHIPROCKET_EMAIL`
- `SHIPROCKET_PASSWORD`
- `CRON_SECRET`
- `PLATFORM_FEE_PERCENT`

### 9.2 Build and Run Commands

- `npm install`
- `npx prisma generate`
- `npx prisma db push`
- `npm run dev`
- `npm run build`
- `npm start`

## 10. Constraints and Assumptions

- The application assumes `Firebase Auth` is the primary auth provider.
- Razorpay keys and webhook secrets must be present for payment flows.
- Shiprocket requires a configured pickup location named `Primary` in the dashboard.
- Upstash rate limiting is optional but recommended for production abuse protection.
- A fresh database deployment should reconcile Prisma migration history with `schema.prisma` before use.

## 11. Summary

NexCart is implemented as a full-featured multi-vendor marketplace with product catalog, checkout, order tracking, payments, payouts, seller store management, admin controls, delivery agent support, returns, reviews, email notifications, and image upload support.

The codebase is structured around Next.js app routes and includes integrations for Firebase, Prisma/PostgreSQL, Razorpay, Cloudinary, Resend, Shiprocket, and optional Upstash Redis. Production readiness depends on configuring the required environment variables and rotating any exposed secrets.
