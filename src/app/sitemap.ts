import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://skill-relay-tau.vercel.app";
  return ["", "/explore", "/packs", "/agent"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "daily" as const, priority: path === "" ? 1 : 0.8 }));
}
