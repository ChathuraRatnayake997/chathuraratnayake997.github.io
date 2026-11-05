/* ============================================
    My Drawings — full image with card fan
    ============================================ */

(function () {
    const FOLDER_URL = new URL('../assets/Projects/my_drawings/', window.location.href);
    const MANIFEST_URL = new URL('manifest.json', FOLDER_URL);
    const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const stage = document.getElementById('drawingsStage');
    const fan = document.getElementById('viewerFan');
    const content = document.getElementById('viewerContent');
    const emptyState = document.getElementById('drawingsEmpty');
    const dotsContainer = document.getElementById('drawingDots');
    const counter = document.getElementById('drawingCounter');
    const titleEl = document.getElementById('drawingTitle');
    const metaEl = document.getElementById('drawingMeta');
    const prevBtn = document.getElementById('prevDrawing');
    const nextBtn = document.getElementById('nextDrawing');
    const refreshBtn = document.getElementById('refreshDrawings');
    const drawingImage = document.getElementById('drawingImage');
    const drawingImageButton = document.getElementById('drawingImageButton');
    const lightbox = document.getElementById('drawing-lightbox');
    const lightboxImg = document.getElementById('drawing-lightbox-img');
    const lightboxCaption = document.getElementById('drawing-lightbox-caption');
    const lightboxClose = document.querySelector('#drawing-lightbox .lightbox-close');

    if (!drawingImage || !drawingImageButton || !fan) return;

    let deck = [];
    let currentIndex = 0;
    let isTransitioning = false;
    let lastLightboxFocus = null;
    let wheelLockedUntil = 0;

    let startX = 0;
    let startY = 0;
    let dragDeltaX = 0;
    let dragDeltaY = 0;
    let dragging = false;
    let didDrag = false;

    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    function prettify(name) {
        const base = name
            .replace(/\.[^.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return base.replace(/\b\w/g, function (char) {
            return char.toUpperCase();
        }) || 'Untitled';
    }

    function openDrawingLightbox(index) {
        const image = deck[index];
        if (!lightbox || !lightboxImg || !image) return;

        lastLightboxFocus = document.activeElement;
        lightboxImg.src = image.url;
        lightboxImg.alt = image.title;
        lightboxCaption.textContent = image.title;
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';

        if (lightboxClose) lightboxClose.focus();
    }

    function closeDrawingLightbox() {
        if (!lightbox || lightbox.hidden) return;

        lightbox.hidden = true;
        document.body.style.overflow = '';

        if (lastLightboxFocus && typeof lastLightboxFocus.focus === 'function') {
            lastLightboxFocus.focus();
        }
    }

    async function discoverImages() {
        const fromListing = new Map();
        const fromManifest = new Map();

        const add = (target, raw, title) => {
            if (!raw) return;

            let url;
            try {
                url = new URL(raw, FOLDER_URL);
            } catch (error) {
                return;
            }

            const name = decodeURIComponent(url.pathname.split('/').pop() || '');
            if (!IMAGE_RE.test(name)) return;

            target.set(name, {
                name: name,
                url: url.href,
                title: title || prettify(name)
            });
        };

        try {
            const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.images || []);

                list.forEach((item) => {
                    if (typeof item === 'string') {
                        add(fromManifest, item);
                    } else if (item && (item.file || item.src || item.url)) {
                        add(fromManifest, item.file || item.src || item.url, item.title);
                    }
                });
            }
        } catch (error) {
            // Manifest is optional.
        }

        try {
            const res = await fetch(FOLDER_URL, { cache: 'no-store' });
            const type = res.headers.get('content-type') || '';

            if (res.ok && type.includes('text/html')) {
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');

                doc.querySelectorAll('a[href]').forEach((link) => {
                    add(fromListing, link.getAttribute('href'));
                });
            }
        } catch (error) {
            // Directory listings are not available on every host.
        }

        // Prefer the live directory listing so deleted files disappear; fall
        // back to the manifest on hosts where listings are disabled.
        const source = fromListing.size ? fromListing : fromManifest;

        return Array.from(source.values()).sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    function renderFan() {
        fan.innerHTML = '';

        deck.forEach((image, index) => {
            const card = document.createElement('img');
            card.className = 'viewer-fan-card';
            card.dataset.index = String(index);
            card.src = image.url;
            card.alt = '';
            card.loading = index < 4 ? 'eager' : 'lazy';
            card.decoding = 'async';
            card.setAttribute('aria-hidden', 'true');

            card.addEventListener('click', () => {
                if (didDrag) {
                    didDrag = false;
                    return;
                }
                goToCard(index);
            });

            fan.appendChild(card);
        });
    }

    function showActiveImage(image, immediate) {
        if (!image) return;

        const setSource = () => {
            drawingImage.alt = image.title;
            drawingImage.onload = () => {
                drawingImage.style.opacity = '1';
                drawingImage.style.transform = 'scale(1)';
            };
            drawingImage.onerror = () => {
                drawingImage.style.opacity = '1';
                drawingImage.style.transform = 'scale(1)';
            };
            drawingImage.src = image.url;
        };

        if (!immediate) {
            drawingImage.style.opacity = '0';
            drawingImage.style.transform = 'scale(0.985)';
            setSource();
        } else {
            setSource();
        }
    }

    function updateFan() {
        const cards = fan.querySelectorAll('.viewer-fan-card');
        const compact = window.innerWidth <= 900;
        const maxDepth = compact ? 2 : 3;

        cards.forEach((card, index) => {
            let offset = index - currentIndex;

            if (offset > deck.length / 2) offset -= deck.length;
            if (offset < -deck.length / 2) offset += deck.length;

            if (offset === 0) {
                card.style.transform = 'translate3d(0, 0, 0) scale(1)';
                card.style.opacity = '0';
                card.style.zIndex = '0';
                card.style.pointerEvents = 'none';
                card.style.filter = 'none';
                return;
            }

            const direction = offset > 0 ? 1 : -1;
            const depth = Math.abs(offset);

            if (depth > maxDepth) {
                card.style.transform = 'translate3d(0, 0, -240px) scale(0.75)';
                card.style.opacity = '0';
                card.style.zIndex = '0';
                card.style.pointerEvents = 'none';
                return;
            }

            const translateX = compact ? direction * depth * 22 : direction * depth * 64;
            const translateY = compact ? depth * -8 : depth * -18;
            const translateZ = depth * -90;
            const rotateZ = compact ? direction * depth * 4 : direction * depth * 6;
            const scale = Math.max(0.7, 1 - depth * 0.06);

            card.style.transform = 'translate3d(' + translateX + 'px, ' + translateY + 'px, ' + translateZ + 'px) scale(' + scale + ') rotateZ(' + rotateZ + 'deg)';
            card.style.opacity = String(Math.max(0.4, 0.95 - (depth - 1) * 0.15));
            card.style.zIndex = String(10 - depth);
            card.style.pointerEvents = 'auto';
            card.style.filter = 'brightness(' + Math.max(55, 100 - depth * 12) + '%)';
        });
    }

    function updateView(options) {
        const image = deck[currentIndex];
        if (!image) return;

        const immediate = options && options.immediate;

        if (drawingImage.getAttribute('src') === image.url) {
            drawingImage.style.opacity = '1';
            drawingImage.style.transform = 'scale(1)';
        } else {
            showActiveImage(image, immediate);
        }

        drawingImageButton.setAttribute('aria-label', 'View ' + image.title + ' full size');
        titleEl.textContent = image.title;
        metaEl.textContent = 'Some of my artworks';
        counter.textContent = String(currentIndex + 1).padStart(2, '0') + ' / ' + String(deck.length).padStart(2, '0');

        updateFan();
        renderDots();
    }

    function renderDots() {
        dotsContainer.innerHTML = '';

        deck.forEach((image, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'viewer-dot' + (index === currentIndex ? ' active' : '');
            dot.setAttribute('aria-label', 'Show ' + image.title);
            dot.addEventListener('click', () => goToCard(index));
            dotsContainer.appendChild(dot);
        });
    }

    function goToCard(index) {
        if (!deck.length || isTransitioning) return;

        const nextIndex = (index + deck.length) % deck.length;
        if (nextIndex === currentIndex) return;

        isTransitioning = true;
        currentIndex = nextIndex;

        updateView();

        window.setTimeout(() => {
            isTransitioning = false;
        }, 420);
    }

    function nextCard() {
        goToCard(currentIndex + 1);
    }

    function prevCard() {
        goToCard(currentIndex - 1);
    }

    async function loadDrawings(preservePosition) {
        closeDrawingLightbox();

        const previousName = deck[currentIndex] ? deck[currentIndex].name : null;

        if (refreshBtn) refreshBtn.classList.add('spinning');

        const images = await discoverImages();

        if (refreshBtn) refreshBtn.classList.remove('spinning');

        deck = images;

        if (!deck.length) {
            content.hidden = true;
            emptyState.hidden = false;
            drawingImage.removeAttribute('src');
            fan.innerHTML = '';
            dotsContainer.innerHTML = '';
            counter.textContent = '00 / 00';
            return;
        }

        emptyState.hidden = true;
        content.hidden = false;

        if (preservePosition && previousName) {
            const found = deck.findIndex((image) => image.name === previousName);
            currentIndex = found >= 0 ? found : 0;
        } else {
            currentIndex = 0;
        }

        renderFan();
        updateView({ immediate: true });
    }

    function animateTilt() {
        if (!reduceMotion) {
            currentTiltX += (targetTiltX - currentTiltX) * 0.08;
            currentTiltY += (targetTiltY - currentTiltY) * 0.08;

            const active = document.querySelector('.viewer-active');
            if (active) {
                active.style.transform = 'perspective(900px) rotateX(' + currentTiltX + 'deg) rotateY(' + currentTiltY + 'deg)';
            }
        }

        window.requestAnimationFrame(animateTilt);
    }

    window.addEventListener('pointermove', (event) => {
        if (reduceMotion) return;

        const mouseX = (event.clientX / window.innerWidth) - 0.5;
        const mouseY = (event.clientY / window.innerHeight) - 0.5;

        targetTiltX = -mouseY * 7;
        targetTiltY = mouseX * 7;

        const active = document.querySelector('.viewer-active');
        if (active) {
            const rect = active.getBoundingClientRect();
            const cardX = ((event.clientX - rect.left) / rect.width) * 100;
            const cardY = ((event.clientY - rect.top) / rect.height) * 100;

            active.style.setProperty('--mx', cardX + '%');
            active.style.setProperty('--my', cardY + '%');
        }
    }, { passive: true });

    window.addEventListener('wheel', (event) => {
        if (lightbox && !lightbox.hidden) return;
        if (!deck.length || Math.abs(event.deltaY) < 12) return;

        const now = Date.now();
        if (now < wheelLockedUntil) return;
        wheelLockedUntil = now + 350;

        if (event.deltaY > 0) nextCard();
        else prevCard();
    }, { passive: true });

    window.addEventListener('keydown', (event) => {
        if (lightbox && !lightbox.hidden) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextCard();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') prevCard();
    });

    const onDragStart = (event) => {
        dragging = true;
        didDrag = false;
        startX = event.touches ? event.touches[0].clientX : event.clientX;
        startY = event.touches ? event.touches[0].clientY : event.clientY;
        dragDeltaX = 0;
        dragDeltaY = 0;
        stage.style.transition = 'none';
    };

    const onDragMove = (event) => {
        if (!dragging) return;

        const currentX = event.touches ? event.touches[0].clientX : event.clientX;
        const currentY = event.touches ? event.touches[0].clientY : event.clientY;
        dragDeltaX = currentX - startX;
        dragDeltaY = currentY - startY;

        if (Math.abs(dragDeltaX) > 4 || Math.abs(dragDeltaY) > 4) {
            didDrag = true;
        }

        stage.style.transform = 'translate(' + (dragDeltaX * 0.25) + 'px, ' + (dragDeltaY * 0.25) + 'px)';
    };

    const onDragEnd = () => {
        if (!dragging) return;
        dragging = false;

        stage.style.transition = '';
        stage.style.transform = '';

        if (Math.abs(dragDeltaX) > 40 || Math.abs(dragDeltaY) > 40) {
            if (dragDeltaX < 0 || dragDeltaY < 0) nextCard();
            else prevCard();
        }
    };

    stage.addEventListener('touchstart', onDragStart, { passive: true });
    stage.addEventListener('touchmove', onDragMove, { passive: true });
    stage.addEventListener('touchend', onDragEnd, { passive: true });
    stage.addEventListener('touchcancel', onDragEnd, { passive: true });
    stage.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);

    drawingImageButton.addEventListener('click', () => {
        if (didDrag) {
            didDrag = false;
            return;
        }
        openDrawingLightbox(currentIndex);
    });

    prevBtn.addEventListener('click', prevCard);
    nextBtn.addEventListener('click', nextCard);

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadDrawings(true));
    }

    if (lightbox && lightboxClose) {
        lightboxClose.addEventListener('click', closeDrawingLightbox);

        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) closeDrawingLightbox();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !lightbox.hidden) closeDrawingLightbox();
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) loadDrawings(true);
    });

    loadDrawings(false);
    animateTilt();
})();
