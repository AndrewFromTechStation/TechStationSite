(() => {
    if (typeof window === 'undefined') {
        return;
    }

    const elementPrototype = window.Element ? window.Element.prototype : null;

    if (elementPrototype && !elementPrototype.matches) {
        elementPrototype.matches =
            elementPrototype.msMatchesSelector ||
            elementPrototype.webkitMatchesSelector ||
            function matches(selector) {
                const matchesList = (this.document || this.ownerDocument).querySelectorAll(selector);
                let index = matchesList.length;
                while (--index >= 0 && matchesList.item(index) !== this) {}
                return index > -1;
            };
    }

    if (elementPrototype && !elementPrototype.closest) {
        elementPrototype.closest = function closest(selector) {
            let current = this;
            while (current && current.nodeType === 1) {
                if (current.matches(selector)) {
                    return current;
                }
                current = current.parentElement || current.parentNode;
            }
            return null;
        };
    }

    if (typeof NodeList !== 'undefined' && NodeList.prototype && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    if (!('requestAnimationFrame' in window)) {
        window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 16);
        window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
    } else if (!('cancelAnimationFrame' in window)) {
        window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
    }

    if (typeof window.fetch !== 'function') {
        window.fetch = (input, init = {}) =>
            new Promise((resolve, reject) => {
                try {
                    const url = typeof input === 'string' ? input : String(input.url || input);
                    const request = new XMLHttpRequest();
                    request.open(init.method || 'GET', url, true);

                    if (init.credentials === 'include') {
                        request.withCredentials = true;
                    }

                    if (init.headers && typeof init.headers === 'object') {
                        Object.keys(init.headers).forEach((key) => {
                            const value = init.headers[key];
                            if (typeof value !== 'undefined') {
                                request.setRequestHeader(key, value);
                            }
                        });
                    }

                    request.onload = () => {
                        const rawHeaders = request.getAllResponseHeaders();
                        const headerMap = {};

                        if (rawHeaders) {
                            rawHeaders
                                .trim()
                                .split(/\r?\n/)
                                .forEach((line) => {
                                    const separatorIndex = line.indexOf(':');
                                    if (separatorIndex > -1) {
                                        const name = line.slice(0, separatorIndex).trim().toLowerCase();
                                        const value = line.slice(separatorIndex + 1).trim();
                                        headerMap[name] = value;
                                    }
                                });
                        }

                        const responseText = request.responseText;
                        const response = {
                            ok: request.status >= 200 && request.status < 300,
                            status: request.status,
                            statusText: request.statusText,
                            url: request.responseURL,
                            headers: {
                                get: (name) => headerMap[(name || '').toLowerCase()] || null,
                                has: (name) => Object.prototype.hasOwnProperty.call(headerMap, (name || '').toLowerCase()),
                            },
                            text: () => Promise.resolve(responseText),
                            json: () =>
                                new Promise((resolveJson, rejectJson) => {
                                    if (!responseText) {
                                        resolveJson(null);
                                        return;
                                    }
                                    try {
                                        resolveJson(JSON.parse(responseText));
                                    } catch (error) {
                                        rejectJson(error);
                                    }
                                }),
                        };

                        resolve(response);
                    };

                    request.onerror = () => reject(new TypeError('Network request failed'));
                    request.onabort = () => reject(new Error('Request aborted'));

                    if (init.signal && typeof init.signal.addEventListener === 'function') {
                        init.signal.addEventListener(
                            'abort',
                            () => {
                                request.abort();
                            },
                            { once: true },
                        );
                    }

                    if (init.body !== undefined) {
                        request.send(init.body);
                    } else {
                        request.send();
                    }
                } catch (error) {
                    reject(error);
                }
            });
    }
})();

const recaptchaSiteKey = '6LfcMfMrAAAAABpKYI5dFG3d3VAYMOpd2pGDtqK9';

let recaptchaReadyPromise = null;

