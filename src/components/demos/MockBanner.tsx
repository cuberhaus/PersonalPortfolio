import type { CSSProperties, ReactNode } from "react";

const bannerStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 10%, transparent), color-mix(in srgb, var(--accent-end) 8%, transparent))",
  border: "1px solid var(--glow-color-strong)",
  borderRadius: "0.5rem",
  padding: "0.5rem 1rem",
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  marginBottom: "1rem",
  textAlign: "center",
};

export default function MockBanner({ children }: { children: ReactNode }) {
  return <div style={bannerStyle}>{children}</div>;
}
