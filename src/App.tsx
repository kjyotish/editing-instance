import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Film,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Package,
  Play,
  Sparkles,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { products as seedProducts, projects as seedProjects } from "./data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { portfolioCategories } from "./types";
import type { PortfolioCategory, Product, Project } from "./types";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Products", to: "/products" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

type PortfolioFilter = "all" | PortfolioCategory;
type ThemeMode = "system" | "light" | "dark";
type ContactFunctionResponse = { message?: string; error?: string };
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

const projectColumns = "id,title,role,category,year,poster_url,video_url,youtube_url,format,featured";
const productColumns = "id,title,category,price,cover_url,description,features,file_url,preview_before_url,preview_after_url,is_free";

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

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return extension || "file";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem("editing-instance-theme");
    return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
  });

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
      const [projectResult, productResult] = await Promise.all([
        supabase!.from("portfolio_projects").select(projectColumns).order("created_at", { ascending: false }),
        supabase!.from("digital_products").select(productColumns).order("created_at", { ascending: false }),
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
    }

    void loadPublicContent();

    return () => {
      mounted = false;
    };
  }, []);

  function handleDownloadProduct(product: Product) {
    if (!product.fileUrl) {
      return;
    }

    if (product.isFree) {
      void downloadFreeProduct(product);
      return;
    }

    window.open(product.fileUrl, "_blank", "noopener");
  }

  return (
    <div className="app-shell">
      <Nav menuOpen={menuOpen} theme={theme} onThemeChange={setTheme} onMenuToggle={() => setMenuOpen((value) => !value)} />
      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      <Routes>
        <Route path="/" element={<Home products={products} projects={projects} onDownload={handleDownloadProduct} />} />
        <Route path="/portfolio" element={<Portfolio projects={projects} />} />
        <Route path="/products" element={<Products products={products} onDownload={handleDownloadProduct} />} />
        <Route path="/services" element={<Products products={products} onDownload={handleDownloadProduct} />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/admin"
          element={(
            <Admin
              products={products}
              projects={projects}
              onProductCreated={(product) => setProducts((current) => [product, ...current])}
              onProjectCreated={(project) => setProjects((current) => [project, ...current])}
            />
          )}
        />
      </Routes>
      <Footer />
    </div>
  );
}

function Nav({
  menuOpen,
  theme,
  onThemeChange,
  onMenuToggle,
}: {
  menuOpen: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onMenuToggle: () => void;
}) {
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
}: {
  products: Product[];
  projects: Project[];
  onDownload: (product: Product) => void;
}) {
  const featuredProject = projects.find((project) => project.featured && project.videoUrl)
    ?? projects.find((project) => project.videoUrl)
    ?? projects[0];
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
        <video className="hero-video" autoPlay muted loop playsInline poster={featuredProject.posterUrl}>
          <source src={featuredProject.videoUrl} type="video/mp4" />
        </video>
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
                  <ProductCard key={product.id} product={product} onDownload={onDownload} />
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

function Portfolio({ projects }: { projects: Project[] }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<PortfolioFilter>("all");
  
  // Get all unique categories from projects
  const allCategories = Array.from(new Set(projects.map((p) => p.category)));
  const predefinedCatValues = portfolioCategories.map((c) => c.value) as string[];
  const customCats = allCategories.filter((cat) => !(predefinedCatValues as string[]).includes(cat));
  
  const visibleProjects = filter === "all" ? projects : projects.filter((project) => project.category === filter);

  const getCategoryLabel = (value: string): string => {
    const predefined = portfolioCategories.find((c) => c.value === value);
    return predefined ? predefined.label : value;
  };

  return (
    <main className="page fade-in">
      <PageHeader eyebrow="Portfolio" title="Selected Works" copy="A categorized reel of edits for brands, music artists, couples, founders, and documentary teams." />
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
      <section className="masonry-grid">
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={setActiveProject} />
        ))}
      </section>
      {visibleProjects.length === 0 && (
        <p className="empty-state">No portfolio videos are published in this category yet.</p>
      )}
      {activeProject && <Theater project={activeProject} onClose={() => setActiveProject(null)} />}
    </main>
  );
}

