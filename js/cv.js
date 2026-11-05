/* ============================================
    CV viewer — renders assets/cv/cv.pdf in a modal
    ============================================ */

(function () {
    const link = document.querySelector('.bio-cv');
    const modal = document.getElementById('cv-modal');
    if (!link || !modal) return;

    const pages = document.getElementById('cv-pages');
    const scroll = document.getElementById('cv-scroll');
    const status = document.getElementById('cv-status');
    const closeButton = modal.querySelector('.cv-close');
    const PDF_URL = 'assets/cv/cv.pdf';

    let isLoading = false;
    let isRendered = false;
    let lastFocus = null;

    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const setStatus = (text) => {
        status.textContent = text || '';
        status.hidden = !text;
    };

    async function renderPdf() {
        if (isRendered || isLoading) return;

        if (!window.pdfjsLib) {
            setStatus('CV viewer unavailable. Use “Open PDF” instead.');
            return;
        }

        isLoading = true;
        setStatus('Loading CV…');

        try {
            const pdf = await pdfjsLib.getDocument(PDF_URL + '?t=' + Date.now()).promise;
            const available = Math.max(scroll.clientWidth - 40, 320);
            const maxWidth = Math.min(available, 880);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            for (let number = 1; number <= pdf.numPages; number += 1) {
                const page = await pdf.getPage(number);
                const baseViewport = page.getViewport({ scale: 1 });
                const scale = (maxWidth / baseViewport.width) * dpr;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = '100%';
                canvas.style.height = 'auto';

                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport }).promise;
                pages.appendChild(canvas);
            }

            isRendered = true;
            setStatus('');
        } catch (error) {
            setStatus('CV not found yet. Add assets/cv/cv.pdf to show it here.');
        } finally {
            isLoading = false;
        }
    }

    function openModal() {
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        closeButton.focus();
        renderPdf();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus();
    }

    link.addEventListener('click', (event) => {
        event.preventDefault();
        openModal();
    });

    closeButton.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) closeModal();
    });
})();
