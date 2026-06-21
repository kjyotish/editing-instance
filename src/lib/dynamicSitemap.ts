// Dynamic sitemap generation for Editing Instance
// This file provides functions to generate sitemaps for all content types
// To serve these, add routes to your API or generate as static files during build

import type { Product, Project, AIScript } from "../types";
import { siteConfig } from "../config/siteConfig";

const SITE_URL = siteConfig.siteUrl;
const LAST_MODIFIED = new Date().toISOString().split('T')[0];

function slugifyPath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateMainSitemap(): string {
  const routes = [
    { path: "", priority: 1.0, changefreq: "daily" },
    { path: "portfolio", priority: 0.9, changefreq: "weekly" },
    { path: "products", priority: 0.9, changefreq: "daily" },
    { path: "aiscripts", priority: 0.8, changefreq: "weekly" },
    { path: "services", priority: 0.7, changefreq: "monthly" },
    { path: "about", priority: 0.6, changefreq: "monthly" },
    { path: "contact", priority: 0.5, changefreq: "yearly" },
  ];

  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${SITE_URL}${route.path ? "/" + route.path : "/"}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function generateProductsSitemap(products: Product[]): string {
  const urls = products
    .map(
      (product) => `  <url>
    <loc>${SITE_URL}/products/${product.id}/${slugifyPath(product.title) || "product"}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function generateScriptsSitemap(scripts: AIScript[]): string {
  const urls = scripts
    .map(
      (script) => `  <url>
    <loc>${SITE_URL}/aiscripts/${script.id}/${slugifyPath(script.title) || "script"}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function generatePortfolioSitemap(projects: Project[]): string {
  const urls = projects
    .map(
      (project) => `  <url>
    <loc>${SITE_URL}/portfolio/${project.id}/${slugifyPath(project.title) || "project"}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function generateSitemapIndex(
  hasProducts: boolean,
  hasScripts: boolean,
  hasPortfolio: boolean
): string {
  const sitemaps = [
    { url: `${SITE_URL}/sitemap.xml`, lastmod: LAST_MODIFIED },
  ];

  if (hasPortfolio) {
    sitemaps.push({ url: `${SITE_URL}/sitemap-portfolio.xml`, lastmod: LAST_MODIFIED });
  }

  if (hasProducts) {
    sitemaps.push({ url: `${SITE_URL}/sitemap-products.xml`, lastmod: LAST_MODIFIED });
  }

  if (hasScripts) {
    sitemaps.push({ url: `${SITE_URL}/sitemap-scripts.xml`, lastmod: LAST_MODIFIED });
  }

  const urls = sitemaps
    .map(
      (sitemap) => `  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</sitemapindex>`;
}

/**
 * Export sitemaps as static files during build
 * Call this function in your build script or API route
 */
export async function exportSitemaps(
  products: Product[],
  scripts: AIScript[],
  projects: Project[]
) {
  const mainSitemap = generateMainSitemap();
  const productsSitemap = generateProductsSitemap(products);
  const scriptsSitemap = generateScriptsSitemap(scripts);
  const portfolioSitemap = generatePortfolioSitemap(projects);
  const sitemapIndex = generateSitemapIndex(
    products.length > 0,
    scripts.length > 0,
    projects.length > 0
  );

  return {
    "sitemap.xml": mainSitemap,
    "sitemap-products.xml": productsSitemap,
    "sitemap-scripts.xml": scriptsSitemap,
    "sitemap-portfolio.xml": portfolioSitemap,
    "sitemap-index.xml": sitemapIndex,
  };
}

// Helper function to submit sitemaps to search engines via HTTP requests
export async function submitSitemapsToSearchEngines() {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`);

  // Create promises for all submissions
  const submissions = [
    // Google
    fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`, {
      method: "GET",
    }).catch(() => console.log("Google sitemap submission attempted")),

    // Bing
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`, {
      method: "GET",
    }).catch(() => console.log("Bing sitemap submission attempted")),

    // Yandex
    fetch(`https://www.yandex.com/webmaster/ping?sitemap=${sitemapUrl}`, {
      method: "GET",
    }).catch(() => console.log("Yandex sitemap submission attempted")),
  ];

  await Promise.allSettled(submissions);
}
