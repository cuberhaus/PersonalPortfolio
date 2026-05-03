import { useState, useCallback, useEffect, useRef } from "react";

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/draculin-demo";
import MockBanner from "./MockBanner";
import { debug } from "../../lib/debug";
import { useDemoLifecycle } from "../../lib/useDebug";

type Lang = "en" | "es" | "ca";
type Tab = "news" | "chat" | "quiz" | "vision" | "stats";

const BACKEND_URL = "http://localhost:8889";
const netLog = debug("net:draculin");
const demoLog = debug("demo:draculin");

import { FALLBACK_NEWS, BLOOD_DATA, PERIOD_DAYS, scoreBand } from "../../lib/draculin-quiz";

const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)", minHeight: "500px" },
  tabs: { display: "flex" as const, gap: "0.25rem", padding: "0.75rem 1rem", background: "var(--bg-card)", borderRadius: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" as const, justifyContent: "center" as const },
  tab: { padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: "transparent", color: "var(--text-muted)" },
  tabActive: { background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", color: "var(--text-primary)" },
  card: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "0.75rem", padding: "1.5rem" },
  btn: { padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" },
  primaryBtn: { background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", color: "var(--text-primary)" },
  secondaryBtn: { background: "var(--border-color)", color: "var(--text-secondary)" },
  input: { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem", width: "100%", outline: "none" },
} as const;

function NewsTab({ t }: { t: typeof TRANSLATIONS.en }) {
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [backendUp, setBackendUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    netLog.info("fetch-news");
    fetch(`${BACKEND_URL}/api/news/`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const items = Object.values(data.news as Record<string, { title: string; link: string; img: string }>);
        setNews(items);
        setBackendUp(true);
        netLog.info("fetch-news-ok", { count: items.length });
      })
      .catch((err) => {
        if (!cancelled) setBackendUp(false);
        netLog.warn("fetch-news-fallback", { err: String(err) });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>DracuNews</h3>
      {!backendUp && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t.fallbackNewsTitle}</p>}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
        {news.map((n, i) => (
          <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ ...s.card, display: "flex", gap: "1rem", alignItems: "center", textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--accent-start)")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}>
            {n.img && <img src={n.img} alt="" style={{ width: "80px", height: "60px", objectFit: "cover" as const, borderRadius: "0.5rem", flexShrink: 0 }} onError={(e) => (e.currentTarget.style.display = "none")} />}
            <span style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>{n.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ChatTab({ t }: { t: typeof TRANSLATIONS.en }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendUp, setBackendUp] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    netLog.info("chat-prefetch");
    fetch(`${BACKEND_URL}/api/chat/`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const msgs = Object.values(data.messages_dict as Record<string, string>);
        setMessages(msgs);
        setBackendUp(true);
        netLog.info("chat-prefetch-ok", { count: msgs.length });
      })
      .catch((err) => {
        if (!cancelled) setMessages([t.mockChatInit]);
        netLog.warn("chat-prefetch-fallback", { err: String(err) });
      });
    return () => { cancelled = true; };
  }, [t.mockChatInit]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(() => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, msg]);
    setLoading(true);

    netLog.info("chat-send", { len: msg.length, backendUp });
    if (backendUp) {
      fetch(`${BACKEND_URL}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      })
        .then((r) => r.json())
        .then((data) => {
          const msgs = Object.values(data.messages_dict as Record<string, string>);
          setMessages(msgs);
          netLog.info("chat-send-ok", { count: msgs.length });
        })
        .catch((err) => {
          setMessages((prev) => [...prev, "[Error contacting backend]"]);
          netLog.warn("chat-parse-failed", { err: String(err) });
        })
        .finally(() => setLoading(false));
    } else {
      setTimeout(() => {
        setMessages((prev) => [...prev, t.mockChatReply.replace("{msg}", msg)]);
        setLoading(false);
      }, 500);
    }
  }, [input, backendUp, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "400px" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>DracuChat</h3>
      <div style={{ flex: 1, overflowY: "auto" as const, ...s.card, marginBottom: "0.75rem", padding: "1rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.5rem",
            borderRadius: "0.5rem",
            background: i % 2 === 0 ? "color-mix(in srgb, var(--accent-start) 10%, transparent)" : "var(--bg-secondary)",
            fontSize: "0.85rem",
            lineHeight: 1.5,
          }}>{m}</div>
        ))}
        {loading && <div style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>{t.typing}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={s.input}
          placeholder={t.inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button style={{ ...s.btn, ...s.primaryBtn, whiteSpace: "nowrap" as const }} onClick={send} disabled={loading}>
          {t.send}
        </button>
      </div>
    </div>
  );
}

function QuizTab({ t }: { t: typeof TRANSLATIONS.en }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const answer = (yes: boolean) => {
    const q = t.questions[idx];
    const newScore = score + (yes ? q.scoreYes : q.scoreNo);
    setScore(newScore);
    if (idx < t.questions.length - 1) {
      setIdx(idx + 1);
    } else {
      setDone(true);
    }
  };

  const band = scoreBand(score);
  const result = band === "mild" ? t.quizResult1 : band === "moderate" ? t.quizResult2 : t.quizResult3;
  const resultColor = band === "mild" ? "var(--accent-start)" : band === "moderate" ? "var(--accent-end)" : "var(--text-muted)";

  const restart = () => { setIdx(0); setScore(0); setDone(false); };

  return (
    <div style={{ ...s.card, textAlign: "center" as const, maxWidth: "500px", margin: "0 auto" }}>
      <h3 style={{ marginBottom: "1.5rem" }}>DracuQuiz</h3>
      {done ? (
        <>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>{t.quizResultTitle}</p>
          <p style={{ color: resultColor, fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>{result}</p>
          <button style={{ ...s.btn, ...s.primaryBtn }} onClick={restart}>{t.restart}</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            {t.questionNOf.replace("{n}", String(idx + 1)).replace("{total}", String(t.questions.length))}
          </p>
          <p style={{ fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>{t.questions[idx].text}</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button style={{ ...s.btn, background: "var(--accent-end)", color: "var(--text-primary)", minWidth: "80px" }} onClick={() => answer(true)}>{t.yes}</button>
            <button style={{ ...s.btn, ...s.secondaryBtn, minWidth: "80px" }} onClick={() => answer(false)}>{t.no}</button>
          </div>
        </>
      )}
    </div>
  );
}

function VisionTab({ t }: { t: typeof TRANSLATIONS.en }) {
  return (
    <div style={{ ...s.card, textAlign: "center" as const, padding: "3rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>DracuVision</h3>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <p style={{ color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>
        {t.visionDesc}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.75rem" }}>
        {t.visionNote}
      </p>
    </div>
  );
}

function StatsTab({ t }: { t: typeof TRANSLATIONS.en }) {
  const [periodDays, setPeriodDays] = useState<number[]>([...PERIOD_DAYS]);
  const maxBlood = Math.max(...Object.values(BLOOD_DATA));

  const toggleDay = (d: number) => {
    setPeriodDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>DracuStats</h3>
      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "1fr 1fr" }}>
        {/* Blood volume chart */}
        <div style={s.card}>
          <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{t.statsVolume}</h4>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "120px" }}>
            {Object.entries(BLOOD_DATA).map(([day, val]) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem" }}>
                <div style={{ width: "100%", maxWidth: "24px", height: `${(val / maxBlood) * 100}px`, background: "linear-gradient(180deg, var(--accent-start), var(--accent-end))", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
                  title={`${val} ml`} />
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Questionnaire performance */}
        <div style={s.card}>
          <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{t.statsImpact}</h4>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-evenly", gap: "0.5rem", height: "120px" }}>
            {[{ label: t.statsLabels.mild, val: 10, color: "var(--accent-start)" }, { label: t.statsLabels.moderate, val: 5, color: "var(--accent-end)" }, { label: t.statsLabels.severe, val: 3, color: "var(--text-muted)" }].map((d) => (
              <div key={d.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem" }}>
                <div style={{ width: "32px", height: `${d.val * 10}px`, background: d.color, borderRadius: "3px 3px 0 0" }} title={`${d.val} users`} />
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "center" as const }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ ...s.card, marginTop: "1.5rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{t.calendarTitle}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {t.days.map((d) => (
            <div key={d} style={{ textAlign: "center" as const, fontSize: "0.7rem", color: "var(--text-muted)", padding: "0.25rem" }}>{d}</div>
          ))}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
            const isPeriod = periodDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  background: isPeriod ? "color-mix(in srgb, var(--accent-end) 20%, transparent)" : "var(--bg-secondary)",
                  border: isPeriod ? "1px solid var(--accent-end)" : "1px solid var(--border-color)",
                  borderRadius: "0.25rem",
                  color: isPeriod ? "var(--accent-end)" : "var(--text-secondary)",
                  padding: "0.35rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: isPeriod ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DraculinDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  useDemoLifecycle('demo:draculin', { lang });
  const [tab, setTab] = useState<Tab>("news");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "news", label: "DracuNews", icon: "🌐" },
    { id: "chat", label: "DracuChat", icon: "💬" },
    { id: "quiz", label: "DracuQuiz", icon: "🧠" },
    { id: "vision", label: "DracuVision", icon: "📷" },
    { id: "stats", label: "DracuStats", icon: "📊" },
  ];

  return (
    <div style={s.wrapper}>
      <MockBanner>{t.bannerPre}<code>{t.bannerCode}</code>{t.bannerPost}</MockBanner>

      <div style={s.tabs}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            style={{ ...s.tab, ...(tab === tb.id ? s.tabActive : {}) }}
            onClick={() => setTab(tb.id)}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {tab === "news" && <NewsTab t={t} />}
      {tab === "chat" && <ChatTab t={t} />}
      {tab === "quiz" && <QuizTab t={t} />}
      {tab === "vision" && <VisionTab t={t} />}
      {tab === "stats" && <StatsTab t={t} />}
    </div>
  );
}
