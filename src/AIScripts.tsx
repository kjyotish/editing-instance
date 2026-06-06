import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Filter, Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "./components/PageHeader";
import type { AIScript } from "./types";

export const DEFAULT_AI_SCRIPT_CATEGORIES = [
  "Sales Scripts",
  "Brand Story",
  "UGC Ads",
  "Reels Hooks",
  "Testimonial Ads",
  "Voiceover Scripts",
  "Product Explainers",
  "Appointment Booking",
];

export const DEFAULT_AI_SCRIPT_LANGUAGES = [
  "English",
  "Hindi",
  "Punjabi",
  "Urdu",
  "Bengali",
  "Arabic",
  "Spanish",
  "French",
  "Portuguese",
];

const LANGUAGE_PHRASE_MAP: Record<string, Array<[string, string]>> = {
  Hindi: [
    ["book now", "अभी बुक करें"],
    ["call now", "अभी कॉल करें"],
    ["limited offer", "सीमित ऑफर"],
    ["get started", "शुरू करें"],
    ["learn more", "और जानें"],
    ["thank you", "धन्यवाद"],
    ["hello", "नमस्ते"],
  ],
  Punjabi: [
    ["book now", "ਹੁਣੇ ਬੁੱਕ ਕਰੋ"],
    ["call now", "ਹੁਣੇ ਕਾਲ ਕਰੋ"],
    ["limited offer", "ਸੀਮਿਤ ਪੇਸ਼ਕਸ਼"],
    ["get started", "ਹੁਣ ਸ਼ੁਰੂ ਕਰੋ"],
    ["learn more", "ਹੋਰ ਜਾਣੋ"],
    ["thank you", "ਧੰਨਵਾਦ"],
    ["hello", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ"],
  ],
  Urdu: [
    ["book now", "ابھی بک کریں"],
    ["call now", "ابھی کال کریں"],
    ["limited offer", "محدود پیشکش"],
    ["get started", "شروع کریں"],
    ["learn more", "مزید جانیں"],
    ["thank you", "شکریہ"],
    ["hello", "السلام علیکم"],
  ],
  Bengali: [
    ["book now", "এখনই বুক করুন"],
    ["call now", "এখনই কল করুন"],
    ["limited offer", "সীমিত অফার"],
    ["get started", "শুরু করুন"],
    ["learn more", "আরও জানুন"],
    ["thank you", "ধন্যবাদ"],
    ["hello", "হ্যালো"],
  ],
  Arabic: [
    ["book now", "احجز الآن"],
    ["call now", "اتصل الآن"],
    ["limited offer", "عرض محدود"],
    ["get started", "ابدأ الآن"],
    ["learn more", "اعرف المزيد"],
    ["thank you", "شكرًا لك"],
    ["hello", "مرحبًا"],
  ],
  Spanish: [
    ["book now", "Reserva ahora"],
    ["call now", "Llama ahora"],
    ["limited offer", "Oferta limitada"],
    ["get started", "Comienza ahora"],
    ["learn more", "Saber más"],
    ["thank you", "Gracias"],
    ["hello", "Hola"],
  ],
  French: [
    ["book now", "Réservez maintenant"],
    ["call now", "Appelez maintenant"],
    ["limited offer", "Offre limitée"],
    ["get started", "Commencer maintenant"],
    ["learn more", "En savoir plus"],
    ["thank you", "Merci"],
    ["hello", "Bonjour"],
  ],
  Portuguese: [
    ["book now", "Reserve agora"],
    ["call now", "Ligue agora"],
    ["limited offer", "Oferta limitada"],
    ["get started", "Comece agora"],
    ["learn more", "Saiba mais"],
    ["thank you", "Obrigado"],
    ["hello", "Olá"],
  ],
};

export function getAIScriptCategoryLabel(category: string) {
  return category
    .trim()
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" ");
}

export function getAIScriptLanguageLabel(language: string) {
  return language
    .trim()
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" ");
}

