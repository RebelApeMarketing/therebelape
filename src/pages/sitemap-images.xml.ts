import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Missing site config in astro.config.mjs");
  }

  const posts = await getCollection("posts", ({ data }) => !data.draft);

  // Filter posts that have images
  const postsWithImages = posts.filter((post) => post.data.image);

  const urls = postsWithImages
    .map((post) => {
      const loc = new URL(`/blog/${post.slug}/`, site).toString();

      return `
  <url>
    <loc>${loc}</loc>
    <image:image>
      <image:loc>${post.data.image}</image:loc>
      <image:title>${post.data.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</image:title>
      <image:caption>${post.data.description ? post.data.description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : ""}</image:caption>
    </image:image>
  </url>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    }
  );
};
