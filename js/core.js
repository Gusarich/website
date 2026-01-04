// Core utilities shared across the site JS.

export const CONFIG = {
    API: {
        VIEWCOUNT_BASE: 'https://api.gusarich.com',
        VIEWCOUNT_CACHE_KEY: 'viewcounts_cache'
    },
    SHIKI: {
        CDN_URL: 'https://unpkg.com/shiki@0.14.3/dist/index.unpkg.iife.js',
        THEMES: {
            LIGHT: 'github-light',
            DARK: 'github-dark'
        }
    },
    UI: {
        CODE_BLOCK_HEIGHT: 200,
        CODE_BLOCK_COLLAPSE_LINES: 20,
        ANIMATION_DURATION: 300,
        COPY_FEEDBACK_DURATION: 2000,
        INLINE_CODE_FEEDBACK_DURATION: 600
    },
    TOC: {
        MIN_HEADINGS: 3
    }
};

export const State = {
    shikiLoaded: false,
    customTactGrammar: null
};

export const Formatting = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

export const Links = {
    // Some list items contain only a single link (e.g. "- ton-org/vanity").
    // On some browsers this can feel "flickery" because the list marker/whitespace
    // isn't part of the <a> hitbox. Make the whole <li> reliably show pointer.
    ensurePointerForLinkOnlyListItems(container) {
        const items = container.querySelectorAll('li');
        items.forEach((li) => {
            const meaningfulNodes = Array.from(li.childNodes).filter((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return (node.textContent || '').trim().length > 0;
                }
                return node.nodeType === Node.ELEMENT_NODE;
            });

            if (meaningfulNodes.length !== 1) return;

            const onlyNode = meaningfulNodes[0];
            if (
                onlyNode.nodeType !== Node.ELEMENT_NODE ||
                onlyNode.tagName !== 'A'
            ) {
                return;
            }

            li.style.cursor = 'pointer';
            onlyNode.style.cursor = 'pointer';
        });
    }
};
