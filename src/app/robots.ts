import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/search", "/product/", "/store/", "/categories/"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/checkout",
          "/checkout/",
          "/cart",
          "/cart/",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app"}/sitemap.xml`,
  };
}
