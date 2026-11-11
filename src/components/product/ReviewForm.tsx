"use client";

import { useAuthContext } from "@/context/AuthContext";

import { useState } from "react";
import { toast } from "sonner";
import { InteractiveRating } from "@/components/shared/RatingStars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const { user } = useAuthContext();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Please sign in to write a review
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-6 text-center">
        <Check className="h-6 w-6 text-emerald-600" />
        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Review submitted!</p>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Thanks for sharing your experience.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    // Optimistic: show success immediately
    setSubmitted(true);
    onSuccess?.();

    // Fire-and-forget to server in background
    fetch("/api/products/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body }),
    }).catch(() => {
      // Silently retry or just let it go — UX already confirmed
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/50 p-5">
      <h3 className="font-semibold">Write a Review</h3>

      <div className="space-y-1.5">
        <Label>Your Rating *</Label>
        <InteractiveRating value={rating} onChange={setRating} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reviewTitle">Title</Label>
        <Input
          id="reviewTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarise your review"
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reviewBody">Review</Label>
        <Textarea
          id="reviewBody"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={4}
          maxLength={1000}
        />
        <div className="text-right text-xs text-muted-foreground">{body.length}/1000</div>
      </div>

      <Button type="submit" disabled={rating === 0} className="w-full">
        Submit Review
      </Button>
    </form>
  );
}
