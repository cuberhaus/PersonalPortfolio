import { useState, useCallback, useEffect, useRef } from "react";

type Lang = "en" | "es" | "ca";
type Tab = "news" | "chat" | "quiz" | "vision" | "stats";

const BACKEND_URL = "http://localhost:8889";

const TRANSLATIONS = {
  en: {
    banner: "Interactive demo of the Draculin health app. Start the backend (<code>cd Draculin-Backend && docker compose up -d</code>) for live chat and news.",
    fallbackNewsTitle: "Backend not detected \u2014 showing fallback news data.",
    mockChatInit: "Hello! I am Draculine, your menstruation advisor. [Mock mode \u2014 start the backend for real chat]",
    mockChatReply: "[Mock] Thank you for your question: \u00ab{msg}\u00bb. Start the backend for real answers.",
    typing: "Typing...",
    inputPlaceholder: "Type a message...",
    send: "Send",
    quizResultTitle: "Test Result:",
    quizResult1: "Mild or no impact.",
    quizResult2: "Moderate impact, may require medical review.",
    quizResult3: "Severe impact, it is advisable to seek medical help. Call emergency services for immediate assistance.",
    restart: "Restart",
    questionNOf: "Question {n} of {total}",
    yes: "Yes",
    no: "No",
    visionDesc: "Computer vision feature for analyzing menstrual health. This requires the device camera and the Roboflow vision model on the backend.",
    visionNote: "Not available in web demo \u2014 works on the native Flutter app.",
    statsVolume: "ML per Day",
    statsImpact: "Questionnaire Impact",
    statsLabels: { mild: "Mild", moderate: "Moderate", severe: "Severe" },
    calendarTitle: "Period Calendar (tap to toggle)",
    days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    questions: [
      { text: "Is your menstrual bleeding more frequent than every 21 days?", scoreYes: 2, scoreNo: 0 },
      { text: "Does your menstrual bleeding last more than 7 days?", scoreYes: 2, scoreNo: 0 },
      { text: "Do you consider your menstrual bleeding to be excessively heavy?", scoreYes: 3, scoreNo: 0 },
      { text: "Do you suffer from severe pain during your menstrual period that interferes with your daily activities?", scoreYes: 3, scoreNo: 0 },
      { text: "Do you experience additional symptoms (such as nausea, severe headache, dizziness) during your period?", scoreYes: 2, scoreNo: 0 },
      { text: "Does your menstrual period have a negative impact on your social or emotional life?", scoreYes: 2, scoreNo: 0 },
    ],
  },
  es: {
    banner: "Demo interactiva de la app de salud Draculin. Inicia el backend (<code>cd Draculin-Backend && docker compose up -d</code>) para chat y noticias en vivo.",
    fallbackNewsTitle: "Backend no detectado \u2014 mostrando datos de noticias de respaldo.",
    mockChatInit: "\u00a1Hola! Soy Draculine, tu asesora en temas de menstruación. [Modo mock \u2014 inicia el backend para chat real]",
    mockChatReply: "[Mock] Gracias por tu pregunta: \u00ab{msg}\u00bb. Inicia el backend para respuestas reales.",
    typing: "Escribiendo...",
    inputPlaceholder: "Escribe un mensaje...",
    send: "Enviar",
    quizResultTitle: "Resultado del Test:",
    quizResult1: "Impacto leve o ningún impacto.",
    quizResult2: "Impacto moderado, puede requerir una revisión médica.",
    quizResult3: "Impacto severo, es aconsejable buscar ayuda médica. Llama al 112 para asistencia de emergencia.",
    restart: "Volver a empezar",
    questionNOf: "Pregunta {n} de {total}",
    yes: "Sí",
    no: "No",
    visionDesc: "Función de visión por computador para analizar la salud menstrual. Requiere la cámara del dispositivo y el modelo de visión de Roboflow en el backend.",
    visionNote: "No disponible en la demo web \u2014 funciona en la app nativa de Flutter.",
    statsVolume: "ML por Día",
    statsImpact: "Impacto del Cuestionario",
    statsLabels: { mild: "Leve", moderate: "Moderado", severe: "Severo" },
    calendarTitle: "Calendario Menstrual (toca para alternar)",
    days: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"],
    questions: [
      { text: "\u00bfTu sangrado menstrual es más frecuente que cada 21 días?", scoreYes: 2, scoreNo: 0 },
      { text: "\u00bfTu sangrado menstrual dura más de 7 días?", scoreYes: 2, scoreNo: 0 },
      { text: "\u00bfConsideras que tu sangrado menstrual es excesivamente abundante?", scoreYes: 3, scoreNo: 0 },
      { text: "\u00bfSufres dolores fuertes durante tu periodo menstrual que interfieren con tus actividades diarias?", scoreYes: 3, scoreNo: 0 },
      { text: "\u00bfExperimentas síntomas adicionales (como náuseas, dolor de cabeza intenso, mareos) durante tu periodo?", scoreYes: 2, scoreNo: 0 },
      { text: "\u00bfTu periodo menstrual tiene un impacto negativo en tu vida social o emocional?", scoreYes: 2, scoreNo: 0 },
    ],
  },
  ca: {
    banner: "Demo interactiva de l'app de salut Draculin. Inicia el backend (<code>cd Draculin-Backend && docker compose up -d</code>) per a xat i notícies en viu.",
    fallbackNewsTitle: "Backend no detectat \u2014 mostrant dades de notícies de suport.",
    mockChatInit: "Hola! Sóc la Draculine, la teva assessora en temes de menstruació. [Mode mock \u2014 inicia el backend per a xat real]",
    mockChatReply: "[Mock] Gràcies per la teva pregunta: \u00ab{msg}\u00bb. Inicia el backend per respostes reals.",
    typing: "Escrivint...",
    inputPlaceholder: "Escriu un missatge...",
    send: "Enviar",
    quizResultTitle: "Resultat del Test:",
    quizResult1: "Impacte lleu o cap impacte.",
    quizResult2: "Impacte moderat, pot requerir una revisió mèdica.",
    quizResult3: "Impacte sever, és aconsellable buscar ajuda mèdica. Truca al 112 per a assistència d'emergència.",
    restart: "Tornar a començar",
    questionNOf: "Pregunta {n} de {total}",
    yes: "Sí",
    no: "No",
    visionDesc: "Funció de visió per computador per analitzar la salut menstrual. Requereix la càmera del dispositiu i el model de visió de Roboflow al backend.",
    visionNote: "No disponible a la demo web \u2014 funciona a l'app nativa de Flutter.",
    statsVolume: "ML per Dia",
    statsImpact: "Impacte del Qüestionari",
    statsLabels: { mild: "Lleu", moderate: "Moderat", severe: "Sever" },
    calendarTitle: "Calendari Menstrual (toca per alternar)",
    days: ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"],
    questions: [
      { text: "El teu sagnat menstrual és més freqüent que cada 21 dies?", scoreYes: 2, scoreNo: 0 },
      { text: "El teu sagnat menstrual dura més de 7 dies?", scoreYes: 2, scoreNo: 0 },
      { text: "Consideres que el teu sagnat menstrual és excessivament abundant?", scoreYes: 3, scoreNo: 0 },
      { text: "Pateixes dolors forts durant el teu període menstrual que interfereixen amb les teves activitats diàries?", scoreYes: 3, scoreNo: 0 },
      { text: "Experimentes símptomes addicionals (com ara nàusees, mal de cap intens, mareigs) durant el teu període?", scoreYes: 2, scoreNo: 0 },
      { text: "El teu període menstrual té un impacte negatiu en la teva vida social o emocional?", scoreYes: 2, scoreNo: 0 },
    ],
  }
};