export function replaceBusinessNameTokens(text: string, businessName: string) {
  const replacement = businessName.trim() || "Your Business";
  return text
    .replace(/\{\{\s*business_name\s*\}\}/gi, replacement)
    .replace(/\[\[\s*business_name\s*\]\]/gi, replacement)
    .replace(/\{\s*business_name\s*\}/gi, replacement)
    .replace(/\[\s*business_name\s*\]/gi, replacement);
}

export function getEffectiveBusinessName(script: AIScript, businessName: string) {
  return businessName.trim() || script.defaultBusinessName?.trim() || "Your Business";
}

export function personalizeAIScriptContent(script: AIScript, businessName: string) {
  const effectiveBusinessName = getEffectiveBusinessName(script, businessName);
  let content = script.content;

  if (script.defaultBusinessName?.trim()) {
    content = content.split(script.defaultBusinessName).join(effectiveBusinessName);
  }

  return replaceBusinessNameTokens(content, effectiveBusinessName);
}

export function localizeAIScriptContent(script: AIScript, businessName: string, language: string) {
  const effectiveBusinessName = getEffectiveBusinessName(script, businessName);
  const sourceLanguage = getAIScriptLanguageLabel(script.language || "English");
  const targetLanguage = getAIScriptLanguageLabel(language || script.language || "English");
  let content = personalizeAIScriptContent(script, effectiveBusinessName);

  if (targetLanguage && targetLanguage !== sourceLanguage) {
    content = translateContent(content, targetLanguage);
  }

  return content;
}

export function getEffectiveScriptLanguage(script: AIScript, language: string) {
  return language.trim() || script.language?.trim() || "English";
}

export function downloadAIScriptPdf(
  script: AIScript,
  businessName: string,
  languageOverride?: string,
) {
  const effectiveBusinessName = getEffectiveBusinessName(script, businessName);
  const effectiveLanguage = getEffectiveScriptLanguage(script, languageOverride || "");
  const content = localizeAIScriptContent(script, businessName, effectiveLanguage);

  const html = buildPrintableHtml({
    title: script.title,
    category: script.category,
    businessName: effectiveBusinessName,
    language: effectiveLanguage,
    summary: script.summary,
    content,
  });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.inset = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.srcdoc = html;

  const cleanup = () => {
    iframe.remove();
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    frameWindow.focus();
    try {
      frameWindow.print();
    } catch {
      // Some browsers may block print; still cleanup.
    }

    setTimeout(cleanup, 500);
  };

  document.body.appendChild(iframe);
}

