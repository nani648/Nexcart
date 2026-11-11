import { notFound } from "next/navigation";
import Image from "next/image";
import { Star, MapPin, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const revalidate = 300;

async function getStore(sellerId: string) {
  const seller = await db.seller.findUnique({ where: { sellerId } });
  if (!seller || seller.status !== "APPROVED") return null;

  const products = await db.product.findMany({
    where: { sellerId: seller.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return { seller, products };
}

export default async function StorePage({ params }: { params: { sellerId: string } }) {
  const data = await getStore(params.sellerId);
  if (!data) notFound();

  const { seller, products } = data;

  return (
    <div>
      <div
        className="rounded-lg p-6 mb-6 text-white"
        style={{ backgroundColor: seller.storeColor || "#ea580c" }}
      >
        <div className="flex items-center gap-4">
          {seller.logo && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white flex-shrink-0">
              <Image src={seller.logo} alt={seller.storeName} fill className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {seller.storeName}
              {seller.isVerified && <ShieldCheck className="w-5 h-5" />}
            </h1>
            {seller.description && (
              <p className="text-sm opacity-90 mt-1 line-clamp-2">{seller.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm">
              {seller.totalReviews > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  {seller.rating.toFixed(1)} ({seller.totalReviews} reviews)
                </span>
              )}
              {seller.storeAddress && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {seller.storeAddress}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {seller.storePaused && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3 mb-4">
          {seller.storePausedMsg || "This store is currently not accepting new orders."}
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">Products from {seller.storeName}</h2>
      {products.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">No products listed yet.</p>
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
