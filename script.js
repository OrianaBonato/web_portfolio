// ==========================================
// PROJECTS — SPLIT SCROLL
// ==========================================
(function () {
    const wrap = document.getElementById('projectsSplit');
    if (!wrap) return;

    // en móvil no hay scroll-hijack: el CSS apila las cards en una columna
    if (window.matchMedia('(max-width: 768px)').matches) {
        wrap.style.height = 'auto';
        wrap.querySelectorAll('.project-cover').forEach((c) => { c.style.transform = ''; });
        return;
    }

    const hint = document.getElementById('projectsHint');
    const leftCovers  = [...wrap.querySelectorAll('.project-cover[data-side="left"]')];
    const rightCovers = [...wrap.querySelectorAll('.project-cover[data-side="right"]')];
    const leftLabel  = wrap.querySelector('.project-index--left');
    const rightLabel = wrap.querySelector('.project-index--right');

    // nº de "avances" alternados (izq/der), derivado de las cards que EXISTEN:
    // así se puede comentar/descomentar un proyecto sin tocar nada más.
    const totalCovers = leftCovers.length + rightCovers.length;
    if (totalCovers === 0) return;
    const STEPS = Math.max(1, totalCovers - 2);

    // altura del track acorde al nº de avances (antes era 500vh fijo en el CSS)
    wrap.style.height = (STEPS + 1) * 100 + 'vh';

    let ticking = false;
    let currentStep = -1;

    // se usa la POSICIÓN de la card dentro de su panel (no un data-index fijo)
    // 0% activa · -100% ya pasada · 100% pendiente
    function place(el, i, activeI) {
        const y = i === activeI ? 0 : (i < activeI ? -100 : 100);
        el.style.transform = `translateY(${y}%)`;
        el.classList.toggle('is-active', i === activeI);
    }

    function apply(step) {
        // izquierda avanza en steps impares acumulados, derecha en los pares
        const leftI  = Math.ceil(step / 2);
        const rightI = Math.floor(step / 2);

        leftCovers.forEach((el, i) => place(el, i, leftI));
        rightCovers.forEach((el, i) => place(el, i, rightI));

        if (leftLabel)  leftLabel.textContent  = String(2 * leftI + 1).padStart(2, '0');
        if (rightLabel) rightLabel.textContent = String(2 * rightI + 2).padStart(2, '0');
        if (hint) hint.style.opacity = step === 0 ? '1' : '0';
    }

    function compute() {
        ticking = false;
        const total = wrap.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        const scrolled = -wrap.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, scrolled / total));
        const step = Math.round(p * STEPS);
        if (step !== currentStep) {
            currentStep = step;
            apply(step);
        }
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(compute);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    compute();
})();


