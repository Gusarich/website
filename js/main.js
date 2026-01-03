import { BlogPosts } from './blog-posts.js';
import { CodeBlocks } from './code.js';
import { Images } from './content.js';
import { KeyboardShortcuts } from './modals.js';
import { Navigation } from './navigation.js';
import { DarkMode, THEME_CHANGE_EVENT } from './theme.js';

export async function run() {
    DarkMode.init();
    KeyboardShortcuts.init();
    Navigation.setupHashLinkHandlers(document);
    Images.processThemeAware(document);

    document.addEventListener(THEME_CHANGE_EVENT, async () => {
        await CodeBlocks.reprocessAll();
        Images.processThemeAware(document);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const legacyPostId = urlParams.get('post');

    if (legacyPostId) {
        const anchor = window.location.hash || '';
        window.location.replace(`/blog/${encodeURIComponent(legacyPostId)}/${anchor}`);
        return;
    }

    const routeMatch = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (routeMatch) {
        const slug = routeMatch[1];
        await BlogPosts.processPostPage(slug);
        return;
    }

    await BlogPosts.loadList();
    Navigation.handleBackNavigation();
    Navigation.handleInitialHash();
}
