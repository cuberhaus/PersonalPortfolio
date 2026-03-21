import { useState, useCallback, useEffect, useRef } from "react";

type Tab = "news" | "chat" | "quiz" | "vision" | "stats";

const BACKEND_URL = "http://localhost:8889";

interface Question {
  text: string;
  scoreYes: number;
  scoreNo: number;
}

const QUESTIONS: Question[] = [
  { text: "El teu sagnat menstrual és més freqüent que cada 21 dies?", scoreYes: 2, scoreNo: 0 },
  { text: "El teu sagnat menstrual dura més de 7 dies?", scoreYes: 2, scoreNo: 0 },
  { text: "Consideres que el teu sagnat menstrual és excessivament abundant?", scoreYes: 3, scoreNo: 0 },
  { text: "Pateixes dolors forts durant el teu període menstrual que interfereixen amb les teves activitats diàries?", scoreYes: 3, scoreNo: 0 },
  { text: "Experimentes símptomes addicionals (com ara nàusees, mal de cap intens, mareigs) durant el teu període?", scoreYes: 2, scoreNo: 0 },
  { text: "El teu període menstrual té un impacte negatiu en la teva vida social o emocional?", scoreYes: 2, scoreNo: 0 },
];

const FALLBACK_NEWS = [
  { title: "La Marató 2023", link: "https://www.ccma.cat/tv3/marato/", img: "https://pessebre.org/wp-content/uploads/2022/12/logo-lamarato_normal.jpg" },
  { title: "Las farmacias catalanas distribuirán productos menstruales gratuitos a partir de 2024", link: "https://elpais.com/espana/catalunya/2023-09-21/las-farmacias-catalanas-distribuiran-productos-menstruales-gratuitos-a-partir-de-2024.html", img: "" },
  { title: "Cómo ayudar a tu hija a superar el miedo al uso del tampón y la copa menstrual", link: "https://elpais.com/mamas-papas/expertos/2023-08-28/como-ayudar-a-tu-hija-a-superar-el-miedo-al-uso-del-tampon-y-la-copa-menstrual.html", img: "" },
];

const BLOOD_DATA: Record<string, number> = { Mon: 5, Tue: 10, Wed: 7, Thu: 15, Fri: 8, Sat: 4, Sun: 6 };
const PERIOD_DAYS = [2, 3, 4, 5, 28, 29, 30];

const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7", minHeight: "500px" },
  tabs: { display: "flex" as const, gap: "0.25rem", padding: "0.75rem 1rem", background: "#16161f", borderRadius: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" as const, justifyContent: "center" as const },
  tab: { padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: "transparent", color: "#71717a" },
  tabActive: { background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "var(--text-primary)" },
  card: { background: "#16161f", border: "1px solid #27272a", borderRadius: "0.75rem", padding: "1.5rem" },
  btn: { padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" },
  primaryBtn: { background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "var(--text-primary)" },
  secondaryBtn: { background: "#27272a", color: "#a1a1aa" },
  input: { background: "#12121a", border: "1px solid #27272a", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "#e4e4e7", fontSize: "0.9rem", width: "100%", outline: "none" },
  mockBanner: { background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.75rem", color: "#a1a1aa", marginBottom: "1rem", textAlign: "center" as const },
} as const;

function NewsTab() {
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [backendUp, setBackendUp] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/news/`)
      .then((r) => r.json())
      .then((data) => {
        const items = Object.values(data.news as Record<string, { title: string; link: string; img: string }>);
        setNews(items);
        setBackendUp(true);
      })
      .catch(() => setBackendUp(false));
  }, []);

  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>DracuNews</h3>
      {!backendUp && <p style={{ fontSize: "0.8rem", color: "#71717a", marginBottom: "1rem" }}>Backend not detected — showing fallback news data.</p>}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
        {news.map((n, i) => (
          <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ ...s.card, display: "flex", gap: "1rem", alignItems: "center", textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "#27272a")}>
            {n.img && <img src={n.img} alt="" style={{ width: "80px", height: "60px", objectFit: "cover" as const, borderRadius: "0.5rem", flexShrink: 0 }} onError={(e) => (e.currentTarget.style.display = "none")} />}
            <span style={{ color: "#e4e4e7", fontSize: "0.9rem" }}>{n.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendUp, setBackendUp] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/chat/`)
      .then((r) => r.json())
      .then((data) => {
        const msgs = Object.values(data.messages_dict as Record<string, string>);
        setMessages(msgs);
        setBackendUp(true);
      })
      .catch(() => {
        setMessages(["¡Hola! Soy Draculine, tu asesora en temas de menstruación. [Mock mode — start the backend for real chat]"]);
      });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(() => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, msg]);
    setLoading(true);

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
        })
        .catch(() => setMessages((prev) => [...prev, "[Error contacting backend]"]))
        .finally(() => setLoading(false));
    } else {
      setTimeout(() => {
        setMessages((prev) => [...prev, `[Mock] Gràcies per la teva pregunta: «${msg}». Inicia el backend per respostes reals.`]);
        setLoading(false);
      }, 500);
    }
  }, [input, backendUp]);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "400px" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>DracuChat</h3>
      <div style={{ flex: 1, overflowY: "auto" as const, ...s.card, marginBottom: "0.75rem", padding: "1rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.5rem",
            borderRadius: "0.5rem",
            background: i % 2 === 0 ? "rgba(99,102,241,0.1)" : "#12121a",
            fontSize: "0.85rem",
            lineHeight: 1.5,
          }}>{m}</div>
        ))}
        {loading && <div style={{ padding: "0.5rem 0.75rem", color: "#71717a", fontSize: "0.85rem" }}>Escrivint...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={s.input}
          placeholder="Escriu un missatge..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button style={{ ...s.btn, ...s.primaryBtn, whiteSpace: "nowrap" as const }} onClick={send} disabled={loading}>
          Enviar
        </button>
      </div>
    </div>
  );
}

