import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed categories
  const categories = [
    { name: "Electronics", slug: "electronics", image: "💻" },
    { name: "Fashion", slug: "fashion", image: "👗" },
    { name: "Home & Kitchen", slug: "home-kitchen", image: "🏠" },
    { name: "Books", slug: "books", image: "📚" },
    { name: "Sports & Fitness", slug: "sports-fitness", image: "⚽" },
    { name: "Beauty & Personal Care", slug: "beauty", image: "💄" },
    { name: "Toys & Games", slug: "toys-games", image: "🧸" },
    { name: "Garden & Outdoors", slug: "garden-outdoors", image: "🌱" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }

  // Seed coupons
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    create: {
      code: "WELCOME10",
      discountType: "percentage",
      discount: 10,
      minOrder: 500,
      isActive: true,
    },
    update: {},
  });

  await prisma.coupon.upsert({
    where: { code: "FLAT100" },
    create: {
      code: "FLAT100",
      discountType: "fixed",
      discount: 100,
      minOrder: 1000,
      isActive: true,
    },
    update: {},
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
