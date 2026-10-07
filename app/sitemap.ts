import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/terms", "/privacy"];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}
