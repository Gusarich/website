export const RSSSubscribe = {
    init() {
        if (document.getElementById('rss-toggle')) return;

        const link = document.createElement('a');
        link.id = 'rss-toggle';
        link.className = 'rss-toggle';
        link.href = '/feed.xml';
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = 'Subscribe via RSS';
        link.setAttribute('aria-label', 'Subscribe via RSS');
        link.innerHTML = `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
            >
                <circle cx="5" cy="19" r="1.6" fill="currentColor" />
                <path
                    d="M4.5 4.5c8.3 0 15 6.7 15 15"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    d="M4.5 11c4.7 0 8.5 3.8 8.5 8.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
            </svg>
        `;

        document.body.appendChild(link);
    }
};
