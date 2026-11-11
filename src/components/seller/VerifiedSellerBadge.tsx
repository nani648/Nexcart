"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedSellerBadgeProps {
  isVerified: boolean;
  rating?: number;
  totalOrders?: number;
  className?: string;
}

export function VerifiedSellerBadge({
  isVerified,
  rating,
  totalOrders,
  className = "",
}: VerifiedSellerBadgeProps) {
  if (!isVerified) {
    return null;
  }

  const content = (
    <Badge className={`flex items-center gap-1 bg-blue-600 hover:bg-blue-700 ${className}`}>
      <CheckCircle className="h-3 w-3" />
      Verified Seller
    </Badge>
  );

  if (rating !== undefined && totalOrders !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-semibold">Verified Seller</p>
              <p>★ {rating.toFixed(1)} rating • {totalOrders}+ orders</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

export function SellerVerificationInfo({ 
  rating, 
  totalOrders, 
  totalReviews 
}: { 
  rating: number; 
  totalOrders: number; 
  totalReviews: number;
}) {
  const isVerified = totalOrders >= 10 && rating >= 4;

  return (
    <div className="space-y-4 rounded-lg border border-border/40 p-4 bg-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold">★ {rating.toFixed(1)}</span>
            {isVerified && (
              <VerifiedSellerBadge isVerified={true} rating={rating} totalOrders={totalOrders} />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Orders:</span>
          <span className="font-semibold">{totalOrders}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Reviews:</span>
          <span className="font-semibold">{totalReviews}</span>
        </div>
      </div>

      {!isVerified && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Verification Requirements:</strong> 10+ orders & 4+ rating
            <br />
            <strong>Progress:</strong> {totalOrders >= 10 ? "✓" : `${totalOrders}/10`} orders, {rating >= 4 ? "✓" : `${rating.toFixed(1)}/4`} rating
          </p>
        </div>
      )}
    </div>
  );
}
