import { CONFIG } from './core.js';
import { Navigation } from './navigation.js';
import { DarkMode } from './theme.js';

export const TableOfContents = {
    generate(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        if (headings.length === 0) return;

        const tocItems = this.extractHeadings(headings);

        // Only render the full TOC UI when there are enough headings, but always
        // assign stable IDs so in-page links like #my-section work.
        if (headings.length >= CONFIG.TOC.MIN_HEADINGS) {
            const tocContainer = this.createContainer(tocItems);
            this.insertIntoContent(container, tocContainer);
        }

        this.addHeadingLinks(container);
    },

    extractHeadings(headings) {
        const items = [];
        const usedIds = new Map();

        headings.forEach((heading) => {
            const baseId = heading.id || this.generateId(heading.textContent);
            const uniqueId = this.makeUniqueId(baseId, usedIds);
            heading.id = uniqueId;

            items.push({
                id: heading.id,
                text: heading.textContent.trim(),
                level: parseInt(heading.tagName.substring(1))
            });
        });

        return items;
    },

    makeUniqueId(baseId, usedIds) {
        const safeBase = baseId || 'section';
        const count = usedIds.get(safeBase) || 0;
        usedIds.set(safeBase, count + 1);
        return count === 0 ? safeBase : `${safeBase}-${count}`;
    },

    generateId(text) {
        const slug = text.trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        return slug || 'section';
    },

    createContainer(tocItems) {
        const container = document.createElement('div');
        container.className = 'toc-container';

        const header = this.createHeader();
        const content = this.createContent(tocItems);

        container.appendChild(header);
        container.appendChild(content);

        this.addToggleFunctionality(container, header, content);

        return container;
    },

    createHeader() {
        const header = document.createElement('div');
        header.className = 'toc-header';
        header.innerHTML = `
            <h3>Table of Contents</h3>
            <button class="toc-toggle">Expand</button>
        `;
        return header;
    },

    createContent(tocItems) {
        const content = document.createElement('div');
        content.className = 'toc-content collapsed';
        content.style.height = '0px';

        const list = document.createElement('ul');
        list.className = 'toc-list';

        tocItems.forEach(item => {
            const listItem = this.createListItem(item);
            list.appendChild(listItem);
        });

        content.appendChild(list);
        return content;
    },

    createListItem(item) {
        const listItem = document.createElement('li');
        listItem.className = `toc-h${item.level}`;

        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.textContent = item.text;

        // No need for individual event handler - Navigation module handles it

        listItem.appendChild(link);
        return listItem;
    },

    addToggleFunctionality(container, header, content) {
        const toggle = container.querySelector('.toc-toggle');

        const toggleToc = (e) => {
            // Prevent double-triggering when clicking the button
            if (e && e.target === toggle) {
                e.stopPropagation();
            }

            const isCollapsed = content.classList.contains('collapsed');
            this.animateToggle(content, isCollapsed);
            toggle.textContent = isCollapsed ? 'Collapse' : 'Expand';
        };

        // Make the entire header clickable
        header.addEventListener('click', toggleToc);
    },

    animateToggle(content, isCollapsed) {
        const currentHeight = window.getComputedStyle(content).height;

        content.style.height = currentHeight;
        void content.offsetWidth;

        content.classList.toggle('collapsed');

        requestAnimationFrame(() => {
            if (isCollapsed) {
                content.style.height = 'auto';
                const expandedHeight = window.getComputedStyle(content).height;
                content.style.height = currentHeight;

                requestAnimationFrame(() => {
                    content.style.height = expandedHeight;
                    setTimeout(() => {
                        content.style.height = '';
                    }, CONFIG.UI.ANIMATION_DURATION);
                });
            } else {
                requestAnimationFrame(() => {
                    content.style.height = '0px';
                });
            }
        });
    },

    insertIntoContent(container, tocContainer) {
        const firstHeading = container.querySelector('h2, h3');
        if (firstHeading) {
            container.insertBefore(tocContainer, firstHeading);
        } else {
            container.insertBefore(tocContainer, container.firstChild);
        }
    },

    addHeadingLinks(container) {
        const headings = container.querySelectorAll('h2, h3, h4');

        headings.forEach(heading => {
            if (!heading.id) return;

            this.makeHeadingClickable(heading);
            this.addLinkIcon(heading);
        });
    },

    makeHeadingClickable(heading) {
        heading.style.cursor = 'pointer';

        heading.addEventListener('click', (e) => {
            // Only handle clicks directly on the heading, not on child elements
            if (e.target === heading || e.target.tagName === 'CODE') {
                e.preventDefault();
                Navigation.scrollToElement(heading.id, {
                    updateHistory: true,
                    smooth: true
                });
            }
        });
    },

    addLinkIcon(heading) {
        const link = document.createElement('a');
        link.className = 'heading-link';
        link.href = `#${heading.id}`;
        link.innerHTML = ' #';
        link.setAttribute('aria-label', 'Anchor link');

        heading.appendChild(link);

        // No need for click handler - Navigation module handles it via delegation
    }
};