// ==========================================
// PROJECT DETAIL — BARRA DE PROGRESO (solo móvil)
// Se inyecta por JS: fija abajo, se llena con el scroll y el contador
// marca qué imagen cruza el centro de la pantalla.
// ==========================================
function initMobileProgress(photos, progressBox) {
    // los dots de escritorio no se usan en móvil
    if (progressBox) progressBox.style.display = 'none';

    // en modo tira contamos las imágenes de la tira; si no, las fotos.
    // el CTA final no cuenta como imagen.
    const strip = document.querySelector('.project-strip');
    const imgs = strip
        ? [...strip.querySelectorAll('img')]
        : photos.filter((p) => !p.classList.contains('project-photo--cta'));
    const total = imgs.length;
    if (total === 0) return;

    const box = document.createElement('div');
    box.className = 'm-progress';
    box.innerHTML = '<div class="m-progress-track"><div class="m-progress-fill"></div></div>' +
                    '<span class="m-progress-count"></span>';
    document.body.appendChild(box);
    const bar = box.querySelector('.m-progress-fill');
    const cnt = box.querySelector('.m-progress-count');

    let raf = false;
    function update() {
        raf = false;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        bar.style.width = (p * 100) + '%';

        const mid = window.innerHeight * 0.5;
        let active = 0;
        imgs.forEach((im, i) => { if (im.getBoundingClientRect().top <= mid) active = i; });
        cnt.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
    function onScroll() { if (raf) return; raf = true; requestAnimationFrame(update); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', update);
    update();
}


// ==========================================
// PROJECT DETAIL — SPLIT SCROLL (nº de fotos dinámico)
// ==========================================
(function () {
    const wrap = document.getElementById('projectSplit');
    if (!wrap) return;

    const photos = [...document.querySelectorAll('#projectPhotos .project-photo')];
    const progressBox = document.getElementById('projectProgress');
    const counterEl = document.getElementById('projectCounter');
    const total = photos.length;
    if (total === 0) return;

    // en móvil: sin carrusel cuadrado ni pan; las fotos fluyen a ancho completo
    // y el progreso pasa a una barra fija abajo.
    if (window.matchMedia('(max-width: 768px)').matches) {
        wrap.style.height = 'auto';
        photos.forEach((p) => {
            p.style.width = '';
            p.style.height = '';
            p.style.transform = '';
            // el screenshot largo se sirve como <img> en flujo para verlo entero
            if (p.classList.contains('project-photo--tall')) {
                const m = /url\(["']?(.+?)["']?\)/.exec(p.style.backgroundImage);
                if (m) {
                    const img = document.createElement('img');
                    img.src = m[1];
                    img.alt = '';
                    p.appendChild(img);
                    p.style.backgroundImage = 'none';
                }
            }
        });
        initMobileProgress(photos, progressBox);
        return;
    }

    // MODO TIRA: fotos de alturas distintas apiladas a ancho completo, sin
    // espacio entre ellas; el scroll las recorre en continuo dentro del cuadrado.
    const stripWin = wrap.querySelector('.project-photo--strip');
    const strip = stripWin ? stripWin.querySelector('.project-strip') : null;
    const stripImgs = strip ? [...strip.querySelectorAll('img')] : [];

    // lado del cuadrado = menor entre el ancho del panel y el alto disponible
    // bajo la barra de navegación (84px). Así la imagen 1:1 nunca se recorta.
    const NAV_H = 84;
    const rightPanel = document.querySelector('#projectSplit .project-split-right');
    function sizeSquare() {
        const w = rightPanel ? rightPanel.clientWidth : window.innerWidth / 2;
        const side = Math.max(0, Math.min(w, window.innerHeight - NAV_H));
        photos.forEach((p) => { p.style.width = side + 'px'; p.style.height = side + 'px'; });
    }
    sizeSquare();

    // margen (en "pantallas") al entrar un screenshot largo: se queda quieto
    // arriba del todo mientras termina de entrar, y recién después se recorre.
    const TALL_LEAD = 0.6;

    // peso de scroll por foto (en "pantallas"). Normal = 1.
    // Un screenshot largo (.project-photo--tall) usa más para poder recorrerlo.
    const weights = photos.map((el) =>
        (el.classList.contains('project-photo--tall') || el.classList.contains('project-photo--strip'))
            ? (parseFloat(el.dataset.tall) || 3)
            : 1
    );
    const starts = [];
    let acc = 0;
    weights.forEach((w, i) => { starts[i] = acc; acc += w; });
    const totalScreens = acc; // suma de pesos

    // altura del track: recorrido total + una pantalla visible
    wrap.style.height = (totalScreens + 1) * 100 + 'vh';

    // puntos de progreso: uno por imagen de la tira, o uno por foto
    const dotCount = stripImgs.length || total;
    for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('span');
        dot.className = 'project-progress-dot';
        progressBox.appendChild(dot);
    }
    const dots = [...progressBox.children];

    function apply(active, localP) {
        photos.forEach((el, i) => {
            el.classList.toggle('is-active', i === active);
            el.classList.toggle('is-passed', i < active);
            // pan vertical del screenshot largo según el progreso local
            if (el.classList.contains('project-photo--tall')) {
                const y = i === active ? localP : (i < active ? 1 : 0);
                el.style.backgroundPositionY = (y * 100) + '%';
            }
        });

        let mark = active; // qué punto/contador marcar

        // recorrido continuo de la tira + índice de la imagen que se está viendo
        if (strip && stripWin) {
            const winH = stripWin.clientHeight;
            const max = Math.max(0, strip.offsetHeight - winH);
            const p = photos.indexOf(stripWin) === active ? localP : 0;
            const offset = p * max;
            strip.style.transform = 'translateY(' + (-offset) + 'px)';

            // la imagen activa es la que ocupa el centro de la ventana
            const mid = offset + winH / 2;
            let acc2 = 0;
            for (let i = 0; i < stripImgs.length; i++) {
                const h = stripImgs[i].offsetHeight;
                if (mid < acc2 + h) { mark = i; break; }
                acc2 += h;
                mark = i;
            }
        }

        dots.forEach((d, i) => d.classList.toggle('is-active', i === mark));
        if (counterEl) counterEl.textContent = String(mark + 1).padStart(2, '0') + ' / ' + String(dotCount).padStart(2, '0');
    }

    let raf = false;
    function compute() {
        raf = false;
        const scrollable = wrap.offsetHeight - window.innerHeight;
        if (scrollable <= 0) { apply(0, 0); return; }
        const scrolled = -wrap.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, scrolled / scrollable));
        const pos = p * totalScreens; // 0..totalScreens
        let active = 0;
        for (let i = 0; i < total; i++) { if (starts[i] <= pos + 1e-6) active = i; }

        const local = pos - starts[active];        // pantallas recorridas dentro de la foto activa
        let localP;
        if (photos[active].classList.contains('project-photo--tall')) {
            // margen inicial: el screenshot se ve COMPLETO DESDE ARRIBA mientras
            // termina de entrar; el pan recién arranca después de TALL_LEAD.
            const span = Math.max(0.01, weights[active] - TALL_LEAD);
            localP = Math.min(1, Math.max(0, (local - TALL_LEAD) / span));
        } else {
            localP = Math.min(1, Math.max(0, local / weights[active]));
        }
        apply(active, localP);
    }

    function onScroll() { if (raf) return; raf = true; requestAnimationFrame(compute); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { sizeSquare(); onScroll(); });

    // el alto de la tira depende de las imágenes cargadas: recalcular al cargar
    stripImgs.forEach((img) => img.addEventListener('load', onScroll));
    window.addEventListener('load', () => { sizeSquare(); compute(); });

    compute();
})();


// ==========================================
// NAV BAR + FULLSCREEN MENU
// ==========================================
(function () {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    const links = [...document.querySelectorAll('.nav-link')];
    const langBtn = document.getElementById('navLang');
    if (!toggle || !menu) return;

    const sections = links
        .map(link => ({ link, el: document.getElementById(link.dataset.section) }))
        .filter(s => s.el);

    // ---- open / close ----
    function setOpen(open) {
        document.body.classList.toggle('nav-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', () => {
        setOpen(!document.body.classList.contains('nav-open'));
    });

    // ---- link click: scroll suave si la sección está en esta página;
    //      si no (páginas de proyecto), deja que el href navegue al home ----
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.getElementById(link.dataset.section);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
            setOpen(false);
        });
    });

    // (el botón EN/ES lo maneja el módulo de i18n al final del archivo)

    // ---- scroll-spy: marca en gris claro (#BCBCBC) la sección actual ----
    function updateActive() {
        if (sections.length === 0) return;
        const y = window.scrollY + window.innerHeight * 0.4;
        let current = sections[0];
        sections.forEach(s => {
            if (s.el.offsetTop <= y) current = s;
        });
        sections.forEach(s => s.link.classList.toggle('is-active', s === current));
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    updateActive();

    // ---- ocultar la barra mientras los cards de proyectos ocupan la pantalla ----
    const projects = document.getElementById('projectsSplit');
    const navBar = document.querySelector('.nav-bar');
    if (projects && navBar) {
        function updateNavVisibility() {
            const r = projects.getBoundingClientRect();
            const covering = r.top <= 0 && r.bottom >= window.innerHeight;
            navBar.classList.toggle('nav-hidden', covering);
        }
        window.addEventListener('scroll', updateNavVisibility, { passive: true });
        window.addEventListener('resize', updateNavVisibility);
        updateNavVisibility();
    }
})();


