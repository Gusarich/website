import { CONFIG } from './core.js';

export const ViewCount = {
    getCache() {
        try {
            const cached = localStorage.getItem(CONFIG.API.VIEWCOUNT_CACHE_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    },

    saveCache(counts) {
        try {
            localStorage.setItem(CONFIG.API.VIEWCOUNT_CACHE_KEY, JSON.stringify(counts));
        } catch {
            // Ignore localStorage errors
        }
    },

    async fetch(postSlug) {
        try {
            const response = await fetch(`${CONFIG.API.VIEWCOUNT_BASE}/api/viewcount/${postSlug}`);
            if (!response.ok) throw new Error('Failed to fetch view count');

            const data = await response.json();

            const cache = this.getCache();
            cache[postSlug] = data.views;
            this.saveCache(cache);

            return data.views;
        } catch (error) {
            console.error(`Error fetching view count for ${postSlug}:`, error);
            const cache = this.getCache();
            return cache[postSlug] || 0;
        }
    },

    getCached(postSlug) {
        const cache = this.getCache();
        return cache[postSlug] || 0;
    },

    format(count) {
        const nbsp = '\u00A0';
        return count === 1 ? `1${nbsp}view` : `${count}${nbsp}views`;
    },

    async updateElement(element, postSlug) {
        if (!element) return;
        const viewCount = await this.fetch(postSlug);
        const formatted = this.format(viewCount);
        if (element.textContent !== formatted) {
            element.textContent = formatted;
        }
    }
};
