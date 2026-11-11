import { useState } from "react";
import { toast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface VariantCombo {
  [key: string]: string; // e.g., { "Size": "M", "Color": "Black" }
}

export interface BulkVariantInput {
  combo: VariantCombo;
  price: number | null;
  comparePrice?: number | null;
  stock: number;
}

export interface BulkVariantPayload {
  productId: string;
  variants: BulkVariantInput[];
  deleteExisting?: boolean;
}

export interface ApiResponse {
  success: boolean;
  count: number;
  message: string;
  productId: string;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useVariantGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);

  /**
   * Save bulk variants to the database
   * @param payload - The bulk variant payload containing product ID and variants array
   * @returns Promise<ApiResponse> - Response from the API
   */
  const saveBulkVariants = async (
    payload: BulkVariantPayload
  ): Promise<ApiResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate payload
      if (!payload.productId) {
        throw new Error("Product ID is required");
      }
      if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
        throw new Error("At least one variant is required");
      }
      if (payload.variants.length > 1000) {
        throw new Error("Maximum 1000 variants allowed per request");
      }

      // Validate each variant
      payload.variants.forEach((variant, index) => {
        if (!variant.combo || Object.keys(variant.combo).length === 0) {
          throw new Error(`Variant ${index + 1}: combo object is required`);
        }
        if (typeof variant.stock !== "number" || variant.stock < 0) {
          throw new Error(
            `Variant ${index + 1}: stock must be a non-negative number`
          );
        }
      });

      // Make API request
      const response = await fetch("/api/products/variants/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `API error: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result: ApiResponse = await response.json();
      setLastResponse(result);

      // Show success toast
      toast({
        title: "Success! 🎉",
        description: result.message,
        variant: "default",
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);

      // Show error toast
      toast({
        title: "Error creating variants",
        description: errorMessage,
        variant: "destructive",
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch existing variants for a product
   */
  const fetchVariants = async (productId: string) => {
    try {
      const response = await fetch(
        `/api/products/variants/bulk?productId=${productId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch variants");
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Delete all variants for a product
   */
  const deleteVariants = async (productId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/products/variants/bulk?productId=${productId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete variants");
      }

      const result = await response.json();

      toast({
        title: "Deleted",
        description: result.message,
        variant: "default",
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveBulkVariants,
    fetchVariants,
    deleteVariants,
    isLoading,
    error,
    lastResponse,
  };
}
