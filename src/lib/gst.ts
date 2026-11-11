/**
 * GST invoice helpers — pure functions, no DB/IO, safe to unit test.
 */

export interface LineGstResult {
  taxable: number;
  gstAmount: number;
  hasGst: boolean;
}

/**
 * Compute the taxable value + GST amount for a single order line.
 * `price` is the per-unit price actually charged (assumed inclusive of GST
 * when a gstRate is provided). If `gstRate` is null/undefined, the product
 * has no GST info on file — the full amount is returned as "taxable" with
 * `hasGst: false` so callers can render "GST breakup not available".
 */
export function computeLineGst(price: number, qty: number, gstRate: number | null | undefined): LineGstResult {
  const lineTotal = price * qty;
  if (gstRate === null || gstRate === undefined) {
    return { taxable: lineTotal, gstAmount: 0, hasGst: false };
  }
  const taxable = lineTotal / (1 + gstRate / 100);
  const gstAmount = lineTotal - taxable;
  return { taxable, gstAmount, hasGst: true };
}

/**
 * Determine whether a sale is intra-state (CGST+SGST) or inter-state (IGST)
 * based on the seller's and buyer's state. Falls back to inter-state (IGST)
 * if either state is unknown, since that's the safer/more conservative default.
 */
export function isIntraState(sellerState: string | null | undefined, buyerState: string | null | undefined): boolean {
  const a = sellerState?.trim().toLowerCase();
  const b = buyerState?.trim().toLowerCase();
  return !!a && !!b && a === b;
}

/**
 * Split a total GST amount into CGST/SGST/IGST components based on whether
 * the sale is intra-state or inter-state.
 */
export function splitGst(totalGst: number, intraState: boolean): { cgst: number; sgst: number; igst: number } {
  if (intraState) {
    return { cgst: totalGst / 2, sgst: totalGst / 2, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: totalGst };
}
