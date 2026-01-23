import { getCollection } from 'astro:content';

// Function to extract YouTube video IDs from markdown content
function extractYouTubeVideos(content: string): Array<{id: string, url: string}> {
  const videos: Array<{id: string, url: string}> = [];

  // Match YouTube embed URLs: youtube.com/embed/VIDEO_ID
  const embedMatches = content.matchAll(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g);
  for (const match of embedMatches) {
    const videoId = match[1];
    videos.push({
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    });
  }

  // Match YouTube watch URLs: youtube.com/watch?v=VIDEO_ID
  const watchMatches = content.matchAll(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g);
  for (const match of watchMatches) {
    const videoId = match[1];
    if (!videos.some(v => v.id === videoId)) {
      videos.push({
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }

  // Match short YouTube URLs: youtu.be/VIDEO_ID
  const shortMatches = content.matchAll(/youtu\.be\/([a-zA-Z0-9_-]+)/g);
  for (const match of shortMatches) {
    const videoId = match[1];
    if (!videos.some(v => v.id === videoId)) {
      videos.push({
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }

  return videos;
}

export async function GET() {
  const posts = await getCollection('posts');
  const publishedPosts = posts.filter(post => !post.data.draft);

  // Collect all videos from all posts
  const videoPages: Array<{
    pageUrl: string;
    title: string;
    description: string;
    videos: Array<{id: string, url: string}>;
    publishDate: Date;
    thumbnail: string;
  }> = [];

  for (const post of publishedPosts) {
    const videos = extractYouTubeVideos(post.body);

    if (videos.length > 0) {
      videoPages.push({
        pageUrl: `https://therebelape.com/blog/${post.slug}/`,
        title: post.data.title,
        description: post.data.description,
        videos: videos,
        publishDate: post.data.publishDate,
        thumbnail: post.data.image || 'https://RebelApeCDN.b-cdn.net/rebel-ape-main/default-og-image.jpg'
      });
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${videoPages.map(page => `  <url>
    <loc>${page.pageUrl}</loc>
${page.videos.map(video => `    <video:video>
      <video:thumbnail_loc>https://img.youtube.com/vi/${video.id}/maxresdefault.jpg</video:thumbnail_loc>
      <video:title>${escapeXml(page.title)}</video:title>
      <video:description>${escapeXml(page.description)}</video:description>
      <video:content_loc>${video.url}</video:content_loc>
      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${video.id}</video:player_loc>
      <video:publication_date>${page.publishDate.toISOString()}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
    </video:video>`).join('\n')}
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
