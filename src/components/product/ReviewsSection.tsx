"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RatingHistogram } from "@/components/product/RatingHistogram";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  user: { name?: string | null; avatar?: string | null };
}

interface ReviewsSectionProps {
  productId: string;
  initialReviews: Review[];
  initialRating: number;
  initialReviewCount: number;
}

function buildDistribution(reviews: Review[]): Record<number, number> {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) dist[star]++;
  });
  return dist;
}

function calcRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.floor(rating) ? "fill-amber-400 text-amber-400" :
            i < rating ? "fill-amber-200 text-amber-200" :
            "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
];

export function ReviewsSection({
  productId, initialReviews, initialRating, initialReviewCount,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(initialRating);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialReviewCount > initialReviews.length);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const distribution = buildDistribution(reviews);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/reviews?productId=${productId}&page=${page + 1}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(prev => {
        const ids = new Set(prev.map(r => r.id));
        return [...prev, ...(data.reviews as Review[]).filter(r => !ids.has(r.id))];
      });
      setReviewCount(data.total);
      setHasMore(reviews.length + data.reviews.length < data.total);
      setPage(p => p + 1);
    } catch { /* silently */ } finally { setLoading(false); }
  }, [loading, page, productId, reviews.length]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/products/reviews?productId=${productId}&page=1`);
        if (!res.ok) return;
        const data = await res.json();
        setReviews(prev => {
          const ids = new Set(prev.map(r => r.id));
          const fresh = (data.reviews as Review[]).filter(r => !ids.has(r.id));
          if (!fresh.length) return prev;
          return [...fresh, ...prev];
        });
        setReviewCount(data.total);
        if (data.reviews.length > 0) setRating(calcRating(data.reviews));
      } catch { /* */ }
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [productId]);

  const filtered = activeFilter ? reviews.filter(r => Math.round(r.rating) === activeFilter) : reviews;

  if (reviewCount === 0 && reviews.length === 0) {
    return (
      <section id="reviews">
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Reviews</h2>
          <p className="text-[22px] font-black text-foreground tracking-tight">Customer Reviews</p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-white dark:bg-[hsl(220_17%_8%)] p-10 text-center">
          <Star className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-muted-foreground">No reviews yet — be the first to review after purchase!</p>
        </div>
      </section>
    );
  }

  return (
    <section id="reviews">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Reviews</h2>
        <p className="text-[22px] font-black text-foreground tracking-tight">Customer Reviews</p>
      </div>

      {/* Rating histogram */}
      <div className="rounded-3xl border border-border/40 bg-white dark:bg-[hsl(220_17%_8%)] p-6 mb-5 shadow-sm">
        <RatingHistogram
          rating={rating}
          reviewCount={reviewCount}
          distribution={{ 5: distribution[5] ?? 0, 4: distribution[4] ?? 0, 3: distribution[3] ?? 0, 2: distribution[2] ?? 0, 1: distribution[1] ?? 0 }}
          onFilter={setActiveFilter}
          activeFilter={activeFilter}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {([null, 5, 4, 3, 2, 1] as (number | null)[]).map((f) => {
          const label = f === null ? "All" : `${f}★`;
          const isActive = activeFilter === f;
          const count = f === null ? reviews.length : (distribution[f] ?? 0);
          return (
            <button
              key={label}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-[0_2px_12px_hsl(var(--primary)/0.35)]"
                  : "border border-border/50 bg-white dark:bg-[hsl(220_17%_8%)] text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {label}
              <span className={cn("text-[10px] font-black", isActive ? "text-white/80" : "text-muted-foreground/60")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Review cards */}
      <div className="space-y-3 mb-6">
        {filtered.length === 0 && (
          <p className="text-[13px] text-muted-foreground py-8 text-center">
            No {activeFilter ? `${activeFilter}★` : ""} reviews yet.
          </p>
        )}
        {filtered.map((review, idx) => {
          const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
          const starRating = Math.round(review.rating);
          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.3) }}
              className="rounded-3xl border border-border/40 bg-white dark:bg-[hsl(220_17%_8%)] p-5 hover:border-border/60 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-[14px] font-black shadow-sm",
                    gradientClass
                  )}>
                    {review.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{review.user.name || "Customer"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRow rating={review.rating} />
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-2 py-0.5">
                        Verified ✓
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={cn(
                    "flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[12px] font-black text-white",
                    starRating >= 4 ? "bg-emerald-600" : starRating === 3 ? "bg-amber-500" : "bg-red-500"
                  )}>
                    {review.rating} <Star className="h-2.5 w-2.5 fill-white text-white ml-0.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground/60">{formatDate(review.createdAt)}</span>
                </div>
              </div>
              {review.title && (
                <p className="text-[14px] font-bold text-foreground mb-1.5">{review.title}</p>
              )}
              {review.body && (
                <p className="text-[13px] text-muted-foreground leading-relaxed">{review.body}</p>
              )}
              <button className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors rounded-full border border-border/30 px-2.5 py-1 hover:border-border/60">
                <ThumbsUp className="h-3 w-3" /> Helpful
              </button>
            </motion.div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-2xl border-2 border-border/50 py-3.5 text-[13px] font-bold text-foreground hover:bg-muted/30 hover:border-border/70 transition-all disabled:opacity-50"
        >
          {loading ? "Loading…" : `Load more reviews (${reviewCount - filtered.length} remaining)`}
        </button>
      )}
    </section>
  );
}
