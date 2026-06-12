// SEO utilities for managing meta tags and structured data
import { siteConfig, getOgImageUrl } from "../config/siteConfig";

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
}

// Use siteConfig for all site-wide settings
const SITE_NAME = siteConfig.siteName;
const SITE_URL = siteConfig.siteUrl;
const DEFAULT_IMAGE = getOgImageUrl();

export function updateMetaTags(config: SEOConfig) {
  // Update title
  document.title = `${config.title} | ${SITE_NAME}`;
  updateOrCreateMeta("title", config.title);
  updateOrCreateMeta("og:title", config.title);
  updateOrCreateMeta("twitter:title", config.title);

  // Update description
  updateOrCreateMeta("description", config.description);
  updateOrCreateMeta("og:description", config.description);
  updateOrCreateMeta("twitter:description", config.description);

  // Update keywords
  if (config.keywords && config.keywords.length > 0) {
    updateOrCreateMeta("keywords", config.keywords.join(", "));
  }

  // Update image
  const image = config.image || DEFAULT_IMAGE;
  updateOrCreateMeta("og:image", image);
  updateOrCreateMeta("twitter:image", image);

  // Update URL
  const url = config.url || SITE_URL;
  updateOrCreateMeta("og:url", url);
  updateOrCreateMeta("twitter:url", url);

  // Update type
  if (config.type) {
    updateOrCreateMeta("og:type", config.type);
  }

  // Update author
  if (config.author) {
    updateOrCreateMeta("author", config.author);
  }

  // Update published/modified dates
  if (config.publishedDate) {
    updateOrCreateMeta("article:published_time", config.publishedDate);
  }
  if (config.modifiedDate) {
    updateOrCreateMeta("article:modified_time", config.modifiedDate);
  }

  // Update canonical URL
  updateCanonical(url);
}

export function updateCanonical(url: string) {
  let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function updateOrCreateMeta(property: string, content: string) {
  const isProperty = property.startsWith("og:") || property.startsWith("twitter:");
  const selector = isProperty
    ? `meta[property="${property}"]`
    : `meta[name="${property}"]`;

  let meta = document.querySelector(selector) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement("meta");
    if (isProperty) {
      meta.setAttribute("property", property);
    } else {
      meta.setAttribute("name", property);
    }
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function addStructuredData(data: Record<string, unknown>) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function createProductSchema(product: {
  id: string;
  title: string;
  description: string;
  price?: number | string;
  image?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    url: product.url,
    image: product.image || DEFAULT_IMAGE,
    ...(product.price && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image || DEFAULT_IMAGE,
    datePublished: article.datePublished,
    ...(article.dateModified && { dateModified: article.dateModified }),
    ...(article.author && { author: { "@type": "Person", name: article.author } }),
    url: article.url,
  };
}

// SEO-friendly page config generator
export const pageConfigs = {
  home: {
    title: "Home - Premium Video Editing Presets & Scripts",
    description: "Explore Editing Instance: premium video editing presets, LUTs, color grading tools, and AI-powered scripts for professional cinematic post-production.",
    keywords: ["video editing", "presets", "LUTs", "color grading", "cinematic effects", "post-production tools"],
  },
  portfolio: {
    title: "Portfolio - Cinematic Video Projects",
    description: "Explore our cinematic video portfolio including fashion films, wedding films, motion graphics, documentaries, and AI-assisted video projects.",
    keywords: ["video portfolio", "cinematic films", "motion graphics", "wedding videos", "documentary", "video production"],
  },
  products: {
    title: "Products - Video Editing Presets & LUTs",
    description: "Browse our collection of premium video editing presets, LUTs, color grading packs, and post-production tools for all major editing software.",
    keywords: ["video presets", "LUTs", "color grading presets", "davinci resolve", "premiere pro", "final cut pro", "editing tools"],
  },
  aiscripts: {
    title: "AI Scripts - Automated Content Generation",
    description: "Discover AI-powered scripts for video editing, social media content, marketing, and creative storytelling. Streamline your content creation workflow.",
    keywords: ["AI scripts", "video scripts", "marketing scripts", "content generation", "automation", "social media scripts"],
  },
  services: {
    title: "Services - Professional Post-Production",
    description: "Professional video editing, color grading, motion graphics, and post-production services for filmmakers and content creators.",
    keywords: ["video editing services", "color grading", "post-production", "motion graphics", "professional editing"],
  },
  about: {
    title: "About Editing Instance",
    description: "Learn about Editing Instance: our mission to provide premium video editing tools, presets, and AI scripts for content creators worldwide.",
    keywords: ["about us", "video editing tools", "editing presets", "content creation", "filmmaking"],
  },
  contact: {
    title: "Contact Us - Get In Touch",
    description: "Have questions or feedback? Contact Editing Instance. We're here to help with your video editing and post-production needs.",
    keywords: ["contact", "support", "video editing help", "preset recommendations"],
  },
};
