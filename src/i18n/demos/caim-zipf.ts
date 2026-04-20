type Lang = 'en' | 'es' | 'ca';

export const T = {
  en: {
    corpus: 'Corpus',
    customText: 'Custom text',
    analyze: 'Analyze',
    logScale: 'Log scale',
    linearScale: 'Linear scale',
    parameters: 'Fitted parameters',
    words: 'Top words',
    rank: 'Rank',
    word: 'Word',
    frequency: 'Frequency',
    customPlaceholder: 'Paste text here to analyze word frequency distribution…',
    notEnoughWords: 'Need at least 5 distinct words.',
  },
  es: {
    corpus: 'Corpus',
    customText: 'Texto personalizado',
    analyze: 'Analizar',
    logScale: 'Escala log',
    linearScale: 'Escala lineal',
    parameters: 'Parámetros ajustados',
    words: 'Palabras principales',
    rank: 'Pos.',
    word: 'Palabra',
    frequency: 'Frecuencia',
    customPlaceholder: 'Pega texto aquí para analizar la distribución de frecuencia de palabras…',
    notEnoughWords: 'Se necesitan al menos 5 palabras distintas.',
  },
  ca: {
    corpus: 'Corpus',
    customText: 'Text personalitzat',
    analyze: 'Analitzar',
    logScale: 'Escala log',
    linearScale: 'Escala lineal',
    parameters: 'Paràmetres ajustats',
    words: 'Paraules principals',
    rank: 'Pos.',
    word: 'Paraula',
    frequency: 'Freqüència',
    customPlaceholder: 'Enganxa text aquí per analitzar la distribució de freqüència de paraules…',
    notEnoughWords: 'Es necessiten almenys 5 paraules diferents.',
  },
};

export type ZipfTranslations = typeof T[Lang];
