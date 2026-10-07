import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything past the public marketing pages sits behind auth (proxy.ts
      // redirects anonymous visitors to /login anyway) - no reason to have
      // crawlers spend budget on role dashboards or the onboarding wizards.
      disallow: [
        "/hospital",
        "/locum-tenens",
        "/working-doctor",
        "/super-admin",
        "/onboarding",
        "/verification",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
