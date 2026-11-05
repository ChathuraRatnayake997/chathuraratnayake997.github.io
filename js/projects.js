/* ============================================
    Projects — rendered from data/projects.json
    ============================================ */

(function () {
    const grid = document.getElementById('home-projects') || document.getElementById('projects-grid');
    if (!grid) return;

    const showOnlyFeatured = grid.id === 'home-projects';
    const inPages = /(^|\/)pages\//.test(location.pathname);

    // Resolve site-root-relative paths (data, assets, local page links) from
    // whichever page is active: index.html sits at the root, the rest in pages/.
    function resolve(path) {
        if (!inPages) return path;
        if (path.startsWith('pages/')) return path.slice('pages/'.length);
        return '../' + path;
    }

    function externalLink(url) {
        return /^https?:\/\//i.test(url);
    }

    function buildProject(project) {
        const link = document.createElement('a');
        const url = typeof project.link === 'string' ? project.link.trim() : '';

        if (url) {
            if (externalLink(url)) {
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener';
            } else {
                link.href = resolve(url);
            }
        } else {
            link.setAttribute('aria-disabled', 'true');
            link.tabIndex = -1;
        }

        const hasImage = typeof project.image === 'string' && project.image.trim() !== '';
        const node = document.createElement('div');
        node.className = 'node' + (hasImage ? ' node-feature' : '');

        const copy = document.createElement('div');
        if (hasImage) copy.className = 'node-copy';

        const title = document.createElement('h3');
        title.textContent = project.title || 'Untitled project';

        const intro = document.createElement('p');
        intro.textContent = project.intro || '';

        copy.appendChild(title);
        copy.appendChild(intro);

        node.appendChild(copy);

        if (hasImage) {
            const media = document.createElement('div');
            media.className = 'node-media';

            const img = document.createElement('img');
            img.src = resolve(project.image.trim());
            img.alt = (project.title || 'Project') + ' preview';
            img.loading = 'lazy';
            img.decoding = 'async';

            media.appendChild(img);
            node.appendChild(media);
        }

        link.appendChild(node);
        return link;
    }

    function primeFeatureImages() {
        grid.querySelectorAll('.node-media img').forEach((img) => {
            const apply = () => {
                if (!img.naturalWidth || !img.clientWidth) return;
                const height = Math.round(img.clientWidth * img.naturalHeight / img.naturalWidth);
                const card = img.closest('.node');
                if (card) card.style.setProperty('--img-h', height + 'px');
            };

            if (img.complete) {
                apply();
            } else {
                img.addEventListener('load', apply, { once: true });
            }
        });
    }

    async function renderProjects() {
        try {
            const response = await fetch(inPages ? '../data/projects.json' : 'data/projects.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Could not load projects');

            const data = await response.json();
            const projects = Array.isArray(data) ? data : (data.projects || []);
            const visible = showOnlyFeatured
                ? projects.filter((project) => Boolean(project.featured))
                : projects;

            if (!visible.length) {
                const empty = document.createElement('p');
                empty.className = 'projects-empty';
                empty.textContent = 'No projects to show yet.';
                grid.appendChild(empty);
                return;
            }

            grid.innerHTML = '';
            visible.forEach((project) => grid.appendChild(buildProject(project)));
            primeFeatureImages();
        } catch (error) {
            grid.innerHTML = '';
            const empty = document.createElement('p');
            empty.className = 'projects-empty';
            empty.textContent = 'Projects are unavailable right now.';
            grid.appendChild(empty);
        }
    }

    renderProjects();

    window.addEventListener('resize', () => {
        primeFeatureImages();
    });
})();
