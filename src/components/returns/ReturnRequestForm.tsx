"use client";

import { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface ReturnFormProps {
  orderId: string;
  productId: string;
  productName: string;
  onSuccess?: () => void;
}

type ReturnReason = "DEFECTIVE" | "WRONG_ITEM" | "NOT_AS_DESCRIBED" | "DAMAGED" | "CHANGE_OF_MIND" | "OTHER";

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "DEFECTIVE",        label: "Product is defective" },
  { value: "WRONG_ITEM",       label: "Received wrong item" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "DAMAGED",          label: "Product damaged" },
  { value: "CHANGE_OF_MIND",   label: "Change of mind" },
  { value: "OTHER",            label: "Other reason" },
];

export function ReturnRequestForm({ orderId, productId, productName, onSuccess }: ReturnFormProps) {
  const { user } = useAuthContext();
  const [reason, setReason]           = useState<ReturnReason | "">("");
  const [description, setDescription] = useState("");
  const [images, setImages]           = useState<string[]>([]);
  const [isLoading, setIsLoading]     = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a return reason");
      return;
    }
    if (!user?.uid) {
      toast.error("You must be logged in to submit a return request");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.uid}`,
        },
        body: JSON.stringify({
          orderId,
          productId,
          reason,
          description: description || null,
          images,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success("Return request submitted successfully!");
      setReason("");
      setDescription("");
      setImages([]);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit return request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Important notice */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
        <p className="text-[13px] text-blue-700 dark:text-blue-400">
          <strong>Return window:</strong> You can request a return within 7 days of delivery.
          You are requesting a return for <strong>{productName}</strong>.
        </p>
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">Return Reason *</label>
        <Select value={reason} onValueChange={(value) => setReason(value as ReturnReason)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {RETURN_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">Description</label>
        <Textarea
          placeholder="Describe the issue in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={3}
          className="resize-none text-[13px]"
        />
      </div>

      {/* Image upload */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">Upload Images (optional)</label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isLoading}
            className="hidden"
            id="return-images"
          />
          <label htmlFor="return-images" className="cursor-pointer">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-[12px] text-muted-foreground">Click to upload images of the issue</p>
          </label>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.map((image, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden border">
                <Image
                  src={image}
                  alt={`Upload ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-24 object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading || !reason}
        className="w-full"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
        ) : (
          "Submit Return Request"
        )}
      </Button>
    </div>
  );
}