// ==========================================
// SCROLL REVEAL — textos y secciones
// ==========================================
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- split de titulos en letras (rise con mascara) ----
    function splitText(el, stagger) {
        if (!el || el.dataset.split) return;
        el.dataset.split = '1';
        const nodes = [...el.childNodes];
        el.innerHTML = '';
        let i = 0;
        nodes.forEach((node) => {
            if (node.nodeType === 3) {
                // agrupa las letras por palabra (nowrap) para que el título
                // corte solo en los espacios y nunca a mitad de palabra
                let word = null;
                const flush = () => { if (word) { el.appendChild(word); word = null; } };
                [...node.textContent].forEach((ch) => {
                    if (ch === ' ') { flush(); el.appendChild(document.createTextNode(' ')); return; }
                    if (ch === '\n' || ch === '\t' || ch === '\r') { return; }
                    if (!word) { word = document.createElement('span'); word.className = 'reveal-word'; }
                    const mask = document.createElement('span');
                    mask.className = 'reveal-text-mask';
                    const s = document.createElement('span');
                    s.className = 'reveal-text-char';
                    s.textContent = ch;
                    s.style.transitionDelay = (i * stagger) + 'ms';
                    mask.appendChild(s);
                    word.appendChild(mask);
                    i++;
                });
                flush();
            } else if (node.nodeName === 'BR') {
                el.appendChild(document.createElement('br'));
            } else {
                el.appendChild(node);
            }
        });
        el.classList.add('reveal-text');
    }

    // ---- observer comun: activa/desactiva .is-in (se repite al reentrar) ----
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting));
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    function mark(el, variant, delay) {
        if (!el) return;
        el.classList.add('reveal');
        if (variant) el.classList.add('reveal--' + variant);
        if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
        io.observe(el);
    }

    // ---- titulos con split ----
    [
        { sel: '.name', step: 45 },
        { sel: '.portfolio-title', step: 40 },
        { sel: '.footer-name', step: 40 },
    ].forEach(({ sel, step }) => {
        document.querySelectorAll(sel).forEach((el) => {
            splitText(el, reduce ? 0 : step);
            io.observe(el);
        });
    });

    // ---- elementos sueltos (variant, delay) ----
    const singles = [
        ['.professional-title', 'up', 750],
        ['.about-me-title', 'left', 0],
        ['.about-me', 'right', 120],
        ['.about-me-label', 'up', 0],
        ['.about-header .social-links', 'up', 80],
        ['.greeting', 'up', 0],
        ['.about-name', 'up', 90],
        ['.cv-button', 'up', 200],
        ['.about-role', 'up', 60],
        ['.about-text', 'up', 160],
        ['.about-photo', 'scale', 60],
        ['.tools-marquee', 'fade', 0],
        ['.experience-section .section-label', 'up', 0],
        ['.footer-bottom', 'up', 120],
    ];
    singles.forEach(([sel, variant, delay]) => {
        document.querySelectorAll(sel).forEach((el) => mark(el, variant, delay));
    });

    // ---- grupos escalonados (stagger marcado) ----
    // se anima el contenido interno (no el <article>) para no pisar el hover translateX
    document.querySelectorAll('.experience-list .experience-item').forEach((el, i) => {
        const base = i * 130;
        mark(el.querySelector('.experience-content'), 'up', base);
        mark(el.querySelector('.experience-date'), 'up', base + 90);
    });
})();


