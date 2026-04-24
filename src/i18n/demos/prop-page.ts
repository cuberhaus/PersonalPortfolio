// Page-UI strings for the prop demo (extends card data in src/data/demos*.json).
export type PropLang = 'en' | 'es' | 'ca';

export interface PropCopy {
  liveApp: string;
  startHint: string;
  openNewTab: string;
  demoUnavail: string;
  unavailDesc: string;
  runLocal: string;
  step1: string;
  step2: string;
  step3: string;
  mockNavBrand: string;
  mockNavHome: string;
  mockNavTypes: string;
  mockNavItems: string;
  mockNavUsers: string;
  mockNavRatings: string;
  mockNavRecs: string;
  mockDashTitle: string;
  mockDashType: string;
  mockDashUsers: string;
  mockDashItems: string;
  mockDashRatings: string;
  mockDashSession: string;
  mockSessionActive: string;
  mockNoSelection: string;
  mockHint: string;
}

export const PROP_COPY: Record<PropLang, PropCopy> = {
  en: {
    liveApp: "Live app (runs locally)",
    startHint: "Start the Spring Boot app: <code>cd subgrup-prop7.1 && make web</code>",
    openNewTab: "Open in new tab",
    demoUnavail: "Demo unavailable",
    unavailDesc: "This Java Spring Boot application only runs locally during development. <br/>Check out the source code below to run it yourself!",
    runLocal: "Run the real app locally",
    step1: "<code>cd subgrup-prop7.1</code>",
    step2: "<code>make web</code> — compiles and starts the Spring Boot server",
    step3: "The app will run at <a href=\"http://localhost:8081\" target=\"_blank\" rel=\"noopener\">localhost:8081</a>",
    mockNavBrand: "Recommendation System",
    mockNavHome: "Home",
    mockNavTypes: "Item Types",
    mockNavItems: "Items",
    mockNavUsers: "Users",
    mockNavRatings: "Ratings",
    mockNavRecs: "Recommendations",
    mockDashTitle: "System Status",
    mockDashType: "Active item type",
    mockDashUsers: "System users",
    mockDashItems: "Loaded items",
    mockDashRatings: "Total ratings",
    mockDashSession: "Session Status",
    mockSessionActive: "Session active",
    mockNoSelection: "None selected",
    mockHint: "This is an interactive mock of the Spring Boot application interface."
  },
  es: {
    liveApp: "App en vivo (se ejecuta localmente)",
    startHint: "Inicia la app Spring Boot: <code>cd subgrup-prop7.1 && make web</code>",
    openNewTab: "Abrir en nueva pestaña",
    demoUnavail: "Demo no disponible",
    unavailDesc: "Esta aplicación Java Spring Boot solo se ejecuta localmente durante el desarrollo. <br/>¡Revisa el código fuente a continuación para ejecutarla tú mismo!",
    runLocal: "Ejecutar la app real localmente",
    step1: "<code>cd subgrup-prop7.1</code>",
    step2: "<code>make web</code> — compila e inicia el servidor Spring Boot",
    step3: "La app se ejecutará en <a href=\"http://localhost:8081\" target=\"_blank\" rel=\"noopener\">localhost:8081</a>",
    mockNavBrand: "Sistema de Recomendación",
    mockNavHome: "Inicio",
    mockNavTypes: "Tipos de ítem",
    mockNavItems: "Ítems",
    mockNavUsers: "Usuarios",
    mockNavRatings: "Valoraciones",
    mockNavRecs: "Recomendaciones",
    mockDashTitle: "Estado del Sistema",
    mockDashType: "Tipo de ítem actual",
    mockDashUsers: "Usuarios del sistema",
    mockDashItems: "Ítems cargados",
    mockDashRatings: "Valoraciones totales",
    mockDashSession: "Estado de la Sesión",
    mockSessionActive: "Sesión iniciada",
    mockNoSelection: "Ninguno seleccionado",
    mockHint: "Este es un mock interactivo de la interfaz de la aplicación Spring Boot."
  },
  ca: {
    liveApp: "App en viu (s'executa localment)",
    startHint: "Inicia l'app Spring Boot: <code>cd subgrup-prop7.1 && make web</code>",
    openNewTab: "Obrir en nova pestanya",
    demoUnavail: "Demo no disponible",
    unavailDesc: "Aquesta aplicació Java Spring Boot només s'executa localment durant el desenvolupament. <br/>Revisa el codi font a continuació per executar-la tu mateix!",
    runLocal: "Executar l'app real localment",
    step1: "<code>cd subgrup-prop7.1</code>",
    step2: "<code>make web</code> — compila i inicia el servidor Spring Boot",
    step3: "L'app s'executarà a <a href=\"http://localhost:8081\" target=\"_blank\" rel=\"noopener\">localhost:8081</a>",
    mockNavBrand: "Sistema de Recomanació",
    mockNavHome: "Inici",
    mockNavTypes: "Tipus d'ítem",
    mockNavItems: "Ítems",
    mockNavUsers: "Usuaris",
    mockNavRatings: "Valoracions",
    mockNavRecs: "Recomanacions",
    mockDashTitle: "Estat del Sistema",
    mockDashType: "Tipus d'ítem actual",
    mockDashUsers: "Usuaris al sistema",
    mockDashItems: "Ítems carregats",
    mockDashRatings: "Valoracions totals",
    mockDashSession: "Estat de la Sessió",
    mockSessionActive: "Sessió iniciada",
    mockNoSelection: "Cap seleccionat",
    mockHint: "Aquest és un mock interactiu de la interfície de l'aplicació Spring Boot."
  }
};

export function getPropCopy(lang: string): PropCopy {
  return PROP_COPY[(lang in PROP_COPY ? lang : 'en') as PropLang];
}
