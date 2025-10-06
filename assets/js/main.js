document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('ts-nav-toggle');
    const animatedElements = document.querySelectorAll('[data-animate]');
    const counterElements = document.querySelectorAll('.ts-counter');
    const countersPlayed = new WeakSet();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const scrollHints = document.querySelectorAll('.ts-subheader__scroll-hint');
    const floatingCta = document.querySelector('.ts-floating-cta');
    const isSubpage = document.body.classList.contains('ts-subpage');
    let scrollTicking = false;

    const addMediaQueryListener = (mediaQueryList, callback) => {
        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', callback);
        } else if (typeof mediaQueryList.addListener === 'function') {
            mediaQueryList.addListener(callback);
        }
    };

    const showAnimatedElements = () => {
        animatedElements.forEach((element) => {
            element.classList.add('is-visible');
        });
    };

    const syncCountersImmediately = () => {
        counterElements.forEach((counterEl) => {
            const target = Number(counterEl.dataset.counterTarget || counterEl.textContent);
            if (!Number.isNaN(target)) {
                counterEl.textContent = target.toLocaleString('ru-RU');
            }
        });
    };

    const shouldUseObserver = supportsIntersectionObserver && !prefersReducedMotion.matches && !isSubpage;

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

    const updateScrollUi = () => {
        const scrollOffset = window.scrollY || window.pageYOffset;

        scrollHints.forEach((hint) => {
            if (scrollOffset > 80) {
                hint.classList.add('is-hidden');
            } else {
                hint.classList.remove('is-hidden');
            }
        });

        if (floatingCta) {
            if (scrollOffset > 320) {
                floatingCta.classList.add('is-visible');
            } else {
                floatingCta.classList.remove('is-visible');
            }
        }
    };

    const onScroll = () => {
        if (scrollTicking) {
            return;
        }

        scrollTicking = true;
        requestAnimationFrame(() => {
            updateScrollUi();
            scrollTicking = false;
        });
    };

    updateScrollUi();
    window.addEventListener('scroll', onScroll, { passive: true });

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

    if (!shouldUseObserver) {
        document.documentElement.classList.remove('has-animations');
        showAnimatedElements();
        syncCountersImmediately();
    }

    if (shouldUseObserver) {
        document.documentElement.classList.add('has-animations');

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

        addMediaQueryListener(prefersReducedMotion, (event) => {
            if (event.matches) {
                showAnimatedElements();
                syncCountersImmediately();
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

    const initPanelTabs = ({ tabSelector, panelSelector, targetAttribute }) => {
        const tabs = Array.from(document.querySelectorAll(tabSelector));
        const panels = Array.from(document.querySelectorAll(panelSelector));

        if (!tabs.length || !panels.length) {
            return;
        }

        const getTargetId = (tab) => tab.dataset[targetAttribute];
        const panelById = new Map(panels.map((panel) => [panel.id, panel]));

        let activeTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];

        const showPanel = (panel) => {
            if (!panel) {
                return;
            }

            panel.hidden = false;

            if (prefersReducedMotion.matches) {
                panel.classList.add('is-active');
                return;
            }

            panel.classList.remove('is-active');
            requestAnimationFrame(() => {
                panel.classList.add('is-active');
            });
        };

        const hidePanel = (panel) => {
            if (!panel) {
                return;
            }

            if (prefersReducedMotion.matches) {
                panel.classList.remove('is-active');
                panel.hidden = true;
                return;
            }

            panel.classList.remove('is-active');
            panel.addEventListener(
                'transitionend',
                (event) => {
                    if (event.propertyName === 'opacity') {
                        panel.hidden = true;
                    }
                },
                { once: true },
            );

            window.setTimeout(() => {
                if (!panel.hidden) {
                    panel.hidden = true;
                }
            }, 600);
        };

        const activateTab = (tab) => {
            if (!tab) {
                return;
            }

            const targetId = getTargetId(tab);
            const targetPanel = panelById.get(targetId);

            if (!targetPanel) {
                return;
            }

            if (activeTab && activeTab !== tab) {
                const previousPanel = panelById.get(getTargetId(activeTab));
                activeTab.classList.remove('is-active');
                activeTab.setAttribute('aria-selected', 'false');
                activeTab.setAttribute('tabindex', '-1');
                hidePanel(previousPanel);
            }

            tab.classList.add('is-active');
            tab.setAttribute('aria-selected', 'true');
            tab.setAttribute('tabindex', '0');
            targetPanel.scrollTop = 0;
            showPanel(targetPanel);

            activeTab = tab;
        };

        const initialiseStates = () => {
            tabs.forEach((tab, index) => {
                const isActive = tab === activeTab;
                const panel = panelById.get(getTargetId(tab));

                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', String(isActive));
                tab.setAttribute('tabindex', isActive ? '0' : '-1');

                if (panel) {
                    panel.classList.toggle('is-active', isActive);
                    panel.hidden = !isActive;
                }
            });
        };

        initialiseStates();

        const focusTabByOffset = (currentIndex, offset) => {
            const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
            const nextTab = tabs[nextIndex];
            nextTab.focus();
            activateTab(nextTab);
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                if (!tab.classList.contains('is-active')) {
                    activateTab(tab);
                }
            });

            tab.addEventListener('keydown', (event) => {
                switch (event.key) {
                    case 'ArrowRight':
                    case 'ArrowDown':
                        event.preventDefault();
                        focusTabByOffset(index, 1);
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        event.preventDefault();
                        focusTabByOffset(index, -1);
                        break;
                    case 'Home':
                        event.preventDefault();
                        tabs[0].focus();
                        activateTab(tabs[0]);
                        break;
                    case 'End':
                        event.preventDefault();
                        tabs[tabs.length - 1].focus();
                        activateTab(tabs[tabs.length - 1]);
                        break;
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        activateTab(tab);
                        break;
                    default:
                        break;
                }
            });
        });

        prefersReducedMotion.addEventListener('change', () => {
            tabs.forEach((tab) => {
                const panel = panelById.get(getTargetId(tab));
                if (!panel) {
                    return;
                }

                const isActive = tab.classList.contains('is-active');
                panel.hidden = !isActive;
                panel.classList.toggle('is-active', isActive);
            });
        });
    };

    initPanelTabs({
        tabSelector: '.ts-services__item',
        panelSelector: '.ts-services__panel',
        targetAttribute: 'serviceTarget',
    });

    initPanelTabs({
        tabSelector: '.ts-portfolio__item',
        panelSelector: '.ts-portfolio__panel',
        targetAttribute: 'caseTarget',
    });
});
