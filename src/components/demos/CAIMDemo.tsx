import { useState, lazy, Suspense } from 'react';

import { T, type DemoTranslations } from "../../i18n/demos/caimdemo";

type Lang = "en" | "es" | "ca";

const PageRankTab = lazy(() => import('./caim/PageRankTab'));
const ZipfTab = lazy(() => import('./caim/ZipfTab'));

type Tab = 'pagerank' | 'zipf';

interface Props {
  lang?: Lang;
}

export default function CAIMDemo({ lang = 'en' }: Props) {
  const t = T[lang] || T.en;
  const [activeTab, setActiveTab] = useState<Tab>('pagerank');

  return (
    <div className="caim-mock" style={styles.wrapper}>
      {/* Tab navigation */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('pagerank')}
          style={{ ...styles.tab, ...(activeTab === 'pagerank' ? styles.tabActive : {}) }}
          data-tab="pagerank"
        >
          {t.pagerank}
        </button>
        <button
          onClick={() => setActiveTab('zipf')}
          style={{ ...styles.tab, ...(activeTab === 'zipf' ? styles.tabActive : {}) }}
          data-tab="zipf"
        >
          {t.zipf}
        </button>
      </div>

      {/* Tab content */}
      <div style={styles.content}>
        <Suspense fallback={<p style={styles.loading}>{t.loading}</p>}>
          {activeTab === 'pagerank' ? <PageRankTab lang={lang} /> : <ZipfTab lang={lang} />}
        </Suspense>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    marginBottom: '1.5rem',
  },
  tabBar: {
    display: 'flex', gap: '0.25rem',
    padding: '0.35rem', marginBottom: '1rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '0.75rem',
    width: 'fit-content',
  },
  tab: {
    padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none',
    background: 'transparent', color: 'var(--text-muted)',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
    color: '#fff',
  },
  content: {
    minHeight: 300,
  },
  loading: {
    textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem',
  },
};
