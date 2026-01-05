import { ViewCount } from '../viewcount.js';

export function hydrateListViewCounts(container) {
    const viewElements = container.querySelectorAll('[data-post-id]');
    if (viewElements.length === 0) return;

    // Show cached counts immediately (fast), then refresh from the API.
    viewElements.forEach((element) => {
        const postSlug = element.getAttribute('data-post-id');
        const cachedCount = ViewCount.getCached(postSlug);
        element.textContent = ViewCount.format(cachedCount);
    });

    viewElements.forEach((element) => {
        const postSlug = element.getAttribute('data-post-id');
        ViewCount.updateElement(element, postSlug);
    });
}