function QuizTab() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const answer = (yes: boolean) => {
    const q = QUESTIONS[idx];
    const newScore = score + (yes ? q.scoreYes : q.scoreNo);
    setScore(newScore);
    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
    } else {
      setDone(true);
    }
  };

  const result = score <= 3 ? "Impacte lleu o cap impacte." : score <= 7 ? "Impacte moderat, pot requerir una revisió mèdica." : "Impacte sever, és aconsellable buscar ajuda mèdica. Truca al 112 per a assistència d'emergència.";
  const resultColor = score <= 3 ? "#4ade80" : score <= 7 ? "#facc15" : "#f87171";

  const restart = () => { setIdx(0); setScore(0); setDone(false); };

  return (
    <div style={{ ...s.card, textAlign: "center" as const, maxWidth: "500px", margin: "0 auto" }}>
      <h3 style={{ marginBottom: "1.5rem" }}>DracuQuiz</h3>
      {done ? (
        <>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Resultat del Test:</p>
          <p style={{ color: resultColor, fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>{result}</p>
          <button style={{ ...s.btn, ...s.primaryBtn }} onClick={restart}>Tornar a començar</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "1rem" }}>Pregunta {idx + 1} de {QUESTIONS.length}</p>
          <p style={{ fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>{QUESTIONS[idx].text}</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button style={{ ...s.btn, background: "#ec4899", color: "var(--text-primary)", minWidth: "80px" }} onClick={() => answer(true)}>Sí</button>
            <button style={{ ...s.btn, ...s.secondaryBtn, minWidth: "80px" }} onClick={() => answer(false)}>No</button>
          </div>
        </>
      )}
    </div>
  );
}

function VisionTab() {
  return (
    <div style={{ ...s.card, textAlign: "center" as const, padding: "3rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>DracuVision</h3>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <p style={{ color: "#a1a1aa", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>
        Computer vision feature for analyzing menstrual health. This requires the device camera and the Roboflow vision model on the backend.
      </p>
      <p style={{ color: "#71717a", fontSize: "0.8rem", marginTop: "0.75rem" }}>
        Not available in web demo — works on the native Flutter app.
      </p>
    </div>
  );
}

function StatsTab() {
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
          <h4 style={{ fontSize: "0.9rem", color: "#a1a1aa", marginBottom: "1rem" }}>ML per Day</h4>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "120px" }}>
            {Object.entries(BLOOD_DATA).map(([day, val]) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem" }}>
                <div style={{ width: "100%", maxWidth: "24px", height: `${(val / maxBlood) * 100}px`, background: "linear-gradient(180deg, #6366f1, #a855f7)", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
                  title={`${val} ml`} />
                <span style={{ fontSize: "0.65rem", color: "#71717a" }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Questionnaire performance */}
        <div style={s.card}>
          <h4 style={{ fontSize: "0.9rem", color: "#a1a1aa", marginBottom: "1rem" }}>Questionnaire Impact</h4>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-evenly", gap: "0.5rem", height: "120px" }}>
            {[{ label: "Lleu", val: 10, color: "#4ade80" }, { label: "Moderat", val: 5, color: "#facc15" }, { label: "Sever", val: 3, color: "#f87171" }].map((d) => (
              <div key={d.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem" }}>
                <div style={{ width: "32px", height: `${d.val * 10}px`, background: d.color, borderRadius: "3px 3px 0 0" }} title={`${d.val} users`} />
                <span style={{ fontSize: "0.6rem", color: "#71717a", textAlign: "center" as const }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ ...s.card, marginTop: "1.5rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "#a1a1aa", marginBottom: "1rem" }}>Period Calendar (tap to toggle)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div key={d} style={{ textAlign: "center" as const, fontSize: "0.7rem", color: "#71717a", padding: "0.25rem" }}>{d}</div>
          ))}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
            const isPeriod = periodDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  background: isPeriod ? "rgba(236,72,153,0.2)" : "#12121a",
                  border: isPeriod ? "1px solid #ec4899" : "1px solid #27272a",
                  borderRadius: "0.25rem",
                  color: isPeriod ? "#ec4899" : "#a1a1aa",
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

export default function DraculinDemo() {
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
      <div style={s.mockBanner}>
        Interactive demo of the Draculin health app. Start the backend (<code>cd Draculin-Backend && docker compose up -d</code>) for live chat and news.
      </div>

      <div style={s.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "news" && <NewsTab />}
      {tab === "chat" && <ChatTab />}
      {tab === "quiz" && <QuizTab />}
      {tab === "vision" && <VisionTab />}
      {tab === "stats" && <StatsTab />}
    </div>
  );
}
