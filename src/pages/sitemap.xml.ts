import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Missing site config in astro.config.mjs");
  }

  const sitemaps = [
    "sitemap-pages.xml",
    "sitemap-posts.xml",
    "sitemap-images.xml",
    "sitemap-videos.xml",
  ];

  const sitemapEntries = sitemaps
    .map((sitemap) => {
      const loc = new URL(sitemap, site).toString();
      return `
  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    }
  );
};
