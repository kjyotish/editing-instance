import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Film,
  FileText,
  Instagram,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Package,
  Play,
  Send,
  Sparkles,
  Search,
  Share2,
  Sun,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import { products as seedProducts, projects as seedProjects } from "./data";
import {
  AIScriptsPage,
  DEFAULT_AI_SCRIPT_CATEGORIES,
  DEFAULT_AI_SCRIPT_LANGUAGES,
  getAIScriptCategoryLabel,
  getAIScriptLanguageLabel,
  replaceBusinessNameTokens,
} from "./AIScripts";
import { PageHeader } from "./components/PageHeader";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { portfolioCategories } from "./types";
import type { AIScript, PortfolioCategory, Product, Project } from "./types";
import { updateMetaTags, pageConfigs } from "./lib/seo";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Products", to: "/products" },
  { label: "Scripts", to: "/aiscripts" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

type PortfolioFilter = "all" | PortfolioCategory;
type ThemeMode = "system" | "light" | "dark";
type ContactFunctionResponse = { message?: string; error?: string };
type NewsletterFunctionResponse = { message?: string; error?: string };
type ProjectRow = {
  id: string;
  title: string;
  role: string;
  category: string;
  year: string;
  poster_url: string;
  video_url: string | null;
  youtube_url: string | null;
  format: "landscape" | "portrait" | null;
  featured: boolean;
};
type ProductRow = {
  id: string;
  title: string;
  category: string;
  price: number | string;
  cover_url: string;
  description: string;
  features: string[] | null;
  file_url: string | null;
  preview_before_url: string | null;
  preview_after_url: string | null;
  is_free: boolean;
};
type PortfolioCategoryRow = {
  name: string;
};
type AIScriptRow = {
  id: string;
  title: string;
  category: string;
  default_business_name: string;
  language: string;
  summary: string;
  content: string;
  created_at?: string;
};
type AIScriptCategoryRow = {
  name: string;
};

const projectColumns = "id,title,role,category,year,poster_url,video_url,youtube_url,format,featured";
const productColumns = "id,title,category,price,cover_url,description,features,file_url,preview_before_url,preview_after_url,is_free";
const aiScriptColumns = "id,title,category,default_business_name,language,summary,content,created_at";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "Device theme", icon: Monitor },
  { value: "light", label: "Light mode", icon: Sun },
  { value: "dark", label: "Dark mode", icon: Moon },
];

function getPortfolioCategoryLabel(category: PortfolioCategory) {
  return portfolioCategories.find((item) => item.value === category)?.label ?? category;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    role: row.role,
    category: row.category,
    year: row.year,
    posterUrl: row.poster_url,
    videoUrl: row.video_url ?? "",
    youtubeUrl: row.youtube_url ?? undefined,
    format: row.format ?? "landscape",
    featured: row.featured,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    coverUrl: row.cover_url,
    description: row.description,
    features: row.features ?? [],
    fileUrl: row.file_url ?? undefined,
    previewBeforeUrl: row.preview_before_url ?? undefined,
    previewAfterUrl: row.preview_after_url ?? undefined,
    isFree: row.is_free,
  };
}

function mapAIScript(row: AIScriptRow): AIScript {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    defaultBusinessName: row.default_business_name || undefined,
    language: row.language || undefined,
    summary: row.summary,
    content: row.content,
    createdAt: row.created_at,
  };
}

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return extension || "file";
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
}

