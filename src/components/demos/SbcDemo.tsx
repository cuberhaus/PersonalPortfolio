import { useState, useMemo } from "react";
import {
  CITIES, ACCOMMODATIONS, ACTIVITIES, TRANSPORTS, TRIP_TYPES, CITY_LISTS,
  type City, type Accommodation, type Activity, type Transport,
} from "../../data/sbc-mock";

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/sbc-demo";
import MockBanner from "./MockBanner";

type Lang = "en" | "es" | "ca";

/* ── Styles (same palette as other demos) ── */
const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)", minHeight: "500px" },
  card: { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "0.75rem", padding: "1.5rem" },
  btn: { padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" },
  primaryBtn: { background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", color: "var(--text-primary)" },
  secondaryBtn: { background: "var(--border-color)", color: "var(--text-secondary)" },
  input: { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem", width: "100%", outline: "none", boxSizing: "border-box" as const },
  stepLabel: { fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" },
  stepTitle: { fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" },
  stepDesc: { fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  optionBtn: { padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "2px solid var(--border-color)", background: "var(--bg-secondary)", cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const, fontSize: "0.9rem", color: "var(--text-primary)" },
  optionActive: { borderColor: "var(--accent-start)", background: "color-mix(in srgb, var(--accent-start) 12%, transparent)" },
  progressBar: { height: "4px", borderRadius: "2px", background: "var(--border-color)", marginBottom: "1.5rem", overflow: "hidden" as const },
  progressFill: { height: "100%", borderRadius: "2px", background: "linear-gradient(90deg, var(--accent-start), var(--accent-end))", transition: "width 0.3s" },
  navRow: { display: "flex", justifyContent: "space-between", marginTop: "1.5rem", gap: "0.75rem" },
  timeline: { display: "flex", flexDirection: "column" as const, gap: "1.25rem" },
  cityCard: { ...{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "0.75rem", padding: "1.25rem" }, position: "relative" as const },
  cityName: { fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" },
  tag: { display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.7rem", fontWeight: 600, marginRight: "0.35rem", marginBottom: "0.25rem" },
  summary: { display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" as const, marginTop: "1.25rem", marginBottom: "1.25rem" },
  summaryItem: { textAlign: "center" as const },
  summaryValue: { fontSize: "1.5rem", fontWeight: 700, background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  summaryLabel: { fontSize: "0.75rem", color: "var(--text-muted)" },
};

/* ── Local mini-solver (simplified from Python solver.py) ── */
interface Prefs {
  ages: number[];
  tripType: string;
  daysMin: number; daysMax: number;
  daysPerCityMin: number; daysPerCityMax: number;
  citiesMin: number; citiesMax: number;
  budget: number;
  avoidTransport: string[];
  minStars: number;
  preferUnknown: boolean;
  priority: "cost" | "days" | "cities";
}

interface CityPlan {
  city: City;
  days: number;
  hotel: Accommodation | null;
  activities: Activity[];
  transportToNext: Transport | null;
}

interface TripResult {
  cityPlans: CityPlan[];
  totalDays: number;
  totalCost: number;
  errors: string[];
}

function planTrip(prefs: Prefs): TripResult {
  const favored = CITY_LISTS[prefs.tripType] ?? [];
  const scored = CITIES.map((c) => {
    let score = 0;
    if (favored.includes(c.id)) score += 100;
    if (prefs.preferUnknown && c.population < 500_000) score += 30;
    if (!prefs.preferUnknown && c.population > 1_000_000) score += 20;
    return { city: c, score };
  }).sort((a, b) => b.score - a.score);

  const plans: CityPlan[] = [];
  let totalDays = 0;
  const maxCities = prefs.priority === "cities" ? prefs.citiesMax : Math.min(prefs.citiesMax, prefs.citiesMin + 1);

  for (const { city } of scored) {
    if (plans.length >= maxCities) break;
    if (totalDays >= prefs.daysMax) break;
    const days = Math.min(
      prefs.daysPerCityMax,
      Math.max(prefs.daysPerCityMin, prefs.daysMax - totalDays),
    );
    if (days < prefs.daysPerCityMin) break;
    plans.push({ city, days, hotel: null, activities: [], transportToNext: null });
    totalDays += days;
  }

  const errors: string[] = [];
  let budgetLeft = prefs.budget;
  let totalCost = 0;

  for (const cp of plans) {
    const hotels = ACCOMMODATIONS
      .filter((a) => a.cityId === cp.city.id && a.stars >= prefs.minStars && a.pricePerNight * cp.days <= budgetLeft)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
    const hotel = hotels[0] ?? ACCOMMODATIONS
      .filter((a) => a.cityId === cp.city.id && a.pricePerNight * cp.days <= budgetLeft)
      .sort((a, b) => a.pricePerNight - b.pricePerNight)[0] ?? null;
    cp.hotel = hotel;
    if (hotel) {
      const cost = hotel.pricePerNight * cp.days;
      budgetLeft -= cost;
      totalCost += cost;
    }
  }

  for (let i = 0; i < plans.length - 1; i++) {
    const avoidLower = prefs.avoidTransport.map((m) => m.toLowerCase());
    let routes = TRANSPORTS.filter(
      (t) => t.fromCityId === plans[i].city.id && t.toCityId === plans[i + 1].city.id
        && !avoidLower.includes(t.mode.toLowerCase()) && t.price <= budgetLeft,
    );
    if (!routes.length) {
      routes = TRANSPORTS.filter(
        (t) => t.fromCityId === plans[i].city.id && t.toCityId === plans[i + 1].city.id
          && t.price <= budgetLeft,
      );
    }
    routes.sort((a, b) => a.price - b.price);
    const route = routes[0] ?? null;
    plans[i].transportToNext = route;
    if (route) {
      budgetLeft -= route.price;
      totalCost += route.price;
    } else {
      errors.push(`No transport: ${plans[i].city.name} → ${plans[i + 1].city.name}`);
    }
  }

  for (const cp of plans) {
    const maxDur = cp.days * 100;
    let usedDur = 0;
    const acts = ACTIVITIES.filter((a) => a.cityId === cp.city.id);
    for (const act of acts) {
      if (usedDur + act.durationPct > maxDur) continue;
      if (act.price > budgetLeft) continue;
      cp.activities.push(act);
      usedDur += act.durationPct;
      budgetLeft -= act.price;
      totalCost += act.price;
    }
  }

  if (totalDays < prefs.daysMin) errors.push(`Trip too short: ${totalDays} days (min ${prefs.daysMin})`);
  if (plans.length < prefs.citiesMin) errors.push(`Too few cities: ${plans.length} (min ${prefs.citiesMin})`);
  if (plans.some((p) => !p.hotel)) errors.push("No hotel found for all cities");

  return { cityPlans: plans, totalDays, totalCost, errors };
}

/* ── Component ── */
export default function SbcDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [step, setStep] = useState(1);
  const [ages, setAges] = useState([30]);
  const [tripType, setTripType] = useState("cultural");
  const [daysMin, setDaysMin] = useState(7);
  const [daysMax, setDaysMax] = useState(14);
  const [daysPerCityMin, setDaysPerCityMin] = useState(2);
  const [daysPerCityMax, setDaysPerCityMax] = useState(4);
  const [citiesMin, setCitiesMin] = useState(2);
  const [citiesMax, setCitiesMax] = useState(4);
  const [budget, setBudget] = useState(2000);
  const [avoidTransport, setAvoidTransport] = useState<string[]>([]);
  const [minStars, setMinStars] = useState(3);
  const [preferUnknown, setPreferUnknown] = useState(false);
  const [priority, setPriority] = useState<"cost" | "days" | "cities">("cost");
  const [result, setResult] = useState<TripResult | null>(null);

  const goNext = () => { if (step < 10) setStep(step + 1); };
  const goBack = () => { if (step > 1) setStep(step - 1); };
  const doPlan = () => {
    const r = planTrip({
      ages, tripType, daysMin, daysMax, daysPerCityMin, daysPerCityMax,
      citiesMin, citiesMax, budget, avoidTransport, minStars, preferUnknown, priority,
    });
    setResult(r);
  };
  const reset = () => { setStep(1); setResult(null); };

  const toggleAvoid = (mode: string) => {
    setAvoidTransport((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const starOptions = useMemo(() => [1, 2, 3, 4, 5], []);

  /* Step renderers */
  const renderStep = () => {
    const titles: Record<number, { title: string; desc: string }> = {
      1: { title: t.s1title, desc: t.s1desc },
      2: { title: t.s2title, desc: t.s2desc },
      3: { title: t.s3title, desc: t.s3desc },
      4: { title: t.s4title, desc: t.s4desc },
      5: { title: t.s5title, desc: t.s5desc },
      6: { title: t.s6title, desc: t.s6desc },
      7: { title: t.s7title, desc: t.s7desc },
      8: { title: t.s8title, desc: t.s8desc },
      9: { title: t.s9title, desc: t.s9desc },
      10: { title: t.s10title, desc: t.s10desc },
    };
    const { title, desc } = titles[step];

    return (
      <>
        <div style={s.stepLabel}>{t.stepOf.replace("{n}", String(step))}</div>
        <div style={s.stepTitle}>{title}</div>
        <div style={s.stepDesc}>{desc}</div>
        {stepBody()}
      </>
    );
  };

  const stepBody = () => {
    switch (step) {
      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ages.map((age, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="number" min={0} max={120} value={age} style={{ ...s.input, width: "80px" }}
                  onChange={(e) => { const n = [...ages]; n[i] = Math.max(0, Math.min(120, Number(e.target.value))); setAges(n); }} />
                {ages.length > 1 && (
                  <button style={{ ...s.btn, ...s.secondaryBtn, fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                    onClick={() => setAges(ages.filter((_, j) => j !== i))}>{t.removeAge}</button>
                )}
              </div>
            ))}
            <button style={{ ...s.btn, ...s.secondaryBtn, alignSelf: "flex-start" }}
              onClick={() => setAges([...ages, 30])}>{t.addAge}</button>
          </div>
        );
      case 2:
        return (
          <div style={{ ...s.grid2 }}>
            {TRIP_TYPES.map((tt) => (
              <button key={tt.id}
                style={{ ...s.optionBtn, ...(tripType === tt.id ? s.optionActive : {}) }}
                onClick={() => setTripType(tt.id)}>
                {tt.emoji} {tt[lang] || tt.en}
              </button>
            ))}
          </div>
        );
      case 3:
        return (
          <div style={s.grid2}>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.minDays}</div>
              <input type="number" min={1} max={30} value={daysMin} style={s.input}
                onChange={(e) => setDaysMin(Math.max(1, Math.min(30, Number(e.target.value))))} />
            </label>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.maxDays}</div>
              <input type="number" min={1} max={60} value={daysMax} style={s.input}
                onChange={(e) => setDaysMax(Math.max(1, Math.min(60, Number(e.target.value))))} />
            </label>
          </div>
        );
      case 4:
        return (
          <div style={s.grid2}>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.minDaysCity}</div>
              <input type="number" min={1} max={14} value={daysPerCityMin} style={s.input}
                onChange={(e) => setDaysPerCityMin(Math.max(1, Math.min(14, Number(e.target.value))))} />
            </label>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.maxDaysCity}</div>
              <input type="number" min={1} max={14} value={daysPerCityMax} style={s.input}
                onChange={(e) => setDaysPerCityMax(Math.max(1, Math.min(14, Number(e.target.value))))} />
            </label>
          </div>
        );
      case 5:
        return (
          <div style={s.grid2}>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.minCities}</div>
              <input type="number" min={1} max={10} value={citiesMin} style={s.input}
                onChange={(e) => setCitiesMin(Math.max(1, Math.min(10, Number(e.target.value))))} />
            </label>
            <label>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{t.maxCities}</div>
              <input type="number" min={1} max={10} value={citiesMax} style={s.input}
                onChange={(e) => setCitiesMax(Math.max(1, Math.min(10, Number(e.target.value))))} />
            </label>
          </div>
        );
      case 6:
        return (
          <div>
            <input type="range" min={200} max={10000} step={100} value={budget}
              style={{ width: "100%", accentColor: "var(--accent-start)" }}
              onChange={(e) => setBudget(Number(e.target.value))} />
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: "1.25rem", marginTop: "0.5rem" }}>
              €{budget.toLocaleString()}
            </div>
          </div>
        );
      case 7: {
        const modes = [
          { id: "Avion", label: `✈️ ${t.plane}` },
          { id: "Tren", label: `🚂 ${t.train}` },
          { id: "Barco", label: `🚢 ${t.boat}` },
        ];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {modes.map((m) => (
              <button key={m.id}
                style={{ ...s.optionBtn, ...(avoidTransport.includes(m.id) ? s.optionActive : {}) }}
                onClick={() => toggleAvoid(m.id)}>
                {avoidTransport.includes(m.id) ? "❌ " : ""}{m.label}
              </button>
            ))}
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {avoidTransport.length === 0 ? t.avoidNone : `${t.avoid}: ${avoidTransport.join(", ")}`}
            </div>
          </div>
        );
      }
      case 8:
        return (
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {starOptions.map((n) => (
              <button key={n}
                style={{ ...s.optionBtn, textAlign: "center", minWidth: "3.5rem", ...(minStars === n ? s.optionActive : {}) }}
                onClick={() => setMinStars(n)}>
                {"⭐".repeat(n)}
              </button>
            ))}
          </div>
        );
      case 9:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button style={{ ...s.optionBtn, ...(preferUnknown ? s.optionActive : {}) }}
              onClick={() => setPreferUnknown(true)}>🗺️ {t.preferUnknown}</button>
            <button style={{ ...s.optionBtn, ...(!preferUnknown ? s.optionActive : {}) }}
              onClick={() => setPreferUnknown(false)}>🏙️ {t.preferPopular}</button>
          </div>
        );
      case 10:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(["cost", "days", "cities"] as const).map((p) => {
              const label = p === "cost" ? t.prioCost : p === "days" ? t.prioDays : t.prioCities;
              return (
                <button key={p}
                  style={{ ...s.optionBtn, ...(priority === p ? s.optionActive : {}) }}
                  onClick={() => setPriority(p)}>
                  {label}
                </button>
              );
            })}
          </div>
        );
      default: return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;
    return (
      <div>
        <div style={s.stepTitle}>{t.resultTitle}</div>
        <div style={s.summary}>
          <div style={s.summaryItem}>
            <div style={s.summaryValue}>{result.totalDays}</div>
            <div style={s.summaryLabel}>{t.totalDays}</div>
          </div>
          <div style={s.summaryItem}>
            <div style={s.summaryValue}>{result.cityPlans.length}</div>
            <div style={s.summaryLabel}>{lang === "en" ? "Cities" : lang === "es" ? "Ciudades" : "Ciutats"}</div>
          </div>
          <div style={s.summaryItem}>
            <div style={s.summaryValue}>€{Math.round(result.totalCost).toLocaleString()}</div>
            <div style={s.summaryLabel}>{t.totalCost}</div>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div style={{ ...s.card, borderColor: "orange", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <strong>⚠️ {t.errors}:</strong>
            <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div style={s.timeline}>
          {result.cityPlans.map((cp, idx) => (
            <div key={idx}>
              <div style={s.cityCard}>
                <div style={s.cityName}>📍 {cp.city.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {cp.days} {cp.days === 1 ? t.day : t.days} · {cp.city.continent}
                </div>
                {cp.hotel ? (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span style={{ ...s.tag, background: "color-mix(in srgb, var(--accent-start) 15%, transparent)", color: "var(--accent-start)" }}>
                      {t.hotel}
                    </span>
                    {cp.hotel.name} {"⭐".repeat(cp.hotel.stars)} — €{cp.hotel.pricePerNight}/night
                  </div>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "orange", marginBottom: "0.5rem" }}>{t.noHotel}</div>
                )}
                {cp.activities.length > 0 && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span style={{ ...s.tag, background: "color-mix(in srgb, var(--accent-end) 15%, transparent)", color: "var(--accent-end)" }}>
                      {t.activities}
                    </span>
                    {cp.activities.map((a) => a.name).join(", ")}
                  </div>
                )}
              </div>
              {cp.transportToNext && (
                <div style={{ textAlign: "center", padding: "0.5rem 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {cp.transportToNext.mode === "Avion" ? "✈️" : cp.transportToNext.mode === "Tren" ? "🚂" : "🚢"}{" "}
                  {cp.transportToNext.name} — €{cp.transportToNext.price}
                </div>
              )}
              {idx < result.cityPlans.length - 1 && !cp.transportToNext && (
                <div style={{ textAlign: "center", padding: "0.5rem 0", fontSize: "0.8rem", color: "orange" }}>
                  ⚠️ {t.noTransport}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ ...s.navRow, justifyContent: "center" }}>
          <button style={{ ...s.btn, ...s.primaryBtn }} onClick={reset}>{t.newTrip}</button>
        </div>
      </div>
    );
  };

  return (
    <div style={s.wrapper}>
      <MockBanner>{t.bannerPre}<code>{t.bannerCode}</code>{t.bannerPost}</MockBanner>

      {!result ? (
        <div style={s.card}>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${(step / 10) * 100}%` }} />
          </div>
          {renderStep()}
          <div style={s.navRow}>
            {step > 1 ? (
              <button style={{ ...s.btn, ...s.secondaryBtn }} onClick={goBack}>{t.back}</button>
            ) : (
              <div />
            )}
            {step < 10 ? (
              <button style={{ ...s.btn, ...s.primaryBtn }} onClick={goNext}>{t.next}</button>
            ) : (
              <button style={{ ...s.btn, ...s.primaryBtn }} onClick={doPlan}>{t.plan}</button>
            )}
          </div>
        </div>
      ) : renderResult()}
    </div>
  );
}
