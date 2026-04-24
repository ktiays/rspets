document.addEventListener('DOMContentLoaded', () => {
    // Scroll reveal
    const revealElements = document.querySelectorAll(
        '.feature-card, .care-step, .battle-card, .section-header, .adopt-card, .hero-badge, .hero-title, .hero-subtitle, .hero-cta, .hero-stats'
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
    const grids = document.querySelectorAll('.features-grid, .care-steps, .battle-grid');
    grids.forEach((grid) => {
        const children = grid.children;
        Array.from(children).forEach((child, index) => {
            child.style.transitionDelay = `${index * 80}ms`;
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 20) {
            navbar.style.boxShadow = '0 4px 20px rgba(45, 42, 38, 0.06)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1500);
            } catch (err) {
                console.error('Copy failed', err);
            }
        });
    });
});
