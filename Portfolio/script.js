// ==========================================
// PROJECTS — SPLIT SCROLL
// ==========================================
(function () {
    const wrap = document.getElementById('projectsSplit');
    if (!wrap) return;

    const hint = document.getElementById('projectsHint');
    const leftCovers  = [...wrap.querySelectorAll('.project-cover[data-side="left"]')];
    const rightCovers = [...wrap.querySelectorAll('.project-cover[data-side="right"]')];
    const leftLabel  = wrap.querySelector('.project-index--left');
    const rightLabel = wrap.querySelector('.project-index--right');

    const STEPS = 4; // nº de "avances" alternados (izq/der) — ajusta si cambias el nº de proyectos

    let ticking = false;
    let currentStep = -1;

    // 0% activa · -100% ya pasada · 100% pendiente
    function place(el, activeIdx) {
        const idx = Number(el.dataset.index);
        const y = idx === activeIdx ? 0 : (idx < activeIdx ? -100 : 100);
        el.style.transform = `translateY(${y}%)`;
    }

    function apply(step) {
        // izquierda avanza en steps impares acumulados, derecha en los pares
        const leftIdx  = 2 * Math.ceil(step / 2);
        const rightIdx = 1 + 2 * Math.floor(step / 2);

        leftCovers.forEach(el => place(el, leftIdx));
        rightCovers.forEach(el => place(el, rightIdx));

        if (leftLabel)  leftLabel.textContent  = String(leftIdx + 1).padStart(2, '0');
        if (rightLabel) rightLabel.textContent = String(rightIdx + 1).padStart(2, '0');
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

    const steps = total - 1; // nº de avances = fotos - 1

    // altura del track: una pantalla por foto
    wrap.style.height = (total * 100) + 'vh';

    // genera los puntos de progreso según el nº real de fotos
    photos.forEach(() => {
        const dot = document.createElement('span');
        dot.className = 'project-progress-dot';
        progressBox.appendChild(dot);
    });
    const dots = [...progressBox.children];

    function apply(step) {
        photos.forEach((el, i) => {
            el.classList.toggle('is-active', i === step);
            el.classList.toggle('is-passed', i < step);
        });
        dots.forEach((d, i) => d.classList.toggle('is-active', i === step));
        if (counterEl) counterEl.textContent = String(step + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }

    let currentStep = -1;
    function compute() {
        const scrollable = wrap.offsetHeight - window.innerHeight;
        if (scrollable <= 0 || steps === 0) { apply(0); return; }
        const scrolled = -wrap.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, scrolled / scrollable));
        const step = Math.round(p * steps);
        if (step !== currentStep) {
            currentStep = step;
            apply(step);
        }
    }

    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
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

    // ---- EN/ES toggle ----
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            langBtn.textContent = langBtn.textContent.trim() === 'EN' ? 'ES' : 'EN';
            // wire real i18n logic here when it exists
        });
    }

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