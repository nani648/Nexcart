import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const revalidate = 300;

async function getCategory(slug: string) {
  const category = await db.category.findUnique({ where: { slug, isActive: true } });
  if (!category) return null;

  const products = await db.product.findMany({
    where: { categoryId: category.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return { category, products };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const data = await getCategory(params.slug);
  if (!data) notFound();

  const { category, products } = data;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{category.name}</h1>
      {category.description && (
        <p className="text-sm text-gray-500 mb-4">{category.description}</p>
      )}
      {products.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
