import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer", className)}
      {...props}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#000",
        borderRadius: 4,
        ...(props.style ?? {}),
      }}
    >
      <style>{`
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .skeleton-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 35%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0.85) 52%,
            rgba(255,255,255,0.55) 54%,
            transparent 65%
          );
          animation: shimmer-sweep 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export { Skeleton };
