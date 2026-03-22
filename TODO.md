1. Downloadable CV
Added a styled "Download CV" button in the About section below the list of your technical skills, with full translations (Descargar CV / Descarregar CV).
Your Action: Add your actual resume as a PDF file named cv.pdf into the public/ folder.

2. Google Analytics (GA4)
Created an Analytics.astro component and injected it globally into the main Layout and DemoLayout <head> sections.
Your Action: Sign in to Google Analytics, create a property, get your Measurement ID (it starts with G-), and replace the 'G-XXXXXXXXXX' string at the top of the src/components/Analytics.astro file.

3. OpenGraph Social Images per Demo
Updated DemoLayout.astro to accept an ogImage property. By default, it will fall back to your main /og-image.jpg. I've also updated your JSON data files with a placeholder "image": "" to reflect where they could be stored.
Your Action: If you want a specific image to appear when linking a demo on Twitter or LinkedIn, capture a screenshot, place it in public/ (e.g. draculin-og.jpg), and then pass it as a prop in the demo's .astro file like so: <DemoLayout title="..." description="..." ogImage="/draculin-og.jpg">.

4. Contact Form
Upgraded the Contact section with a sleek, accessible contact form (Name, Email, Message) using Web3Forms. It includes full language translations for all placeholders and labels. I also restored the social links (GitHub/LinkedIn/Email) at the bottom!
Your Action: Go to Web3Forms, grab a free API Access Key by entering your email, and replace "YOUR_ACCESS_KEY_HERE" at the top of the src/components/Contact.astro file.
Feel free to run npm run dev to see how everything looks. Let me know if you would like me to tweak any of the styling!