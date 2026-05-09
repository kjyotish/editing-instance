import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Film,
  ImagePlus,
  Lock,
  Menu,
  Monitor,
  Moon,
  Package,
  Play,
  ShoppingBag,
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
];

type PortfolioFilter = "all" | PortfolioCategory;
type ThemeMode = "system" | "light" | "dark";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "Device theme", icon: Monitor },
  { value: "light", label: "Light mode", icon: Sun },
  { value: "dark", label: "Dark mode", icon: Moon },
];

function getPortfolioCategoryLabel(category: PortfolioCategory) {
  return portfolioCategories.find((item) => item.value === category)?.label ?? category;
}

function App() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [cartItem, setCartItem] = useState<Product | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem("editing-instance-theme");
    return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("editing-instance-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <Nav menuOpen={menuOpen} theme={theme} onThemeChange={setTheme} onMenuToggle={() => setMenuOpen((value) => !value)} />
      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      <Routes>
        <Route path="/" element={<Home products={products} projects={projects} onBuy={setCartItem} />} />
        <Route path="/portfolio" element={<Portfolio projects={projects} />} />
        <Route path="/services" element={<Services products={products} onBuy={setCartItem} />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin onAddProject={setProjects} onAddProduct={setProducts} customCategories={customCategories} onAddCategory={setCustomCategories} />} />
      </Routes>
      <Footer />
      {cartItem && <CartDrawer product={cartItem} onClose={() => setCartItem(null)} />}
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
          <Link className="admin-link" to="/admin">Admin</Link>
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
      <NavLink to="/admin" onClick={onClose}>Admin</NavLink>
    </div>
  );
}

function Home({
  products,
  projects,
  onBuy,
}: {
  products: Product[];
  projects: Project[];
  onBuy: (product: Product) => void;
}) {
  const featured = products[0];
  const featuredProject = projects.find((project) => project.featured) ?? projects[0];

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
            <Link className="secondary-btn light" to="/services">Digital Products</Link>
          </div>
        </div>
      </section>

      <section className="section two-col">
        <div>
          <p className="eyebrow">Featured project</p>
          <h2>Clean edits with cinematic restraint.</h2>
          <p className="section-copy">Commercial cuts, wedding films, music videos, documentaries, and short-form social assets built around pacing, polish, and emotional clarity.</p>
        </div>
        <ProjectPreview project={featuredProject} />
      </section>

      <section className="section product-heading">
        <div>
          <p className="eyebrow">Featured digital product</p>
          <h2>{featured.title}</h2>
        </div>
      </section>

      <section className="section feature-band">
        <div className="product-spotlight">
          <img src={featured.coverUrl} alt={featured.title} loading="lazy" />
          <div>
            <p className="eyebrow">Featured digital product</p>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <button className="primary-btn" type="button" onClick={() => onBuy(featured)}>
              Add to Bag <ShoppingBag size={16} />
            </button>
          </div>
        </div>
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

function Services({ products, onBuy }: { products: Product[]; onBuy: (product: Product) => void }) {
  const [filter, setFilter] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const visibleProducts = filter === "All" ? products : products.filter((product) => product.category === filter);

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Services and store"
        title="Post-production systems for sharper films."
        copy="Hire Editing Instance for polished video work, or buy digital products that bring the same finishing language into your own timeline."
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
          <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
        ))}
      </section>
      {selectedProduct && (
        <ProductDetail product={selectedProduct} onBuy={onBuy} onClose={() => setSelectedProduct(null)} />
      )}
    </main>
  );
}

