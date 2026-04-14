---
name: Create HTML Mock for PROP Demo
overview: Replace the 'Demo unavailable' section in the production build with an interactive HTML/CSS mock of the PROP recommendation system.
todos:
  - id: add-mock-translations
    content: Add mock UI translations to the TRANSLATIONS object in prop.astro
    status: completed
  - id: create-mock-html
    content: Create the HTML structure for the mock interface in prop.astro
    status: completed
  - id: style-mock-ui
    content: Add CSS styling to make the mock look like the real Bootstrap 5 app
    status: completed
  - id: add-mock-interactivity
    content: Add vanilla JS to handle fake tab switching in the mock
    status: completed
isProject: false
---

# Create HTML/CSS Mock for PROP Demo

When the PROP application is built for production (where `import.meta.env.DEV` is false and the local Spring Boot backend isn't running), we will display a mini-interactive HTML mock instead of a simple "Demo unavailable" message.

## 1. Modify `prop.astro` Template

- Edit `src/pages/demos/prop.astro`.
- Locate the `!isDev` fallback section.
- Instead of showing "Demo unavailable", build a structural representation of the PROP web app.

## 2. Build the Mock UI Structure

The mock will replicate the look and feel of the real Spring Boot app we built earlier:

- **Navbar:** A fake navigation bar with branding ("Sistema de Recomanació") and simulated tabs (Tipus d'ítem, Ítems, Usuaris, Valoracions, Recomanacions).
- **Dashboard/Home View:** A simulated dashboard showing the statistics cards we recently added to the real app (Tipus d'ítem actual, Usuaris al sistema, Ítems carregats, Valoracions totals, Estat de la Sessió).
- **Styling:** We will add encapsulated CSS within the `prop.astro` file to match the dark theme, using borders, background colors, and typography that mimic the Bootstrap 5 setup in the real app.

## 3. Add Minor Interactivity (Optional/Simulated)

- We will use plain JavaScript (vanilla JS) within a `<script>` tag in Astro to allow users to click the fake navbar tabs and switch between pre-rendered mock views (e.g., switching from the Home dashboard to a static mock of the Recommendations list).
- *Scope Note:* The mock will be purely visual frontend logic; no actual backend calls or complex logic will be implemented. It is simply to give visitors a feel for the UI.

## 4. Translate Mock Strings

- We will add the required mock interface strings to the `TRANSLATIONS` dictionary inside `prop.astro` to ensure the mock is localized in English, Spanish, and Catalan.

