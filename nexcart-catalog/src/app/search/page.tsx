import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const revalidate = 60;

async function searchProducts(q: string) {
  if (!q.trim()) return [];
  return db.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { salesCount: "desc" },
    take: 60,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q || "";
  const products = await searchProducts(q);

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">
        {q ? `Search results for "${q}"` : "Search"}
      </h1>
      {q && products.length === 0 && (
        <p className="text-gray-500 py-12 text-center">No products found for &quot;{q}&quot;.</p>
      )}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