async function uploadPublicFile(bucket: "portfolio" | "products", folder: string, file: File) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const path = `${folder}/${crypto.randomUUID()}.${getFileExtension(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function getDownloadName(product: Product) {
  const fallbackName = product.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "product";

  try {
    const fileName = new URL(product.fileUrl ?? "").pathname.split("/").pop();
    return fileName ? decodeURIComponent(fileName) : fallbackName;
  } catch {
    return fallbackName;
  }
}

function slugifyPath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getProductRoutePath(product: Product) {
  const slug = slugifyPath(product.title) || "product";
  return `/products/${product.id}/${slug}`;
}

function getProductShareUrl(product: Product) {
  return `${window.location.origin}${getProductRoutePath(product)}`;
}

async function downloadFreeProduct(product: Product) {
  if (!product.fileUrl) {
    return;
  }

  try {
    const response = await fetch(product.fileUrl);

    if (!response.ok) {
      throw new Error("Unable to download product file.");
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = getDownloadName(product);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch {
    const link = document.createElement("a");
    link.href = product.fileUrl;
    link.download = getDownloadName(product);
    link.rel = "noopener";
    link.click();
  }
}

async function getFunctionErrorMessage(error: unknown) {
  if (!error) return null;
  
  const maybeError = error as { message?: string; context?: unknown };
  const response = maybeError.context instanceof Response ? maybeError.context : null;

  if (response) {
    try {
      const body = await response.clone().json() as ContactFunctionResponse;
      if (body.error) {
        return body.error;
      }
    } catch {
      try {
        const text = await response.clone().text();
        if (text) {
          return text;
        }
      } catch {
        // Keep the original function error below.
      }
    }
  }

  return maybeError.message;
}

function App() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [scripts, setScripts] = useState<AIScript[]>([]);
  const [portfolioCategoryNames, setPortfolioCategoryNames] = useState<string[]>(
    portfolioCategories.map((category) => category.value),
  );
  const [aiScriptCategoryNames, setAIScriptCategoryNames] = useState<string[]>(
    DEFAULT_AI_SCRIPT_CATEGORIES,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem("editing-instance-theme");
    return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
  });
  const [cartItem, setCartItem] = useState<Product | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("editing-instance-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    let mounted = true;

    async function loadPublicContent() {
      const [projectResult, productResult, portfolioCategoryResult, scriptResult, scriptCategoryResult] = await Promise.all([
        supabase!.from("portfolio_projects").select(projectColumns).order("created_at", { ascending: false }),
        supabase!.from("digital_products").select(productColumns).order("created_at", { ascending: false }),
        supabase!.from("portfolio_categories").select("name").order("created_at", { ascending: false }),
        supabase!.from("ai_scripts").select(aiScriptColumns).order("created_at", { ascending: false }),
        supabase!.from("ai_script_categories").select("name").order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (!projectResult.error && projectResult.data?.length) {
        setProjects((projectResult.data as ProjectRow[]).map(mapProject));
      }

      if (!productResult.error && productResult.data?.length) {
        setProducts((productResult.data as ProductRow[]).map(mapProduct));
      }

      if (!portfolioCategoryResult.error) {
        const loadedCategoryNames = ((portfolioCategoryResult.data as PortfolioCategoryRow[] | null | undefined) ?? []).map((row) => row.name);
        const projectCategoryNames = (projectResult.data as ProjectRow[] | null | undefined)?.map((project) => project.category) ?? [];
        setPortfolioCategoryNames(Array.from(new Set([
          ...portfolioCategories.map((category) => category.value),
          ...loadedCategoryNames,
          ...projectCategoryNames,
        ])).sort());
      }

      if (!scriptResult.error && scriptResult.data?.length) {
        setScripts((scriptResult.data as AIScriptRow[]).map(mapAIScript));
      }

      if (!scriptCategoryResult.error) {
        const loadedScriptCategoryNames = ((scriptCategoryResult.data as AIScriptCategoryRow[] | null | undefined) ?? []).map((row) => row.name);
        const scriptCategoryNamesFromScripts = (scriptResult.data as AIScriptRow[] | null | undefined)?.map((script) => script.category) ?? [];
        setAIScriptCategoryNames(Array.from(new Set([
          ...DEFAULT_AI_SCRIPT_CATEGORIES,
          ...loadedScriptCategoryNames,
          ...scriptCategoryNamesFromScripts,
        ])).sort());
      }
    }

    void loadPublicContent();

    return () => {
      mounted = false;
    };
  }, []);

  function handleDownloadProduct(product: Product) {
    if (product.isFree) {
      if (product.fileUrl) {
        void downloadFreeProduct(product);
      }
      return;
    }

    setCartItem(product);
  }

  function handleSelectProduct(product: Product) {
    const preserveQuery = location.pathname.startsWith("/products") || location.pathname.startsWith("/services");
    navigate(`${getProductRoutePath(product)}${preserveQuery ? location.search : ""}`);
  }

  // SEO: Update meta tags based on current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/") {
      updateMetaTags(pageConfigs.home);
    } else if (path === "/portfolio") {
      updateMetaTags(pageConfigs.portfolio);
    } else if (path.startsWith("/products") || path.startsWith("/services")) {
      updateMetaTags(pageConfigs.products);
    } else if (path === "/aiscripts") {
      updateMetaTags(pageConfigs.aiscripts);
    } else if (path === "/about") {
      updateMetaTags(pageConfigs.about);
    } else if (path === "/contact") {
      updateMetaTags(pageConfigs.contact);
    }
    
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="app-shell">
      <Nav
        menuOpen={menuOpen}
        theme={theme}
        onThemeChange={setTheme}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        hidden={videoPlayerOpen}
      />
      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      <Routes>
        <Route
          path="/"
          element={
            <Home
              products={products}
              projects={projects}
              onDownload={handleDownloadProduct}
              onSelectProduct={handleSelectProduct}
            />
          }
        />
        <Route path="/portfolio" element={<Portfolio projects={projects} onPlayerOpen={setVideoPlayerOpen} />} />
        <Route
          path="/products"
          element={
            <Products
              products={products}
              onDownload={handleDownloadProduct}
              onSelectProduct={handleSelectProduct}
              onBuyProduct={setCartItem}
            />
          }
        />
        <Route
          path="/products/:productId/:productSlug?"
          element={
            <Products
              products={products}
              onDownload={handleDownloadProduct}
              onSelectProduct={handleSelectProduct}
              onBuyProduct={setCartItem}
            />
          }
        />
        <Route path="/aiscripts" element={<AIScriptsPage scripts={scripts} />} />
        <Route
          path="/services"
          element={
            <Products
              products={products}
              onDownload={handleDownloadProduct}
              onSelectProduct={handleSelectProduct}
              onBuyProduct={setCartItem}
            />
          }
        />
        <Route
          path="/services/:productId/:productSlug?"
          element={
            <Products
              products={products}
              onDownload={handleDownloadProduct}
              onSelectProduct={handleSelectProduct}
              onBuyProduct={setCartItem}
            />
          }
        />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/admin"
          element={(
            <Admin
              products={products}
              projects={projects}
              aiScriptCategoryNames={aiScriptCategoryNames}
              scripts={scripts}
              portfolioCategoryNames={portfolioCategoryNames}
              onPortfolioCategoryCreated={(category) => {
                setPortfolioCategoryNames((current) => Array.from(new Set([...current, category])).sort());
              }}
              onAIScriptCategoryCreated={(category) => {
                setAIScriptCategoryNames((current) => Array.from(new Set([...current, category])).sort());
              }}
              onScriptCreated={(script) => setScripts((current) => [script, ...current])}
              onScriptUpdated={(updated) => setScripts((current) => current.map((script) => script.id === updated.id ? updated : script))}
              onScriptDeleted={(id) => setScripts((current) => current.filter((script) => script.id !== id))}
              onProductCreated={(product) => setProducts((current) => [product, ...current])}
              onProjectCreated={(project) => setProjects((current) => [project, ...current])}
              onProductUpdated={(updated) => setProducts((current) => current.map((p) => p.id === updated.id ? updated : p))}
              onProductDeleted={(id) => setProducts((current) => current.filter((p) => p.id !== id))}
              onProjectUpdated={(updated) => setProjects((current) => current.map((p) => p.id === updated.id ? updated : p))}
              onProjectDeleted={(id) => setProjects((current) => current.filter((p) => p.id !== id))}
            />
          )}
        />
      </Routes>
      {cartItem && (
        <CartDrawer
          product={cartItem}
          onClose={() => setCartItem(null)}
        />
      )}
      <Footer />
    </div>
  );
}

function Nav({
  menuOpen,
  theme,
  onThemeChange,
  onMenuToggle,
  hidden,
}: {
  menuOpen: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onMenuToggle: () => void;
  hidden?: boolean;
}) {
  if (hidden) {
    return null;
  }

  return (
    <header className="nav-wrap">
      <nav className="nav-pill" aria-label="Primary navigation">
        <Link className="brand" to="/">Editing Instance</Link>
        <div className="nav-links">
          {navItems.slice(1).map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="theme-switch" aria-label="Theme preference">
          {themeOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                aria-label={option.label}
                className={theme === option.value ? "theme-btn active" : "theme-btn"}
                key={option.value}
                type="button"
                onClick={() => onThemeChange(option.value)}
                title={option.label}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
        <button className="icon-btn menu-btn" type="button" onClick={onMenuToggle} aria-label="Open menu">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>
    </header>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  return (
    <div className="mobile-panel">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} onClick={onClose}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function Home({
  products,
  projects,
  onDownload,
  onSelectProduct,
}: {
  products: Product[];
  projects: Project[];
  onDownload: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}) {
  const featuredProject = projects.find((project) => project.featured && project.videoUrl)
    ?? projects.find((project) => project.videoUrl)
    ?? null;
  const categories = Array.from(new Set(products.map((product) => product.category)));

  const sectionCopy: Record<string, string> = {
    "Premium Text Animations": "High-end title sequences, motion typography, and callouts designed for fast editorial polish.",
    "Free Motion Graphics": "Ready-to-use motion overlays, transitions, and graphics for quick edits and social stories.",
    LUTs: "Color grading packs crafted for cinematic, wedding, and social workflows.",
    Transitions: "Styled transition packs and motion bridges to level up every cut.",
    "Editor Essentials": "Templates, presets, and workflow assets made for editors who need speed and quality.",
  };

  return (
    <main className="fade-in">
      <section className="hero">
        {featuredProject?.videoUrl ? (
          <video className="hero-video" autoPlay muted loop playsInline poster={featuredProject.posterUrl}>
            <source src={featuredProject.videoUrl} type="video/mp4" />
          </video>
        ) : featuredProject ? (
          <img className="hero-video" src={featuredProject.posterUrl} alt={featuredProject.title} />
        ) : (
          <div className="hero-video hero-video-placeholder" aria-hidden="true" />
        )}
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Premium post-production studio</p>
          <h1>Visual Storytelling</h1>
          <p>Editing, color, sound, and digital assets for brands, creators, and filmmakers who care about the final frame.</p>
          <div className="hero-actions">
            <Link className="primary-btn" to="/portfolio">View Work <ArrowRight size={16} /></Link>
            <Link className="secondary-btn light" to="/products">Digital Assets</Link>
          </div>
        </div>
      </section>

      <section className="section product-categories">
        {categories.map((category) => {
          const sectionProducts = products.filter((product) => product.category === category).slice(0, 2);
          if (!sectionProducts.length) {
            return null;
          }

          return (
            <div className="product-category-section" key={category}>
              <div className="category-header">
                <div>
                  <p className="eyebrow">{category}</p>
                  <h2>{category}</h2>
                  <p className="section-copy">{sectionCopy[category] ?? `Digital assets for ${category.toLowerCase()}.`}</p>
                </div>
                {category === "Free Motion Graphics" && <span className="badge">Free</span>}
              </div>

              <div className="product-category-grid">
                {sectionProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onDownload={onDownload}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
              <Link className="secondary-btn category-link" to={`/products?category=${encodeURIComponent(category)}`}>
                Explore all {category} <ArrowRight size={16} />
              </Link>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Portfolio({ projects, onPlayerOpen }: { projects: Project[]; onPlayerOpen: (open: boolean) => void }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<PortfolioFilter>("all");
  const openedVideoHistoryRef = useRef(false);

  useEffect(() => {
    onPlayerOpen(Boolean(activeProject));
  }, [activeProject, onPlayerOpen]);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    window.history.pushState({ portfolioVideoOpen: true }, "", window.location.href);
    openedVideoHistoryRef.current = true;

    const onPopState = (event: PopStateEvent) => {
      if (activeProject && (!event.state || !event.state.portfolioVideoOpen)) {
        setActiveProject(null);
      }
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      openedVideoHistoryRef.current = false;
    };
  }, [activeProject]);

  const handleCloseProject = () => {
    if (openedVideoHistoryRef.current) {
      window.history.back();
      return;
    }

    setActiveProject(null);
  };

  // Get all unique categories from projects
  const allCategories = Array.from(new Set(projects.map((p) => p.category)));
  const predefinedCatValues = portfolioCategories.map((c) => c.value) as string[];
  const customCats = allCategories.filter((cat) => !(predefinedCatValues as string[]).includes(cat));

  const visibleProjects = filter === "all" ? projects : projects.filter((project) => project.category === filter);
  const hasLandscape = visibleProjects.some((project) => project.format === "landscape");

  const getCategoryLabel = (value: string): string => {
    const predefined = portfolioCategories.find((c) => c.value === value);
    return predefined ? predefined.label : value;
  };

  return (
    <main className="page fade-in">
      <PageHeader eyebrow="Portfolio" title="Art of Editing & Storytelling" copy="Browse every editing category — from cinematic videos to reels, ads, gaming edits, documentaries, and more." />
      <div className="filter-bar portfolio-filter" aria-label="Portfolio category filters">
        <button className={filter === "all" ? "chip active" : "chip"} type="button" onClick={() => setFilter("all")}>
          All
        </button>
        {portfolioCategories.map((category) => (
          allCategories.includes(category.value) && (
            <button
              className={filter === category.value ? "chip active" : "chip"}
              key={category.value}
              type="button"
              onClick={() => setFilter(category.value)}
            >
              {category.label}
            </button>
          )
        ))}
        {customCats.map((customCat) => (
          <button
            className={filter === customCat ? "chip active" : "chip"}
            key={customCat}
            type="button"
            onClick={() => setFilter(customCat as PortfolioFilter)}
          >
            {customCat}
          </button>
        ))}
      </div>
      <section className={hasLandscape ? "masonry-grid" : "masonry-grid no-landscape"}>
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={setActiveProject} />
        ))}
      </section>
      {visibleProjects.length === 0 && (
        <p className="empty-state">No portfolio videos are published in this category yet.</p>
      )}
      {activeProject && <Theater project={activeProject} onClose={handleCloseProject} />}
    </main>
  );
}

function Products({
  products,
  onDownload,
  onSelectProduct,
  onBuyProduct,
}: {
  products: Product[];
  onDownload: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onBuyProduct: (product: Product) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search") ?? "";
  const filter = categoryParam && categories.includes(categoryParam) ? categoryParam : "All";
  const normalizedSearch = searchParam.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const categoryMatches = filter === "All" || product.category === filter;
    const searchMatches = !normalizedSearch || `${product.title} ${product.description} ${product.category}`.toLowerCase().includes(normalizedSearch);
    return categoryMatches && searchMatches;
  });
  const activeProduct = productId ? products.find((product) => product.id === productId) ?? null : null;

  function handleFilter(category: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (category === "All") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", category);
    }
    setSearchParams(nextParams);
  }

  function handleSearchChange(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set("search", value);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams);
  }

  function handleCloseProduct() {
    navigate(`/products${location.search}`, { replace: true });
  }

  useEffect(() => {
    if (productId && !activeProduct) {
      navigate(`/products${location.search}`, { replace: true });
    }
  }, [activeProduct, location.search, navigate, productId]);

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Products"
        title="Digital assets for sharper edits."
        copy="Browse every product category, then download the assets that fit your editing and post-production workflow."
      />
      <div className="product-search-bar glass-card">
        <Search size={16} />
        <input
          type="search"
          value={searchParam}
          onChange={(event) => handleSearchChange(event.currentTarget.value)}
          placeholder="Search products by name"
          aria-label="Search products by name"
        />
      </div>
      <div className="filter-bar" aria-label="Product filters">
        {categories.map((category) => (
          <button className={filter === category ? "chip active" : "chip"} key={category} type="button" onClick={() => handleFilter(category)}>
            {category}
          </button>
        ))}
      </div>
      {searchParam && (
        <div className="product-search-chip-row">
          <span className="product-search-chip">Search: {searchParam}</span>
        </div>
      )}
      <section className="store-grid">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDownload={onDownload}
            onSelect={onSelectProduct}
          />
        ))}
      </section>
      {visibleProducts.length === 0 && (
        <p className="empty-state">No products match your search and filter.</p>
      )}
      {activeProduct && (
        <ProductDetailModal
          product={activeProduct}
          onClose={handleCloseProduct}
          onBuy={onBuyProduct}
          onDownload={onDownload}
        />
      )}
    </main>
  );
}

function getRequiredFile(formData: FormData, name: string) {
  const file = formData.get(name);

  if (!(file instanceof File) || !file.size) {
    throw new Error(`Choose a ${name.replace("-", " ")} file.`);
  }

  return file;
}

function getOptionalFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size ? file : null;
}

function getCategoryValue(formData: FormData, selectName: string, customName: string) {
  const category = String(formData.get(customName) || formData.get(selectName) || "").trim();

  if (!category) {
    throw new Error("Choose a category or create a custom one.");
  }

  return category;
}

function isLutCategory(category: string) {
  return /^luts?$/i.test(category.trim());
}

function getYouTubeEmbedUrl(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const videoId = host === "youtu.be"
      ? pathParts[0]
      : host.endsWith("youtube.com")
        ? parsedUrl.searchParams.get("v") || pathParts[pathParts.length - 1]
        : null;

    if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  } catch {
    return null;
  }
}

function Admin({
  products,
  projects,
  scripts,
  portfolioCategoryNames,
  aiScriptCategoryNames,
  onPortfolioCategoryCreated,
  onAIScriptCategoryCreated,
  onProductCreated,
  onProjectCreated,
  onScriptCreated,
  onProductUpdated,
  onProductDeleted,
  onProjectUpdated,
  onProjectDeleted,
  onScriptUpdated,
  onScriptDeleted,
}: {
  products: Product[];
  projects: Project[];
  scripts: AIScript[];
  portfolioCategoryNames: string[];
  aiScriptCategoryNames: string[];
  onPortfolioCategoryCreated: (category: string) => void;
  onAIScriptCategoryCreated: (category: string) => void;
  onProductCreated: (product: Product) => void;
  onProjectCreated: (project: Project) => void;
  onScriptCreated: (script: AIScript) => void;
  onProductUpdated: (product: Product) => void;
  onProductDeleted: (productId: string) => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: string) => void;
  onScriptUpdated: (script: AIScript) => void;
  onScriptDeleted: (scriptId: string) => void;
}) {
  const [mode, setMode] = useState<"products" | "portfolio" | "scripts">("products");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [portfolioCustomCategory, setPortfolioCustomCategory] = useState("");
  const [scriptCustomCategory, setScriptCustomCategory] = useState("");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingScript, setEditingScript] = useState<AIScript | null>(null);

  const productCategories = Array.from(new Set(products.map((product) => product.category))).sort();
  const portfolioCategoryOptions = Array.from(new Set([
    ...portfolioCategoryNames,
    ...projects.map((project) => project.category),
  ])).sort();
  const scriptCategoryOptions = Array.from(new Set([
    ...DEFAULT_AI_SCRIPT_CATEGORIES,
    ...aiScriptCategoryNames,
    ...scripts.map((script) => script.category),
  ])).sort();

  async function ensurePortfolioCategory(category: string) {
    const { error } = await supabase!
      .from("portfolio_categories")
      .upsert({ name: category }, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      throw new Error(`${error.message}. Run the admin upload Supabase upgrade before creating custom portfolio categories.`);
    }

    onPortfolioCategoryCreated(category);
  }

  async function ensureAIScriptCategory(category: string) {
    const { error } = await supabase!
      .from("ai_script_categories")
      .upsert({ name: category }, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      throw new Error(`${error.message}. Run the admin upload Supabase upgrade before creating custom script categories.`);
    }

    onAIScriptCategoryCreated(category);
  }

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setAuthChecking(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAdminEmail(data.session?.user.email ?? null);
        setAuthChecking(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminEmail(session?.user.email ?? null);
      setAuthChecking(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    if (!supabase) {
      setAuthError("Add the Supabase URL and anon key before using admin uploads.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
    }
  }

  async function handleProductUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const customCategory = String(formData.get("custom-category") || "").trim();
      const category = getCategoryValue(formData, "category", "custom-category");
      const isFree = formData.get("is-free") === "on";
      const price = isFree ? 0 : Number(formData.get("price"));
      const cover = getRequiredFile(formData, "cover");
      const asset = getOptionalFile(formData, "asset");
      const previewBefore = getOptionalFile(formData, "preview-before");
      const previewAfter = getOptionalFile(formData, "preview-after");
      const features = String(formData.get("features") || "")
        .split(/\n|,/)
        .map((feature) => feature.trim())
        .filter(Boolean);

      if (!title || !description) {
        throw new Error("Product title and description are required.");
      }

      if (!isFree && (!Number.isFinite(price) || price <= 0)) {
        throw new Error("Paid products need a price greater than zero.");
      }

      if ((previewBefore && !previewAfter) || (!previewBefore && previewAfter)) {
        throw new Error("Upload both LUT preview images: before and after.");
      }

      if (isLutCategory(category) && (!previewBefore || !previewAfter)) {
        throw new Error("LUT products need before and after preview images.");
      }

      if (customCategory) {
        const { error: categoryError } = await supabase
          .from("product_categories")
          .upsert({ name: category }, { onConflict: "name", ignoreDuplicates: true });

        if (categoryError) {
          throw new Error(`${categoryError.message}. Run the admin upload Supabase upgrade before creating custom product categories.`);
        }
      }

      const [coverUrl, fileUrl, previewBeforeUrl, previewAfterUrl] = await Promise.all([
        uploadPublicFile("products", "covers", cover),
        asset ? uploadPublicFile("products", "files", asset) : Promise.resolve(undefined),
        previewBefore ? uploadPublicFile("products", "lut-preview-before", previewBefore) : Promise.resolve(undefined),
        previewAfter ? uploadPublicFile("products", "lut-preview-after", previewAfter) : Promise.resolve(undefined),
      ]);

      const { data, error } = await supabase
        .from("digital_products")
        .insert({
          title,
          category,
          price,
          cover_url: coverUrl,
          description,
          features,
          file_url: fileUrl,
          preview_before_url: previewBeforeUrl,
          preview_after_url: previewAfterUrl,
          is_free: isFree,
        })
        .select(productColumns)
        .single();

      if (error) {
        throw error;
      }

      onProductCreated(mapProduct(data as ProductRow));
      form.reset();
      setFormSuccess(`Published ${title}.`);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to upload this product."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePortfolioUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const role = String(formData.get("role") || "").trim() || "Video edit";
      const category = getCategoryValue(formData, "category", "custom-category");
      const year = String(formData.get("year") || "").trim() || String(new Date().getFullYear());
      const poster = getRequiredFile(formData, "poster");
      const video = getOptionalFile(formData, "video");
      const youtubeUrl = String(formData.get("youtube-url") || "").trim();
      const format = formData.get("format") === "portrait" ? "portrait" : "landscape";
      const featured = formData.get("featured") === "on";

      if (!title) {
        throw new Error("Portfolio title is required.");
      }

      if (!video && !getYouTubeEmbedUrl(youtubeUrl)) {
        throw new Error("Upload a video file or add a valid YouTube video link.");
      }

      if (String(formData.get("custom-category") || "").trim()) {
        await ensurePortfolioCategory(category);
      }

      const [posterUrl, videoUrl] = await Promise.all([
        uploadPublicFile("portfolio", "posters", poster),
        video ? uploadPublicFile("portfolio", "videos", video) : Promise.resolve(undefined),
      ]);

      const { data, error } = await supabase
        .from("portfolio_projects")
        .insert({
          title,
          role,
          category,
          year,
          poster_url: posterUrl,
          video_url: videoUrl,
          youtube_url: youtubeUrl || null,
          format,
          featured,
        })
        .select(projectColumns)
        .single();

      if (error) {
        throw error;
      }

      onProjectCreated(mapProject(data as ProjectRow));
      form.reset();
      setPortfolioCustomCategory("");
      setFormSuccess(`Published ${title}.`);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to upload this portfolio video."));
    } finally {
      setSaving(false);
    }
  }

  async function handleScriptUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const defaultBusinessName = String(formData.get("default-business-name") || "").trim();
      const language = String(formData.get("language") || "").trim();
      const summary = String(formData.get("summary") || "").trim();
      const content = String(formData.get("content") || "").trim();
      const category = getCategoryValue(formData, "category", "custom-category");
      const customCategory = String(formData.get("custom-category") || "").trim();

      if (!title || !summary || !content || !defaultBusinessName || !language) {
        throw new Error("Script title, business name, language, summary, and content are required.");
      }

      if (customCategory) {
        await ensureAIScriptCategory(category);
      }

      const renderedContent = replaceBusinessNameTokens(content, defaultBusinessName);

      const { data, error } = await supabase
        .from("ai_scripts")
        .insert({
          title,
          category,
          default_business_name: defaultBusinessName,
          language,
          summary,
          content: renderedContent,
        })
        .select(aiScriptColumns)
        .single();

      if (error) {
        throw error;
      }

      onScriptCreated(mapAIScript(data as AIScriptRow));
      form.reset();
      setScriptCustomCategory("");
      setFormSuccess(`Published ${title}.`);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to upload this script."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`Are you sure you want to delete "${product.title}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(null);

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase
        .from("digital_products")
        .delete()
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      onProductDeleted(product.id);
      setFormSuccess(`Successfully deleted "${product.title}".`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(null);

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase
        .from("portfolio_projects")
        .delete()
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      onProjectDeleted(project.id);
      setFormSuccess(`Successfully deleted "${project.title}".`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete portfolio project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScript(script: AIScript) {
    if (!window.confirm(`Are you sure you want to delete "${script.title}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(null);

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase
        .from("ai_scripts")
        .delete()
        .eq("id", script.id);

      if (error) {
        throw error;
      }

      onScriptDeleted(script.id);
      setFormSuccess(`Successfully deleted "${script.title}".`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete script.");
    } finally {
      setSaving(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="page fade-in">
        <PageHeader eyebrow="Admin" title="Upload studio content." copy="Configure Supabase before using the product and portfolio upload system." />
        <p className="form-error admin-message">Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.</p>
      </main>
    );
  }

  if (authChecking) {
    return (
      <main className="page fade-in">
        <p className="admin-note">Checking admin session...</p>
      </main>
    );
  }

  if (!adminEmail) {
    return (
      <main className="page fade-in">
        <PageHeader eyebrow="Admin" title="Sign in to publish." copy="Use an invited Supabase Auth account to upload products and portfolio videos." />
        <section className="glass-card admin-auth">
          <Upload size={22} />
          <form onSubmit={handleSignIn}>
            <h2>Admin access</h2>
            {authError && <p className="form-error">{authError}</p>}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className="primary-btn full" type="submit">Sign in</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page fade-in">
      <PageHeader eyebrow="Admin" title="Publish products, portfolio videos, and AI scripts." copy="Create categories as you upload. Public pages read the uploaded records from Supabase." />
      <div className="admin-toolbar">
        <div className="filter-bar" aria-label="Admin upload type">
          <button className={mode === "products" ? "chip active" : "chip"} type="button" onClick={() => setMode("products")}>
            Products
          </button>
          <button className={mode === "portfolio" ? "chip active" : "chip"} type="button" onClick={() => setMode("portfolio")}>
            Portfolio videos
          </button>
          <button className={mode === "scripts" ? "chip active" : "chip"} type="button" onClick={() => setMode("scripts")}>
            AI scripts
          </button>
        </div>
        <button className="secondary-btn" type="button" onClick={() => void supabase?.auth.signOut()}>
          <LogOut size={16} /> Sign out {adminEmail}
        </button>
      </div>
      {formError && <p className="form-error admin-message">{formError}</p>}
      {formSuccess && <p className="form-success admin-message">{formSuccess}</p>}
      <section className="admin-layout">
        <div className="admin-main-col">
          {mode === "products" ? (
            <form className="glass-card admin-form" onSubmit={handleProductUpload}>
              <Package size={22} />
              <h2>Create product</h2>
              <div className="admin-form-grid">
                <label>
                  Title
                  <input name="title" required />
                </label>
                <label>
                  Price
                  <input name="price" type="number" min="0" step="0.01" placeholder="49" />
                </label>
                <label>
                  Existing category
                  <select name="category" defaultValue="">
                    <option value="">Choose category</option>
                    {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label>
                  Custom category
                  <input name="custom-category" placeholder="New category name" />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" rows={4} required />
              </label>
              <label>
                Features
                <textarea name="features" rows={4} placeholder="One feature per line" />
              </label>
              <div className="admin-form-grid">
                <label>
                  Cover image
                  <input name="cover" type="file" accept="image/*" required />
                </label>
                <label>
                  Download file
                  <input name="asset" type="file" />
                </label>
              </div>
              <div className="admin-form-grid">
                <label>
                  LUT preview before
                  <input name="preview-before" type="file" accept="image/*" />
                </label>
                <label>
                  LUT preview after
                  <input name="preview-after" type="file" accept="image/*" />
                </label>
              </div>
              <label className="checkbox-label">
                <input name="is-free" type="checkbox" />
                Free product
              </label>
              <button className="primary-btn full" type="submit" disabled={saving}>
                {saving ? "Uploading..." : "Publish product"}
              </button>
            </form>
          ) : mode === "portfolio" ? (
            <form className="glass-card admin-form" onSubmit={handlePortfolioUpload}>
              <Film size={22} />
              <h2>Create portfolio video</h2>
              <div className="admin-form-grid">
                <label>
                  Title
                  <input name="title" required />
                </label>
                <label>
                  Role
                  <input name="role" placeholder="Edit, grade, sound design" />
                </label>
                <label>
                  Existing category
                  <select name="category" defaultValue="">
                    <option value="">Choose category</option>
                    {portfolioCategoryOptions.map((category) => (
                      <option key={category} value={category}>{getPortfolioCategoryLabel(category)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Custom category
                  <input
                    name="custom-category"
                    placeholder="New category name"
                    value={portfolioCustomCategory}
                    onChange={(event) => setPortfolioCustomCategory(event.currentTarget.value)}
                  />
                </label>
                <label>
                  Year
                  <input name="year" inputMode="numeric" placeholder={String(new Date().getFullYear())} />
                </label>
                <label>
                  Video format
                  <select name="format" defaultValue="landscape">
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </label>
              </div>
              <div className="admin-form-grid">
                <label>
                  Poster image
                  <input name="poster" type="file" accept="image/*" required />
                </label>
                <label>
                  Video file
                  <input name="video" type="file" accept="video/*" />
                </label>
                <label>
                  YouTube video link
                  <input name="youtube-url" type="url" placeholder="https://youtu.be/..." />
                </label>
              </div>
              <label className="checkbox-label">
                <input name="featured" type="checkbox" />
                Use as home hero video
              </label>
              <button className="primary-btn full" type="submit" disabled={saving}>
                {saving ? "Uploading..." : "Publish portfolio video"}
              </button>
            </form>
          ) : (
            <form className="glass-card admin-form" onSubmit={handleScriptUpload}>
              <FileText size={22} />
              <h2>Create AI script</h2>
              <p className="section-copy">
                Use <code>{`{{business_name}}`}</code> anywhere in the body so users can personalize the PDF before downloading.
              </p>
              <div className="admin-form-grid">
                <label>
                  Title
                  <input name="title" required />
                </label>
                <label>
                  Default business name
                  <input
                    name="default-business-name"
                    placeholder="Your studio name"
                    required
                  />
                </label>
                <label>
                  Language
                  <select name="language" defaultValue="English">
                    {DEFAULT_AI_SCRIPT_LANGUAGES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Existing category
                  <select name="category" defaultValue={scriptCategoryOptions[0] ?? ""}>
                    {scriptCategoryOptions.map((category) => (
                      <option key={category} value={category}>{getAIScriptCategoryLabel(category)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Custom category
                  <input
                    name="custom-category"
                    placeholder="New category name"
                    value={scriptCustomCategory}
                    onChange={(event) => setScriptCustomCategory(event.currentTarget.value)}
                  />
                </label>
              </div>
              <label>
                Summary
                <textarea name="summary" rows={3} placeholder="Short description shown on the card" required />
              </label>
              <label>
                Script content
                <textarea
                  name="content"
                  rows={12}
                  placeholder="Write the script here and place {{business_name}} where the client name should appear."
                  required
                />
              </label>
              <button className="primary-btn full" type="submit" disabled={saving}>
                {saving ? "Uploading..." : "Publish AI script"}
              </button>
            </form>
          )}

          {/* LIST VIEWS */}
          {mode === "products" ? (
            <div className="admin-list-section glass-card">
              <div className="admin-list-header">
                <Package size={16} />
                <h3>All Products <span className="admin-count">({products.length})</span></h3>
              </div>
              {products.length === 0 ? (
                <p className="empty-state">No products uploaded yet.</p>
              ) : (
                <div className="admin-mini-grid">
                  {products.map((product) => (
                    <div className="admin-mini-card" key={product.id}>
                      <img src={product.coverUrl} alt={product.title} className="admin-mini-thumb" />
                      <div className="admin-mini-body">
                        <p className="admin-mini-title">{product.title}</p>
                        <p className="admin-mini-meta">{product.category} · {product.isFree ? "Free" : `$${product.price}`}</p>
                      </div>
                      <div className="admin-mini-actions">
                        <button className="admin-action-btn edit" type="button" title="Edit" onClick={() => setEditingProduct(product)}>Edit</button>
                        <button className="admin-action-btn delete" type="button" title="Delete" onClick={() => void handleDeleteProduct(product)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : mode === "portfolio" ? (
            <div className="admin-list-section glass-card">
              <div className="admin-list-header">
                <Film size={16} />
                <h3>All Portfolio Videos <span className="admin-count">({projects.length})</span></h3>
              </div>
              {projects.length === 0 ? (
                <p className="empty-state">No portfolio videos uploaded yet.</p>
              ) : (
                <div className="admin-mini-grid">
                  {projects.map((project) => (
                    <div className="admin-mini-card" key={project.id}>
                      <img src={project.posterUrl} alt={project.title} className="admin-mini-thumb" />
                      <div className="admin-mini-body">
                        <p className="admin-mini-title">{project.title}</p>
                        <p className="admin-mini-meta">{getPortfolioCategoryLabel(project.category)} · {project.year} · {project.format}</p>
                      </div>
                      <div className="admin-mini-actions">
                        <button className="admin-action-btn edit" type="button" title="Edit" onClick={() => setEditingProject(project)}>Edit</button>
                        <button className="admin-action-btn delete" type="button" title="Delete" onClick={() => void handleDeleteProject(project)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="admin-list-section glass-card">
              <div className="admin-list-header">
                <FileText size={16} />
                <h3>All AI Scripts <span className="admin-count">({scripts.length})</span></h3>
              </div>
              {scripts.length === 0 ? (
                <p className="empty-state">No AI scripts uploaded yet.</p>
              ) : (
                <div className="admin-mini-grid">
                  {scripts.map((script) => (
                    <div className="admin-mini-card script-mini-card" key={script.id}>
                      <div className="admin-mini-body">
                        <p className="admin-mini-title">{script.title}</p>
                        <p className="admin-mini-meta">
                          {getAIScriptCategoryLabel(script.category)} · {getAIScriptLanguageLabel(script.language || "English")} · {script.defaultBusinessName || "No business name"}
                        </p>
                        <p className="admin-mini-summary">{script.summary}</p>
                      </div>
                      <div className="admin-mini-actions">
                        <button className="admin-action-btn edit" type="button" title="Edit" onClick={() => setEditingScript(script)}>Edit</button>
                        <button className="admin-action-btn delete" type="button" title="Delete" onClick={() => void handleDeleteScript(script)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <aside className="admin-help">
          <article className="glass-card admin-card">
            <Package size={22} />
            <h3>Product categories</h3>
            <p>Every uploaded product becomes an instance on the products page. Home shows the latest two items from each category and links into the full category view.</p>
          </article>
          <article className="glass-card admin-card">
            <Film size={22} />
            <h3>Portfolio categories</h3>
            <p>Choose a listed category or type a custom category for a new portfolio group. Portrait format keeps vertical videos framed on the public portfolio grid.</p>
          </article>
          <article className="glass-card admin-card">
            <FileText size={22} />
            <h3>AI script placeholders</h3>
            <p>Use <code>{`{{business_name}}`}</code> in your script body. Users can swap in their own business name before downloading the PDF.</p>
          </article>
        </aside>
      </section>

      {/* EDIT MODALS */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          productCategories={productCategories}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={onProductUpdated}
        />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          portfolioCategoryOptions={portfolioCategoryOptions}
          ensurePortfolioCategory={ensurePortfolioCategory}
          onClose={() => setEditingProject(null)}
          onProjectUpdated={onProjectUpdated}
        />
      )}
      {editingScript && (
        <EditAIScriptModal
          script={editingScript}
          scriptCategoryOptions={scriptCategoryOptions}
          ensureAIScriptCategory={ensureAIScriptCategory}
          onClose={() => setEditingScript(null)}
          onScriptUpdated={onScriptUpdated}
        />
      )}
    </main>
  );
}

function EditProductModal({
  product,
  onClose,
  onProductUpdated,
  productCategories,
}: {
  product: Product;
  onClose: () => void;
  onProductUpdated: (product: Product) => void;
  productCategories: string[];
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(product.isFree || false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const customCategory = String(formData.get("custom-category") || "").trim();
      const category = getCategoryValue(formData, "category", "custom-category");
      const price = isFree ? 0 : Number(formData.get("price"));
      const cover = getOptionalFile(formData, "cover");
      const asset = getOptionalFile(formData, "asset");
      const previewBefore = getOptionalFile(formData, "preview-before");
      const previewAfter = getOptionalFile(formData, "preview-after");
      const features = String(formData.get("features") || "")
        .split(/\n|,/)
        .map((feature) => feature.trim())
        .filter(Boolean);

      if (!title || !description) {
        throw new Error("Product title and description are required.");
      }

      if (!isFree && (!Number.isFinite(price) || price <= 0)) {
        throw new Error("Paid products need a price greater than zero.");
      }

      if ((previewBefore && !previewAfter) || (!previewBefore && previewAfter)) {
        throw new Error("Upload both LUT preview images: before and after.");
      }

      if (customCategory) {
        const { error: categoryError } = await supabase
          .from("product_categories")
          .upsert({ name: category }, { onConflict: "name", ignoreDuplicates: true });

        if (categoryError) {
          throw new Error(`${categoryError.message}. Run the admin upload Supabase upgrade before creating custom product categories.`);
        }
      }

      const [coverUrl, fileUrl, previewBeforeUrl, previewAfterUrl] = await Promise.all([
        cover ? uploadPublicFile("products", "covers", cover) : Promise.resolve(undefined),
        asset ? uploadPublicFile("products", "files", asset) : Promise.resolve(undefined),
        previewBefore ? uploadPublicFile("products", "lut-preview-before", previewBefore) : Promise.resolve(undefined),
        previewAfter ? uploadPublicFile("products", "lut-preview-after", previewAfter) : Promise.resolve(undefined),
      ]);

      const updatePayload: any = {
        title,
        category,
        price,
        description,
        features,
        is_free: isFree,
      };

      if (coverUrl) updatePayload.cover_url = coverUrl;
      if (fileUrl !== undefined) updatePayload.file_url = fileUrl;
      if (previewBeforeUrl !== undefined) updatePayload.preview_before_url = previewBeforeUrl;
      if (previewAfterUrl !== undefined) updatePayload.preview_after_url = previewAfterUrl;

      const { data, error } = await supabase
        .from("digital_products")
        .update(updatePayload)
        .eq("id", product.id)
        .select(productColumns)
        .single();

      if (error) {
        throw error;
      }

      onProductUpdated(mapProduct(data as ProductRow));
      onClose();
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to update this product."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal admin-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${product.title}`}>
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close edit">
        <X size={18} />
      </button>
      <div className="admin-edit-panel glass-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <Package size={22} />
          <h2>Edit Product</h2>
          {formError && <p className="form-error">{formError}</p>}
          <div className="admin-form-grid">
            <label>
              Title
              <input name="title" defaultValue={product.title} required />
            </label>
            <label>
              Price
              <input name="price" type="number" min="0" step="0.01" defaultValue={product.price} disabled={isFree} />
            </label>
            <label>
              Existing category
              <select name="category" defaultValue={product.category}>
                <option value="">Choose category</option>
                {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Custom category
              <input name="custom-category" placeholder="New category name" />
            </label>
          </div>
          <label>
            Description
            <textarea name="description" rows={4} defaultValue={product.description} required />
          </label>
          <label>
            Features
            <textarea name="features" rows={4} placeholder="One feature per line" defaultValue={product.features.join("\n")} />
          </label>
          <div className="admin-form-grid">
            <label>
              Cover image (optional)
              <input name="cover" type="file" accept="image/*" />
            </label>
            <label>
              Download file (optional)
              <input name="asset" type="file" />
            </label>
          </div>
          <div className="admin-form-grid">
            <label>
              LUT preview before (optional)
              <input name="preview-before" type="file" accept="image/*" />
            </label>
            <label>
              LUT preview after (optional)
              <input name="preview-after" type="file" accept="image/*" />
            </label>
          </div>
          <label className="checkbox-label">
            <input name="is-free" type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            Free product
          </label>
          <button className="primary-btn full" type="submit" disabled={saving}>
            {saving ? "Updating..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditProjectModal({
  project,
  onClose,
  onProjectUpdated,
  portfolioCategoryOptions,
  ensurePortfolioCategory,
}: {
  project: Project;
  onClose: () => void;
  onProjectUpdated: (project: Project) => void;
  portfolioCategoryOptions: string[];
  ensurePortfolioCategory: (category: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const role = String(formData.get("role") || "").trim() || "Video edit";
      const category = getCategoryValue(formData, "category", "custom-category");
      const year = String(formData.get("year") || "").trim() || String(new Date().getFullYear());
      const poster = getOptionalFile(formData, "poster");
      const video = getOptionalFile(formData, "video");
      const youtubeUrl = String(formData.get("youtube-url") || "").trim();
      const format = formData.get("format") === "portrait" ? "portrait" : "landscape";
      const featured = formData.get("featured") === "on";

      if (!title) {
        throw new Error("Portfolio title is required.");
      }

      if (String(formData.get("custom-category") || "").trim()) {
        await ensurePortfolioCategory(category);
      }

      const [posterUrl, videoUrl] = await Promise.all([
        poster ? uploadPublicFile("portfolio", "posters", poster) : Promise.resolve(undefined),
        video ? uploadPublicFile("portfolio", "videos", video) : Promise.resolve(undefined),
      ]);

      const updatePayload: any = {
        title,
        role,
        category,
        year,
        youtube_url: youtubeUrl || null,
        format,
        featured,
      };

      if (posterUrl) updatePayload.poster_url = posterUrl;
      if (videoUrl !== undefined) updatePayload.video_url = videoUrl;

      const { data, error } = await supabase
        .from("portfolio_projects")
        .update(updatePayload)
        .eq("id", project.id)
        .select(projectColumns)
        .single();

      if (error) {
        throw error;
      }

      onProjectUpdated(mapProject(data as ProjectRow));
      onClose();
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to update this portfolio video."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal admin-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${project.title}`}>
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close edit">
        <X size={18} />
      </button>
      <div className="admin-edit-panel glass-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <Film size={22} />
          <h2>Edit Portfolio Video</h2>
          {formError && <p className="form-error">{formError}</p>}
          <div className="admin-form-grid">
            <label>
              Title
              <input name="title" defaultValue={project.title} required />
            </label>
            <label>
              Role
              <input name="role" placeholder="Edit, grade, sound design" defaultValue={project.role} />
            </label>
            <label>
              Existing category
              <select name="category" defaultValue={project.category}>
                <option value="">Choose category</option>
                {portfolioCategoryOptions.map((category) => (
                  <option key={category} value={category}>{getPortfolioCategoryLabel(category)}</option>
                ))}
              </select>
            </label>
            <label>
              Custom category
              <input name="custom-category" placeholder="New category name" />
            </label>
            <label>
              Year
              <input name="year" inputMode="numeric" placeholder={String(new Date().getFullYear())} defaultValue={project.year} />
            </label>
            <label>
              Video format
              <select name="format" defaultValue={project.format}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
          </div>
          <div className="admin-form-grid">
            <label>
              Poster image (optional)
              <input name="poster" type="file" accept="image/*" />
            </label>
            <label>
              Video file (optional)
              <input name="video" type="file" accept="video/*" />
            </label>
            <label>
              YouTube video link (optional)
              <input name="youtube-url" type="url" placeholder="https://youtu.be/..." defaultValue={project.youtubeUrl || ""} />
            </label>
          </div>
          <label className="checkbox-label">
            <input name="featured" type="checkbox" defaultChecked={project.featured} />
            Use as home hero video
          </label>
          <button className="primary-btn full" type="submit" disabled={saving}>
            {saving ? "Updating..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditAIScriptModal({
  script,
  onClose,
  onScriptUpdated,
  scriptCategoryOptions,
  ensureAIScriptCategory,
}: {
  script: AIScript;
  onClose: () => void;
  onScriptUpdated: (script: AIScript) => void;
  scriptCategoryOptions: string[];
  ensureAIScriptCategory: (category: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setSaving(true);
      const title = String(formData.get("title") || "").trim();
      const defaultBusinessName = String(formData.get("default-business-name") || "").trim();
      const language = String(formData.get("language") || "").trim();
      const summary = String(formData.get("summary") || "").trim();
      const content = String(formData.get("content") || "").trim();
      const category = getCategoryValue(formData, "category", "custom-category");
      const customCategory = String(formData.get("custom-category") || "").trim();

      if (!title || !summary || !content || !defaultBusinessName || !language) {
        throw new Error("Script title, business name, language, summary, and content are required.");
      }

      if (customCategory) {
        await ensureAIScriptCategory(category);
      }

      const existingBusinessName = script.defaultBusinessName?.trim() || "";
      const shiftedContent = existingBusinessName
        ? content.split(existingBusinessName).join(defaultBusinessName)
        : content;
      const renderedContent = replaceBusinessNameTokens(shiftedContent, defaultBusinessName);

      const { data, error } = await supabase
        .from("ai_scripts")
        .update({
          title,
          category,
          default_business_name: defaultBusinessName,
          language,
          summary,
          content: renderedContent,
        })
        .eq("id", script.id)
        .select(aiScriptColumns)
        .single();

      if (error) {
        throw error;
      }

      onScriptUpdated(mapAIScript(data as AIScriptRow));
      onClose();
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, "Unable to update this script."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal admin-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${script.title}`}>
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close edit">
        <X size={18} />
      </button>
      <div className="admin-edit-panel glass-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <FileText size={22} />
          <h2>Edit AI Script</h2>
          {formError && <p className="form-error">{formError}</p>}
          <div className="admin-form-grid">
            <label>
              Title
              <input name="title" defaultValue={script.title} required />
            </label>
            <label>
              Default business name
              <input
                name="default-business-name"
                placeholder="Your studio name"
                defaultValue={script.defaultBusinessName || ""}
                required
              />
            </label>
            <label>
              Language
              <select name="language" defaultValue={script.language || "English"}>
                {DEFAULT_AI_SCRIPT_LANGUAGES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Existing category
              <select name="category" defaultValue={script.category}>
                <option value="">Choose category</option>
                {scriptCategoryOptions.map((category) => (
                  <option key={category} value={category}>{getAIScriptCategoryLabel(category)}</option>
                ))}
              </select>
            </label>
            <label>
              Custom category
              <input name="custom-category" placeholder="New category name" />
            </label>
          </div>
          <label>
            Summary
            <textarea name="summary" rows={3} defaultValue={script.summary} required />
          </label>
          <label>
            Script content
            <textarea
              name="content"
              rows={12}
              defaultValue={script.content}
              placeholder="Use {{business_name}} wherever the client name should appear."
              required
            />
          </label>
          <button className="primary-btn full" type="submit" disabled={saving}>
            {saving ? "Updating..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
//About page with creator bio, experience, and contact info, plus a relevant image. This gives visitors insight into who is behind Editing Instance and builds trust in the brand. The content highlights Jyotish's expertise in video editing and digital assets, while the design maintains the site's modern and creative aesthetic.

function About() {
  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="About Editing Instance"
        title="Professional Video Editing & Digital Assets"
        copy="Crafted by Jyotish Kumar – a BCA graduate specializing in DaVinci Resolve video editing, motion graphics, color grading, and sound design. Providing professional editing solutions and premium digital assets to editors worldwide."
      />
      <section className="about-grid">
        <img src="https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?auto=format&fit=crop&w=1400&q=80" alt="Video editing suite" loading="lazy" />
        <div className="glass-card about-panel">
          <h2>About the Creator</h2>
          <div className="about-content">
            <div className="about-item">
              <strong>Jyotish Kumar</strong>
              <p>BCA Graduate | Professional Video Editor</p>
            </div>
            <div className="about-item">
              <strong>Specialization</strong>
              <p>DaVinci Resolve Editing • Motion Graphics • Color Grading • Sound Effects</p>
            </div>
            <div className="about-item">
              <strong>Experience</strong>
              <p>Professional editing experience from 2022 to present, with expertise in cinematic color grading, dynamic motion graphics, and immersive sound design.</p>
            </div>
            <div className="about-item">
              <strong>Connect</strong>
              <p><a href="mailto:kjyotish124@gmail.com">kjyotish124@gmail.com</a> • <a href="https://instagram.com/editinginstance" target="_blank" rel="noopener noreferrer">Instagram @editinginstance</a></p>
            </div>
            <div className="about-item">
              <strong>Mission</strong>
              <p>Provide premium digital editing assets and professional workflows to empower creators worldwide. Every product is designed with broadcast quality and creative freedom in mind.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const message = formData.message.trim().replace(/<[^>]*>/g, "");

    if (!name || !email || !phone || !message) {
      setError("Please fill out every field.");
      return;
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[+0-9][0-9\s-]{6,20}$/.test(phone)) {
      setError("Please enter a valid phone or WhatsApp number.");
      return;
    }

    if (message.length < 10 || message.length > 2000) {
      setError("Message must be between 10 and 2000 characters.");
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError("Contact form is temporarily unavailable. Please try again later.");
      return;
    }

    setStatus("submitting");

    const payload = { name, email, phone, message };
    const { data, error: functionError } = await supabase.functions.invoke<ContactFunctionResponse>("send-contact-email", {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    if (functionError || data?.error) {
      setError(data?.error || await getFunctionErrorMessage(functionError) || "Unable to deliver your message right now.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
    setFormData({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Get in touch"
        title="Let's work together."
        copy="Reach out for editing services, licensing inquiries, or collaborations."
      />
      <section className="contact-section">
        <div className="contact-form glass-card">
          {status === "sent" ? (
            <div className="success-state" role="status" aria-live="polite">
              <Check size={32} />
              <h2>Message sent!</h2>
              <p>Thanks for reaching out. You'll hear from me soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2>Contact us</h2>
              {error && <p className="form-error">{error}</p>}
              <label>
                Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Phone / WhatsApp
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1234567890"
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  required
                />
              </label>
              <button className="primary-btn full send-btn" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}


function ProjectPreview({ project }: { project: Project }) {
  return (
    <article className="preview-card">
      <img src={project.posterUrl} alt={project.title} loading="lazy" />
      <div>
        <strong>{project.title}</strong>
        <span>{project.role}</span>
      </div>
    </article>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(project.youtubeUrl);
  const hasVideo = Boolean(project.videoUrl);

  return (
    <article className={project.format === "portrait" ? "project-card portrait" : "project-card"}>
      <button
        className="thumb-btn"
        type="button"
        onClick={() => onOpen(project)}
        onMouseEnter={() => void videoRef.current?.play()}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
      >
        {youtubeEmbedUrl ? (
          <img className="project-poster" src={project.posterUrl} alt={project.title} loading="lazy" />
        ) : hasVideo ? (
          <video ref={videoRef} muted loop playsInline poster={project.posterUrl}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img className="project-poster" src={project.posterUrl} alt={project.title} loading="lazy" />
        )}
        <span><Play size={18} /></span>
      </button>
      <div className="project-meta">
        <strong>{project.title}</strong>
        <span>{project.role} · {getPortfolioCategoryLabel(project.category)}</span>
      </div>
    </article>
  );
}

function Theater({ project, onClose }: { project: Project; onClose: () => void }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(project.youtubeUrl);
  const hasVideo = Boolean(project.videoUrl);

  return (
    <div className={project.format === "portrait" ? "theater portrait" : "theater"} role="dialog" aria-modal="true">
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close video">
        <X size={18} />
      </button>
      <div className="theater-panel">
        {youtubeEmbedUrl ? (
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            src={`${youtubeEmbedUrl}&autoplay=1`}
            title={project.title}
          />
        ) : hasVideo ? (
          <video controls autoPlay poster={project.posterUrl}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img className="theater-poster" src={project.posterUrl} alt={project.title} />
        )}
        <div className="theater-meta">
          <h2>{project.title}</h2>
          <p>{project.role} · {project.year}</p>
          <Link className="secondary-btn" to="/contact">Get in touch <Mail size={16} /></Link>
        </div>
      </div>
    </div>
  );
}

function LutPreviewSlider({ product, compact = false }: { product: Product; compact?: boolean }) {
  const [mix, setMix] = useState(50);

  if (!product.previewBeforeUrl || !product.previewAfterUrl) {
    return null;
  }

  return (
    <div className={compact ? "before-after lut-card-preview" : "before-after"}>
      <img src={product.previewBeforeUrl} alt={`${product.title} before LUT`} />
      <div className="after-layer" style={{ clipPath: `inset(0 ${100 - mix}% 0 0)` }}>
        <img src={product.previewAfterUrl} alt={`${product.title} after LUT`} />
      </div>
      <input
        aria-label={`Compare ${product.title} LUT preview`}
        min="0"
        max="100"
        type="range"
        value={mix}
        onChange={(event) => setMix(Number(event.target.value))}
      />
    </div>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onBuy,
  onDownload,
}: {
  product: Product;
  onClose: () => void;
  onBuy: (product: Product) => void;
  onDownload: (product: Product) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("modal-open");
    };
  }, []);

  const hasLutPreview = isLutCategory(product.category) &&
    Boolean(product.previewBeforeUrl && product.previewAfterUrl);
  const shareUrl = getProductShareUrl(product);

  async function handleShare() {
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} on Editing Instance`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("Copy this product link:", shareUrl);
    }
  }

  return (
    <div className="product-modal" role="dialog" aria-modal="true" aria-label={`${product.title} details`}>
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close product details">
        <X size={18} />
      </button>
      <div className="product-detail">
        {hasLutPreview ? (
          <LutPreviewSlider product={product} />
        ) : (
          <div className="before-after">
            <img src={product.coverUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div className="glass-card buy-box lut-preview-meta">
          <p className="eyebrow">{product.category}</p>
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <strong className="detail-price">{product.isFree ? "Free" : `$${product.price}`}</strong>

          {product.features && product.features.length > 0 && (
            <ul>
              {product.features.map((feature) => (
                <li key={feature}>
                  <Check size={17} /> {feature}
                </li>
              ))}
            </ul>
          )}

          <div className="product-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={handleShare}
            >
              <Share2 size={14} /> Share product
            </button>
            <button
              className="primary-btn"
              type="button"
              onClick={() => {
                if (product.isFree) {
                  onDownload(product);
                } else {
                  onBuy(product);
                }
              }}
            >
              {product.isFree ? "Download" : `Buy Now — $${product.price}`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onDownload,
  onSelect,
  compact = false,
}: {
  product: Product;
  onDownload: (product: Product) => void;
  onSelect: (product: Product) => void;
  compact?: boolean;
}) {
  const hasLutPreview = isLutCategory(product.category) &&
    Boolean(product.previewBeforeUrl && product.previewAfterUrl);

  return (
    <article
      className={`glass-card service-card product-card${compact ? " compact" : ""}`}
      onClick={() => onSelect(product)}
      style={{ cursor: "pointer" }}
    >
      {product.isFree ? (
        <span className="product-card-free-badge">Free</span>
      ) : (
        <span className="product-card-price-badge">${product.price}</span>
      )}
      {hasLutPreview ? (
        <div onClick={(e) => e.stopPropagation()}>
          <LutPreviewSlider product={product} compact />
        </div>
      ) : (
        <img src={product.coverUrl} alt={product.title} loading="lazy" />
      )}
      <div className="product-card-body">
        <p className="eyebrow">{product.category}</p>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
      </div>
      <div className="product-card-action">
        <button
          className="secondary-btn full"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(product);
          }}
        >
          {product.isFree ? "Download" : `Buy — $${product.price}`}
        </button>
      </div>
    </article>
  );
}


function CartDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const total = useMemo(() => product.price.toFixed(2), [product.price]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("modal-open");
    };
  }, []);

  function pay(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setPaid(true);
    }, 1000);
  }

  return (
    <aside className="cart-drawer" aria-label="Checkout">
      <button className="icon-btn close" type="button" onClick={onClose} aria-label="Close cart">
        <X size={20} />
      </button>
      {paid ? (
        <div className="success-state">
          <Check size={32} />
          <h2>Order confirmed</h2>
          <p>{product.title} is ready for digital delivery.</p>
          {product.fileUrl ? (
            <button
              className="primary-btn"
              type="button"
              onClick={() => void downloadFreeProduct(product)}
              style={{ marginTop: "16px" }}
            >
              Download Asset
            </button>
          ) : (
            <p className="muted" style={{ fontSize: "14px", marginTop: "8px" }}>
              A download link has been sent to your email.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={pay}>
          <h2>Checkout</h2>
          <div className="order-summary glass-card">
            <img src={product.coverUrl} alt={product.title} />
            <div>
              <strong>{product.title}</strong>
              <span>${total}</span>
            </div>
          </div>
          <label>
            Card number
            <input required inputMode="numeric" placeholder="4242 4242 4242 4242" pattern="[0-9\s]{13,19}" title="Enter a valid card number" />
          </label>
          <label>
            Name on card
            <input required placeholder="Editing Instance" />
          </label>
          <div className="payment-grid">
            <label>
              Expiry
              <input required placeholder="08/29" pattern="(0[1-9]|1[0-2])\/[0-9]{2}" title="MM/YY format" />
            </label>
            <label>
              CVC
              <input required inputMode="numeric" placeholder="123" pattern="[0-9]{3,4}" title="3 or 4 digit security code" />
            </label>
          </div>
          <button className="primary-btn full" type="submit" disabled={loading}>
            {loading ? "Processing..." : `Pay $${total}`}
          </button>
        </form>
      )}
    </aside>
  );
}



function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError("Newsletter signup is temporarily unavailable. Please try again later.");
      return;
    }

    setStatus("submitting");

    const payload = { email: normalizedEmail };
    const { data, error: functionError } = await supabase.functions.invoke<NewsletterFunctionResponse>("send-newsletter-subscription", {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const subscriptionError = data?.error || await getFunctionErrorMessage(functionError);
    if (functionError || subscriptionError) {
      setError(subscriptionError || "Unable to complete the subscription right now.");
      setStatus("idle");
      return;
    }

    setStatus("success");
    setEmail("");
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <footer className="site-footer">
      <div className="footer-top">
        {/* Brand Info */}
        <div className="footer-column brand-column">
          <Link className="footer-brand" to="/">
            Editing Instance<span className="brand-dot"></span>
          </Link>
          <p className="footer-tagline">
            Premium post-production tools, cinematic LUTs, and typography templates designed for creators, editors, and filmmakers who demand the highest quality.
          </p>
          <div className="footer-socials">
            <a href="https://instagram.com/editinginstance" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="https://youtube.com/@jyotish149" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <Youtube size={18} />
            </a>
            <a href="mailto:kjyotish124@gmail.com" aria-label="Email">
              <Mail size={18} />
            </a>
          </div>
        </div>

        {/* Explore Links */}
        <div className="footer-column">
          <h4>Explore</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/products">Digital Assets</Link></li>
            <li><Link to="/about">About Creator</Link></li>
            <li><Link to="/contact">Get in Touch</Link></li>
          </ul>
        </div>

        {/* Resources Columns */}
        <div className="footer-column">
          <h4>Resources</h4>
          <ul className="footer-links">
            <li><Link to="/products?category=LUTs">Cinematic LUTs</Link></li>
            <li><Link to="/products?category=Premium%20Text%20Animations">Text Animations</Link></li>
            <li><Link to="/products?category=Free%20Motion%20Graphics">Free Templates</Link></li>
            <li><Link to="/products?category=Editor%20Essentials">Editor Essentials</Link></li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div className="footer-column newsletter-column">
          <h4>Stay Updated</h4>
          <p className="newsletter-text">Subscribe to receive free assets, presets, and tutorial updates directly to your inbox.</p>
          {status === "success" ? (
            <div className="newsletter-success fade-in">
              <Check size={16} />
              <span>Subscribed</span>
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address for newsletter"
              />
              <button className="send-btn newsletter-send" type="submit" aria-label="Subscribe" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
                  </svg>
                ) : (
                  <Send size={14} />
                )}
              </button>
            </form>
          )}
          {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span>&copy; {new Date().getFullYear()} Editing Instance. All rights reserved.</span>
          <span className="footer-divider">|</span>
          <span>Crafted by <a href="https://instagram.com/jk__editings" target="_blank" rel="noopener noreferrer" className="creator-link">Jyotish Kumar</a></span>
        </div>
        <div className="footer-bottom-right">
          {/* <Link to="/contact">Privacy Policy</Link>
          <Link to="/contact">Terms of Service</Link> */}
          <Link to="/admin" className="admin-portal-link">Admin</Link>
        </div>
      </div>
    </footer>
  );
}

export default App;
