import { DEFAULT_LOCALE, type Locale } from '../config/locales';

// `Record<Locale, string>` enforces a label for every locale at compile time,
// so adding a 4th locale in `src/config/locales.ts` makes this dictionary fail
// to type-check until the new label is added.
export const languages: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
};

export const defaultLang: Locale = DEFAULT_LOCALE;

export const ui = {
  en: {
    // Nav
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.skills': 'Skills',
    'nav.experience': 'Experience',
    'nav.education': 'Education',
    'nav.certifications': 'Certifications',
    'nav.work': 'Professional Work',
    'nav.contact': 'Contact',

    // Hero
    'hero.greeting': 'Hi, my name is',
    'hero.tagline_1': 'I like building',
    'hero.tagline_2': 'things with AI & data.',
    'hero.description':
      'Computer Science Engineer from Barcelona, currently an AI & Data Consultant at Deloitte. I enjoy exploring new tech, shipping real tools, and helping my team build things that actually work.',
    'hero.cta': 'View my work',

    // About
    'about.label': 'About',
    'about.title': 'A bit about me',
    'about.p1':
      "Hi! I'm Pol — a Computer Science Engineer from Barcelona. I graduated from UPC's Facultat d'Informàtica de Barcelona (FIB) and now work as an AI & Data Consultant at Deloitte, where most of my days are spent at the intersection of AI, data platforms, and the messy reality of making them useful.",
    'about.p2':
      "What I actually enjoy is building stuff — exploring new tools, figuring out how they fit together, and helping my team ship things we're proud of. I care more about solving the problem than about picking the trendiest stack, though I'm happy when both line up.",
    'about.p3':
      "Outside of work you'll usually find me climbing, deep in a videogame, or pretending my Vim keybindings make me faster than I really am. Here's some of the tech I've been using lately:",
    'about.cv': 'Download CV',

    // Projects
    'projects.label': 'Interactive',
    'projects.title': 'Try my projects',
    'projects.subtitle': 'Live, interactive demos you can play with right in your browser.',
    'projects.badge': 'Live Demo',
    'projects.showMore': 'Show more',
    'projects.showLess': 'Show less',

    // Skills
    'skills.label': 'Skills',
    'skills.title': 'Tech I work with',
    'skills.subtitle': 'Technologies and tools I use to bring ideas to life.',

    // Experience
    'experience.label': 'Experience',
    'experience.title': "Where I've worked",
    'experience.subtitle': 'A timeline of my professional journey so far.',

    // Work Projects
    'work.label': 'Professional Work',
    'work.title': 'Featured Projects',
    'work.subtitle': 'Key milestones and AI initiatives delivered in the real world.',

    // Education
    'education.label': 'Education',
    'education.title': 'Where I studied',

    // Certifications
    'certifications.label': 'Credentials',
    'certifications.title': 'Licenses & certifications',
    'certifications.subtitle': 'Professional certifications I have earned along the way.',
    'certifications.viewCredential': 'View credential',
    'certifications.showMore': 'Show more',
    'certifications.showLess': 'Show less',

    // Contact
    'contact.label': 'Contact',
    'contact.title': 'Get in touch',
    'contact.text':
      "I'm currently open to new opportunities and collaborations. Whether you have a question, a project idea, or just want to say hi — my inbox is always open.",
    'contact.cta': 'Send Message',
    'contact.name': 'Name',
    'contact.namePlaceholder': 'Your name',
    'contact.email': 'Email',
    'contact.emailPlaceholder': 'your.email@example.com',
    'contact.message': 'Message',
    'contact.messagePlaceholder': 'Your message...',
    'contact.success': 'Thanks! Your message has been sent.',
    'contact.error': 'Oops! Something went wrong. Please try again.',
    'contact.invalidEmail': 'Please enter a valid email address (e.g., name@gmail.com).',
    'contact.sending': 'Sending...',
    'contact.didYouMean': 'Did you mean',
    'contact.useSuggestion': 'Use this',

    // Demos Layout
    'demo.portfolio': 'Portfolio',

    'demo.moreProjects': 'More Projects',
    'demo.previous': 'Previous',
    'demo.next': 'Next',
    'demo.viewSource': 'View Source on GitHub',
    'demo.viewFrontend': 'Frontend Code (GitHub)',
    'demo.viewBackend': 'Backend Code (GitHub)',
    'demo.allDemos': 'All Demos',
    'meta.title': 'Pol Casacuberta — Portfolio',
    'meta.description':
      'Pol Casacuberta — AI & Data Consultant from Barcelona. I build things with AI and data.',
    'notFound.title': 'Page Not Found',
    'notFound.message': "The page you're looking for doesn't exist or has been moved.",
    'notFound.back': 'Portfolio',
    'aria.toggleMenu': 'Toggle menu',
    'aria.toggleTheme': 'Toggle theme (Ctrl+K for more themes)',
    'aria.scrollTop': 'Scroll to top of page',
    'aria.viewGithub': 'View on GitHub',
    'aria.skipToContent': 'Skip to content',

    // Theme + design picker (Ctrl+K)
    'theme.customize': 'Customize',
    'theme.design': 'Design',
    'theme.palette': 'Palette',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.recommended': 'recommended for this design',
    'theme.closeHint': 'Press <kbd>Esc</kbd> to close',
    // Design names + blurbs are owned by src/lib/designs.ts (see translations
    // field on each DesignMeta entry); look them up via getDesignName /
    // getDesignBlurb so adding a new design only touches one file.
  },
  es: {
    // Nav
    'nav.about': 'Sobre mí',
    'nav.projects': 'Proyectos',
    'nav.skills': 'Habilidades',
    'nav.experience': 'Experiencia',
    'nav.education': 'Educación',
    'nav.certifications': 'Certificaciones',
    'nav.work': 'Trabajo Profesional',
    'nav.contact': 'Contacto',

    // Hero
    'hero.greeting': 'Hola, mi nombre es',
    'hero.tagline_1': 'Me gusta construir',
    'hero.tagline_2': 'cosas con IA y datos.',
    'hero.description':
      'Ingeniero Informático de Barcelona, actualmente Consultor de IA y Datos en Deloitte. Disfruto explorando nuevas tecnologías, sacando adelante herramientas reales y ayudando a mi equipo a construir cosas que de verdad funcionen.',
    'hero.cta': 'Ver mi trabajo',

    // About
    'about.label': 'Sobre mí',
    'about.title': 'Un poco sobre mí',
    'about.p1':
      "¡Hola! Soy Pol, Ingeniero Informático de Barcelona. Me gradué en la Facultat d'Informàtica de Barcelona (FIB) de la UPC y ahora trabajo como Consultor de IA y Datos en Deloitte, donde paso la mayor parte de los días en la intersección de la IA, las plataformas de datos y la realidad algo caótica de hacerlas útiles.",
    'about.p2':
      'Lo que realmente disfruto es construir: explorar herramientas nuevas, entender cómo encajan entre sí y ayudar a mi equipo a sacar adelante cosas de las que estemos orgullosos. Me importa más resolver el problema que usar el stack más de moda, aunque me alegra cuando ambas cosas coinciden.',
    'about.p3':
      'Fuera del trabajo me suelen encontrar escalando, metido en un videojuego o fingiendo que mis atajos de Vim me hacen más rápido de lo que soy. Estas son algunas de las tecnologías con las que he trabajado últimamente:',
    'about.cv': 'Descargar CV',

    // Projects
    'projects.label': 'Interactivo',
    'projects.title': 'Prueba mis proyectos',
    'projects.subtitle':
      'Demos interactivas y en vivo que puedes probar directamente en tu navegador.',
    'projects.badge': 'Demo en vivo',
    'projects.showMore': 'Mostrar más',
    'projects.showLess': 'Mostrar menos',

    // Skills
    'skills.label': 'Habilidades',
    'skills.title': 'Tecnología que utilizo',
    'skills.subtitle': 'Tecnologías y herramientas que uso para hacer realidad las ideas.',

    // Experience
    'experience.label': 'Experiencia',
    'experience.title': 'Dónde he trabajado',
    'experience.subtitle': 'Una línea de tiempo de mi trayectoria profesional hasta ahora.',

    // Work Projects
    'work.label': 'Trabajo Profesional',
    'work.title': 'Proyectos Destacados',
    'work.subtitle': 'Hitos clave e iniciativas de IA entregadas en el mundo real.',

    // Education
    'education.label': 'Educación',
    'education.title': 'Dónde estudié',

    // Certifications
    'certifications.label': 'Credenciales',
    'certifications.title': 'Licencias y certificaciones',
    'certifications.subtitle': 'Certificaciones profesionales que he obtenido por el camino.',
    'certifications.viewCredential': 'Ver credencial',
    'certifications.showMore': 'Ver más',
    'certifications.showLess': 'Ver menos',

    // Contact
    'contact.label': 'Contacto',
    'contact.title': 'Ponte en contacto',
    'contact.text':
      'Actualmente estoy abierto a nuevas oportunidades y colaboraciones. Ya sea que tengas una pregunta, una idea para un proyecto o simplemente quieras saludar, mi bandeja de entrada siempre está abierta.',
    'contact.cta': 'Enviar Mensaje',
    'contact.name': 'Nombre',
    'contact.namePlaceholder': 'Tu nombre',
    'contact.email': 'Correo electrónico',
    'contact.emailPlaceholder': 'tu.correo@ejemplo.com',
    'contact.message': 'Mensaje',
    'contact.messagePlaceholder': 'Tu mensaje...',
    'contact.success': '¡Gracias! Tu mensaje ha sido enviado.',
    'contact.error': '¡Ups! Algo salió mal. Por favor, inténtalo de nuevo.',
    'contact.invalidEmail': 'Por favor, introduce un correo válido (ej. nombre@gmail.com).',
    'contact.sending': 'Enviando...',
    'contact.didYouMean': 'Quisiste decir',
    'contact.useSuggestion': 'Usar esta',

    // Demos Layout
    'demo.portfolio': 'Portafolio',

    'demo.moreProjects': 'Más Proyectos',
    'demo.previous': 'Anterior',
    'demo.next': 'Siguiente',
    'demo.viewSource': 'Ver código en GitHub',
    'demo.viewFrontend': 'Código Frontend (GitHub)',
    'demo.viewBackend': 'Código Backend (GitHub)',
    'demo.allDemos': 'Todos los Demos',
    'meta.title': 'Pol Casacuberta — Portafolio',
    'meta.description':
      'Pol Casacuberta — Consultor de IA y Datos de Barcelona. Construyo cosas con IA y datos.',
    'notFound.title': 'Página no encontrada',
    'notFound.message': 'La página que buscas no existe o ha sido movida.',
    'notFound.back': 'Portafolio',
    'aria.toggleMenu': 'Abrir menú',
    'aria.toggleTheme': 'Cambiar tema (Ctrl+K para más temas)',
    'aria.scrollTop': 'Ir arriba',
    'aria.viewGithub': 'Ver en GitHub',
    'aria.skipToContent': 'Saltar al contenido',

    // Theme + design picker (Ctrl+K)
    'theme.customize': 'Personaliza',
    'theme.design': 'Diseño',
    'theme.palette': 'Paleta',
    'theme.dark': 'Oscuro',
    'theme.light': 'Claro',
    'theme.recommended': 'recomendada para este diseño',
    'theme.closeHint': 'Pulsa <kbd>Esc</kbd> para cerrar',
    // Design name/blurb translations live in src/lib/designs.ts (see ES entries on each DesignMeta).
  },
  ca: {
    // Nav
    'nav.about': 'Sobre mi',
    'nav.projects': 'Projectes',
    'nav.skills': 'Habilitats',
    'nav.experience': 'Experiència',
    'nav.education': 'Educació',
    'nav.certifications': 'Certificacions',
    'nav.work': 'Treball Professional',
    'nav.contact': 'Contacte',

    // Hero
    'hero.greeting': 'Hola, em dic',
    'hero.tagline_1': "M'agrada construir",
    'hero.tagline_2': 'coses amb IA i dades.',
    'hero.description':
      "Enginyer Informàtic de Barcelona, actualment Consultor d'IA i Dades a Deloitte. Gaudeixo explorant noves tecnologies, tirant endavant eines reals i ajudant el meu equip a construir coses que funcionin de veritat.",
    'hero.cta': 'Veure el meu treball',

    // About
    'about.label': 'Sobre mi',
    'about.title': 'Una mica sobre mi',
    'about.p1':
      "Hola! Soc el Pol, Enginyer Informàtic de Barcelona. Em vaig graduar a la Facultat d'Informàtica de Barcelona (FIB) de la UPC i ara treballo com a Consultor d'IA i Dades a Deloitte, on passo la major part dels dies a la intersecció de la IA, les plataformes de dades i la realitat una mica caòtica de fer-les útils.",
    'about.p2':
      "El que realment gaudeixo és construir: explorar eines noves, entendre com encaixen entre si i ajudar el meu equip a tirar endavant coses de les quals estiguem orgullosos. M'importa més resoldre el problema que fer servir l'stack més de moda, tot i que m'alegra quan les dues coses coincideixen.",
    'about.p3':
      'Fora de la feina em sol trobar escalant, ficat en un videojoc o fent veure que els meus atalls de Vim em fan més ràpid del que soc. Aquestes són algunes de les tecnologies amb què he treballat últimament:',
    'about.cv': 'Descarregar CV',

    // Demos
    'projects.label': 'Interactiu',
    'projects.title': 'Prova els meus projectes',
    'projects.subtitle':
      'Demos interactives i en viu que pots provar directament al teu navegador.',
    'projects.badge': 'Demo en viu',
    'projects.showMore': 'Mostra més',
    'projects.showLess': 'Mostra menys',

    // Skills
    'skills.label': 'Habilitats',
    'skills.title': 'Tecnologia que utilitzo',
    'skills.subtitle': 'Tecnologies i eines que faig servir per fer realitat les idees.',

    // Experience
    'experience.label': 'Experiència',
    'experience.title': 'On he treballat',
    'experience.subtitle': 'Una línia de temps de la meva trajectòria professional fins ara.',

    // Work Projects
    'work.label': 'Treball Professional',
    'work.title': 'Projectes Destacats',
    'work.subtitle': "Fites clau i iniciatives d'IA entregades al món real.",

    // Education
    'education.label': 'Educació',
    'education.title': 'On he estudiat',

    // Certifications
    'certifications.label': 'Credencials',
    'certifications.title': 'Llicències i certificacions',
    'certifications.subtitle': 'Certificacions professionals que he obtingut pel camí.',
    'certifications.viewCredential': 'Veure credencial',
    'certifications.showMore': 'Veure més',
    'certifications.showLess': 'Veure menys',

    // Contact
    'contact.label': 'Contacte',
    'contact.title': "Posa't en contacte",
    'contact.text':
      'Actualment estic obert a noves oportunitats i col·laboracions. Tant si tens una pregunta, una idea per a un projecte o simplement vols saludar, la meva bústia sempre està oberta.',
    'contact.cta': 'Enviar Missatge',
    'contact.name': 'Nom',
    'contact.namePlaceholder': 'El teu nom',
    'contact.email': 'Correu electrònic',
    'contact.emailPlaceholder': 'el.teu.correu@exemple.com',
    'contact.message': 'Missatge',
    'contact.messagePlaceholder': 'El teu missatge...',
    'contact.success': 'Gràcies! El teu missatge ha estat enviat.',
    'contact.error': 'Ui! Alguna cosa ha anat malament. Si us plau, torna-ho a provar.',
    'contact.invalidEmail': 'Si us plau, introdueix un correu vàlid (ex. nom@gmail.com).',
    'contact.sending': 'Enviant...',
    'contact.didYouMean': 'Volies dir',
    'contact.useSuggestion': 'Fer servir aquesta',

    // Demos Layout
    'demo.portfolio': 'Portafolis',

    'demo.moreProjects': 'Més Projectes',
    'demo.previous': 'Anterior',
    'demo.next': 'Següent',
    'demo.viewSource': 'Veure codi a GitHub',
    'demo.viewFrontend': 'Codi Frontend (GitHub)',
    'demo.viewBackend': 'Codi Backend (GitHub)',
    'demo.allDemos': 'Totes les Demos',
    'meta.title': 'Pol Casacuberta — Portafolis',
    'meta.description':
      "Pol Casacuberta — Consultor d'IA i Dades de Barcelona. Construeixo coses amb IA i dades.",
    'notFound.title': 'Pàgina no trobada',
    'notFound.message': 'La pàgina que busques no existeix o ha estat moguda.',
    'notFound.back': 'Portafolis',
    'aria.toggleMenu': 'Obrir menú',
    'aria.toggleTheme': 'Canviar tema (Ctrl+K per a més temes)',
    'aria.scrollTop': 'Anar a dalt',
    'aria.viewGithub': 'Veure a GitHub',
    'aria.skipToContent': 'Saltar al contingut',

    // Theme + design picker (Ctrl+K)
    'theme.customize': 'Personalitza',
    'theme.design': 'Disseny',
    'theme.palette': 'Paleta',
    'theme.dark': 'Fosc',
    'theme.light': 'Clar',
    'theme.recommended': 'recomanada per a aquest disseny',
    'theme.closeHint': 'Prem <kbd>Esc</kbd> per tancar',
    // Les traduccions del nom/descripció dels dissenys viuen a src/lib/designs.ts.
  },
} as const;
