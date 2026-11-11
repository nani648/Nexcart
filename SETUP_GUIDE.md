# NexCart - Setup & Configuration Guide

## ✅ Project Status
Your NexCart project has been **fully fixed and is ready to use!**

---

## 🚀 Quick Start  .\cloudflared.exe tunnel --url http://localhost:3000 --protocol http2
  ## & cloudflared tunnel --url http://localhost:3000
  ###.\cloudflared.exe tunnel --url http://localhost:3000 --protocol http2 

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create or update your `.env.local` file with real credentials:

```env
# Database (PostgreSQL via Supabase recommended)
DATABASE_URL="postgresql://user:password@host:5432/nexcart"
DIRECT_URL="postgresql://user:password@host:5432/nexcart"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or your production URL

# Firebase (Auth & Storage)
NEXT_PUBLIC_FIREBASE_API_KEY="your_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_bucket.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Firebase Admin SDK
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your_project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudinary (Image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Razorpay (Payment gateway)
RAZORPAY_KEY_ID="your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your_public_key"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
RAZORPAY_ROUTE_ACCOUNT_NUMBER="your_account_number"

# Resend (Email service)
RESEND_API_KEY="your_api_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Upstash Redis (Rate limiting)
UPSTASH_REDIS_REST_URL="your_redis_url"
UPSTASH_REDIS_REST_TOKEN="your_redis_token"

# Shiprocket (Shipping)
SHIPROCKET_EMAIL="your_email"
SHIPROCKET_PASSWORD="your_password"

# Security
CRON_SECRET="openssl rand -base64 32"  # Generate with: openssl rand -base64 32

# Platform
PLATFORM_FEE_PERCENT="5"  # Commission percentage (0-100)
```

### 3. Setup Database

#### Option A: Using Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string and set it in `.env.local` as `DATABASE_URL`

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL locally
# macOS
brew install postgresql@15

# Linux
sudo apt-get install postgresql

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb nexcart

# Get connection string
# postgresql://localhost/nexcart
```

### 4. Initialize Prisma

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Seed database with sample data
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 📋 What's Fixed

✅ Removed duplicate Next.js config files  
✅ Fixed missing UI components (card, dialog)  
✅ Added missing type definitions  
✅ Fixed API route issues  
✅ Added lazy-loading Prisma client  
✅ Fixed build configuration  
✅ Removed unsupported Next.js options  
✅ Added environment configuration  

---

## 🔑 Essential External Services

### Firebase
- Authentication & user management
- Cloud Storage for user uploads
- Realtime database (optional)

### Razorpay
- Payment processing
- Subscription management
- Seller payouts

### Cloudinary
- Image hosting & optimization
- Product image management

### Resend
- Email notifications
- Transaction confirmations

### Upstash Redis
- Rate limiting
- Caching (optional)

### Shiprocket
- Shipping integration
- Order tracking

---

## 🧪 Testing

### Run linter
```bash
npm run lint
```

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

---

## 🚨 Common Issues & Solutions

### Issue: "Can't reach database server at localhost:5432"
**Solution:** Make sure PostgreSQL is running and `DATABASE_URL` is correct
```bash
# Check if PostgreSQL is running
pg_isready
```

### Issue: Prisma client not found
**Solution:** Regenerate Prisma client
```bash
npx prisma generate
```

### Issue: Port 3000 already in use
**Solution:** Use different port
```bash
npm run dev -- -p 3001
```

### Issue: Firebase authentication not working
**Solution:** Verify Firebase credentials and check:
- API keys are correct
- Project ID matches
- Domain is whitelisted in Firebase console

---

## 🧪 Staging Environment (test before production)

A staging environment is a second deployment of NexCart that uses its **own
database** and **own Razorpay test keys**, so you can test changes safely
without touching real customer data or moving real money.

### Setup steps

1. **Database** — create a second (free) Supabase project. Use its
   connection strings instead of production's.
2. **Razorpay** — switch the dashboard to "Test Mode" and copy the test API
   keys (they start with `rzp_test_...`). Payments made with these are
   simulated — no real money moves. Use Razorpay's published test
   card/UPI numbers to complete test checkouts.
3. **Firebase** — ideally create a second Firebase project for staging auth,
   so test accounts never mix with real users.
4. **Deploy** — create a second Vercel project (e.g. `nexcart-staging`)
   pointing at the same repo/branch, and set its environment variables from
   `.env.staging.example` (in this repo) under that project's
   Settings → Environment Variables.
5. **Redis** — use a separate Upstash Redis database for staging so its
   rate-limit counters don't affect production.

### Workflow

```
make a change → push → staging deploys automatically →
test with fake data / Razorpay test payments →
if it works, deploy the same commit to production
```

This costs nothing extra (free tiers cover a second Supabase project, Redis
database, and Vercel project) and is the single best safeguard before
shipping changes that touch orders, wallets, or payments.

---

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 💡 Tips

1. **Use `.env.local`** for sensitive data (never commit to git)
2. **Keep `.env.example`** updated for team reference
3. **Test APIs** with your real database before deploying
4. **Monitor** Razorpay and Firebase quotas
5. **Set up** GitHub Actions for CI/CD

---

## ✨ You're all set!

The project is ready for development and production deployment.

For issues or questions, check the error logs and ensure all environment variables are correctly configured.

Happy coding! 🚀
