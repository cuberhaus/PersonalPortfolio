---
name: Fix_PROP_and_Add_Work_Projects
overview: Fix the PROP web app tab-switching freeze/crash and add a new Featured Work section for the Deloitte project to the portfolio.
todos:
  - id: fix-prop-domini
    content: Add fast counting methods `obtenirNombreItems` and `obtenirNombreValoracions` to `ControladorDomini.java`
    status: pending
  - id: fix-prop-home-controller
    content: Update `HomeController.java` to use the new counting methods instead of fully converting data in memory
    status: pending
  - id: create-work-projects-data
    content: Create `src/data/work_projects.json` (and `.es.json`, `.ca.json`) with the Deloitte Horse company project data
    status: pending
  - id: create-work-projects-component
    content: Create `src/components/WorkProjects.astro` component to display the professional projects elegantly
    status: pending
  - id: integrate-work-projects
    content: Add the new WorkProjects component to the main `index.astro` layout and translation dictionaries
    status: pending
isProject: false
---

# 1. Fix PROP Web App Freezing / Crashing
**The Issue:** When you switch tabs (especially going back to the Home page), the Java Spring Boot application calculates the total number of Items and Ratings to show on the dashboard cards. However, the current code (`domini.obtenirItems().size()`) forces the system to convert the **entire** database of items and ratings into huge string lists in memory just to count them! This causes massive memory spikes, freezing, and crashes.
**The Fix:** 
- Add two new efficient methods to `ControladorDomini.java`: `obtenirNombreItems()` and `obtenirNombreValoracions()` that simply return the integer size of the inner collections (e.g. `itemsActuals.obtenirTotsElsElements().size()`) without building strings.
- Update `HomeController.java` to use these new efficient methods. 

# 2. Add "Professional Work" Section to Portfolio
**The Recommendation:** For a milestone as significant as a "world-first Physical AI project at Deloitte detecting anomalies on live motor production", burying it as a bullet point in the experience timeline would be a disservice. **It deserves its own dedicated spotlight section.** 

**The Implementation Plan:**
- **New Data File:** Create `src/data/work_projects.json` to store professional highlights (Title, Company, Description, Tags, etc.). We will add the "Horse company" Physical AI project as the first entry.
- **New Component:** Create `src/components/WorkProjects.astro` that renders a sleek grid of cards (similar to the Interactive Demos section, but perhaps with a slightly more professional/corporate styling variation). 
- **Update Homepage:** Include the `<WorkProjects />` component in `src/pages/index.astro`, likely placing it between the "Experience" timeline and the "Interactive Demos" section so it naturally transitions from your roles to the specific big projects you delivered in those roles.
- **i18n Support:** Ensure the new section respects the English/Spanish/Catalan translations structure that your portfolio uses.