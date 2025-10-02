const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelectorAll('.nav__links a');

navLinks.forEach((link) => {
    link.addEventListener('click', () => {
        if (navToggle.checked) {
            navToggle.checked = false;
        }
    });
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (event) {
        const targetId = this.getAttribute('href')?.substring(1);
        const targetElement = targetId ? document.getElementById(targetId) : null;

        if (targetElement) {
            event.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
