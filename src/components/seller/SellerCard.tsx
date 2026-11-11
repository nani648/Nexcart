import Image from "next/image";
import Link from "next/link";
import { Star, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerCardProps {
  sellerId: string;
  storeName: string;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  rating: number;
  productCount: number;
  className?: string;
}

export function SellerCard({
  sellerId,
  storeName,
  description,
  logo,
  banner,
  rating,
  productCount,
  className,
}: SellerCardProps) {
  return (
    <Link href={`/store/${sellerId}`}>
      <div
        className={cn(
          "group overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-foreground/20 hover:shadow-md hover:shadow-black/5",
          className
        )}
      >
        {/* Banner */}
        <div className="relative h-20 bg-muted">
          {banner && (
            <Image src={banner} alt="" fill className="object-cover" />
          )}
          {/* Logo */}
          <div className="absolute -bottom-5 left-4">
            <div className="h-10 w-10 overflow-hidden rounded-lg border-2 border-background bg-background shadow-sm">
              {logo ? (
                <Image src={logo} alt={storeName} width={40} height={40} className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-bold">
                  {storeName[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-7">
          <div>
            <h3 className="font-semibold text-sm">{storeName}</h3>
            <p className="text-xs text-muted-foreground">{sellerId}</p>
          </div>
          {description && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>{productCount} products</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
