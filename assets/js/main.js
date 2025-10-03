document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('ts-nav-toggle');
    const navLinks = document.querySelectorAll('.ts-nav__links a');
    const animatedElements = document.querySelectorAll('[data-animate]');
    const counterElements = document.querySelectorAll('.ts-counter');
    const countersPlayed = new WeakSet();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            if (navToggle.checked) {
                navToggle.checked = false;
            }
        });
    });

    const animateCounter = (counterEl) => {
        const target = Number(counterEl.dataset.counterTarget || counterEl.textContent);
        if (Number.isNaN(target)) {
            return;
        }

        const duration = 1800;
        const startTime = performance.now();
        const startValue = 0;

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const update = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutCubic(progress);
            const value = Math.round(startValue + (target - startValue) * eased);
            counterEl.textContent = value.toLocaleString('ru-RU');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counterEl.textContent = target.toLocaleString('ru-RU');
            }
        };

        requestAnimationFrame(update);
    };

    if (prefersReducedMotion.matches) {
        animatedElements.forEach((element) => {
            element.classList.add('is-visible');
        });

        counterElements.forEach((counterEl) => {
            const target = Number(counterEl.dataset.counterTarget || counterEl.textContent);
            if (!Number.isNaN(target)) {
                counterEl.textContent = target.toLocaleString('ru-RU');
            }
        });
    } else {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const { target } = entry;
                        target.classList.add('is-visible');

                        if (target.dataset.animate === 'counter') {
                            const counterEl = target.querySelector('.ts-counter');
                            if (counterEl && !countersPlayed.has(counterEl)) {
                                countersPlayed.add(counterEl);
                                animateCounter(counterEl);
                            }
                        }

                        if (target.dataset.animate !== 'parallax') {
                            observer.unobserve(target);
                        }
                    }
                });
            },
            {
                threshold: 0.25,
                rootMargin: '0px 0px -10% 0px',
            },
        );

        animatedElements.forEach((element) => {
            const delay = element.dataset.animateDelay;
            if (delay) {
                element.style.setProperty('--animate-delay', `${delay}s`);
            }
            revealObserver.observe(element);
        });

        prefersReducedMotion.addEventListener('change', (event) => {
            if (event.matches) {
                animatedElements.forEach((element) => element.classList.add('is-visible'));
                counterElements.forEach((counterEl) => {
                    const target = Number(counterEl.dataset.counterTarget || counterEl.textContent);
                    if (!Number.isNaN(target)) {
                        counterEl.textContent = target.toLocaleString('ru-RU');
                    }
                });
                revealObserver.disconnect();
            }
        });
    }

    const accordions = document.querySelectorAll('.ts-accordion__item');

    accordions.forEach((item) => {
        const trigger = item.querySelector('.ts-accordion__trigger');
        const content = item.querySelector('.ts-accordion__content');

        if (trigger.getAttribute('aria-expanded') === 'true') {
            content.style.display = 'block';
        }

        trigger.addEventListener('click', () => {
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            trigger.setAttribute('aria-expanded', String(!isExpanded));
            content.style.display = isExpanded ? 'none' : 'block';
        });
    });
});
