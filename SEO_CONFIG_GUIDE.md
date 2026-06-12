# SEO Configuration Guide

## Overview
The site's SEO settings, branding, and URLs are now **centralized** in a single configuration file. This makes it easy to update your site branding, domain, and logos across the entire project without manually editing multiple files.

## Configuration File Location
📁 **File:** `src/config/siteConfig.ts`

This file contains all SEO-related settings and is referenced throughout the project.

## How to Update Site Settings

### 1. **Change Your Domain/Site URL**
```typescript
export const siteConfig: SiteConfig = {
  siteName: "Editing Instance",
  siteUrl: "https://editinginstance.in",  // ← Update this
  // ... rest of config
};
```

### 2. **Update Your Logo**
```typescript
  logo: {
    url: "/vite.svg",              // ← Change your logo path here
    alt: "Editing Instance Logo",  // ← Update alt text
  },
```

### 3. **Update OG Image (Social Media Preview)**
```typescript
  ogImage: "https://editinginstance.in/og-image.jpg",  // ← Update this
```

### 4. **Update Author Information**
```typescript
  author: "Jyotish Kumar",  // ← Your name
  copyright: "© 2024-2026 Editing Instance. All rights reserved.",  // ← Your copyright
```

### 5. **Add Twitter Handle** (Optional)
```typescript
  twitterHandle: "@editinginstance",  // ← Add your Twitter handle
```

## Where Configuration is Used

The configuration is automatically used in:

- ✅ **SEO Meta Tags** - All `og:url`, `og:image`, site name references
- ✅ **Structured Data** - Product, project, and script schemas
- ✅ **Product URLs** - Generated dynamically using `getProductUrl()`
- ✅ **Page URLs** - Generated dynamically using `getAbsoluteUrl()`
- ✅ **Canonical URLs** - Updated for SEO crawlers

## Helper Functions Available

Use these functions throughout your app to ensure consistency:

```typescript
import { 
  siteConfig, 
  getProductUrl, 
  getProjectUrl, 
  getAbsoluteUrl, 
  getLogoUrl, 
  getOgImageUrl 
} from "@/config/siteConfig";

// Get product URL
const productLink = getProductUrl("my-product-id");
// → "https://editinginstance.in/products/my-product-id"

// Get project URL
const projectLink = getProjectUrl("my-project-id");
// → "https://editinginstance.in/projects/my-project-id"

// Get absolute URL for any path
const link = getAbsoluteUrl("/about");
// → "https://editinginstance.in/about"

// Get logo URL
const logoUrl = getLogoUrl();
// → "/vite.svg"

// Get OG image URL
const ogImage = getOgImageUrl();
// → "https://editinginstance.in/og-image.jpg"

// Access config directly
console.log(siteConfig.siteName);  // "Editing Instance"
console.log(siteConfig.author);    // "Jyotish Kumar"
```

## Files That Reference siteConfig

These files automatically use the configuration:

- `src/lib/seo.ts` - Main SEO utilities
- `src/lib/seoHelpers.ts` - Structured data helpers
- Any component using SEO helpers

## Example: Updating for a New Domain

**Before (hardcoded everywhere):**
```typescript
url: `https://editinginstance.in/products/${id}`
// Would need to update in 5+ different files
```

**After (centralized):**
1. Update `src/config/siteConfig.ts`:
```typescript
siteUrl: "https://mynewdomain.com"
```
2. All URLs automatically update across the entire project! ✨

## Next Steps

1. Open `src/config/siteConfig.ts`
2. Update the values to match your site
3. All SEO tags and structured data will reflect these changes automatically
4. No manual updates needed in other files

---

**Note:** Remember to also update `index.html` meta tags if they have hardcoded values that differ from the config.
