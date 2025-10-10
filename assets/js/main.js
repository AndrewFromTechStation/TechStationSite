const recaptchaSiteKey = '6LeTbeQrAAAAAM3nmwf9iMPosxKcJw9WB54T7BIj';

const recaptchaState = {
    forms: [],
    widgetIds: new Map(),
    errors: new WeakMap(),
    ready: false,
    scriptRequested: false,
};

const showRecaptchaError = (form, message) => {
    const errorEl = recaptchaState.errors.get(form);
    if (!errorEl) {
        return;
    }

    if (message) {
        errorEl.textContent = message;
    }

    errorEl.classList.add('is-visible');
    errorEl.setAttribute('role', 'alert');
};

const hideRecaptchaError = (form) => {
    const errorEl = recaptchaState.errors.get(form);
    if (!errorEl) {
        return;
    }

    errorEl.classList.remove('is-visible');
    errorEl.removeAttribute('role');
};

const renderRecaptchaForForm = (form) => {
    if (!recaptchaState.ready || recaptchaState.widgetIds.has(form)) {
        return;
    }

    const container = form.querySelector('.g-recaptcha');
    if (!container || !window.grecaptcha || typeof window.grecaptcha.render !== 'function') {
        return;
    }

    const widgetId = window.grecaptcha.render(container, {
        sitekey: recaptchaSiteKey,
        callback: () => {
            hideRecaptchaError(form);
        },
        'expired-callback': () => {
            showRecaptchaError(form);
        },
        'error-callback': () => {
            showRecaptchaError(form);
        },
    });

    recaptchaState.widgetIds.set(form, widgetId);
};

const ensureRecaptchaScript = () => {
    if (recaptchaState.scriptRequested || recaptchaState.forms.length === 0) {
        return;
    }

    const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
    if (existingScript) {
        recaptchaState.scriptRequested = true;
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=tsInitRecaptcha&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        recaptchaState.ready = false;
        recaptchaState.scriptRequested = false;
        recaptchaState.forms.forEach((form) => {
            showRecaptchaError(form, 'Не удалось загрузить reCAPTCHA. Попробуйте обновить страницу.');
        });
    };

    document.head.appendChild(script);
    recaptchaState.scriptRequested = true;
};

