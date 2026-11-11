import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";

export const revalidate = 120;

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://nexcart.example.com";

async function getProduct(productId: string) {
  const product = await db.product.findUnique({
    where: { productId },
    include: {
      seller: true,
      category: true,
      variants: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!product || !product.isActive) return null;
  return product;
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const images = product.images?.length ? product.images : ["https://placehold.co/500x500?text=No+Image"];
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  // Buying happens on the main app — this catalog app is browse-only.
  const buyUrl = `${MAIN_APP_URL}/product/${product.productId}`;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <div className="relative aspect-square bg-white rounded-lg border overflow-hidden">
          <Image src={images[0]} alt={product.name} fill className="object-contain p-4" />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {images.slice(1, 6).map((img, i) => (
              <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded border bg-white overflow-hidden">
                <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-contain" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {product.category && (
          <Link href={`/category/${product.category.slug}`} className="text-xs text-orange-600 hover:underline">
            {product.category.name}
          </Link>
        )}
        <h1 className="text-2xl font-bold mt-1">{product.name}</h1>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-gray-500">({product.reviewCount} reviews)</span>
          </div>
        )}

        <div className="flex items-baseline gap-3 mt-3">
          <span className="text-3xl font-bold">₹{product.price.toLocaleString("en-IN")}</span>
          {hasDiscount && (
            <span className="text-lg text-gray-400 line-through">
              ₹{product.comparePrice!.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {product.deliveryInfo && (
          <p className="text-sm text-gray-500 mt-2">{product.deliveryInfo}</p>
        )}

        <p className="text-sm mt-4 whitespace-pre-line">{product.description}</p>

        {product.seller && (
          <Link
            href={`/store/${product.seller.sellerId}`}
            className="flex items-center gap-2 mt-4 p-3 border rounded-lg hover:bg-gray-50"
          >
            {product.seller.logo && (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image src={product.seller.logo} alt={product.seller.storeName} fill className="object-cover" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                {product.seller.storeName}
                {product.seller.isVerified && <ShieldCheck className="w-4 h-4 text-green-600" />}
              </p>
              <p className="text-xs text-gray-500">Visit store</p>
            </div>
          </Link>
        )}

        <a
          href={buyUrl}
          className="block mt-6 w-full text-center bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg"
        >
          Buy Now / Add to Cart
        </a>

        {product.reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-3">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((r) => (
                <div key={r.id} className="border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.userName}</span>
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {r.rating}
                    </span>
                  </div>
                  {r.title && <p className="text-sm font-medium mt-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-600 mt-1">{r.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
