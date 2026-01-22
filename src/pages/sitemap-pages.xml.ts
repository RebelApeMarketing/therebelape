import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Missing site config in astro.config.mjs");
  }

  // Define all static pages with their priorities and change frequencies
  const pages = [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/about/", changefreq: "monthly", priority: 0.8 },
    { path: "/services/", changefreq: "monthly", priority: 0.8 },

    { path: "/services/website-design/", changefreq: "monthly", priority: 0.8 },
    { path: "/services/seo/", changefreq: "monthly", priority: 0.8 },
    { path: "/services/ppc/", changefreq: "monthly", priority: 0.8 },
    { path: "/services/ppc/local-service-ads/", changefreq: "monthly", priority: 0.7 },
    { path: "/services/google-business-profile/", changefreq: "monthly", priority: 0.8 },

    { path: "/blog/", changefreq: "weekly", priority: 0.9 },

    { path: "/case-studies/", changefreq: "monthly", priority: 0.8 },
    { path: "/locations/", changefreq: "monthly", priority: 0.8 },
    { path: "/resources/", changefreq: "monthly", priority: 0.8 },
    { path: "/resources/customer-avatar/", changefreq: "monthly", priority: 0.7 },

    { path: "/contact/", changefreq: "monthly", priority: 0.7 },
    { path: "/schedule/", changefreq: "monthly", priority: 0.6 },

    { path: "/legal/privacy-policy/", changefreq: "yearly", priority: 0.3 },
    { path: "/legal/terms-and-conditions/", changefreq: "yearly", priority: 0.3 },
  ];

  // Get all location pages dynamically
  const locations = await getCollection('locations');
  const locationPages = locations
    .filter(location => !location.data.draft)
    .map(location => {
      const citySlug = location.slug.split('/').pop() || location.slug;
      return {
        path: `/locations/${location.data.state.toLowerCase()}/${citySlug}/`,
        changefreq: "monthly",
        priority: 0.7
      };
    });

  // Combine static pages with dynamic location pages
  const allPages = [...pages, ...locationPages];

  const urls = allPages
    .map((page) => {
      const loc = new URL(page.path, site).toString();
      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    }
  );
};
