import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { sendLowStockAlertEmail } from "@/lib/email";
import { stripHtml } from "@/lib/sanitize";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

interface CSVRow {
  name: string;
  description: string;
  price: string;
  compareprice: string;
  stock: string;
  category: string;
  condition: string;
  tags: string;
  deliveryinfo: string;
  brand: string;
  warranty: string;
  isfeatured: string;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, "").replace(/\s+/g, ""));
  const required = ["name", "price", "stock", "category", "description"];
  for (const req of required) {
    if (!headers.includes(req)) throw new Error(`Missing required column: "${req}"`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV fields
    const values: string[] = [];
    let inQuote = false;
    let current = "";
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    rows.push({
      name:         row.name         ?? "",
      description:  row.description  ?? "",
      price:        row.price        ?? "",
      compareprice: row.compareprice ?? "",
      stock:        row.stock        ?? "",
      category:     row.category     ?? "",
      condition:    row.condition    ?? "",
      tags:         row.tags         ?? "",
      deliveryinfo: row.deliveryinfo ?? "",
      brand:        row.brand        ?? "",
      warranty:     row.warranty     ?? "",
      isfeatured:   row.isfeatured   ?? "",
    });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    // 5 bulk imports per hour per IP — each request can create up to 500
    // products in one call, so this needed its own (coarser) limit rather
    // than relying only on auth checks.
    const limited = await rateLimit(req, RATE_LIMITS.csvImport);
    if (limited) return limited;

    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const seller = user.seller;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    const isActive = formData.get("isActive") !== "false";

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 });

    const text = await file.text();
    let rows: CSVRow[];
    try {
      rows = parseCSV(text);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    if (rows.length === 0) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    if (rows.length > 500) return NextResponse.json({ error: "CSV exceeds 500 rows per import" }, { status: 400 });

    // Pre-fetch all categories for lookup
    const allCategories = await db.category.findMany({ select: { id: true, name: true, slug: true } });
    const categoryMap = new Map(allCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const categorySlugMap = new Map(allCategories.map((c) => [c.slug.toLowerCase(), c.id]));

    const results: { row: number; status: "created" | "error"; name?: string; error?: string }[] = [];
    const lowStockProducts: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = stripHtml(row.name.trim());
        if (!name) throw new Error("Name is required");

        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) throw new Error("Price must be a positive number");

        const stock = parseInt(row.stock, 10);
        if (isNaN(stock) || stock < 0) throw new Error("Stock must be a non-negative integer");

        const description = stripHtml(row.description.trim());
        if (!description) throw new Error("Description is required");

        // comparePrice — optional
        const comparePrice = row.compareprice ? parseFloat(row.compareprice) : undefined;
        if (comparePrice !== undefined && (isNaN(comparePrice) || comparePrice <= price)) {
          throw new Error("Compare price must be a number greater than price");
        }

        // tags — pipe-separated: "Shirt|Formal|Cotton"
        const tags = row.tags
          ? row.tags.split("|").map((t) => t.trim()).filter(Boolean)
          : [];

        // condition
        const conditionRaw = row.condition.trim().toUpperCase();
        const condition =
          conditionRaw === "REFURBISHED" ? "REFURBISHED" :
          conditionRaw === "BOX_OPEN"    ? "BOX_OPEN"    :
          "ORIGINAL";

        // deliveryInfo
        const deliveryInfo = row.deliveryinfo.trim() || undefined;
        if (deliveryInfo && deliveryInfo.length > 100) throw new Error("deliveryInfo must be 100 characters or less");

        // isFeatured
        const isFeatured = row.isfeatured.trim().toLowerCase() === "true";

        // Resolve category
        const catInput = row.category.trim().toLowerCase();
        const categoryId = categoryMap.get(catInput) ?? categorySlugMap.get(catInput) ?? null;

        // Build specifications JSON for brand / warranty
        const specifications: Record<string, string> = {};
        if (row.brand.trim())   specifications._brand   = row.brand.trim();
        if (row.warranty.trim()) specifications._warranty = row.warranty.trim();

        const productId = `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

        await db.product.create({
          data: {
            productId,
            sellerId: seller.id,
            categoryId,
            name,
            description,
            price,
            ...(comparePrice !== undefined ? { comparePrice } : {}),
            stock,
            tags,
            condition,
            ...(deliveryInfo ? { deliveryInfo } : {}),
            isFeatured,
            isActive,
            images: [],
            ...(Object.keys(specifications).length > 0 ? { specifications } : {}),
          },
        });

        if (stock < 10) lowStockProducts.push(name);
        results.push({ row: rowNum, status: "created", name });
      } catch (err) {
        results.push({ row: rowNum, status: "error", name: row.name, error: (err as Error).message });
      }
    }

    if (lowStockProducts.length > 0) {
      try {
        await sendLowStockAlertEmail({
          sellerEmail: user.email,
          sellerName: user.name ?? seller.storeName,
          storeName: seller.storeName,
          products: lowStockProducts.map((name) => ({ name, stock: 0 })),
        });
      } catch {
        console.error("[csv-import] Failed to send low-stock alert");
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const errors  = results.filter((r) => r.status === "error").length;

    return NextResponse.json({ created, errors, results });
  } catch (error) {
    console.error("[POST /api/sellers/products/csv-import]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