function About() {
  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="About Editing Instance"
        title="A precise, modern editing studio for creators with taste."
        copy="Editing Instance blends editorial discipline with product thinking: organized workflows, fast feedback, tasteful grading, and delivery systems that scale."
      />
      <section className="about-grid">
        <img src="https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?auto=format&fit=crop&w=1400&q=80" alt="Video editing suite" loading="lazy" />
        <div className="glass-card about-panel">
          <h2>Built for serious visual work.</h2>
          <p>Every project is handled with a clean pipeline: ingest, story assembly, pacing, polish, grade, sound, delivery, and archival. The goal is simple: make the work feel expensive, intentional, and effortless.</p>
          <div className="stats">
            <span><strong>5+</strong> edit categories</span>
            <span><strong>24h</strong> response window</span>
            <span><strong>4K</strong> delivery-ready</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Admin({
  onAddProject,
  onAddProduct,
  customCategories,
  onAddCategory,
}: {
  onAddProject: React.Dispatch<React.SetStateAction<Project[]>>;
  onAddProduct: React.Dispatch<React.SetStateAction<Product[]>>;
  customCategories: string[];
  onAddCategory: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Use Supabase Auth to protect real uploads.");
  const [busy, setBusy] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setStatus("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable secure admin auth.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    setStatus(error ? error.message : "Magic link sent. Check your inbox.");
  }

  function addDemoProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let category: string;
    
    if (useCustomCategory) {
      const customCat = String(form.get("customCategory") || "Untitled Category").trim();
      category = customCat;
      if (!customCategories.includes(customCat)) {
        onAddCategory([...customCategories, customCat]);
      }
    } else {
      category = String(form.get("category") || portfolioCategories[0].value);
    }
    
    const title = String(form.get("title") || "Untitled Project");
    const format = String(form.get("format") || "landscape") as NonNullable<Project["format"]>;
    onAddProject((items) => [
      {
        id: crypto.randomUUID(),
        title,
        category,
        format,
        role: "Admin uploaded edit",
        year: "2026",
        posterUrl: String(form.get("posterUrl") || seedProjects[0].posterUrl),
        videoUrl: String(form.get("videoUrl") || seedProjects[0].videoUrl),
      },
      ...items,
    ]);
    event.currentTarget.reset();
    setUseCustomCategory(false);
    setNewCategoryName("");
    setStatus("Portfolio item added to this session. Connect Supabase storage for permanent uploads.");
  }

  function addDemoProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddProduct((items) => [
      {
        id: crypto.randomUUID(),
        title: String(form.get("title") || "Untitled Product"),
        category: String(form.get("category") || "LUTs") as Product["category"],
        price: Number(form.get("price") || 49),
        coverUrl: String(form.get("coverUrl") || seedProducts[0].coverUrl),
        description: String(form.get("description") || "A premium digital product for editors."),
        features: ["Secure download", "Instant delivery", "Commercial usage"],
      },
      ...items,
    ]);
    event.currentTarget.reset();
    setStatus("Digital product added to this session. Supabase table writes are ready to wire after schema setup.");
  }

  return (
    <main className="page fade-in">
      <PageHeader
        eyebrow="Admin panel"
        title="Upload portfolio videos and digital products."
        copy="A secure browser admin surface for Supabase Auth, storage, product metadata, and portfolio publishing."
      />
      <section className="admin-grid">
        <form className="glass-card admin-card" onSubmit={sendMagicLink}>
          <Lock size={22} />
          <h3>Admin sign in</h3>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@email.com" required />
          <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Sending..." : "Send magic link"}</button>
          <p className="muted">{isSupabaseConfigured ? status : "Supabase is not configured yet. Demo publishing still works locally."}</p>
        </form>

        <form className="glass-card admin-card" onSubmit={addDemoProject}>
          <Film size={22} />
          <h3>Portfolio upload</h3>
          <input name="title" placeholder="Project title" required />
          <label style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--color-muted)", fontSize: "14px", cursor: "pointer", marginBottom: "8px" }}>
            <input type="checkbox" checked={useCustomCategory} onChange={(e) => setUseCustomCategory(e.target.checked)} style={{ cursor: "pointer" }} />
            Create new category
          </label>
          {useCustomCategory ? (
            <input name="customCategory" placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
          ) : (
            <select name="category" defaultValue={portfolioCategories[0].value}>
              {portfolioCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
              {customCategories.map((customCat) => (
                <option key={customCat} value={customCat}>
                  {customCat}
                </option>
              ))}
            </select>
          )}
          <select name="format" defaultValue="landscape">
            <option value="landscape">Landscape video</option>
            <option value="portrait">Portrait video</option>
          </select>
          <input name="posterUrl" placeholder="Poster image URL" />
          <input name="videoUrl" placeholder="Video preview URL" />
          <button className="secondary-btn" type="submit"><UploadCloud size={16} /> Publish project</button>
        </form>

        <form className="glass-card admin-card" onSubmit={addDemoProduct}>
          <Package size={22} />
          <h3>Product upload</h3>
          <input name="title" placeholder="Product title" required />
          <select name="category" defaultValue="LUTs">
            <option>LUTs</option>
            <option>Premiere Plugins</option>
            <option>Soundscapes</option>
            <option>Presets</option>
          </select>
          <input name="price" placeholder="Price" type="number" min="1" />
          <input name="coverUrl" placeholder="Cover image URL" />
          <textarea name="description" placeholder="Product description" rows={4} />
          <button className="secondary-btn" type="submit"><ImagePlus size={16} /> Publish product</button>
        </form>
      </section>
      <p className="admin-note">{status}</p>
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("modal-open");
    };
  }, []);

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
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product) => void }) {
  return (
    <article className="glass-card product-card" onClick={() => onSelect(product)}>
      <span className="price">${product.price}</span>
      <img src={product.coverUrl} alt={product.title} loading="lazy" />
      <p className="eyebrow">{product.category}</p>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
    </article>
  );
}

function ProductDetail({
  product,
  onBuy,
  onClose,
}: {
  product: Product;
  onBuy: (product: Product) => void;
  onClose: () => void;
}) {
  const [slider, setSlider] = useState(58);

  return (
    <div className="product-modal" role="dialog" aria-modal="true">
      <button className="icon-btn close" type="button" onClick={onClose} aria-label="Close product detail">
        <X size={20} />
      </button>
      <div className="product-detail">
        <div className="before-after">
          <img src={product.coverUrl} alt={`${product.title} before preview`} />
          <div className="after-layer" style={{ width: `${slider}%` }}>
            <img src={product.coverUrl} alt={`${product.title} after preview`} />
          </div>
          <input value={slider} min="15" max="85" type="range" onChange={(event) => setSlider(Number(event.target.value))} aria-label="Before after preview slider" />
        </div>
        <div className="buy-box glass-card">
          <p className="eyebrow">{product.category}</p>
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <strong className="detail-price">${product.price}</strong>
          <ul>
            {product.features.map((feature) => (
              <li key={feature}><Check size={17} /> {feature}</li>
            ))}
          </ul>
          <button className="primary-btn full" type="button" onClick={() => onBuy(product)}>
            Add to Bag <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const total = useMemo(() => product.price.toFixed(2), [product.price]);

  function pay(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setPaid(true);
    }, 900);
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
          <label>Card number<input required inputMode="numeric" placeholder="4242 4242 4242 4242" /></label>
          <label>Name on card<input required placeholder="Editing Instance" /></label>
          <div className="payment-grid">
            <label>Expiry<input required placeholder="08/29" /></label>
            <label>CVC<input required inputMode="numeric" placeholder="123" /></label>
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
  return (
    <footer className="site-footer">
      <span>Editing Instance</span>
      <span>Portfolio · Services · Digital Products</span>
    </footer>
  );
}

export default App;
