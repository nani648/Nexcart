"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SellerRatingFormProps {
  orderId: string;
  sellerId: string;
  onSuccess?: () => void;
}

export function SellerRatingForm({
  orderId,
  sellerId,
  onSuccess,
}: SellerRatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sellers/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          orderId,
          rating,
          comment: comment || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success("Rating submitted successfully!");
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit rating");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 border-dashed">
      <h3 className="font-semibold mb-4">Rate this seller</h3>

      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
            disabled={isLoading}
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoveredRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      {/* Rating text */}
      {rating > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {rating === 1 && "Poor - Would not recommend"}
          {rating === 2 && "Fair - Could be better"}
          {rating === 3 && "Good - Satisfied"}
          {rating === 4 && "Very Good - Would recommend"}
          {rating === 5 && "Excellent - Outstanding seller"}
        </p>
      )}

      {/* Comment */}
      <Textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isLoading}
        className="mb-4 resize-none"
        rows={3}
      />

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || rating === 0}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Rating"
        )}
      </Button>
    </Card>
  );
}
