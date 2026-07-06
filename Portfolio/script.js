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

    function apply(step) {
        // izquierda avanza en steps impares acumulados, derecha en los pares
        const leftIdx  = 2 * Math.ceil(step / 2);
        const rightIdx = 1 + 2 * Math.floor(step / 2);

        leftCovers.forEach(el => el.classList.toggle('is-active', Number(el.dataset.index) === leftIdx));
        rightCovers.forEach(el => el.classList.toggle('is-active', Number(el.dataset.index) === rightIdx));

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