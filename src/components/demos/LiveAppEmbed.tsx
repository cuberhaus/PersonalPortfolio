import { useState, useEffect, useCallback } from "react";

type Lang = "en" | "es" | "ca";

interface LiveAppEmbedProps {
  url: string;
  title: string;
  dockerCmd: string;
  devCmd?: string;
  lang?: Lang;
}

const T = {
  en: {
    checking: "Checking local service…",
    live: "Live app detected",
    runningAt: "Running at",
    openTab: "Open in new tab",
    collapse: "Collapse",
    expand: "Show live app",
    offline: "Run locally to see the full app",
    offlineDesc: "Start the backend with Docker or natively, then refresh this page.",
    or: "or",
  },
  es: {
    checking: "Comprobando servicio local…",
    live: "App en vivo detectada",
    runningAt: "Ejecutándose en",
    openTab: "Abrir en nueva pestaña",
    collapse: "Colapsar",
    expand: "Mostrar app en vivo",
    offline: "Ejecútalo localmente para ver la app completa",
    offlineDesc: "Inicia el backend con Docker o de forma nativa, luego recarga esta página.",
    or: "o",
  },
  ca: {
    checking: "Comprovant servei local…",
    live: "App en viu detectada",
    runningAt: "Executant-se a",
    openTab: "Obrir en una nova pestanya",
    collapse: "Col·lapsar",
    expand: "Mostrar app en viu",
    offline: "Executa'l localment per veure l'app completa",
    offlineDesc: "Inicia el backend amb Docker o de forma nativa, després recarrega aquesta pàgina.",
    or: "o",
  },
};

export default function LiveAppEmbed({ url, title, dockerCmd, devCmd, lang = "en" }: LiveAppEmbedProps) {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [expanded, setExpanded] = useState(true);
  const t = T[lang] || T.en;

  const probe = useCallback(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    fetch(url, { mode: "no-cors", signal: ctrl.signal })
      .then(() => setStatus("online"))
      .catch(() => setStatus("offline"))
      .finally(() => clearTimeout(timer));
  }, [url]);

  useEffect(() => { probe(); }, [probe]);

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
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e88" }} />
          <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{t.live}</strong>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {t.runningAt} <code style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, monospace)" }}>{url}</code>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.35rem", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer",
          }}>{t.openTab} &#8599;</a>
          <button onClick={() => setExpanded(!expanded)} style={{
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
            background: "#0f172a",
          }}
          allow="clipboard-write"
        />
      )}
    </div>
  );
}
