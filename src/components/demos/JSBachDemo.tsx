import { useState, useRef, useCallback } from "react";
import { interpret, playNotes, SAMPLE_PROGRAMS, type JSBachResult } from "../../lib/jsbach/interpreter";

const styles = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  h3: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "var(--text-primary)",
  },
  textarea: {
    width: "100%",
    minHeight: "280px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    padding: "1rem",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.6,
    resize: "vertical" as const,
    outline: "none",
    tabSize: 2,
  },
  button: {
    padding: "0.5rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "var(--text-primary)",
  },
  secondaryBtn: {
    background: "var(--border-color)",
    color: "var(--text-secondary)",
  },
  output: {
    background: "var(--bg-secondary)",
    borderRadius: "0.5rem",
    padding: "1rem",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    lineHeight: 1.6,
    maxHeight: "200px",
    overflowY: "auto" as const,
    color: "var(--text-secondary)",
  },
  error: {
    color: "#f87171",
    background: "#371520",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    marginBottom: "1rem",
  },
  noteBar: {
    display: "flex" as const,
    gap: "2px",
    flexWrap: "wrap" as const,
    marginTop: "0.75rem",
  },
  note: {
    height: "24px",
    borderRadius: "3px",
    minWidth: "8px",
    transition: "opacity 0.15s ease",
  },
  sampleBtns: {
    display: "flex" as const,
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    marginBottom: "1rem",
  },
  sampleBtn: {
    padding: "0.35rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--border-color)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontWeight: 500,
  },
} as const;

const NOTE_NAMES = ["A", "B", "C", "D", "E", "F", "G"];

function noteIntToName(n: number): string {
  if (n === 0) return "A0";
  if (n === 1) return "B0";
  if (n === 51) return "C8";
  const octave = Math.floor((n - 2) / 7) + 1;
  const idx = (n - 2) % 7;
  return NOTE_NAMES[(idx + 2) % 7] + octave;
}

function noteToColor(n: number): string {
  const hue = ((n / 51) * 280 + 230) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function JSBachDemo() {
  const [code, setCode] = useState(SAMPLE_PROGRAMS[0].code);
  const [result, setResult] = useState<JSBachResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeNote, setActiveNote] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const run = useCallback(() => {
    const r = interpret(code);
    setResult(r);
    setActiveNote(-1);
  }, [code]);

  const play = useCallback(async () => {
    if (!result || result.notes.length === 0) return;
    setPlaying(true);

    const tempo = 120;
    const beatMs = (60 / tempo) * 1000;

    result.notes.forEach((_, i) => {
      setTimeout(() => setActiveNote(i), i * beatMs);
    });
    setTimeout(() => setActiveNote(-1), result.notes.length * beatMs);

    await playNotes(result.notes, tempo);
    setPlaying(false);
  }, [result]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setCode(code.substring(0, start) + "  " + code.substring(end));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  }, [code]);

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>
      {/* Sample programs */}
      <div style={styles.card}>
        <h3 style={styles.h3}>Examples</h3>
        <div style={styles.sampleBtns}>
          {SAMPLE_PROGRAMS.map((prog) => (
            <button
              key={prog.name}
              style={styles.sampleBtn}
              onClick={() => { setCode(prog.code); setResult(null); setActiveNote(-1); }}
            >
              {prog.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={styles.card}>
        <h3 style={styles.h3}>Code Editor</h3>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={run}>
            Run
          </button>
          {result && result.notes.length > 0 && (
            <button
              style={{ ...styles.button, ...styles.secondaryBtn, opacity: playing ? 0.5 : 1 }}
              onClick={play}
              disabled={playing}
            >
              {playing ? "Playing..." : "Play Music"}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={styles.card}>
          <h3 style={styles.h3}>Output</h3>

          {result.error && <div style={styles.error}>{result.error}</div>}

          {result.output.length > 0 && (
            <div style={{ ...styles.output, marginBottom: result.notes.length > 0 ? "1rem" : 0 }}>
              {result.output.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          {result.notes.length > 0 && (
            <>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                {result.notes.length} note{result.notes.length !== 1 ? "s" : ""} generated
              </div>
              <div style={styles.noteBar}>
                {result.notes.map((n, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.note,
                      width: `${Math.max(100 / result.notes.length, 8)}%`,
                      maxWidth: "40px",
                      background: noteToColor(n),
                      opacity: activeNote === i ? 1 : activeNote === -1 ? 0.7 : 0.25,
                      transform: activeNote === i ? "scaleY(1.3)" : "scaleY(1)",
                    }}
                    title={noteIntToName(n)}
                  />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                {result.notes.map((n, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.65rem",
                      color: activeNote === i ? "var(--text-primary)" : "var(--text-muted)",
                      transition: "color 0.15s ease",
                    }}
                  >
                    {noteIntToName(n)}
                  </span>
                ))}
              </div>
            </>
          )}

          {!result.error && result.output.length === 0 && result.notes.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Program ran successfully with no output.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
