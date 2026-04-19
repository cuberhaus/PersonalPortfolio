type Lang = "en" | "es" | "ca";

export const TRANSLATIONS = {
  en: {
    examples: "Examples",
    codeEditor: "Code Editor",
    run: "Run",
    playing: "Playing...",
    playMusic: "Play Music",
    output: "Output",
    notesGenerated: "{0} note{s} generated",
    noOutput: "Program ran successfully with no output."
  },
  es: {
    examples: "Ejemplos",
    codeEditor: "Editor de Código",
    run: "Ejecutar",
    playing: "Reproduciendo...",
    playMusic: "Reproducir Música",
    output: "Salida",
    notesGenerated: "{0} nota{s} generada{s}",
    noOutput: "El programa se ejecutó correctamente sin salida."
  },
  ca: {
    examples: "Exemples",
    codeEditor: "Editor de Codi",
    run: "Executar",
    playing: "Reproduint...",
    playMusic: "Reproduir Música",
    output: "Sortida",
    notesGenerated: "{0} nota{s} generada{s}",
    noOutput: "El programa s'ha executat correctament sense sortida."
  }
};

export type DemoTranslations = typeof TRANSLATIONS[Lang];