// ==========================================
// I18N — traducciones EN / ES
// Idioma por defecto: EN (el texto en inglés vive en el HTML).
// El ES vive en este diccionario. NO se traducen nombres propios/marcas
// (Estudio 96, Exlabesa, Gocho…) ni los cargos/empresas de experiencia.
// ==========================================
(function () {
    const STORE = 'ob-lang';

    const ES = {
        // --- nav (todas las páginas) ---
        'nav.portfolio': 'Portafolio',
        'nav.about': 'Sobre mí',
        'nav.experience': 'Experiencia',
        'nav.contact': 'Contacto',

        // --- hero ---
        'hero.title': 'Diseñadora Digital Creativa & Desarrolladora Front-End',

        // --- services / tagline ---
        'services.title': '<span class="highlight-2">Diseñando</span> marcas, experiencias digitales<br> <span class="highlight">&</span> sitios web <span class="highlight-2">con propósito.</span>',
        'services.sub': 'Creo que las mejores ideas surgen cuando<br> la estrategia, el diseño y la tecnología trabajan juntos.',

        // --- about ---
        'about.label': 'Sobre mí',
        'about.greeting': 'Hola, me llamo',
        'about.cv': 'DESCARGAR CV',
        'about.cvfile': 'img/CV_OrianaBonato_2026_ES.pdf',
        'about.role': 'Soy una <br>diseñadora multidisciplinar',
        'about.text': 'Con formación en branding, diseño gráfico y comunicación digital, creo soluciones visuales que ayudan a las marcas a conectar con las personas de forma significativa.<br><br>Mi experiencia va más allá del diseño. A través del desarrollo front-end, transformo conceptos en experiencias digitales completas, uniendo la visión creativa con su implementación.',

        // --- experience (cargos y empresas NO se traducen) ---
        'exp.label': 'Experiencia profesional',
        'exp.desc.0': 'Trabajo de forma transversal en diseño, marketing y desarrollo, creando experiencias digitales alineadas con los objetivos de negocio y el ecosistema de marca de la empresa. Mi rol incluye diseñar sitios web, desarrollar identidades visuales y asegurar la coherencia de las submarcas de la empresa en los canales digitales. También creo contenido para redes sociales, tanto piezas estáticas como audiovisuales, mientras colaboro con el equipo de desarrollo en la creación de plantillas HTML para una plataforma de gestión de redes sociales impulsada por IA.',
        'exp.desc.1': 'Colaboro con emprendedores, pequeñas empresas y equipos de marketing para crear identidades visuales coherentes y experiencias digitales que conectan las marcas con su público. Mi trabajo abarca branding, diseño y desarrollo web, diseño editorial y producción de video, cuidando siempre la coherencia en cada punto de contacto. Ya sea de forma independiente o siguiendo guías de marca establecidas, me enfoco en traducir ideas en una comunicación visual clara, atractiva y efectiva.',
        'exp.desc.2': 'Como parte de una agencia de publicidad multidisciplinar que gestionaba más de quince cuentas de clientes, contribuí en una amplia variedad de proyectos de branding, digitales e impresos. Mis responsabilidades incluían el desarrollo de marca, el diseño de sitios web, la comunicación con clientes y la creación de materiales de marketing como catálogos, vallas publicitarias y gráficas de gran formato. También realicé fotografía de producto y edición de imagen, ayudando a los clientes a mantener una presencia visual coherente tanto en medios digitales como físicos.',
        'exp.date.0': '2024 — Presente',

        // --- footer ---
        'footer.cta': 'Trabajemos juntos y conectemos',

        // --- páginas de proyecto ---
        'project.back': 'Volver a Oriana Bonato',
        'project.visit': 'Visita la web',
        'desc.p01': 'Identidad visual completa para un estudio de arquitectura: construcción del logotipo, sistema tipográfico, paleta cromática y aplicaciones sobre papelería y soportes digitales.',
        'desc.p04': 'Cuando hablé con Rocío por primera vez, me contó que necesitaba una web que explicara su trabajo, su experiencia y sus servicios. El reto no era solo informativo: había que construir un espacio que transmitiera su esencia. Aunque el contenido incluía bastante texto sobre su forma de trabajar, era fundamental que no se sintiera técnico o distante, sino cercano y humano, ya que al ser psicóloga, su enfoque profesional debía quedar claro sin perder calidez.<br><br>Trabajamos desde cero en la definición de su marca: creamos el logo, elegimos una paleta de tonos terracota y rosados que evocaran serenidad y confianza, y seleccionamos imágenes que reflejaran acompañamiento y escucha. El resultado es una web que combina una tipografía elegante con fotografías cálidas, generando un espacio digital que se siente tan seguro y humano como su consulta.',
        'desc.p03': 'Para GOCHO quería construir un logotipo con carácter, algo contundente que transmitiera fuerza desde el primer vistazo. Por eso apostamos por una tipografía condensada de trazo grueso, y ahí surgió el detalle que más me gusta de todo el proyecto: comprimir la letra H para que la propia marca "se aplaste", como referencia directa a la técnica smash. Es ese tipo de guiño que, cuando lo descubres, hace que la marca se quede contigo.<br><br>Con el color quise contar la misma historia: el negro representa la plancha, ese punto más gastrobar y directo, y el naranja aporta la calidez del pan tostado y el queso fundido. Una paleta reducida, pero pensada para que funcione igual de bien en una etiqueta pequeña que en un vinilo de gran formato.<br><br>Lo que más me gusta de este proyecto es cómo el sistema se sostiene en cualquier soporte: packaging, camisetas, redes sociales, hasta el food truck. Añadimos ilustraciones tipo sticker —el personaje, las manchas de salsa— para darle ese toque cercano y divertido, sin perder la solidez de la marca principal. El resultado es una identidad que crece con el negocio, lista para escalar en cualquier formato que necesite.',
        'desc.p05': 'Simon Interiorismo es un estudio especializado en reformas integrales y diseño de espacios —cocinas, baños y vestidores— dirigido por el profesional José Francisco Simón Martínez, con sede en Valencia, España. Necesitaba renovar su sitio web para presentar una imagen moderna y actual en el mercado. Por eso opté por un diseño minimalista que diera todo el protagonismo a las imágenes de sus proyectos y facilitara su visualización.',
        'desc.placeholder': 'Caso de estudio en preparación — próximamente el detalle completo de este proyecto.',
    };

    // [selector, clave, modo]  modo: undefined=texto · 'html'=innerHTML · 'multi'=varios (clave.índice)
    const MAP = [
        ['.nav-link[data-section="portfolio"]', 'nav.portfolio'],
        ['.nav-link[data-section="about"]', 'nav.about'],
        ['.nav-link[data-section="experience"]', 'nav.experience'],
        ['.nav-link[data-section="contact"]', 'nav.contact'],
        ['.professional-title', 'hero.title'],
        ['.services-section .about-me-title', 'services.title', 'html'],
        ['.services-section .about-me', 'services.sub', 'html'],
        ['.about-section .about-me-label', 'about.label'],
        ['.greeting', 'about.greeting'],
        ['.cv-text', 'about.cv'],
        ['.about-role', 'about.role', 'html'],
        ['.about-text', 'about.text', 'html'],
        ['.experience-section .section-label', 'exp.label'],
        ['.experience-description', 'exp.desc', 'multi'],
        ['.experience-date', 'exp.date', 'multi'],
        ['.footer-cta span', 'footer.cta'],
        ['.project-back-text', 'project.back'],
    ];

    // arma la lista de destinos y captura el valor EN original (del HTML)
    // modo: 'text' (por defecto) · 'html' (innerHTML) · 'href' (atributo href)
    const targets = [];
    function addTarget(el, key, mode) {
        if (!el) return;
        const en = mode === 'html' ? el.innerHTML.trim()
                 : mode === 'href' ? el.getAttribute('href')
                 : el.textContent.trim();
        targets.push({ el, key, mode, en });
    }
    MAP.forEach(([sel, key, mode]) => {
        const els = document.querySelectorAll(sel);
        if (mode === 'multi') {
            els.forEach((el, i) => addTarget(el, key + '.' + i, 'text'));
        } else {
            els.forEach((el) => addTarget(el, key, mode));
        }
    });
    document.querySelectorAll('[data-i18n]').forEach((el) => addTarget(el, el.dataset.i18n, 'text'));
    document.querySelectorAll('[data-i18n-html]').forEach((el) => addTarget(el, el.dataset.i18nHtml, 'html'));
    document.querySelectorAll('[data-i18n-href]').forEach((el) => addTarget(el, el.dataset.i18nHref, 'href'));

    const langBtn = document.getElementById('navLang');
    let current = 'en';

    function applyLang(lang) {
        current = (lang === 'es') ? 'es' : 'en';
        targets.forEach((t) => {
            const val = (current === 'es' && ES[t.key] != null) ? ES[t.key] : t.en;
            if (t.mode === 'html') t.el.innerHTML = val;
            else if (t.mode === 'href') t.el.setAttribute('href', val);
            else t.el.textContent = val;
        });
        document.documentElement.setAttribute('lang', current);
        if (langBtn) langBtn.textContent = (current === 'en') ? 'ES' : 'EN';
        try { localStorage.setItem(STORE, current); } catch (e) { /* noop */ }
    }

    let saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) { /* noop */ }
    applyLang(saved === 'es' ? 'es' : 'en');

    if (langBtn) {
        langBtn.addEventListener('click', () => applyLang(current === 'en' ? 'es' : 'en'));
    }
})();

