import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const revalidate = 300; // 5 minutes — catalog data changes slowly (synced from main DB)

async function getHomeData() {
  try {
    const [categories, featured, latest, topSellers] = await Promise.all([
      db.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 12,
      }),
      db.product.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { salesCount: "desc" },
        take: 10,
      }),
    ]);
    return { categories, featured, latest, topSellers };
  } catch (err) {
    console.error("[catalog home] failed to load:", err);
    return { categories: [], featured: [], latest: [], topSellers: [] };
  }
}

export default async function HomePage() {
  const { categories, featured, latest, topSellers } = await getHomeData();

  return (
    <div className="space-y-10">
      {categories.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="flex-shrink-0 w-24 text-center"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl">
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    "🛍️"
                  )}
                </div>
                <p className="text-xs mt-1 line-clamp-1">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Featured Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">New Arrivals</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {latest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {topSellers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Top Sellers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {topSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && featured.length === 0 && latest.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          Catalog is empty. Run the sync script (<code>npm run sync</code>) to pull products
          from the main database.
        </p>
      )}
    </div>
  );
}
