document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('ts-nav-toggle');
    const animatedElements = document.querySelectorAll('[data-animate]');
    const counterElements = document.querySelectorAll('.ts-counter');
    const countersPlayed = new WeakSet();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href');
            if (!href || href.length <= 1) {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();

            if (navToggle && navToggle.checked) {
                navToggle.checked = false;
            }

            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const serviceCards = document.querySelectorAll('.ts-service-card');
    const serviceCardData = new Map();

    const openServiceCard = (card, data) => {
        if (!data) {
            return;
        }

        const { summary, details } = data;
        card.classList.add('is-open');
        summary.setAttribute('aria-expanded', 'true');

        if (prefersReducedMotion.matches) {
            details.hidden = false;
            details.style.maxHeight = '';
            return;
        }

        details.hidden = false;
        details.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            const fullHeight = details.scrollHeight;
            details.style.maxHeight = `${fullHeight}px`;
        });

        const handleTransitionEnd = (event) => {
            if (event.propertyName === 'max-height') {
                details.style.maxHeight = 'none';
                details.removeEventListener('transitionend', handleTransitionEnd);
            }
        };

        details.addEventListener('transitionend', handleTransitionEnd);
    };

    const closeServiceCard = (card, data) => {
        if (!data) {
            return;
        }

        const { summary, details } = data;
        card.classList.remove('is-open');
        summary.setAttribute('aria-expanded', 'false');

        if (prefersReducedMotion.matches) {
            details.hidden = true;
            details.style.maxHeight = '';
            return;
        }

        const fullHeight = details.scrollHeight;
        details.style.maxHeight = `${fullHeight}px`;
        requestAnimationFrame(() => {
            details.style.maxHeight = '0px';
        });

        const handleTransitionEnd = (event) => {
            if (event.propertyName === 'max-height') {
                details.hidden = true;
                details.removeEventListener('transitionend', handleTransitionEnd);
            }
        };

        details.addEventListener('transitionend', handleTransitionEnd);
    };

    if (serviceCards.length) {
        serviceCards.forEach((card) => {
            const summary = card.querySelector('.ts-service-card__summary');
            const details = card.querySelector('.ts-service-card__details');

            if (!summary || !details) {
                return;
            }

            serviceCardData.set(card, { summary, details });

            const isOpen = card.classList.contains('is-open');
            summary.setAttribute('aria-expanded', String(isOpen));

            if (prefersReducedMotion.matches) {
                details.hidden = !isOpen;
                details.style.maxHeight = '';
            } else if (isOpen) {
                details.hidden = false;
                details.style.maxHeight = 'none';
            } else {
                details.hidden = true;
                details.style.maxHeight = '0px';
            }

            summary.addEventListener('click', () => {
                const cardData = serviceCardData.get(card);
                if (!cardData) {
                    return;
                }

                if (card.classList.contains('is-open')) {
                    closeServiceCard(card, cardData);
                    return;
                }

                serviceCards.forEach((otherCard) => {
                    if (otherCard === card) {
                        return;
                    }
                    const otherData = serviceCardData.get(otherCard);
                    if (otherData && otherCard.classList.contains('is-open')) {
                        closeServiceCard(otherCard, otherData);
                    }
                });

                openServiceCard(card, cardData);
            });
        });

        prefersReducedMotion.addEventListener('change', () => {
            serviceCardData.forEach(({ summary, details }, card) => {
                const isOpen = card.classList.contains('is-open');
                summary.setAttribute('aria-expanded', String(isOpen));

                if (prefersReducedMotion.matches) {
                    details.hidden = !isOpen;
                    details.style.maxHeight = '';
                } else if (isOpen) {
                    details.hidden = false;
                    details.style.maxHeight = 'none';
                } else {
                    details.hidden = true;
                    details.style.maxHeight = '0px';
                }
            });
        });
    }
});