const setupRecaptchaForForm = (form) => {
    if (!(form instanceof HTMLFormElement) || recaptchaState.forms.includes(form)) {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) {
        return;
    }

    let container = form.querySelector('.g-recaptcha');
    let errorEl = form.querySelector('.ts-form-recaptcha__error');

    if (!container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ts-form-field ts-form-field--full ts-form-recaptcha';

        container = document.createElement('div');
        container.className = 'g-recaptcha';
        container.dataset.sitekey = recaptchaSiteKey;

        wrapper.appendChild(container);

        errorEl = document.createElement('p');
        errorEl.className = 'ts-form-recaptcha__error';
        errorEl.textContent = 'Подтвердите, что вы не робот.';
        errorEl.setAttribute('aria-live', 'polite');
        wrapper.appendChild(errorEl);

        form.insertBefore(wrapper, submitButton);
    } else if (!container.dataset.sitekey) {
        container.dataset.sitekey = recaptchaSiteKey;
    }

    if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'ts-form-recaptcha__error';
        errorEl.textContent = 'Подтвердите, что вы не робот.';
        errorEl.setAttribute('aria-live', 'polite');
        container.insertAdjacentElement('afterend', errorEl);
    }

    recaptchaState.forms.push(form);
    recaptchaState.errors.set(form, errorEl);

    const getMessageBox = () => {
        let messageBox = form.querySelector('.ts-form-message');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.className = 'ts-form-message';
            messageBox.setAttribute('aria-live', 'polite');
            form.appendChild(messageBox);
        }
        return messageBox;
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const messageBox = getMessageBox();
        const hasRecaptcha = window.grecaptcha && typeof window.grecaptcha.getResponse === 'function';
        const widgetId = recaptchaState.widgetIds.get(form);

        if (!hasRecaptcha || typeof widgetId === 'undefined') {
            ensureRecaptchaScript();
            showRecaptchaError(form);
            messageBox.textContent = '⚠️ Подтвердите, что вы не робот.';
            messageBox.className = 'ts-form-message error';
            return;
        }

        const response = window.grecaptcha.getResponse(widgetId);
        if (!response) {
            showRecaptchaError(form);
            messageBox.textContent = '⚠️ Подтвердите, что вы не робот.';
            messageBox.className = 'ts-form-message error';
            return;
        }

        hideRecaptchaError(form);

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : '';

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
        }

        try {
            const action = form.getAttribute('action') || 'send_mail.php';
            const formData = new FormData(form);
            const responseRaw = await fetch(action, {
                method: 'POST',
                body: formData,
            });

            const resultText = (await responseRaw.text()).trim();

            if (resultText === 'success') {
                messageBox.textContent = '✅ Ваше сообщение отправлено! Спасибо.';
                messageBox.className = 'ts-form-message success';
                form.reset();
            } else {
                messageBox.textContent = '⚠️ Ошибка при отправке. Попробуйте позже.';
                messageBox.className = 'ts-form-message error';
            }
        } catch (error) {
            messageBox.textContent = '⚠️ Ошибка сети. Попробуйте ещё раз.';
            messageBox.className = 'ts-form-message error';
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    form.addEventListener('reset', () => {
        const widgetId = recaptchaState.widgetIds.get(form);
        if (window.grecaptcha && typeof window.grecaptcha.reset === 'function' && typeof widgetId !== 'undefined') {
            window.grecaptcha.reset(widgetId);
        }
        hideRecaptchaError(form);
    });

    if (recaptchaState.ready) {
        renderRecaptchaForForm(form);
    }
};

