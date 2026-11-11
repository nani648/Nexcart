import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sellerId: string } }
) {
  const seller = await db.seller.findUnique({
    where: { sellerId: params.sellerId, status: "APPROVED" },
    select: {
      storeName: true,
      sellerId: true,
      description: true,
      rating: true,
      banner: true,
      logo: true,
      _count: { select: { products: true } },
    },
  });

  if (!seller) return new Response("Not found", { status: 404 });

  const rating = seller.rating ? Number(seller.rating).toFixed(1) : null;
  const stars = rating ? "★".repeat(Math.round(Number(rating))) : "";

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
        {seller.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seller.banner}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.2,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(99,102,241,0.5) 100%)",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
            <div
              style={{
                background: "rgba(79,70,229,0.3)",
                border: "1px solid #4f46e5",
                borderRadius: 50,
                padding: "8px 20px",
                fontSize: 15,
                color: "#818cf8",
                fontWeight: 700,
              }}
            >
              ✓ Verified Seller
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {seller.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.logo}
                alt=""
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "4px solid #4f46e5",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 52,
                  fontWeight: 900,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {seller.storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  fontSize: seller.storeName.length > 40 ? 48 : 62,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1.05,
                }}
              >
                {seller.storeName.length > 50
                  ? seller.storeName.slice(0, 50) + "…"
                  : seller.storeName}
              </div>
              {seller.description && (
                <div
                  style={{
                    fontSize: 20,
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: 700,
                    lineHeight: 1.5,
                  }}
                >
                  {seller.description.slice(0, 120)}
                  {seller.description.length > 120 ? "…" : ""}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 15,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
              }}
            >
              ID: {seller.sellerId.slice(0, 14)}…
            </div>
            <div
              style={{
                background: "rgba(79,70,229,0.2)",
                border: "1px solid rgba(79,70,229,0.4)",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 18,
                color: "#818cf8",
                fontWeight: 700,
              }}
            >
              📦 {seller._count.products} Products
            </div>
            {rating && (
              <div
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  borderRadius: 10,
                  padding: "10px 24px",
                  fontSize: 18,
                  color: "#fbbf24",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {stars} {rating}
              </div>
            )}
            <div
              style={{
                marginLeft: "auto",
                background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Visit Store →
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