export const SectionBreadcrumb = {
    init(container) {
        const headings = this.getAllHeadings(container);
        if (headings.length === 0) return;

        this.headings = headings;
        this.createBreadcrumb();
        this.setupScrollListener();
    },

    getAllHeadings(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        return Array.from(headings).map(h => {
            // Get text without the link icon
            let text = h.textContent.trim();
            const linkIcon = h.querySelector('.heading-link');
            if (linkIcon) {
                text = text.replace(linkIcon.textContent, '').trim();
            }

            return {
                element: h,
                text: text,
                level: parseInt(h.tagName.substring(1))
                // We'll calculate position dynamically instead of storing it
            };
        }).filter(h => h.text !== 'Table of Contents'); // Exclude TOC
    },

    createBreadcrumb() {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'section-breadcrumb';
        breadcrumb.innerHTML = '<span class="breadcrumb-content"></span>';
        document.body.appendChild(breadcrumb);
        this.breadcrumbElement = breadcrumb;
        this.contentElement = breadcrumb.querySelector('.breadcrumb-content');

        // Setup click handlers for breadcrumb links using event delegation
        this.breadcrumbElement.addEventListener('click', (e) => {
            const link = e.target.closest('.breadcrumb-link');
            if (!link) return;

            e.preventDefault();

            // Handle top link specially
            if (link.classList.contains('breadcrumb-top')) {
                window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
                });
                // Clear the hash from URL when going to top
                history.replaceState(null, null, window.location.pathname);
                return;
            }

            // Use the unified navigation for other links
            const hash = link.getAttribute('href');
            if (hash && hash !== '#') {
                const targetId = hash.substring(1);
                Navigation.scrollToElement(targetId, {
                    updateHistory: true,
                    smooth: true
                });
            }
        });
    },

    setupScrollListener() {
        let ticking = false;

        const updateBreadcrumb = () => {
            const scrollPos = window.scrollY + 100; // Offset for better detection
            const activeSection = this.findActiveSection(scrollPos);

            if (activeSection) {
                this.updateBreadcrumbContent(activeSection);
                this.breadcrumbElement.classList.add('visible');
                document.body.classList.add('breadcrumb-visible');
            } else {
                this.breadcrumbElement.classList.remove('visible');
                document.body.classList.remove('breadcrumb-visible');
            }

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateBreadcrumb);
                ticking = true;
            }
        });

        // Initial check
        updateBreadcrumb();
    },

    findActiveSection(scrollPos) {
        // Get current positions of all headings using getBoundingClientRect
        const headingsWithPos = this.headings.map(h => ({
            ...h,
            top: h.element.getBoundingClientRect().top + window.scrollY
        }));

        // Find all headings that are above the current scroll position
        const passedHeadings = headingsWithPos.filter(h => h.top <= scrollPos);
        if (passedHeadings.length === 0) return null;

        // Get the last (most recent) heading we've passed
        const currentHeading = passedHeadings[passedHeadings.length - 1];

        // Build the hierarchy based on the current heading
        let h2 = null;
        let h3 = null;
        let h4 = null;

        // Find the parent H2
        for (let i = passedHeadings.length - 1; i >= 0; i--) {
            if (passedHeadings[i].level === 2) {
                h2 = passedHeadings[i];
                break;
            }
        }

        // If current is H3 or H4, find parent H3
        if (currentHeading.level >= 3 && h2) {
            for (let i = passedHeadings.length - 1; i >= 0; i--) {
                if (passedHeadings[i].level === 3 && passedHeadings[i].top > h2.top) {
                    h3 = passedHeadings[i];
                    break;
                }
            }
        }

        // Set the appropriate level based on current heading
        if (currentHeading.level === 2) {
            h2 = currentHeading;
            h3 = null;
            h4 = null;
        } else if (currentHeading.level === 3) {
            h3 = currentHeading;
            h4 = null;
        } else if (currentHeading.level === 4) {
            h4 = currentHeading;
        }

        return { h2, h3, h4 };
    },

    updateBreadcrumbContent(section) {
        const parts = [];

        // Always add link to scroll to top
        parts.push('<a href="#" class="breadcrumb-link breadcrumb-top">↑</a>');

        if (section.h2) {
            const h2Id = section.h2.element.id;
            parts.push(`<a href="#${h2Id}" class="breadcrumb-link breadcrumb-h2">${section.h2.text}</a>`);
        }
        if (section.h3) {
            const h3Id = section.h3.element.id;
            parts.push(`<a href="#${h3Id}" class="breadcrumb-link breadcrumb-h3">${section.h3.text}</a>`);
        }
        if (section.h4) {
            const h4Id = section.h4.element.id;
            parts.push(`<a href="#${h4Id}" class="breadcrumb-link breadcrumb-h4">${section.h4.text}</a>`);
        }

        this.contentElement.innerHTML = parts.join('<span class="breadcrumb-separator"> › </span>');
    }
};

export const Images = {
    processThemeAware(container) {
        const themeImages = container.querySelectorAll('.theme-image[data-base-src]');
        const isDarkMode = DarkMode.isDark();

        themeImages.forEach(img => {
            const baseSrc = img.getAttribute('data-base-src');
            const themedSrc = this.getThemedSource(baseSrc, isDarkMode);

            // Always update src for theme-aware images
            img.src = themedSrc;
        });

        // Apply sensible defaults for all images in scope
        this.applyImageAttributes(container);
    },

    getThemedSource(baseSrc, isDarkMode) {
        const suffix = isDarkMode ? '_dark' : '_light';
        const ext = baseSrc.split('.').pop();
        return baseSrc.replace(`.${ext}`, `${suffix}.${ext}`);
    },

    applyImageAttributes(container) {
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
    }
};

export const Tables = {
    enhance(container) {
        const tables = container.querySelectorAll('table');
        if (!tables.length) return;

        tables.forEach(table => {
            if (table.closest('.table-responsive')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';

            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }
};

