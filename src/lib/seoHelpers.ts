// SEO Helper Component for adding structured data to products, scripts, and projects
// Import and use these in your component files

import { createProductSchema, createArticleSchema, addStructuredData } from "./seo";
import { siteConfig, getProductUrl, getAbsoluteUrl } from "../config/siteConfig";
import type { Product, AIScript, Project } from "../types";

/**
 * Add Product Schema to search results and AI indexing
 * Call this in useEffect after component mounts
 */
export function addProductSchemaToPage(product: Product, category: string) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    category: category,
    url: getProductUrl(product.id),
    image: product.coverUrl,
    ...(product.price > 0 && {
      offers: {
        "@type": "Offer",
        price: product.price.toString(),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: siteConfig.siteName,
          url: siteConfig.siteUrl,
        },
      },
    }),
    ...(product.isFree && {
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  };

  addStructuredData(schema);
}

/**
 * Add AI Script Schema for better AI platform indexing
 */
export function addScriptSchemaToPage(script: AIScript) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: script.title,
    description: script.summary,
    about: {
      "@type": "Thing",
      name: script.category,
    },
    creator: {
      "@type": "Organization",
      name: siteConfig.siteName,
      url: siteConfig.siteUrl,
    },
    url: getAbsoluteUrl(`/aiscripts/${script.id}`),
    inLanguage: script.language || "en",
    ...(script.createdAt && {
      datePublished: script.createdAt,
    }),
  };

  addStructuredData(schema);
}

/**
 * Add Portfolio Project Schema
 */
export function addProjectSchemaToPage(project: Project) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    about: {
      "@type": "Thing",
      name: project.category,
    },
    author: {
      "@type": "Person",
      name: siteConfig.author,
    },
    creator: {
      "@type": "Organization",
      name: siteConfig.siteName,
      url: siteConfig.siteUrl,
    },
    url: getAbsoluteUrl(`/portfolio/${project.id}`),
    datePublished: project.year,
    description: `${project.role} - ${project.title}`,
    ...(project.videoUrl && {
      video: {
        "@type": "VideoObject",
        url: project.videoUrl,
        name: project.title,
      },
    }),
  };

  addStructuredData(schema);
}

/**
 * Add Breadcrumb Schema for navigation
 */
export function addBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>
) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  addStructuredData(schema);
}

/**
 * Add FAQ Schema for better featured snippets
 */
export function addFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  addStructuredData(schema);
}

/**
 * Add Rating Schema for testimonials
 */
export function addRatingSchema(
  itemName: string,
  ratingValue: number,
  reviewCount: number
) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: itemName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toString(),
      reviewCount: reviewCount.toString(),
    },
  };

  addStructuredData(schema);
}

/**
 * SEO recommendations for component rendering
 */
export const SEORecommendations = {
  productCard: {
    title: "Always include title and category",
    description: "Add detailed product description (160+ chars for SEO)",
    image: "Ensure image has descriptive alt text",
    price: "Include price for rich snippets",
  },
  scriptCard: {
    title: "Clear script title with keywords",
    description: "Summary should include primary keywords",
    category: "Properly categorize for discoverability",
    language: "Specify language for multilingual support",
  },
  projectCard: {
    title: "Meaningful project title",
    description: "Role and category help with rankings",
    image: "High-quality poster image required",
    video: "Video URL enables video rich snippets",
  },
};
