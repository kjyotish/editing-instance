# SEO Implementation Guide for Editing Instance

## Quick Start

This guide helps you integrate SEO optimizations throughout the Editing Instance codebase to maximize ranking potential across Google, Bing, and AI platforms like ChatGPT and Gemini.

## Table of Contents

1. [Global SEO Setup](#global-seo-setup)
2. [Page-Level SEO](#page-level-seo)
3. [Product Optimization](#product-optimization)
4. [Portfolio Optimization](#portfolio-optimization)
5. [AI Scripts Optimization](#ai-scripts-optimization)
6. [Image Optimization](#image-optimization)
7. [Performance SEO](#performance-seo)

---

## Global SEO Setup

### ✅ Already Implemented

- `index.html` - Complete meta tags, Open Graph, Twitter cards, and JSON-LD schemas
- `vercel.json` - Cache headers and security headers configured
- `public/robots.txt` - Search engine crawling rules
- `public/manifest.json` - PWA manifest with app metadata
- `src/lib/seo.ts` - Dynamic meta tag management
- `src/lib/seoHelpers.ts` - Structured data helpers
- `src/App.tsx` - Route-based SEO updates

### No Additional Setup Needed

The global SEO is fully configured. Meta tags update automatically when users navigate between pages.

---

## Page-Level SEO

### Current Implementation

Each route automatically updates meta tags via `useLocation` hook in `App.tsx`:

```typescript
// This automatically updates when user navigates
useEffect(() => {
  const path = location.pathname;
  
  if (path === "/") {
    updateMetaTags(pageConfigs.home);
  }
  // ... other routes
}, [location]);
```

### To Add New Pages

1. Add config to `pageConfigs` in `src/lib/seo.ts`:
```typescript
export const pageConfigs = {
  newPage: {
    title: "New Page Title",
    description: "SEO-optimized description (160 chars max)",
    keywords: ["keyword1", "keyword2", "keyword3"],
  },
  // ...
};
```

2. Add route check in `App.tsx`:
```typescript
} else if (path === "/new-page") {
  updateMetaTags(pageConfigs.newPage);
}
```

---

## Product Optimization

### SEO Checklist for Product Pages

- [ ] **Title**: Include main keyword (e.g., "Aurora LUT Pack - Professional Color Grading")
- [ ] **Description**: 150-160 chars, includes benefits and keyword
- [ ] **Price**: Display prominently for rich snippets
- [ ] **Image**: High-quality, optimized (WebP if possible)
- [ ] **Categories**: Proper tagging (Presets, LUTs, Scripts, etc.)
- [ ] **Features**: Bullet list of key features with benefits
- [ ] **Reviews/Ratings**: If available, use rating schema

### Implementation Example

```tsx
import { addProductSchemaToPage } from "../lib/seoHelpers";

function ProductPage({ product }: { product: Product }) {
  useEffect(() => {
    // Add structured data for AI and search engines
    addProductSchemaToPage(product, "Color Grading Preset");
    
    // Update meta tags
    updateMetaTags({
      title: product.title,
      description: product.description,
      keywords: [product.category, "preset", "LUT", "color grading"],
      image: product.coverUrl,
      url: `https://editinginstance.in/products/${product.id}`,
    });
  }, [product]);

  return (
    <main>
      <h1>{product.title}</h1>
      <p className="meta-description">{product.description}</p>
      {/* Rest of content */}
    </main>
  );
}
```

### Product Data Requirements

In your Supabase database, ensure these fields are populated:

```sql
-- Products table
CREATE TABLE digital_products (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,              -- Include keywords
  description TEXT NOT NULL,         -- 150-160 chars, SEO-optimized
  category TEXT NOT NULL,            -- Preset, LUT, Script, etc.
  price DECIMAL,
  cover_url TEXT,                   -- Product preview image
  features TEXT[] NOT NULL,         -- Array of feature strings
  file_url TEXT,                    -- Download link
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

---

## Portfolio Optimization

### SEO Checklist for Project Pages

- [ ] **Title**: Project name + project type (e.g., "Aurora Fashion Film - Cinematic")
- [ ] **Description**: 160 chars describing project scope, techniques, and results
- [ ] **Role**: Clearly state what was done (Edit, Grade, Sound Design)
- [ ] **Category**: Proper categorization (Cinematic, Motion Graphics, etc.)
- [ ] **Video**: Embed with metadata for video rich snippets
- [ ] **Year**: Publication date for timeline

### Implementation Example

```tsx
import { addProjectSchemaToPage } from "../lib/seoHelpers";

function ProjectPage({ project }: { project: Project }) {
  useEffect(() => {
    addProjectSchemaToPage(project);
    
    updateMetaTags({
      title: `${project.title} - ${project.category}`,
      description: `${project.role} for ${project.title}. Professional cinematic production.`,
      keywords: [project.category, "film", "video production", "editing"],
      image: project.posterUrl,
      type: "article",
      publishedDate: `${project.year}-01-01`,
    });
  }, [project]);

  return (
    <article>
      <h1>{project.title}</h1>
      <p className="meta">{project.role} • {project.year}</p>
      {/* Video embeds with proper tags */}
    </article>
  );
}
```

---

## AI Scripts Optimization

### SEO Checklist for Script Pages

- [ ] **Title**: Script name + primary use case (e.g., "Product Launch Script - Marketing AI")
- [ ] **Summary**: Key value prop and use cases (160 chars)
- [ ] **Category**: Type of script (Marketing, Social Media, Tutorial, etc.)
- [ ] **Content**: Clear, well-structured script text with headings
- [ ] **Language**: Specify language for each script
- [ ] **Business Name**: Default business name for personalization

### Implementation Example

```tsx
import { addScriptSchemaToPage } from "../lib/seoHelpers";

function ScriptPage({ script }: { script: AIScript }) {
  useEffect(() => {
    addScriptSchemaToPage(script);
    
    updateMetaTags({
      title: `${script.title} - AI Script Template`,
      description: script.summary,
      keywords: [script.category, "script template", "AI generated", "content"],
      type: "article",
    });
  }, [script]);

  return (
    <article>
      <h1>{script.title}</h1>
      <p className="category-tag">{script.category} • {script.language}</p>
      <div className="script-content">
        {/* Script content with proper heading hierarchy */}
      </div>
    </article>
  );
}
```

---

## Image Optimization

### SEO Best Practices for Images

### Alt Text Guidelines

```tsx
// ❌ Bad
<img src="product.jpg" />

// ✅ Good
<img 
  src="product.jpg" 
  alt="Aurora Premium LUT Pack for DaVinci Resolve - Professional Color Grading"
/>

// ✅ Better with schema
<img 
  src="product.jpg" 
  alt="Aurora Premium LUT Pack for DaVinci Resolve - Professional Color Grading"
  loading="lazy"
  width="400"
  height="300"
/>
```

### Image Naming Convention

```
✅ aurora-lut-pack-color-grading.jpg
✅ cinematic-film-edit-example.jpg
✅ dv-resolve-preset-comparison.jpg

❌ product1.jpg
❌ img_23424.jpg
❌ DSC0001.jpg
```

### Responsive Images

```tsx
<picture>
  <source 
    media="(min-width: 1200px)" 
    srcSet="product-large.webp" 
  />
  <source 
    media="(min-width: 768px)" 
    srcSet="product-medium.webp" 
  />
  <img 
    src="product-small.jpg" 
    alt="Product name and description"
    loading="lazy"
  />
</picture>
```

---

## Performance SEO

### Core Web Vitals Targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | ✅ Optimized |
| FID (First Input Delay) | < 100ms | ✅ Optimized |
| CLS (Cumulative Layout Shift) | < 0.1 | ✅ Optimized |

### Performance Checklist

- [ ] Images optimized and lazy-loaded
- [ ] CSS minified and critical CSS extracted
- [ ] JavaScript code-split by route
- [ ] No render-blocking resources
- [ ] Fonts preloaded (Google Fonts if used)
- [ ] Cache headers configured (vercel.json)

### Vite Optimizations

The project is configured with Vite for optimal performance:

```typescript
// vite.config.ts - Already optimized
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})
```

### Image Optimization Tips

1. **Use Unsplash CDN** for automatic optimization:
   ```
   https://images.unsplash.com/photo-xxx?auto=format&fit=crop&w=1400&q=80
   ```

2. **Lazy Load Below-Fold Images**:
   ```tsx
   <img loading="lazy" alt="..." src="..." />
   ```

3. **Use WebP with Fallback**:
   ```tsx
   <picture>
     <source srcSet="image.webp" type="image/webp" />
     <img src="image.jpg" alt="..." />
   </picture>
   ```

---

## Structured Data Reference

### Organization Schema (Homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Editing Instance",
  "url": "https://editinginstance.in",
  "sameAs": [
    "https://instagram.com/editing_instance",
    "https://youtube.com/@editinginstance"
  ]
}
```

### Product Schema (Product Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Aurora LUT Pack",
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD"
  }
}
```

### Video Schema (Portfolio)
```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Aurora Fashion Film",
  "url": "https://example.com/video.mp4",
  "thumbnailUrl": "https://example.com/thumbnail.jpg"
}
```

---

## Monitoring SEO Performance

### Key Metrics to Track

1. **Search Console**
   - Impressions and CTR
   - Average position
   - Crawl errors

2. **Google Analytics**
   - Organic traffic
   - Bounce rate
   - Avg. time on page
   - Conversion rate

3. **Core Web Vitals**
   - Use PageSpeed Insights
   - Monitor monthly

4. **Keyword Rankings**
   - Track target keywords
   - Monitor competition

### Tools to Use

- Google Search Console: https://search.google.com/search-console
- Google Analytics: https://analytics.google.com
- Bing Webmaster Tools: https://www.bing.com/webmasters
- PageSpeed Insights: https://pagespeed.web.dev
- Schema Validator: https://validator.schema.org

---

## Common SEO Issues & Fixes

### Issue: Pages Not Showing in Search Results

**Causes:**
- Site not submitted to Search Console
- robots.txt blocking crawlers
- Meta tags missing
- Site too new (takes time to index)

**Fixes:**
1. Submit sitemap in Search Console
2. Check robots.txt allows crawling
3. Ensure meta tags in `index.html`
4. Wait 2-4 weeks for indexing

### Issue: Low Click-Through Rate (CTR)

**Causes:**
- Boring title tag
- Non-descriptive meta description
- Not addressing user intent
- Competitor has better snippet

**Fixes:**
1. Include primary keyword in title
2. Write compelling meta description
3. Add specific benefits to description
4. Use schema for rich snippets

### Issue: Poor Core Web Vitals

**Causes:**
- Large unoptimized images
- Render-blocking resources
- JavaScript execution
- CLS from ads/dynamic content

**Fixes:**
1. Optimize images
2. Defer non-critical JavaScript
3. Use CSS containment
4. Set dimensions on media elements

---

## Future SEO Enhancements

### Phase 2 (Consider Next)
- [ ] Blog section with SEO-optimized articles
- [ ] User reviews and ratings system
- [ ] Video transcripts for YouTube content
- [ ] FAQ pages for featured snippets
- [ ] Hreflang tags for multi-language support

### Phase 3 (Advanced)
- [ ] Internal linking strategy optimization
- [ ] Topic clustering for E-A-T signals
- [ ] Content gap analysis
- [ ] Backlink building strategy
- [ ] Brand entity verification (Knowledge Panel)

---

## Need Help?

For questions about SEO implementation:

1. Check `SEO_OPTIMIZATION.md` for high-level strategy
2. Review `src/lib/seo.ts` for code examples
3. Consult Google's SEO Starter Guide: https://developers.google.com/search/docs
4. Contact: contact@editinginstance.in

---

**Last Updated:** 2026-06-12
**Maintained By:** Jyotish Kumar
**Status:** ✅ Core SEO Implemented
