document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            menuBtn.classList.toggle('active', isOpen);
        });
    }

    // Scroll reveal
    const revealElements = document.querySelectorAll(
        '.feature-card, .care-step, .section-header, .adopt-card, .hero-badge, .hero-title, .hero-subtitle, .hero-cta, .hero-stats'
    );

    revealElements.forEach((el) => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => revealObserver.observe(el));

    // Staggered reveal for grid children
    const grids = document.querySelectorAll('.features-grid, .care-steps');
    grids.forEach((grid) => {
        const children = grid.children;
        Array.from(children).forEach((child, index) => {
            child.style.transitionDelay = `${index * 80}ms`;
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 20) {
            navbar.style.boxShadow = '0 4px 20px rgba(45, 42, 38, 0.06)';
        } else {
            navbar.style.boxShadow = 'none';
        }
        lastScroll = currentScroll;
    });
});
