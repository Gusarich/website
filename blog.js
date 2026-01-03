// Entry point for the site's JavaScript.
//
// Keep `blog.js` stable (it's referenced by generated pages), and load the real
// implementation from `js/main.js`.

(() => {
    const scriptUrl = document.currentScript?.src;
    const baseUrl = scriptUrl ? new URL('.', scriptUrl) : new URL('/', window.location.href);
    const mainUrl = new URL('js/main.js', baseUrl).href;

    const start = async () => {
        try {
            const { run } = await import(mainUrl);
            await run();
        } catch (error) {
            console.error('Failed to initialize site JS:', error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void start();
        });
        return;
    }

    void start();
})();

