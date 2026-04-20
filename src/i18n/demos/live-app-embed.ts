export const TRANSLATIONS = {
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
} as const;

export type LiveAppEmbedTranslations = typeof TRANSLATIONS.en;
