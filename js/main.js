import { BlogPosts } from './blog-posts.js';
import { CodeBlocks } from './code.js';
import { Images } from './content.js';
import { LLMTierlist } from './llm-tierlist.js';
import { KeyboardShortcuts } from './modals.js';
import { Navigation } from './navigation.js';
import { RSSSubscribe } from './rss.js';
import { DarkMode, THEME_CHANGE_EVENT } from './theme.js';

export async function run() {
    DarkMode.init();
    RSSSubscribe.init();
    KeyboardShortcuts.init();
    Navigation.setupHashLinkHandlers(document);
    Images.processThemeAware(document);

    document.addEventListener(THEME_CHANGE_EVENT, async () => {
        await CodeBlocks.reprocessAll();
        Images.processThemeAware(document);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const legacyPostSlug = urlParams.get('post');

    if (legacyPostSlug) {
        const anchor = window.location.hash || '';
        window.location.replace(`/blog/${encodeURIComponent(legacyPostSlug)}${anchor}`);
        return;
    }

    const blogSlugMatch = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (blogSlugMatch) {
        const slug = blogSlugMatch[1];
        await BlogPosts.processPostPage(slug);
        return;
    }

    const tierlistMatch = window.location.pathname.match(/^\/llm-tierlist(?:\.html)?\/?$/);
    if (tierlistMatch) {
        await LLMTierlist.init();
        Navigation.handleInitialHash();
        return;
    }

    await BlogPosts.loadList();
    Navigation.handleBackNavigation();
    Navigation.handleInitialHash();
}
