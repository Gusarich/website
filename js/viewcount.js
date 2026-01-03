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

    async fetch(postId) {
        try {
            const response = await fetch(`${CONFIG.API.VIEWCOUNT_BASE}/api/viewcount/${postId}`);
            if (!response.ok) throw new Error('Failed to fetch view count');

            const data = await response.json();

            const cache = this.getCache();
            cache[postId] = data.views;
            this.saveCache(cache);

            return data.views;
        } catch (error) {
            console.error(`Error fetching view count for ${postId}:`, error);
            const cache = this.getCache();
            return cache[postId] || 0;
        }
    },

    getCached(postId) {
        const cache = this.getCache();
        return cache[postId] || 0;
    },

    format(count) {
        const nbsp = '\u00A0';
        return count === 1 ? `1${nbsp}view` : `${count}${nbsp}views`;
    },

    async updateElement(element, postId) {
        if (!element) return;
        const viewCount = await this.fetch(postId);
        const formatted = this.format(viewCount);
        if (element.textContent !== formatted) {
            element.textContent = formatted;
        }
    }
};

