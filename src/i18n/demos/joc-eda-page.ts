// Page-UI strings for the joc-eda demo (extends card data in src/data/demos*.json).
export type JocEdaLang = 'en' | 'es' | 'ca';

export interface JocEdaCopy {
  preloaded: string;
  sampleTitle: string;
  sampleDesc: string;
  map: string;
  rounds: string;
  players: string;
  watchReplay: string;
  ownGame: string;
  uploadDesc: string;
  uploadBtn: string;
  readingFile: string;
  invalidFile: string;
  loadedFile: string;
  fileTooLarge: string;
  controls: string;
  playPause: string;
  prevNext: string;
  startEnd: string;
  zoom: string;
  scrub: string;
  help: string;
  howTo: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
}

export const JOC_EDA_COPY: Record<JocEdaLang, JocEdaCopy> = {
  en: {
    preloaded: "Preloaded",
    sampleTitle: "Sample Game",
    sampleDesc: "4 AI players battle across 250 rounds on a 15×30 grid. Includes warriors, builders, weapons, barricades, and resource gathering.",
    map: "Map:",
    rounds: "Rounds:",
    players: "Players:",
    watchReplay: "Watch Replay",
    ownGame: "Your Own Game",
    uploadDesc: "Compile and run the game locally, then upload the <code>.out</code> replay file to watch it here.",
    uploadBtn: "Upload Replay File",
    readingFile: "Reading file...",
    invalidFile: "This doesn't look like a valid game file (missing \"ThePurge\" header).",
    loadedFile: "Loaded \"{0}\" — opening viewer...",
    fileTooLarge: "File too large for session storage. Try a smaller replay.",
    controls: "Viewer Controls",
    playPause: "Play / Pause",
    prevNext: "Previous / Next round",
    startEnd: "Go to start / end",
    zoom: "Zoom in / out",
    scrub: "Scrub through rounds",
    help: "Help overlay",
    howTo: "How to generate your own replays",
    step1: "Clone the <a href=\"https://github.com/cuberhaus/joc_eda\" target=\"_blank\" rel=\"noopener noreferrer\">repository</a>",
    step2: "Write your own AI in a file like <code>AIMyBot.cc</code> (extend the <code>Player</code> class)",
    step3: "Run <code>make</code> to compile",
    step4: "Run <code>./Game -i default.cnf &gt; replay.out</code> to generate a replay",
    step5: "Upload the <code>replay.out</code> file here to watch it!",
  },
  es: {
    preloaded: "Precargado",
    sampleTitle: "Juego de Ejemplo",
    sampleDesc: "4 jugadores IA luchan durante 250 rondas en una cuadrícula de 15×30. Incluye guerreros, constructores, armas, barricadas y recolección de recursos.",
    map: "Mapa:",
    rounds: "Rondas:",
    players: "Jugadores:",
    watchReplay: "Ver Repetición",
    ownGame: "Tu Propio Juego",
    uploadDesc: "Compila y ejecuta el juego localmente, luego sube el archivo de repetición <code>.out</code> para verlo aquí.",
    uploadBtn: "Subir Archivo de Repetición",
    readingFile: "Leyendo archivo...",
    invalidFile: "Este no parece un archivo de juego válido (falta la cabecera \"ThePurge\").",
    loadedFile: "Cargado \"{0}\" — abriendo visor...",
    fileTooLarge: "Archivo demasiado grande para el almacenamiento de la sesión. Intenta con una repetición más pequeña.",
    controls: "Controles del Visor",
    playPause: "Reproducir / Pausa",
    prevNext: "Ronda anterior / siguiente",
    startEnd: "Ir al inicio / final",
    zoom: "Acercar / Alejar",
    scrub: "Avanzar por las rondas",
    help: "Capa de ayuda",
    howTo: "Cómo generar tus propias repeticiones",
    step1: "Clona el <a href=\"https://github.com/cuberhaus/joc_eda\" target=\"_blank\" rel=\"noopener noreferrer\">repositorio</a>",
    step2: "Escribe tu propia IA en un archivo como <code>AIMyBot.cc</code> (extiende la clase <code>Player</code>)",
    step3: "Ejecuta <code>make</code> para compilar",
    step4: "Ejecuta <code>./Game -i default.cnf &gt; replay.out</code> para generar una repetición",
    step5: "Sube el archivo <code>replay.out</code> aquí para verlo!",
  },
  ca: {
    preloaded: "Precarregat",
    sampleTitle: "Joc d'Exemple",
    sampleDesc: "4 jugadors IA lluiten durant 250 rondes en una quadrícula de 15×30. Inclou guerrers, constructors, armes, barricades i recol·lecció de recursos.",
    map: "Mapa:",
    rounds: "Rondes:",
    players: "Jugadors:",
    watchReplay: "Veure Repetició",
    ownGame: "El Teu Propi Joc",
    uploadDesc: "Compila i executa el joc localment, després puja l'arxiu de repetició <code>.out</code> per veure'l aquí.",
    uploadBtn: "Pujar Arxiu de Repetició",
    readingFile: "Llegint arxiu...",
    invalidFile: "Aquest no sembla un arxiu de joc vàlid (falta la capçalera \"ThePurge\").",
    loadedFile: "Carregat \"{0}\" — obrint visor...",
    fileTooLarge: "Arxiu massa gran per a l'emmagatzematge de la sessió. Prova amb una repetició més petita.",
    controls: "Controls del Visor",
    playPause: "Reproduir / Pausa",
    prevNext: "Ronda anterior / següent",
    startEnd: "Anar a l'inici / final",
    zoom: "Apropar / Allunyar",
    scrub: "Avançar per les rondes",
    help: "Capa d'ajuda",
    howTo: "Com generar les teves pròpies repeticions",
    step1: "Clona el <a href=\"https://github.com/cuberhaus/joc_eda\" target=\"_blank\" rel=\"noopener noreferrer\">repositori</a>",
    step2: "Escriu la teva pròpia IA en un arxiu com <code>AIMyBot.cc</code> (estén la classe <code>Player</code>)",
    step3: "Executa <code>make</code> per compilar",
    step4: "Executa <code>./Game -i default.cnf &gt; replay.out</code> per generar una repetició",
    step5: "Puja l'arxiu <code>replay.out</code> aquí per veure'l!",
  },
};

export function getJocEdaCopy(lang: string): JocEdaCopy {
  return JOC_EDA_COPY[(lang in JOC_EDA_COPY ? lang : 'en') as JocEdaLang];
}
