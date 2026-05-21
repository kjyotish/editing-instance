import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileArchive,
  FileVideo,
  Image,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Play,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from "lucide-react";
import { products as seedProducts, projects as seedProjects } from "./data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { portfolioCategories } from "./types";
import type { PortfolioCategory, Product, Project } from "./types";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Services", to: "/services" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

type PortfolioFilter = "all" | PortfolioCategory;
type ThemeMode = "system" | "light" | "dark";
type ContactFunctionResponse = { message?: string; error?: string };
type AdminTab = "portfolio" | "assets";
type UploadStatus = "idle" | "uploading" | "success";

type ProjectRow = {
  id: string;
  title: string;
  role: string;
  category: string;
  year: string;
  poster_url: string;
  video_url: string;
  featured: boolean;
};

type ProductRow = {
  id: string;
  title: string;
  category: string;
  price: number;
  cover_url: string;
  description: string;
  features: string[];
  file_url?: string | null;
  is_free: boolean;
};

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
    videoUrl: row.video_url,
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
    isFree: row.is_free,
  };
}

function getUploadPath(file: File, folder: string) {
  const extension = file.name.split(".").pop() || "bin";
  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "upload";

  return `${folder}/${Date.now()}-${safeName}.${extension}`;
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

    async function loadPublishedContent() {
      const [projectResult, productResult] = await Promise.all([
        supabase!
          .from("portfolio_projects")
          .select("id,title,role,category,year,poster_url,video_url,featured")
          .order("created_at", { ascending: false }),
        supabase!
          .from("digital_products")
          .select("id,title,category,price,cover_url,description,features,file_url,is_free")
          .order("created_at", { ascending: false }),
      ]);

      if (projectResult.data?.length) {
        setProjects(projectResult.data.map((row) => mapProject(row as ProjectRow)));
      }

      if (productResult.data?.length) {
        setProducts(productResult.data.map((row) => mapProduct(row as ProductRow)));
      }
    }

    void loadPublishedContent();
  }, []);

  function handleDownloadProduct(product: Product) {
    if (product.fileUrl) {
      window.open(product.fileUrl, "_blank");
    }
  }

  return (
    <div className="app-shell">
      <Nav menuOpen={menuOpen} theme={theme} onThemeChange={setTheme} onMenuToggle={() => setMenuOpen((value) => !value)} />
      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      <Routes>
        <Route path="/" element={<Home products={products} projects={projects} onDownload={handleDownloadProduct} />} />
        <Route path="/portfolio" element={<Portfolio projects={projects} />} />
        <Route path="/services" element={<Services products={products} onDownload={handleDownloadProduct} />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin onProjectCreated={(project) => setProjects((items) => [project, ...items])} onProductCreated={(product) => setProducts((items) => [product, ...items])} />} />
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
  const featuredProject = projects.find((project) => project.featured) ?? projects[0];
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
            <Link className="secondary-btn light" to="/services">Digital Assets</Link>
          </div>
        </div>
      </section>

      <section className="section product-categories">
        {categories.map((category) => {
          const sectionProducts = products.filter((product) => product.category === category);
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

function Services({ products, onDownload }: { products: Product[]; onDownload: (product: Product) => void }) {
  const [filter, setFilter] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const visibleProducts = filter === "All" ? products : products.filter((product) => product.category === filter);

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Services and store"
        title="Post-production systems for sharper films."
        copy="Hire Editing Instance for polished video work, or buy digital assets that bring the same finishing language into your own timeline."
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
          <button className={filter === category ? "chip active" : "chip"} key={category} type="button" onClick={() => setFilter(category)}>
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

function Admin({
  onProjectCreated,
  onProductCreated,
}: {
  onProjectCreated: (project: Project) => void;
  onProductCreated: (product: Product) => void;
}) {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [tab, setTab] = useState<AdminTab>("portfolio");
  const [projectForm, setProjectForm] = useState<{
    title: string;
    role: string;
    category: string;
    year: string;
    featured: boolean;
  }>({
    title: "",
    role: "",
    category: portfolioCategories[0].value,
    year: String(new Date().getFullYear()),
    featured: false,
  });
  const [productForm, setProductForm] = useState({
    title: "",
    category: "Premium Text Animations",
    price: "0",
    description: "",
    features: "",
    isFree: false,
  });
  const [projectVideo, setProjectVideo] = useState<File | null>(null);
  const [projectPoster, setProjectPoster] = useState<File | null>(null);
  const [productCover, setProductCover] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productCategories = [
    "Premium Text Animations",
    "Free Motion Graphics",
    "LUTs",
    "Transitions",
    "Editor Essentials",
    "Premiere Plugins",
    "Soundscapes",
    "Presets",
  ];

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function uploadPublicFile(bucket: "portfolio" | "products", file: File, folder: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const path = getUploadPath(file, folder);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
    });

    if (uploadError) {
      throw uploadError;
    }

    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Supabase is not configured. Add your project URL and anon key to .env first.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginData.email.trim(),
      password: loginData.password,
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    setLoginData({ email: "", password: "" });
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }

    if (!projectVideo || !projectPoster) {
      setError("Choose both a portfolio video and poster image.");
      return;
    }

    setStatus("uploading");

    try {
      const [videoUrl, posterUrl] = await Promise.all([
        uploadPublicFile("portfolio", projectVideo, "videos"),
        uploadPublicFile("portfolio", projectPoster, "posters"),
      ]);

      const payload = {
        title: projectForm.title.trim(),
        role: projectForm.role.trim() || "Video edit",
        category: projectForm.category,
        year: projectForm.year.trim() || String(new Date().getFullYear()),
        poster_url: posterUrl,
        video_url: videoUrl,
        featured: projectForm.featured,
      };

      const { data, error: insertError } = await supabase
        .from("portfolio_projects")
        .insert(payload)
        .select("id,title,role,category,year,poster_url,video_url,featured")
        .single();

      if (insertError) {
        throw insertError;
      }

      onProjectCreated(mapProject(data as ProjectRow));
      setStatus("success");
      setMessage("Portfolio video published.");
      setProjectForm({
        title: "",
        role: "",
        category: portfolioCategories[0].value,
        year: String(new Date().getFullYear()),
        featured: false,
      });
      setProjectVideo(null);
      setProjectPoster(null);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError((uploadError as { message?: string }).message || "Unable to publish portfolio video.");
      setStatus("idle");
      return;
    }

    setTimeout(() => setStatus("idle"), 1600);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }

    if (!productCover) {
      setError("Choose a cover image for the asset.");
      return;
    }

    const price = productForm.isFree ? 0 : Number(productForm.price);
    if (!productForm.isFree && (!Number.isFinite(price) || price <= 0)) {
      setError("Paid assets need a price greater than zero.");
      return;
    }

    setStatus("uploading");

    try {
      const [coverUrl, fileUrl] = await Promise.all([
        uploadPublicFile("products", productCover, "covers"),
        productFile ? uploadPublicFile("products", productFile, "files") : Promise.resolve(undefined),
      ]);

      const payload = {
        title: productForm.title.trim(),
        category: productForm.category,
        price,
        cover_url: coverUrl,
        description: productForm.description.trim(),
        features: productForm.features
          .split(/\n|,/)
          .map((feature) => feature.trim())
          .filter(Boolean),
        file_url: fileUrl,
        is_free: productForm.isFree,
      };

      const { data, error: insertError } = await supabase
        .from("digital_products")
        .insert(payload)
        .select("id,title,category,price,cover_url,description,features,file_url,is_free")
        .single();

      if (insertError) {
        throw insertError;
      }

      onProductCreated(mapProduct(data as ProductRow));
      setStatus("success");
      setMessage("Digital asset published.");
      setProductForm({
        title: "",
        category: "Premium Text Animations",
        price: "0",
        description: "",
        features: "",
        isFree: false,
      });
      setProductCover(null);
      setProductFile(null);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError((uploadError as { message?: string }).message || "Unable to publish digital asset.");
      setStatus("idle");
      return;
    }

    setTimeout(() => setStatus("idle"), 1600);
  }

  if (!sessionEmail) {
    return (
      <main className="page fade-in">
        <PageHeader
          eyebrow="Admin"
          title="Upload studio work."
          copy="Sign in with an invited Supabase admin account to publish portfolio videos and downloadable editing assets."
        />
        <section className="admin-auth glass-card">
          <form onSubmit={handleLogin}>
            <LogIn size={26} />
            <h2>Admin sign in</h2>
            {error && <p className="form-error">{error}</p>}
            <label>
              Email
              <input
                type="email"
                value={loginData.email}
                onChange={(event) => setLoginData({ ...loginData, email: event.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginData.password}
                onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
                required
              />
            </label>
            <button className="primary-btn full" type="submit">Sign in</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Admin"
        title="Publish uploads."
        copy="Upload portfolio videos, poster frames, product covers, and downloadable asset files directly into Supabase."
      />
      <div className="admin-toolbar">
        <div className="filter-bar" aria-label="Admin upload type">
          <button className={tab === "portfolio" ? "chip active" : "chip"} type="button" onClick={() => setTab("portfolio")}>
            Portfolio videos
          </button>
          <button className={tab === "assets" ? "chip active" : "chip"} type="button" onClick={() => setTab("assets")}>
            Digital assets
          </button>
        </div>
        <button className="secondary-btn" type="button" onClick={handleLogout}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
      {(error || message) && (
        <p className={error ? "form-error admin-message" : "form-success admin-message"}>
          {error || message}
        </p>
      )}

      {tab === "portfolio" ? (
        <section className="admin-layout">
          <form className="glass-card admin-card admin-form" onSubmit={handleProjectSubmit}>
            <FileVideo size={28} />
            <h2>Portfolio video</h2>
            <div className="admin-form-grid">
              <label>
                Title
                <input value={projectForm.title} onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })} required />
              </label>
              <label>
                Role / credit
                <input value={projectForm.role} onChange={(event) => setProjectForm({ ...projectForm, role: event.target.value })} placeholder="Edit, Grade, Sound Design" />
              </label>
              <label>
                Category
                <select value={projectForm.category} onChange={(event) => setProjectForm({ ...projectForm, category: event.target.value })}>
                  {portfolioCategories.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <input value={projectForm.year} onChange={(event) => setProjectForm({ ...projectForm, year: event.target.value })} required />
              </label>
              <label>
                Video file
                <input type="file" accept="video/*" onChange={(event) => setProjectVideo(event.target.files?.[0] ?? null)} required />
              </label>
              <label>
                Poster image
                <input type="file" accept="image/*" onChange={(event) => setProjectPoster(event.target.files?.[0] ?? null)} required />
              </label>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={projectForm.featured} onChange={(event) => setProjectForm({ ...projectForm, featured: event.target.checked })} />
              Use as featured hero video
            </label>
            <button className="primary-btn full" type="submit" disabled={status === "uploading"}>
              <UploadCloud size={16} /> {status === "uploading" ? "Uploading..." : "Publish video"}
            </button>
          </form>
          <div className="admin-help">
            <article className="glass-card admin-card">
              <Image size={28} />
              <h3>Storage target</h3>
              <p>Videos and posters are uploaded to the public `portfolio` bucket, then saved to `portfolio_projects`.</p>
            </article>
            <article className="glass-card admin-card">
              <Sparkles size={28} />
              <h3>Live update</h3>
              <p>Successful uploads appear in the portfolio immediately and will load from Supabase on future visits.</p>
            </article>
          </div>
        </section>
      ) : (
        <section className="admin-layout">
          <form className="glass-card admin-card admin-form" onSubmit={handleProductSubmit}>
            <FileArchive size={28} />
            <h2>Digital asset</h2>
            <div className="admin-form-grid">
              <label>
                Title
                <input value={productForm.title} onChange={(event) => setProductForm({ ...productForm, title: event.target.value })} required />
              </label>
              <label>
                Category
                <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>
                  {productCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Price
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                  disabled={productForm.isFree}
                  required
                />
              </label>
              <label>
                Cover image
                <input type="file" accept="image/*" onChange={(event) => setProductCover(event.target.files?.[0] ?? null)} required />
              </label>
              <label>
                Asset file
                <input type="file" onChange={(event) => setProductFile(event.target.files?.[0] ?? null)} />
              </label>
              <label>
                Features
                <textarea value={productForm.features} onChange={(event) => setProductForm({ ...productForm, features: event.target.value })} rows={4} placeholder="One feature per line" />
              </label>
            </div>
            <label>
              Description
              <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows={5} required />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={productForm.isFree}
                onChange={(event) => setProductForm({ ...productForm, isFree: event.target.checked, price: event.target.checked ? "0" : productForm.price })}
              />
              Publish as a free download
            </label>
            <button className="primary-btn full" type="submit" disabled={status === "uploading"}>
              <UploadCloud size={16} /> {status === "uploading" ? "Uploading..." : "Publish asset"}
            </button>
          </form>
          <div className="admin-help">
            <article className="glass-card admin-card">
              <Image size={28} />
              <h3>Product media</h3>
              <p>Covers and downloadable files are uploaded to the public `products` bucket, then saved to `digital_products`.</p>
            </article>
            <article className="glass-card admin-card">
              <Check size={28} />
              <h3>Ready to sell</h3>
              <p>New assets appear in Services and on the home product sections as soon as publishing finishes.</p>
            </article>
          </div>
        </section>
      )}
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
        <video ref={videoRef} muted loop playsInline poster={project.posterUrl}>
          <source src={project.videoUrl} type="video/mp4" />
        </video>
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
  return (
    <div className={project.format === "portrait" ? "theater portrait" : "theater"} role="dialog" aria-modal="true">
      <button className="icon-btn close theater-close" type="button" onClick={onClose} aria-label="Close video">
        <X size={18} />
      </button>
      <div className="theater-panel">
        <video controls autoPlay poster={project.posterUrl}>
          <source src={project.videoUrl} type="video/mp4" />
        </video>
        <div className="theater-meta">
          <h2>{project.title}</h2>
          <p>{project.role} · {project.year}</p>
          <Link className="secondary-btn" to="/contact">Get in touch <Mail size={16} /></Link>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onDownload, compact = false }: { product: Product; onDownload: (product: Product) => void; compact?: boolean }) {
  return (
    <article className={`glass-card service-card product-card${compact ? " compact" : ""}`} onClick={() => onDownload(product)}>
      <img src={product.coverUrl} alt={product.title} loading="lazy" />
      <div className="product-card-body">
        <p className="eyebrow">{product.category}</p>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
      </div>
      <div className="product-card-action">
        <button className="secondary-btn full" type="button" onClick={(event) => { event.stopPropagation(); onDownload(product); }}>
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
