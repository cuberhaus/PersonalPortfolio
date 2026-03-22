
2. Google Analytics (GA4)
Created an Analytics.astro component and injected it globally into the main Layout and DemoLayout <head> sections.
Your Action: Sign in to Google Analytics, create a property, get your Measurement ID (it starts with G-), and replace the 'G-XXXXXXXXXX' string at the top of the src/components/Analytics.astro file.

3. OpenGraph Social Images per Demo
Updated DemoLayout.astro to accept an ogImage property. By default, it will fall back to your main /og-image.jpg. I've also updated your JSON data files with a placeholder "image": "" to reflect where they could be stored.
Your Action: If you want a specific image to appear when linking a demo on Twitter or LinkedIn, capture a screenshot, place it in public/ (e.g. draculin-og.jpg), and then pass it as a prop in the demo's .astro file like so: <DemoLayout title="..." description="..." ogImage="/draculin-og.jpg">.
