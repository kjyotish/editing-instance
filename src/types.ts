export const portfolioCategories = [
  { value: "documentary-style", label: "Documentary Style" },
  { value: "motion-graphics", label: "Motion Graphics" },
  { value: "cinematic", label: "Cinematic" },
  { value: "ugc-ad", label: "UGC Ad" },
  { value: "ai-videos", label: "AI Videos" },
] as const;

export type PortfolioCategory = (typeof portfolioCategories)[number]["value"] | string;

export type ProductCategory = string;
export type AIScriptCategory = string;

export type Project = {
  id: string;
  title: string;
  role: string;
  category: PortfolioCategory;
  year: string;
  posterUrl: string;
  videoUrl: string;
  youtubeUrl?: string;
  format?: "landscape" | "portrait";
  featured?: boolean;
};

export type Product = {
  id: string;
  title: string;
  category: ProductCategory;
  price: number;
  coverUrl: string;
  description: string;
  features: string[];
  fileUrl?: string;
  previewBeforeUrl?: string;
  previewAfterUrl?: string;
  isFree?: boolean;
};

export type AIScript = {
  id: string;
  title: string;
  category: AIScriptCategory;
  defaultBusinessName?: string;
  language?: string;
  summary: string;
  content: string;
  createdAt?: string;
};
