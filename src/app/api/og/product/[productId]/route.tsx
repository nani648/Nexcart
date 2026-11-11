import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const product = await db.product.findUnique({
    where: { productId: params.productId },
    select: {
      name: true,
      price: true,
      images: true,
      description: true,
      seller: { select: { storeName: true } },
    },
  });

  if (!product) return new Response("Not found", { status: 404 });

  const bgImage = product.images?.[0] ?? null;
  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(product.price));

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
          background: "#0f0f14",
        }}
      >
        {bgImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgImage}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15,15,20,0.92) 0%, rgba(79,70,229,0.55) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: "linear-gradient(180deg, #4f46e5, #818cf8)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 72px",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                borderRadius: 12,
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              N
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.5px",
              }}
            >
              NexCart
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#818cf8",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {product.seller.storeName}
            </div>
            <div
              style={{
                fontSize: product.name.length > 60 ? 42 : 56,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.1,
                maxWidth: 800,
              }}
            >
              {product.name.length > 80
                ? product.name.slice(0, 80) + "…"
                : product.name}
            </div>
            {product.description && (
              <div
                style={{
                  fontSize: 20,
                  color: "rgba(255,255,255,0.6)",
                  maxWidth: 700,
                  lineHeight: 1.5,
                }}
              >
                {product.description.slice(0, 110)}
                {product.description.length > 110 ? "…" : ""}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                borderRadius: 16,
                padding: "16px 36px",
                fontSize: 40,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              {price}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 50,
                padding: "10px 24px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}>
                🛒 Shop on NexCart
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