// ==========================================
// CURSOR PERSONALIZADO — círculo con seguimiento suave
// ==========================================
(function () {
    // solo con puntero fino (mouse/trackpad); en táctil no aplica
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dot = document.createElement('div');
    dot.className = 'cursor';
    document.body.appendChild(dot);

    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;   // objetivo (mouse)
    let cx = tx, cy = ty;                                          // posición suavizada
    let raf = null;

    function draw() {
        dot.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)';
    }

    function loop() {
        cx += (tx - cx) * 0.4;   // lerp: retardo suave (más alto = menos lag)
        cy += (ty - cy) * 0.4;
        draw();
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
            raf = requestAnimationFrame(loop);
        } else {
            raf = null;
        }
    }

    let shown = false;
    window.addEventListener('mousemove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!shown) { shown = true; dot.style.opacity = '1'; }
        if (reduce) { cx = tx; cy = ty; draw(); return; }   // sin retardo
        if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    // crecer sobre elementos interactivos
    const HOVER = 'a, button, .project-cover, [role="button"], input, textarea, select, label';
    document.addEventListener('mouseover', (e) => {
        dot.classList.toggle('is-hover', !!(e.target.closest && e.target.closest(HOVER)));
    }, { passive: true });

    // ocultar al salir de la ventana
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { if (shown) dot.style.opacity = '1'; });
})();
