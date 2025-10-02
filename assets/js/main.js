document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('ts-nav-toggle');
    const navLinks = document.querySelectorAll('.ts-nav__links a');

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            if (navToggle.checked) {
                navToggle.checked = false;
            }
        });
    });

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