function Products({ products, onDownload }: { products: Product[]; onDownload: (product: Product) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const categoryParam = searchParams.get("category");
  const filter = categoryParam && categories.includes(categoryParam) ? categoryParam : "All";
  const visibleProducts = filter === "All" ? products : products.filter((product) => product.category === filter);

  function handleFilter(category: string) {
    setSearchParams(category === "All" ? {} : { category });
  }

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Products"
        title="Digital assets for sharper edits."
        copy="Browse every product category, then download the assets that fit your editing and post-production workflow."
      />
      <section className="service-row">
        {["Commercial Editing", "Color Grading", "Short-form Systems"].map((service) => (
          <article className="glass-card service-card" key={service}>
            <Sparkles size={22} />
            <h3>{service}</h3>
            <p>Premium structure, pacing, and finish for high-trust visual content.</p>
          </article>
        ))}
      </section>
      <div className="filter-bar" aria-label="Product filters">
        {categories.map((category) => (
          <button className={filter === category ? "chip active" : "chip"} key={category} type="button" onClick={() => handleFilter(category)}>
            {category}
          </button>
        ))}
      </div>
      <section className="store-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onDownload={onDownload} />
        ))}
      </section>
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
  onProductCreated,
  onProjectCreated,
}: {
  products: Product[];
  projects: Project[];
  onProductCreated: (product: Product) => void;
  onProjectCreated: (project: Project) => void;
}) {
  const [mode, setMode] = useState<"products" | "portfolio">("products");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const productCategories = Array.from(new Set(products.map((product) => product.category))).sort();
  const portfolioCategoryOptions = Array.from(new Set([
    ...portfolioCategories.map((category) => category.value),
    ...projects.map((project) => project.category),
  ]));

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
      setFormError(error instanceof Error ? error.message : "Unable to upload this product.");
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
      setFormSuccess(`Published ${title}.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to upload this portfolio video.");
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
      <PageHeader eyebrow="Admin" title="Publish products and portfolio videos." copy="Create categories as you upload. Public pages read the uploaded records from Supabase." />
      <div className="admin-toolbar">
        <div className="filter-bar" aria-label="Admin upload type">
          <button className={mode === "products" ? "chip active" : "chip"} type="button" onClick={() => setMode("products")}>
            Products
          </button>
          <button className={mode === "portfolio" ? "chip active" : "chip"} type="button" onClick={() => setMode("portfolio")}>
            Portfolio videos
          </button>
        </div>
        <button className="secondary-btn" type="button" onClick={() => void supabase?.auth.signOut()}>
          <LogOut size={16} /> Sign out {adminEmail}
        </button>
      </div>
      {formError && <p className="form-error admin-message">{formError}</p>}
      {formSuccess && <p className="form-success admin-message">{formSuccess}</p>}
      <section className="admin-layout">
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
        ) : (
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
                <input name="custom-category" placeholder="New category name" />
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
        )}
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
        </aside>
      </section>
    </main>
  );
}


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
              <p><a href="mailto:kjyotish124@gmail.com">kjyotish124@gmail.com</a> • <a href="https://instagram.com/jk__editings" target="_blank" rel="noopener noreferrer">Instagram @jk__editings</a> (50k+ followers)</p>
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
            <div className="success-state">
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
              <button className="primary-btn full" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}


function PageHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <section className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
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
        ) : (
          <video ref={videoRef} muted loop playsInline poster={project.posterUrl}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
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
        ) : (
          <video controls autoPlay poster={project.posterUrl}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
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

function LutPreview({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="product-modal" role="dialog" aria-modal="true" aria-label={`${product.title} LUT preview`}>
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close LUT preview">
        <X size={18} />
      </button>
      <div className="product-detail">
        <LutPreviewSlider product={product} />
        <div className="glass-card buy-box lut-preview-meta">
          <p className="eyebrow">LUT preview</p>
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <p className="muted">Drag the slider to compare the source frame with the graded LUT preview.</p>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onDownload, compact = false }: { product: Product; onDownload: (product: Product) => void; compact?: boolean }) {
  const hasLutPreview = isLutCategory(product.category)
    && Boolean(product.previewBeforeUrl && product.previewAfterUrl);

  return (
    <article className={`glass-card service-card product-card${compact ? " compact" : ""}`}>
      {hasLutPreview ? <LutPreviewSlider product={product} compact /> : <img src={product.coverUrl} alt={product.title} loading="lazy" />}
      <div className="product-card-body">
        <p className="eyebrow">{product.category}</p>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
      </div>
      <div className="product-card-action">
        <button className="secondary-btn full" type="button" onClick={() => onDownload(product)}>
          Download
        </button>
      </div>
    </article>
  );
}



function Footer() {
  return (
    <footer className="site-footer">
      <span>Editing Instance</span>
      <span>Portfolio · Services · Digital Assets</span>
    </footer>
  );
}

export default App;