window.tsInitRecaptcha = () => {
    recaptchaState.ready = true;
    recaptchaState.forms.forEach((form) => {
        renderRecaptchaForForm(form);
    });
};

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
    const isGalleryPage = document.body.classList.contains('ts-page--gallery');
    const carouselContainers = Array.from(
        document.querySelectorAll(
            '.ts-usecases__grid, .ts-advantages__grid, .ts-services__list, .ts-portfolio__list, .ts-video-gallery__grid',
        ),
    );
    const carouselMobileMedia = window.matchMedia('(max-width: 960px)');
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
            const target = Number(counterEl.dataset.counterTarget ?? counterEl.textContent);
            if (!Number.isNaN(target)) {
                counterEl.textContent = formatCounterValue(counterEl, target);
            }
        });
    };

    const shouldUseObserver =
        supportsIntersectionObserver && !prefersReducedMotion.matches && !isSubpage && !isGalleryPage;

    const formatCounterValue = (counterEl, value) => {
        const decimals = Number(counterEl.dataset.counterDecimals ?? '0');
        return value.toLocaleString('ru-RU', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

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

    const syncCarouselAnimationForMobile = () => {
        const shouldReveal = carouselMobileMedia.matches;

        carouselContainers.forEach((container) => {
            const animatedItems = container.querySelectorAll('[data-animate]');

            animatedItems.forEach((item) => {
                if (shouldReveal) {
                    item.classList.add('is-visible');
                    item.dataset.carouselMobileRevealed = 'true';
                } else if (item.dataset.carouselMobileRevealed === 'true') {
                    item.classList.remove('is-visible');
                    delete item.dataset.carouselMobileRevealed;
                }
            });
        });
    };

    const contactForms = Array.from(document.querySelectorAll('.ts-contact__form'));

    if (contactForms.length > 0) {
        contactForms.forEach((form) => {
            setupRecaptchaForForm(form);
        });

        ensureRecaptchaScript();

        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
            window.tsInitRecaptcha();
        }
    }

    syncCarouselAnimationForMobile();
    addMediaQueryListener(carouselMobileMedia, syncCarouselAnimationForMobile);

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
        const target = Number(counterEl.dataset.counterTarget ?? counterEl.textContent);
        if (Number.isNaN(target)) {
            return;
        }

        const startValueRaw = Number(counterEl.dataset.counterStart ?? 0);
        const startValue = Number.isNaN(startValueRaw) ? 0 : startValueRaw;
        const durationRaw = Number(counterEl.dataset.counterDuration ?? 1600);
        const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : 1600;
        const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
        const startTime = performance.now();

        const update = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutQuint(progress);
            const value = startValue + (target - startValue) * eased;

            counterEl.textContent = formatCounterValue(counterEl, progress < 1 ? value : target);

            if (progress < 1) {
                requestAnimationFrame(update);
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

    const videoModal = document.querySelector('.ts-video-modal');
    const videoTriggers = Array.from(document.querySelectorAll('[data-video-trigger]'));

    if (videoModal && videoTriggers.length > 0) {
        const videoPlayer = videoModal.querySelector('video');
        const videoSource = videoPlayer ? videoPlayer.querySelector('source') : null;
        const modalTitle = videoModal.querySelector('.ts-video-modal__title');
        const closeButtons = Array.from(videoModal.querySelectorAll('[data-video-close]'));
        const dialog = videoModal.querySelector('.ts-video-modal__dialog');
        let previouslyFocusedElement = null;

        const isOpen = () => videoModal.classList.contains('is-open');

        const focusVideoPlayer = () => {
            if (videoPlayer && typeof videoPlayer.focus === 'function') {
                requestAnimationFrame(() => {
                    videoPlayer.focus({ preventScroll: true });
                });
            }
        };

        const setVideoContent = (trigger) => {
            if (!videoPlayer || !(trigger instanceof HTMLElement)) {
                return;
            }

            const videoSrc = trigger.getAttribute('data-video-src');
            const videoType = trigger.getAttribute('data-video-type') || 'video/mp4';
            const videoPoster = trigger.getAttribute('data-video-poster');
            const videoTitle = trigger.getAttribute('data-video-title');

            if (videoPoster) {
                videoPlayer.setAttribute('poster', videoPoster);
            } else {
                videoPlayer.removeAttribute('poster');
            }

            if (videoSource) {
                if (videoSrc) {
                    videoSource.setAttribute('src', videoSrc);
                }
                videoSource.setAttribute('type', videoType);
                videoPlayer.load();
            } else if (videoSrc) {
                videoPlayer.setAttribute('src', videoSrc);
                videoPlayer.load();
            }

            if (modalTitle && videoTitle) {
                modalTitle.textContent = videoTitle;
            }
        };

        const openVideoModal = (trigger) => {
            previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setVideoContent(trigger);
            videoModal.classList.add('is-open');
            videoModal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('ts-modal-open');

            if (videoPlayer) {
                if (videoPlayer.readyState > 0) {
                    videoPlayer.currentTime = 0;
                }

                const playPromise = videoPlayer.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            }

            focusVideoPlayer();
        };

        const closeVideoModal = () => {
            if (!isOpen()) {
                return;
            }

            videoModal.classList.remove('is-open');
            videoModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('ts-modal-open');

            if (videoPlayer) {
                videoPlayer.pause();
                videoPlayer.currentTime = 0;
            }

            if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
                previouslyFocusedElement.focus({ preventScroll: true });
            }

            previouslyFocusedElement = null;
        };

        videoTriggers.forEach((trigger) => {
            trigger.addEventListener('click', () => {
                openVideoModal(trigger);
            });
        });

        closeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                closeVideoModal();
            });
        });

        videoModal.addEventListener('click', (event) => {
            if (!dialog) {
                return;
            }

            if (!dialog.contains(event.target)) {
                closeVideoModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isOpen()) {
                event.preventDefault();
                closeVideoModal();
            }
        });
    }
});