export function AIScriptsPage({
  scripts,
}: {
  scripts: AIScript[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businessName, setBusinessName] = useState("");
  const [language, setLanguage] = useState("");
  const [activeScript, setActiveScript] = useState<AIScript | null>(null);
  const [activeScriptLanguage, setActiveScriptLanguage] = useState("");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(
      scripts.map((script) => (script.category || "").trim()).filter(Boolean),
    )).sort();
  }, [scripts]);

  const languages = useMemo(() => {
    return Array.from(new Set([
      ...DEFAULT_AI_SCRIPT_LANGUAGES,
      ...scripts.map((script) => script.language || "English"),
    ])).sort();
  }, [scripts]);

  const categoryParam = searchParams.get("category");
  const activeCategory = categoryParam && categories.includes(categoryParam) ? categoryParam : "All";

  const filteredScripts = scripts.filter((script) => {
    const categoryMatches = activeCategory === "All" || script.category === activeCategory;
    const languageMatches = !language || (script.language || "English") === language;
    const queryMatches = !query.trim()
      || `${script.title} ${script.summary} ${script.content}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatches && languageMatches && queryMatches;
  });

  const groupedScripts = useMemo(() => {
    const byCategory = new Map<string, AIScript[]>();

    filteredScripts.forEach((script) => {
      const list = byCategory.get(script.category) ?? [];
      list.push(script);
      byCategory.set(script.category, list);
    });

    return Array.from(byCategory.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [filteredScripts]);

  useEffect(() => {
    if (activeScript && !filteredScripts.some((script) => script.id === activeScript.id)) {
      setActiveScript(null);
    }
  }, [activeScript, filteredScripts]);

  useEffect(() => {
    if (activeScript) {
      setActiveScriptLanguage(activeScript.language || "English");
    } else {
      setActiveScriptLanguage("");
    }
  }, [activeScript]);

  function getScriptLanguage(script: AIScript) {
    if (activeScript?.id === script.id) {
      return activeScriptLanguage || script.language || "English";
    }

    return script.language || "English";
  }

  function getPreviewContent(script: AIScript, languageOverride?: string) {
    return localizeAIScriptContent(script, businessName, languageOverride || getScriptLanguage(script));
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (activeScript) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("modal-open");
    };
  }, [activeScript]);

  return (
    <main className="page fade-in aiscripts-page">
      <PageHeader
        eyebrow="AI Scripts"
        title="Upload-ready scripts with editable business names."
        copy="Browse scripts by category, personalize the business name before downloading, and export a clean PDF for client delivery or internal use."
      />

      <section className="glass-card aiscripts-hero-card">
        <div>
          <p className="eyebrow">Personalize before download</p>
          <h2>Make every script feel branded</h2>
          <p className="section-copy">
            Add your firm or business name once, preview how the script reads, then download the final PDF with the placeholder replaced everywhere.
          </p>
        </div>
        <div className="aiscripts-controls">
          <label>
            Search scripts
            <div className="input-with-icon">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search title, summary, or body"
              />
            </div>
          </label>
          <label>
            Script language
            <select value={language} onChange={(event) => setLanguage(event.currentTarget.value)}>
              <option value="">All languages</option>
              {languages.map((item) => (
                <option key={item} value={item}>
                  {getAIScriptLanguageLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="filter-bar aiscripts-filter" aria-label="AI script categories">
        <button
          className={activeCategory === "All" ? "chip active" : "chip"}
          type="button"
          onClick={() => setSearchParams({})}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            className={activeCategory === category ? "chip active" : "chip"}
            key={category}
            type="button"
            onClick={() => setSearchParams({ category })}
          >
            {getAIScriptCategoryLabel(category)}
          </button>
        ))}
      </div>

      <div className="aiscripts-summary-row">
        <div className="glass-card aiscripts-summary-card">
          <Filter size={18} />
          <strong>{filteredScripts.length}</strong>
          <span>Scripts available</span>
        </div>
        <div className="glass-card aiscripts-summary-card">
          <FileText size={18} />
          <strong>{categories.length}</strong>
          <span>Script categories</span>
        </div>
      </div>

      {groupedScripts.length === 0 ? (
        <p className="empty-state">No AI scripts have been published yet.</p>
      ) : (
        groupedScripts.map(([category, categoryScripts]) => (
          <section className="aiscripts-category-section" key={category}>
            <div className="category-header">
              <div>
                <p className="eyebrow">{getAIScriptCategoryLabel(category)}</p>
                <h2>{getAIScriptCategoryLabel(category)}</h2>
                <p className="section-copy">
                  Scripts in this category are ready for client use and can be personalized with your business name before download.
                </p>
              </div>
            </div>
            <div className="store-grid">
              {categoryScripts.map((script) => (
                <article className="glass-card service-card script-card" key={script.id}>
                  <div className="script-card-top">
                    <span className="badge">{getAIScriptCategoryLabel(script.category)}</span>
                    <span className="muted">{getAIScriptLanguageLabel(getScriptLanguage(script))}</span>
                  </div>
                  <h3>{script.title}</h3>
                  <p>{script.summary}</p>
                  <p className="script-excerpt">
                    {getPreviewContent(script).slice(0, 220)}
                    {script.content.length > 220 ? "..." : ""}
                  </p>
                  <div className="product-card-action">
                    <button className="secondary-btn full" type="button" onClick={() => setActiveScript(script)}>
                      Preview script
                    </button>
                    <button
                      className="primary-btn full"
                      type="button"
                      onClick={() => downloadAIScriptPdf(script, businessName, getScriptLanguage(script))}
                    >
                      Download PDF <Download size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {activeScript && (
        <div className="product-modal aiscripts-modal" role="dialog" aria-modal="true" aria-label={`${activeScript.title} preview`}>
          <button className="icon-btn close theater-close" type="button" onClick={() => setActiveScript(null)} aria-label="Close script preview">
            <X size={18} />
          </button>
          <div className="product-detail aiscripts-detail">
            <div className="glass-card aiscripts-preview-panel">
              <p className="eyebrow">{getAIScriptCategoryLabel(activeScript.category)}</p>
              <h2>{activeScript.title}</h2>
              <p>{activeScript.summary}</p>
              <label>
                Script language
                <select
                  value={activeScriptLanguage}
                  onChange={(event) => setActiveScriptLanguage(event.currentTarget.value)}
                >
                  {languages.map((item) => (
                    <option key={item} value={item}>
                      {getAIScriptLanguageLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="aiscripts-preview-body">
                {getPreviewContent(activeScript, activeScriptLanguage)
                  .split("\n")
                  .map((line, index) => (
                    <p key={`${line}-${index}`}>{line || "\u00a0"}</p>
                  ))}
              </div>
            </div>
            <div className="glass-card buy-box aiscripts-download-panel">
              <p className="eyebrow">PDF export</p>
              <h3>{activeScript.title}</h3>
              <p>Change the business name once, then export the final script in PDF format.</p>
              <div className="script-meta-row">
                <span>{getAIScriptLanguageLabel(activeScriptLanguage || activeScript.language || "English")}</span>
              </div>
              <label>
                Business name
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.currentTarget.value)}
                  placeholder="Your business name"
                />
              </label>
              <button
                className="primary-btn full"
                type="button"
                onClick={() => downloadAIScriptPdf(activeScript, businessName, activeScriptLanguage || activeScript.language || "English")}
              >
                Download PDF <Download size={16} />
              </button>
              <Link className="secondary-btn full" to="/contact">
                Request custom script
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function buildPrintableHtml({
  title,
  category,
  businessName,
  language,
  summary,
  content,
}: {
  title: string;
  category: string;
  businessName: string;
  language: string;
  summary: string;
  content: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeCategory = escapeHtml(category);
  const safeBusinessName = escapeHtml(businessName);
  const safeSummary = escapeHtml(summary || "No summary provided.");
  const safeContent = escapeHtml(content).replace(/\n/g, "<br />");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: light; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111827;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }
    body { padding: 24px; }
    article {
      max-width: 780px;
      margin: 0 auto;
    }
    .eyebrow {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      line-height: 1.1;
      font-weight: 800;
    }
    .meta {
      display: grid;
      gap: 8px;
      margin-bottom: 20px;
      color: #374151;
      font-size: 13px;
    }
    .summary {
      margin: 0 0 18px;
      font-size: 15px;
      white-space: pre-wrap;
    }
    .content {
      font-size: 15px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    footer {
      margin-top: 28px;
      font-size: 12px;
      color: #6b7280;
    }
    @page {
      size: auto;
      margin: 24px;
    }
    @media print {
      body { padding: 0; }
      html, body { background: #fff; }
      article { margin: 0; }
    }
  </style>
</head>
<body>
  <article>
    <p class="eyebrow">${safeCategory}</p>
    <h1>${safeTitle}</h1>
    <div class="meta">
      <div><strong>Business name:</strong> ${safeBusinessName}</div>
      <div><strong>Language:</strong> ${escapeHtml(language)}</div>
    </div>
    <p class="summary">${safeSummary}</p>
    <div class="content">${safeContent}</div>
    <footer>Generated from Editing Instance</footer>
  </article>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function translateContent(text: string, language: string) {
  const phrases = LANGUAGE_PHRASE_MAP[language] || [];
  return phrases.reduce((currentText, [source, target]) => {
    const pattern = new RegExp(escapeRegExp(source), "gi");
    return currentText.replace(pattern, target);
  }, text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
