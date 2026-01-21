# Schema Components Documentation

This directory contains reusable Schema.org structured data components that help your site dominate search results. These components automatically generate JSON-LD markup that Google and other search engines love.

## What Schema Markup Does

Schema markup tells search engines **exactly** what your content is about:
- **Rich Snippets**: Get star ratings, FAQs, and breadcrumbs in search results
- **Local SEO**: Tell Google you serve specific cities/regions
- **Authority Signals**: Connect your business identity across the web
- **Better Rankings**: Give search engines the data they need to rank you higher

## Available Schema Components

### 1. OrganizationSchema.astro
**What it does**: Establishes your business identity across all pages.

**Includes**:
- Business name, logo, and description
- Social media profiles (Facebook, Twitter, LinkedIn, Pinterest)
- Contact information
- Business address

**Usage**: Add to every page
```astro
<OrganizationSchema slot="head" />
```

**To add more social profiles**: Edit `/src/components/schema/OrganizationSchema.astro` and add URLs to the `sameAs` array.

---

### 2. ArticleSchema.astro
**What it does**: Marks blog posts as articles with author, dates, and publisher info.

**Usage**: Already included in `/src/pages/blog/[...slug].astro`
```astro
<ArticleSchema
  slot="head"
  title={post.data.title}
  description={post.data.description}
  publishDate={post.data.publishDate}
  lastModified={post.data.lastModified}
  author={post.data.author}
  image={image}
  url={canonical}
  categories={post.data.categories}
/>
```

---

### 3. LocalBusinessSchema.astro
**What it does**: POWERFUL for local SEO. Tells Google you serve specific cities.

**Includes**:
- Service area (city, state, radius)
- Services offered (SEO, PPC, Website Design, Social Media)
- Contact info and social profiles
- Parent organization connection

**Usage**: Already included in location pages
```astro
<LocalBusinessSchema
  slot="head"
  city={city}
  state={state}
  stateAbbr={stateAbbr}
  region={region}
  url={canonical}
/>
```

**To update services**: Edit `/src/components/schema/LocalBusinessSchema.astro` and modify the `hasOfferCatalog` section.

---

### 4. FAQSchema.astro
**What it does**: Gets your FAQs shown directly in Google search results (rich snippets).

**Usage**: Already included in location pages
```astro
<FAQSchema slot="head" faqs={faqs} />
```

**FAQ format**:
```javascript
const faqs = [
  {
    question: "How long until we see results?",
    answer: "Month 1 is foundation..."
  },
  // Add more Q&A pairs
];
```

**To add to other pages**: Just define `faqs` array and include the component.

---

### 5. BreadcrumbSchema.astro
**What it does**: Shows breadcrumb navigation in search results.

**Usage**: Already included in blog and location pages
```astro
<BreadcrumbSchema slot="head" breadcrumbs={breadcrumbs} />
```

**Breadcrumb format**:
```javascript
const breadcrumbs = [
  { name: "Home", url: "https://therebelape.com/" },
  { name: "Blog", url: "https://therebelape.com/blog/" },
  { name: post.data.title, url: canonical }
];
```

---

## How to Add Schema to New Pages

1. **Import the components** you need at the top of your page:
```astro
import OrganizationSchema from '../components/schema/OrganizationSchema.astro';
import BreadcrumbSchema from '../components/schema/BreadcrumbSchema.astro';
```

2. **Add them to your Base layout** using `slot="head"`:
```astro
<Base {title} {description} {canonical}>
  <OrganizationSchema slot="head" />
  <BreadcrumbSchema slot="head" breadcrumbs={breadcrumbs} />

  <!-- Your page content -->
</Base>
```

3. **Test it**: Build your site and check the HTML source. You should see `<script type="application/ld+json">` tags in the `<head>`.

---

## Testing Your Schema

1. **Build and deploy** your site
2. **Test with Google's Rich Results Test**: https://search.google.com/test/rich-results
3. **Validate with Schema.org validator**: https://validator.schema.org/

---

## Adding More Schema Types

Want to add more schema types? Here's how:

1. **Create a new component** in this directory (e.g., `ProductSchema.astro`)
2. **Define the schema object** using Schema.org documentation: https://schema.org/
3. **Export it as JSON-LD**:
```astro
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```
4. **Import and use** on your pages

---

## Why This Beats WordPress Plugins

Most competitors use:
- **Yoast SEO**: Generic, bloated, misses local business schema
- **Rank Math**: Better than Yoast, but still generic
- **Wix/Squarespace**: Barely any schema support

**You have**:
- Custom schema tailored to contractor marketing
- LocalBusiness schema with service areas
- FAQ schema for rich snippets
- Organization schema with all your social profiles
- Breadcrumbs on every page

**This is your competitive advantage.**