const FALLBACK_NEWS = [
  { title: "La Marató 2023", link: "https://www.ccma.cat/tv3/marato/", img: "https://pessebre.org/wp-content/uploads/2022/12/logo-lamarato_normal.jpg" },
  { title: "Las farmacias catalanas distribuirán productos menstruales gratuitos a partir de 2024", link: "https://elpais.com/espana/catalunya/2023-09-21/las-farmacias-catalanas-distribuiran-productos-menstruales-gratuitos-a-partir-de-2024.html", img: "" },
  { title: "Cómo ayudar a tu hija a superar el miedo al uso del tampón y la copa menstrual", link: "https://elpais.com/mamas-papas/expertos/2023-08-28/como-ayudar-a-tu-hija-a-superar-el-miedo-al-uso-del-tampon-y-la-copa-menstrual.html", img: "" },
];

const BLOOD_DATA: Record<string, number> = { Mon: 5, Tue: 10, Wed: 7, Thu: 15, Fri: 8, Sat: 4, Sun: 6 };
const PERIOD_DAYS = [2, 3, 4, 5, 28, 29, 30];

const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)", minHeight: "500px" },
  tabs: { display: "flex" as const, gap: "0.25rem", padding: "0.75rem 1rem", background: "var(--bg-card)", borderRadius: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" as const, justifyContent: "center" as const },
  tab: { padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: "transparent", color: "var(--text-muted)" },
  tabActive: { background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "var(--text-primary)" },
  card: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "0.75rem", padding: "1.5rem" },
  btn: { padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" },
  primaryBtn: { background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "var(--text-primary)" },
  secondaryBtn: { background: "var(--border-color)", color: "var(--text-secondary)" },
  input: { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem", width: "100%", outline: "none" },
  mockBanner: { background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem", textAlign: "center" as const },
} as const;

function NewsTab({ t }: { t: typeof TRANSLATIONS.en }) {
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
      {!backendUp && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t.fallbackNewsTitle}</p>}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
        {news.map((n, i) => (
          <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ ...s.card, display: "flex", gap: "1rem", alignItems: "center", textDecoration: "none", transition: "border-color 0.15s" }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
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
    fetch(`${BACKEND_URL}/api/chat/`)
      .then((r) => r.json())
      .then((data) => {
        const msgs = Object.values(data.messages_dict as Record<string, string>);
        setMessages(msgs);
        setBackendUp(true);
      })
      .catch(() => {
        setMessages([t.mockChatInit]);
      });
  }, [t.mockChatInit]);

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
            background: i % 2 === 0 ? "rgba(99,102,241,0.1)" : "var(--bg-secondary)",
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

  const result = score <= 3 ? t.quizResult1 : score <= 7 ? t.quizResult2 : t.quizResult3;
  const resultColor = score <= 3 ? "#4ade80" : score <= 7 ? "#facc15" : "#f87171";

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
            <button style={{ ...s.btn, background: "#ec4899", color: "var(--text-primary)", minWidth: "80px" }} onClick={() => answer(true)}>{t.yes}</button>
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
                <div style={{ width: "100%", maxWidth: "24px", height: `${(val / maxBlood) * 100}px`, background: "linear-gradient(180deg, #6366f1, #a855f7)", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
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
            {[{ label: t.statsLabels.mild, val: 10, color: "#4ade80" }, { label: t.statsLabels.moderate, val: 5, color: "#facc15" }, { label: t.statsLabels.severe, val: 3, color: "#f87171" }].map((d) => (
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
                  background: isPeriod ? "rgba(236,72,153,0.2)" : "var(--bg-secondary)",
                  border: isPeriod ? "1px solid #ec4899" : "1px solid var(--border-color)",
                  borderRadius: "0.25rem",
                  color: isPeriod ? "#ec4899" : "var(--text-secondary)",
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
      <div style={s.mockBanner} dangerouslySetInnerHTML={{ __html: t.banner }} />

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
