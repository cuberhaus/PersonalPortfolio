import { useState, useEffect, useCallback, useMemo } from "react";
import { TRANSLATIONS } from "../../i18n/demos/live-app-embed";
import { getIframeUrl } from "../../data/demo-services";
import { debug } from "../../lib/debug";
import { installIframeForwarder } from "../../lib/debug-iframe";

const log = debug("net:embed");
const uiLog = debug("ui:embed");

type Lang = "en" | "es" | "ca";

interface LiveAppEmbedProps {
  /**
   * Demo slug from src/data/demo-services.json. Preferred — the iframe URL is
   * resolved from the registry so port changes happen in one place.
   */
  slug?: string;
  /**
   * Explicit iframe URL. Used when no slug is registered (or for ad-hoc demos).
   * Overrides the registry value when both are provided.
   */
  url?: string;
  title: string;
  dockerCmd: string;
  devCmd?: string;
  lang?: Lang;
  fallbackSelector?: string;
}

export default function LiveAppEmbed({ slug, url: explicitUrl, title, dockerCmd, devCmd, lang = "en", fallbackSelector }: LiveAppEmbedProps) {
  const url = useMemo(() => {
    if (explicitUrl) return explicitUrl;
    if (slug) {
      const fromRegistry = getIframeUrl(slug);
      if (fromRegistry) return fromRegistry;
      console.warn(`[LiveAppEmbed] slug="${slug}" not found or has no iframeUrl in demo-services.json`);
    }
    return "";
  }, [slug, explicitUrl]);
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [expanded, setExpanded] = useState(true);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const probe = useCallback(() => {
    const ctrl = new AbortController();
    if (!url) {
      setStatus("offline");
      return ctrl;
    }
    log.info("probe", { url, slug });
    const timer = setTimeout(() => ctrl.abort(), 2000);
    fetch(url, { mode: "no-cors", signal: ctrl.signal })
      .then(() => {
        setStatus("online");
        log.info("probe-result", { url, slug, status: "online" });
      })
      .catch((err) => {
        setStatus("offline");
        if (err instanceof DOMException && err.name === "AbortError") {
          log.warn("probe-aborted", { url, slug });
        } else {
          log.warn("probe-failed", { url, slug, err: String(err) });
        }
      })
      .finally(() => clearTimeout(timer));
    return ctrl;
  }, [url, slug]);

  useEffect(() => {
    const ctrl = probe();
    return () => ctrl.abort();
  }, [probe]);

  useEffect(() => {
    if (!url) return;
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      return;
    }
    installIframeForwarder({ allowedOrigins: [origin] });
  }, [url]);

  useEffect(() => {
    if (!fallbackSelector) return;
    const el = document.querySelector(fallbackSelector) as HTMLElement | null;
    if (!el) return;
    el.style.display = status === "online" ? "none" : "";
  }, [status, fallbackSelector]);

  if (status === "checking") {
    return <div style={{ minHeight: 1 }} />;
  }

  if (status === "offline") {
    return (
      <div style={{
        marginBottom: "1.25rem", padding: "1rem 1.25rem",
        background: "var(--bg-card)", border: "1px solid var(--border-color)",
        borderRadius: "0.75rem", fontSize: "0.82rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1rem", opacity: 0.6 }}>&#9898;</span>
          <strong style={{ color: "var(--text-secondary)" }}>{t.offline}</strong>
        </div>
        <p style={{ margin: "0 0 0.6rem", color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.5 }}>
          {t.offlineDesc}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <code style={{
            display: "block", padding: "0.45rem 0.75rem", borderRadius: "0.4rem",
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            fontSize: "0.75rem", color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)",
          }}>{dockerCmd}</code>
          {devCmd && (
            <>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>{t.or}</span>
              <code style={{
                display: "block", padding: "0.45rem 0.75rem", borderRadius: "0.4rem",
                background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                fontSize: "0.75rem", color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)",
              }}>{devCmd}</code>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
        padding: "0.65rem 1rem", borderRadius: expanded ? "0.75rem 0.75rem 0 0" : "0.75rem",
        background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.10))",
        border: "1px solid rgba(16,185,129,0.3)",
        borderBottom: expanded ? "none" : undefined,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--status-online)", display: "inline-block", boxShadow: "0 0 6px color-mix(in srgb, var(--status-online) 55%, transparent)" }} />
          <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{t.live}</strong>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {t.runningAt} <code style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, monospace)" }}>{url}</code>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => uiLog.info("open-tab", { url, slug })} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.35rem", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer",
          }}>{t.openTab} &#8599;</a>
          <button onClick={() => {
            const next = !expanded;
            setExpanded(next);
            uiLog.info(next ? "expand" : "collapse", { url, slug });
          }} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.35rem", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}>{expanded ? t.collapse : t.expand}</button>
        </div>
      </div>
      {expanded && (
        <iframe
          src={url}
          title={title}
          style={{
            width: "100%", height: "80vh", border: "1px solid var(--border-color)",
            borderTop: "none", borderRadius: "0 0 0.75rem 0.75rem",
            background: "var(--bg-secondary)",
          }}
          allow="clipboard-write"
        />
      )}
    </div>
  );
}
