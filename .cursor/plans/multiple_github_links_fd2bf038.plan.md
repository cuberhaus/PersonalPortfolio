---
name: Multiple GitHub Links
overview: Modify the project cards to support multiple GitHub links and update Draculin's data to include both its frontend and backend repositories.
todos: []
isProject: false
---

# Support Multiple GitHub Links in Project Cards

To solve the issue of Draculin having two GitHub repositories but only one icon on its project card, we can update the code to support multiple links.

Here is the plan:

- **Update the Astro Component**: Modify `src/components/Demos.astro` so that it handles the `demo.github` property as either a single string or an array of strings. We will wrap the output in a flex container (e.g., `<div style="display: flex; gap: 0.5rem;">`) and map over the array to render a GitHub cat icon for each link.
- **Update the Data Files**: Change the `github` property for the `draculin` entry in `src/data/demos.json`, `src/data/demos.es.json`, and `src/data/demos.ca.json`. We will change it from a single string to an array containing both the frontend and backend URLs:
`"github": ["https://github.com/cuberhaus/Draculin-Front", "https://github.com/cuberhaus/Draculin-Backend"]`

This will elegantly show two side-by-side cat icons on the Draculin card, while keeping all other project cards unchanged with their single icon.