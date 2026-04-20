type Lang = 'en' | 'es' | 'ca';

export const T = {
  en: { pagerank: 'PageRank', zipf: "Zipf's Law", loading: 'Loading…' },
  es: { pagerank: 'PageRank', zipf: 'Ley de Zipf', loading: 'Cargando…' },
  ca: { pagerank: 'PageRank', zipf: 'Llei de Zipf', loading: 'Carregant…' },
};

export type DemoTranslations = typeof T[Lang];
