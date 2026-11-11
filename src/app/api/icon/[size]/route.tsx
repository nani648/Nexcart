import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size) || 192;
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.42);
  const subSize = Math.round(size * 0.155);
  const padding = Math.round(size * 0.12);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #06b6d4 100%)",
          borderRadius: radius,
          position: "relative",
        }}
      >
        {/* Subtle inner glow overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background:
              "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,255,255,0.22) 0%, transparent 70%)",
          }}
        />

        {/* Shopping cart icon + letter combo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.round(size * 0.02),
          }}
        >
          {/* Big N */}
          <span
            style={{
              color: "#ffffff",
              fontSize,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              textShadow: "0 2px 16px rgba(0,0,0,0.30)",
            }}
          >
            N
          </span>

          {/* Brand name below */}
          <span
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: subSize,
              fontWeight: 700,
              letterSpacing: "0.12em",
              lineHeight: 1,
              textTransform: "uppercase",
              paddingBottom: padding * 0.3,
            }}
          >
            exCart
          </span>
        </div>

        {/* Bottom shine line */}
        <div
          style={{
            position: "absolute",
            bottom: Math.round(size * 0.08),
            left: "20%",
            right: "20%",
            height: Math.round(size * 0.008),
            background: "rgba(255,255,255,0.30)",
            borderRadius: 99,
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
