import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

export interface ProductCardData {
  id: string;
  productId: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  rating: number;
  reviewCount: number;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images?.[0] || "https://placehold.co/300x300?text=No+Image";
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.productId}`}
      className="block bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 20vw"
          className="object-contain p-3"
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
            {discountPct}% off
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold">₹{product.price.toLocaleString("en-IN")}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              ₹{product.comparePrice!.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
