#!/bin/bash

# MPIDSDemo and PhaseTransitionsDemo
sed -i 's/rgba(255,255,255,0.08)/var(--border-color)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.1)/var(--border-color)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.15)/var(--border-color)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.2)/var(--border-color-hover)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.05)/var(--bg-secondary)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.06)/var(--border-color)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(255,255,255,0.3)/var(--text-muted)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(0,0,0,0.3)/var(--bg-secondary)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx
sed -i 's/rgba(15,15,25,0.95)/var(--bg-card)/g' src/components/demos/MPIDSDemo.tsx src/components/demos/PhaseTransitionsDemo.tsx

# BitsXMaratoDemo
sed -i 's/color: "#f4f4f5"/color: "var(--text-primary)"/g' src/components/demos/BitsXMaratoDemo.tsx
sed -i 's/boxShadow: "0 0 0 2px #18181b"/boxShadow: "0 0 0 2px var(--bg-card)"/g' src/components/demos/BitsXMaratoDemo.tsx

# Desastres
sed -i 's/fill="#1e1e2e"/fill="var(--bg-card)"/g' src/components/demos/DesastresIADemo.tsx src/components/demos/DesastresVisual.tsx
sed -i 's/fill="#fff"/fill="var(--text-primary)"/g' src/components/demos/DesastresIADemo.tsx src/components/demos/DesastresVisual.tsx
sed -i 's/fill="#fafafa"/fill="var(--text-primary)"/g' src/components/demos/DesastresIADemo.tsx src/components/demos/DesastresVisual.tsx

# ApaPractica
sed -i 's/ctx.strokeStyle = "#16162240";/ctx.strokeStyle = "rgba(128,128,128,0.2)";/g' src/components/demos/ApaPracticaDemo.tsx
sed -i 's/ctx.strokeStyle = "#fafafa";/ctx.strokeStyle = "rgba(128,128,128,0.8)";/g' src/components/demos/ApaPracticaDemo.tsx
sed -i 's/color: "#fff"/color: "var(--text-primary)"/g' src/components/demos/ApaPracticaDemo.tsx

# MPIDSDemo SVG text
sed -i 's/fill="#fff"/fill="var(--text-primary)"/g' src/components/demos/MPIDSDemo.tsx

# TendaDemo
sed -i 's/background: "linear-gradient(135deg, #1e1e2e 0%, var(--border-color) 100%)"/background: "var(--bg-secondary)"/g' src/components/demos/TendaDemo.tsx
sed -i 's/color: "#4b5563"/color: "var(--text-muted)"/g' src/components/demos/TendaDemo.tsx

