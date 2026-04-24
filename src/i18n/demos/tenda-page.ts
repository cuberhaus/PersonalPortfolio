// Page-UI strings for the tenda demo (extends card data in src/data/demos*.json).
export type TendaLang = 'en' | 'es' | 'ca';

export interface TendaCopy {
  liveApp: string;
  startHint: string;
  openNewTab: string;
  runLocal: string;
  step1: string;
  step2: string;
  step3: string;
  runNote: string;
}

export const TENDA_COPY: Record<TendaLang, TendaCopy> = {
  en: {
    liveApp: "Live app (runs locally)",
    startHint: "Start the PHP app: <code>cd tenda_online && docker compose up -d && ./start.sh</code>",
    openNewTab: "Open in new tab",
    runLocal: "Run the real app locally",
    step1: "<code>cd tenda_online</code>",
    step2: "<code>docker compose up -d</code> — starts MySQL and loads the schema",
    step3: "<code>./start.sh</code> — starts the PHP server at <a href=\"http://localhost:8888\" target=\"_blank\" rel=\"noopener\">localhost:8888</a>",
    runNote: "Requires: PHP, Docker (for MySQL). The iframe above shows the live app when it's running.",
  },
  es: {
    liveApp: "App en vivo (se ejecuta localmente)",
    startHint: "Inicia la app PHP: <code>cd tenda_online && docker compose up -d && ./start.sh</code>",
    openNewTab: "Abrir en nueva pestaña",
    runLocal: "Ejecutar la app real localmente",
    step1: "<code>cd tenda_online</code>",
    step2: "<code>docker compose up -d</code> — inicia MySQL y carga el esquema",
    step3: "<code>./start.sh</code> — inicia el servidor PHP en <a href=\"http://localhost:8888\" target=\"_blank\" rel=\"noopener\">localhost:8888</a>",
    runNote: "Requiere: PHP, Docker (para MySQL). El iframe de arriba muestra la app en vivo cuando se está ejecutando.",
  },
  ca: {
    liveApp: "App en viu (s'executa localment)",
    startHint: "Inicia l'app PHP: <code>cd tenda_online && docker compose up -d && ./start.sh</code>",
    openNewTab: "Obrir en nova pestanya",
    runLocal: "Executar l'app real localment",
    step1: "<code>cd tenda_online</code>",
    step2: "<code>docker compose up -d</code> — inicia MySQL i carrega l'esquema",
    step3: "<code>./start.sh</code> — inicia el servidor PHP a <a href=\"http://localhost:8888\" target=\"_blank\" rel=\"noopener\">localhost:8888</a>",
    runNote: "Requereix: PHP, Docker (per a MySQL). L'iframe de dalt mostra l'app en viu quan s'està executant.",
  }
};

export function getTendaCopy(lang: string): TendaCopy {
  return TENDA_COPY[(lang in TENDA_COPY ? lang : 'en') as TendaLang];
}
