/**
 * Site Configuration
 * Centralized configuration for URL, branding, and SEO assets
 * Update these values here to change site settings globally
 */

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  logo: {
    url: string;
    alt: string;
  };
  ogImage: string;
  twitterHandle?: string;
  author: string;
  copyright: string;
}

/**
 * Main site configuration - Update these values to change site branding
 * All SEO utilities reference this config for consistency
 */
export const siteConfig: SiteConfig = {
  siteName: "Editing Instance",
  siteUrl: "https://editinginstance.in",
  logo: {
    url: "/vite.svg", // Update this to your logo path
    alt: "Editing Instance Logo",
  },
  ogImage: "https://editinginstance.in/og-image.jpg", // Update this to your OG image URL
  twitterHandle: "@editinginstance",
  author: "Jyotish Kumar",
  copyright: "© 2024-2026 Editing Instance. All rights reserved.",
};

/**
 * Helper function to get product URL
 */
export function getProductUrl(productId: string): string {
  return `${siteConfig.siteUrl}/products/${productId}`;
}

/**
 * Helper function to get project URL
 */
export function getProjectUrl(projectId: string): string {
  return `${siteConfig.siteUrl}/projects/${projectId}`;
}

/**
 * Helper function to get full absolute URL
 */
export function getAbsoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.siteUrl}${path.startsWith("/") ? path : "/" + path}`;
}

/**
 * Helper function to get logo URL (absolute or relative)
 */
export function getLogoUrl(): string {
  return siteConfig.logo.url;
}

/**
 * Helper function to get OG image URL
 */
export function getOgImageUrl(): string {
  return siteConfig.ogImage;
}
