/* ============================================
    Chathura Ratnayake — personal site scripts
    ============================================ */

(function () {
    const root = document.documentElement;
    const themeToggles = document.querySelectorAll('.theme-toggle');

    // ── Theme ──
    const setTheme = (dark) => {
        if (dark) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', dark ? 'dark' : 'light');

        const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
        themeToggles.forEach((button) => button.setAttribute('aria-label', label));
    };

    themeToggles.forEach((button) => {
        button.addEventListener('click', () => {
            setTheme(root.getAttribute('data-theme') !== 'dark');
        });
    });

    if (themeToggles.length) {
        setTheme(root.getAttribute('data-theme') === 'dark');
    }

    // ── Mobile navigation ──
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = document.getElementById('mobile-menu-links');
    const menuClose = document.querySelector('.mobile-menu-close');

    if (menuToggle && mobileMenu && mobileMenuLinks && menuClose) {
        document.querySelectorAll('.main-nav a').forEach((link) => {
            mobileMenuLinks.appendChild(link.cloneNode(true));
        });

        const openMenu = () => {
            mobileMenu.hidden = false;
            document.body.style.overflow = 'hidden';
            menuToggle.setAttribute('aria-expanded', 'true');
            menuClose.focus();
        };

        const closeMenu = () => {
            mobileMenu.hidden = true;
            document.body.style.overflow = '';
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.focus();
        };

        menuToggle.addEventListener('click', openMenu);
        menuClose.addEventListener('click', closeMenu);

        mobileMenu.addEventListener('click', (event) => {
            if (event.target.closest('a')) closeMenu();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 720 && !mobileMenu.hidden) closeMenu();
        });
    }

    // ── Mouse-reactive dot background ──
    const dotGrid = document.querySelector('.dot-grid');
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (dotGrid && finePointer && !reducedMotion) {
        window.addEventListener('pointermove', (event) => {
            dotGrid.style.setProperty('--mx', event.clientX + 'px');
            dotGrid.style.setProperty('--my', event.clientY + 'px');
            dotGrid.classList.add('is-active');
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            dotGrid.classList.remove('is-active');
        });
    }

    // ── Cover lightbox ──
    const lightbox = document.getElementById('cover-lightbox');
    const coverButton = document.querySelector('.editorial-cover');

    if (lightbox && coverButton) {
        const closeButton = lightbox.querySelector('.lightbox-close');
        let lastFocus = null;

        const openLightbox = () => {
            lastFocus = document.activeElement;
            lightbox.hidden = false;
            document.body.style.overflow = 'hidden';
            closeButton.focus();
        };

        const closeLightbox = () => {
            lightbox.hidden = true;
            document.body.style.overflow = '';
            if (lastFocus) lastFocus.focus();
        };

        coverButton.addEventListener('click', openLightbox);
        closeButton.addEventListener('click', closeLightbox);

        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
        });
    }
})();
