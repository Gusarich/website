import { Links } from '../core.js';
import { CodeBlocks } from '../code.js';
import { Images, SectionBreadcrumb, Tables, TableOfContents } from '../content.js';
import { Navigation } from '../navigation.js';
import { PostMeta } from './post-meta.js';

export async function processPostPage(slug) {
    document.documentElement.classList.add('blog-post-page');
    document.body.classList.add('blog-post-page');

    PostMeta.init(slug);

    const container = document.getElementById('blog-post-content');
    if (container) {
        await enhanceContent(container, slug);
    }

    // Hide bottom back-link if page doesn't need scrolling
    maybeToggleBottomBackLink();
    setTimeout(() => maybeToggleBottomBackLink(), 0);
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => maybeToggleBottomBackLink(), 150);
    });
}

async function enhanceContent(container, slug) {
    TableOfContents.generate(container);
    SectionBreadcrumb.init(container);
    await CodeBlocks.processAll(container);
    CodeBlocks.processInline(container);
    Tables.enhance(container);
    // Update theme-aware images and apply lazy/async attributes
    Images.processThemeAware(container);
    Links.ensurePointerForLinkOnlyListItems(container);
    Navigation.handleInitialHash();
}

function maybeToggleBottomBackLink() {
    const article = document.querySelector('article.blog-post');
    if (!article) return;

    const needsScroll =
        document.documentElement.scrollHeight > window.innerHeight + 4;
    const bottomBack = document.getElementById('bottom-back-link');

    if (needsScroll) {
        if (!bottomBack) {
            const container = document.getElementById('blog-post-content');
            if (!container || !container.parentNode) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'blog-post-content';
            const link = document.createElement('a');
            link.id = 'bottom-back-link';
            link.href = '/blog';
            link.className = 'back-link';
            link.textContent = '← Back to all posts';
            wrapper.appendChild(link);
            container.parentNode.insertBefore(wrapper, container.nextSibling);
        }
        return;
    }

    if (bottomBack && bottomBack.parentNode) {
        bottomBack.parentNode.remove();
    }
}
