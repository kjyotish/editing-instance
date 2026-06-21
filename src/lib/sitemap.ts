// Sitemap generation utilities for SEO
import { siteConfig } from "../config/siteConfig";

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function slugifyPath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateSitemapXML(entries: SitemapEntry[]): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    ${entry.lastModified ? `<lastmod>${entry.lastModified}</lastmod>` : ""}
    ${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ""}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  return xml;
}

export function generateSitemapIndex(sitemaps: Array<{ url: string; lastModified?: string }>): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sitemap) => `  <sitemap>
    <loc>${sitemap.url}</loc>
    ${sitemap.lastModified ? `<lastmod>${sitemap.lastModified}</lastmod>` : ""}
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return xml;
}

export const mainSitemapEntries: SitemapEntry[] = [
  {
    url: `${siteConfig.siteUrl}/`,
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${siteConfig.siteUrl}/portfolio`,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${siteConfig.siteUrl}/products`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${siteConfig.siteUrl}/aiscripts`,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${siteConfig.siteUrl}/services`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${siteConfig.siteUrl}/about`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${siteConfig.siteUrl}/contact`,
    changeFrequency: "yearly",
    priority: 0.5,
  },
];

export function generateProductSitemapEntries(
  products: Array<{
    id: string;
    title: string;
    category: string;
  }>
): SitemapEntry[] {
  return products.map((product) => ({
    url: `${siteConfig.siteUrl}/products/${product.id}/${slugifyPath(product.title) || "product"}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
}

export function generateScriptSitemapEntries(
  scripts: Array<{
    id: string;
    title: string;
    category: string;
  }>
): SitemapEntry[] {
  return scripts.map((script) => ({
    url: `${siteConfig.siteUrl}/aiscripts/${script.id}/${slugifyPath(script.title) || "script"}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

export function generatePortfolioSitemapEntries(
  projects: Array<{
    id: string;
    title: string;
    category: string;
  }>
): SitemapEntry[] {
  return projects.map((project) => ({
    url: `${siteConfig.siteUrl}/portfolio/${project.id}/${slugifyPath(project.title) || "project"}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
}

// Helper to submit sitemap to search engines
export async function submitSitemapToSearchEngines() {
  const sitemapUrl = encodeURIComponent(`${siteConfig.siteUrl}/sitemap.xml`);
  
  // Google Search Console
  fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`).catch(() => {
    // Silent catch for cross-origin requests
  });

  // Bing Webmaster Tools
  fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`).catch(() => {
    // Silent catch for cross-origin requests
  });
}