const ensureRecaptchaReady = () => {
    if (recaptchaReadyPromise) {
        return recaptchaReadyPromise;
    }

    const recaptchaScriptSrc = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`;

    recaptchaReadyPromise = new Promise((resolve, reject) => {
        let scriptElement = null;

        const handleError = (message) => {
            if (scriptElement && scriptElement.dataset.tsRecaptcha === 'true') {
                scriptElement.remove();
            }
            recaptchaReadyPromise = null;
            reject(new Error(message || 'Не удалось загрузить reCAPTCHA.'));
        };

        const handleReady = () => {
            if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
                window.grecaptcha.ready(() => resolve(window.grecaptcha));
            } else {
                handleError('reCAPTCHA недоступна.');
            }
        };

        if (window.grecaptcha) {
            handleReady();
            return;
        }

        const managedScript = document.querySelector('script[data-ts-recaptcha="true"]');
        if (managedScript) {
            scriptElement = managedScript;
            scriptElement.addEventListener('load', handleReady, { once: true });
            scriptElement.addEventListener(
                'error',
                () => handleError('Не удалось загрузить reCAPTCHA.'),
                { once: true },
            );
            return;
        }

        const matchingScript =
            document.querySelector(`script[src="${recaptchaScriptSrc}"]`) ||
            document.querySelector('script[src*="recaptcha/api.js"]');

        if (matchingScript) {
            scriptElement = matchingScript;
            scriptElement.dataset.tsRecaptcha = 'true';
            scriptElement.addEventListener('load', handleReady, { once: true });
            scriptElement.addEventListener(
                'error',
                () => handleError('Не удалось загрузить reCAPTCHA.'),
                { once: true },
            );
            return;
        }

        const script = document.createElement('script');
        script.src = recaptchaScriptSrc;
        script.async = true;
        script.defer = true;
        script.dataset.tsRecaptcha = 'true';
        scriptElement = script;
        script.addEventListener('load', handleReady, { once: true });
        script.addEventListener(
            'error',
            () => handleError('Не удалось загрузить reCAPTCHA.'),
            { once: true },
        );
        document.head.appendChild(script);
    });

    return recaptchaReadyPromise;
};

const executeRecaptcha = async (action) => {
    const grecaptcha = await ensureRecaptchaReady();
    return grecaptcha.execute(recaptchaSiteKey, { action });
};

const setupSecureForm = (form) => {
    if (!(form instanceof HTMLFormElement) || form.dataset.secureFormInitialized === 'true') {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) {
        return;
    }

    const submitUrl = form.dataset.submitUrl || form.getAttribute('action') || 'send_mail.php';
    form.dataset.submitUrl = submitUrl;

    if (!form.dataset.preventNativeSubmit) {
        form.setAttribute('action', 'javascript:void(0);');
        form.dataset.preventNativeSubmit = 'true';
    }

    if (!submitButton.dataset.originalText) {
        const buttonText = submitButton.textContent || '';
        submitButton.dataset.originalText = buttonText.trim();
    }

    const recaptchaAction =
        form.dataset.recaptchaAction || (submitUrl.includes('ai_agents') ? 'ai_agents_form' : 'contact_form');

    const ensureHiddenInput = (name) => {
        let input = form.querySelector(`input[name="${name}"]`);
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            form.appendChild(input);
        }
        return input;
    };

    const tokenInput = ensureHiddenInput('recaptcha_token');
    const actionInput = ensureHiddenInput('recaptcha_action');
    actionInput.value = recaptchaAction;
    actionInput.defaultValue = recaptchaAction;

    const getMessageBox = () => {
        let messageBox = form.querySelector('.ts-form-message');

        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.className = 'ts-form-message';
            messageBox.setAttribute('aria-live', 'polite');

            const submitWrapper = submitButton.closest('.ts-form-actions');
            if (submitWrapper) {
                submitWrapper.insertAdjacentElement('afterend', messageBox);
            } else {
                submitButton.insertAdjacentElement('afterend', messageBox);
            }
        }

        return messageBox;
    };

    const setSubmitting = (isSubmitting) => {
        if (!submitButton) {
            return;
        }

        const originalButtonText = submitButton.dataset.originalText ?? submitButton.textContent ?? '';
        if (isSubmitting) {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
        } else {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const messageBox = getMessageBox();
        messageBox.innerHTML = '';
        messageBox.className = 'ts-form-message';
        messageBox.removeAttribute('role');

        try {
            const token = await executeRecaptcha(recaptchaAction);
            if (!token) {
                throw new Error('Token is empty');
            }

            tokenInput.value = token;
        } catch (error) {
            messageBox.innerHTML =
                '<span class="ts-form-message__emoji" aria-hidden="true">⚠️</span><span>Не удалось подтвердить, что вы не робот. Обновите страницу и попробуйте ещё раз.</span>';
            messageBox.className = 'ts-form-message error';
            messageBox.setAttribute('role', 'alert');
            tokenInput.value = '';
            return;
        }

        setSubmitting(true);

        try {
            const action = form.dataset.submitUrl || 'send_mail.php';
            const formData = new FormData(form);
            const responseRaw = await fetch(action, {
                method: 'POST',
                body: formData,
            });

            const resultText = (await responseRaw.text()).trim();

            if (resultText === 'success') {
                messageBox.innerHTML =
                    '<span class="ts-form-message__emoji" aria-hidden="true">✨</span><span>Спасибо! Ваше сообщение отправлено, мы свяжемся с вами в ближайшее время.</span>';
                messageBox.className = 'ts-form-message success';
                messageBox.setAttribute('role', 'status');
                form.reset();
            } else {
                messageBox.innerHTML =
                    '<span class="ts-form-message__emoji" aria-hidden="true">⚠️</span><span>Ошибка при отправке. Попробуйте позже.</span>';
                messageBox.className = 'ts-form-message error';
                messageBox.setAttribute('role', 'alert');
            }
        } catch (error) {
            messageBox.innerHTML =
                '<span class="ts-form-message__emoji" aria-hidden="true">⚠️</span><span>Ошибка сети. Попробуйте ещё раз.</span>';
            messageBox.className = 'ts-form-message error';
            messageBox.setAttribute('role', 'alert');
        } finally {
            setSubmitting(false);
            tokenInput.value = '';
            actionInput.value = recaptchaAction;
        }
    });

    form.dataset.secureFormInitialized = 'true';
};

document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('ts-nav-toggle');
    const animatedElements = document.querySelectorAll('[data-animate]');
    const counterElements = document.querySelectorAll('.ts-counter');
    const countersPlayedStore = typeof WeakSet !== 'undefined' ? new WeakSet() : new Set();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const scrollHints = document.querySelectorAll('.ts-subheader__scroll-hint');
    const floatingCta = document.querySelector('.ts-floating-cta');
    const aiAgentsLinks = document.querySelectorAll('a[href="/AI_Agents"], a[href="/AI_Agents/"]');
    const isSubpage = document.body.classList.contains('ts-subpage');
    const isGalleryPage = document.body.classList.contains('ts-page--gallery');
    const carouselContainers = Array.from(
        document.querySelectorAll(
            '.ts-usecases__grid, .ts-advantages__grid, .ts-services__list, .ts-portfolio__list, .ts-video-gallery__grid',
        ),
    );
    const carouselMobileMedia = window.matchMedia('(max-width: 960px)');
    let scrollTicking = false;
    const docEl = document.documentElement || document.body;
    const supportsSmoothScroll = !!(docEl && docEl.style && 'scrollBehavior' in docEl.style);
    const nowProvider =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? () => performance.now()
            : () => Date.now();

    const markCounterPlayed = (element) => {
        if (element && countersPlayedStore && typeof countersPlayedStore.add === 'function') {
            countersPlayedStore.add(element);
        }
    };

    const hasCounterPlayed = (element) => {
        if (!element || !countersPlayedStore || typeof countersPlayedStore.has !== 'function') {
            return false;
        }
        return countersPlayedStore.has(element);
    };

    const scrollToTarget = (target) => {
        if (!(target instanceof Element)) {
            return;
        }

        if (supportsSmoothScroll && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const rect = target.getBoundingClientRect();
        const currentScrollTop = window.pageYOffset || (docEl && docEl.scrollTop) || 0;
        window.scrollTo(0, rect.top + currentScrollTop);
    };

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

            scrollToTarget(target);
        });
    });

    const handleAiAgentsLinkClick = (event, link) => {
        if (prefersReducedMotion.matches) {
            return;
        }

        if (event.defaultPrevented) {
            return;
        }

        if (link.target && link.target !== '' && link.target !== '_self') {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const href = link.getAttribute('href');
        if (!href) {
            return;
        }

        event.preventDefault();

        if (navToggle && navToggle.checked) {
            navToggle.checked = false;
        }

        const overlay = document.createElement('div');
        overlay.className = 'ts-theme-transition';

        const rect = link.getBoundingClientRect();
        const clientX = event.clientX || rect.left + rect.width / 2;
        const clientY = event.clientY || rect.top + rect.height / 2;
        const xPercent = (clientX / window.innerWidth) * 100;
        const yPercent = (clientY / window.innerHeight) * 100;

        overlay.style.setProperty('--ts-theme-x', `${xPercent}%`);
        overlay.style.setProperty('--ts-theme-y', `${yPercent}%`);

        document.body.appendChild(overlay);

        let hasNavigated = false;
        const navigate = () => {
            if (hasNavigated) {
                return;
            }
            hasNavigated = true;
            window.location.href = href;
        };

        const fallbackTimer = window.setTimeout(navigate, 650);

        overlay.addEventListener(
            'animationend',
            () => {
                window.clearTimeout(fallbackTimer);
                navigate();
            },
            { once: true },
        );
    };

    aiAgentsLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            handleAiAgentsLinkClick(event, link);
        });
    });

    const updateScrollUi = () => {
        const scrollOffset =
            typeof window.scrollY === 'number'
                ? window.scrollY
                : window.pageYOffset || (docEl && docEl.scrollTop) || 0;

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
            setupSecureForm(form);
        });

        ensureRecaptchaReady().catch(() => {
            // Ошибка загрузки обрабатывается во время отправки формы.
        });
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
        const startTime = nowProvider();

        const update = (timestamp) => {
            const currentTime = typeof timestamp === 'number' ? timestamp : nowProvider();
            const progress = Math.min((currentTime - startTime) / duration, 1);
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
                            if (counterEl && !hasCounterPlayed(counterEl)) {
                                markCounterPlayed(counterEl);
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
