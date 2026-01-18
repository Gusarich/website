const containersWithHashHandlers = new WeakSet();

export const Navigation = {
    // Constants for scroll positioning
    SCROLL_OFFSET: 70, // Height to account for sticky breadcrumb
    SCROLL_OFFSET_MOBILE: 50, // Smaller offset for mobile
    SCROLL_DELAY: 100, // Delay for initial page load scrolling

    // Get the appropriate scroll offset based on viewport
    getScrollOffset() {
        return window.innerWidth <= 600 ? this.SCROLL_OFFSET_MOBILE : this.SCROLL_OFFSET;
    },

    getCanonicalUrl() {
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink?.href) {
            return canonicalLink.href;
        }

        const productionDomain = 'https://gusarich.com';
        const pathname = window.location.pathname;
        return productionDomain + pathname;
    },

    // Unified scroll function that handles all anchor navigation
    scrollToElement(elementOrId, options = {}) {
        const {
            updateHistory = true,
            smooth = true,
            offset = this.getScrollOffset()
        } = options;

        // Get the element
        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;

        if (!element) return false;

        // Calculate the target scroll position
        const rect = element.getBoundingClientRect();
        const scrollTop = window.scrollY + rect.top - offset;

        // Check if we need to scroll at all
        if (Math.abs(rect.top - offset) < 2) {
            // Already at the right position
            if (updateHistory && element.id) {
                history.replaceState(null, null, `#${element.id}`);
            }
            return true;
        }

        // Determine scroll behavior
        const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior = smooth && !respectsReducedMotion ? 'smooth' : 'auto';

        // Perform the scroll
        window.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: behavior
        });

        // Update URL if requested
        if (updateHistory && element.id) {
            // Use replaceState for initial navigation, pushState for user clicks
            const method = options.isInitial ? 'replaceState' : 'pushState';
            history[method](null, null, `#${element.id}`);
        }

        return true;
    },

    // Handle navigation when page loads with a hash
    handleInitialHash() {
        if (!window.location.hash) return;

        const targetId = window.location.hash.substring(1);
        if (!targetId) return;

        // Simple delay to let browser handle initial layout
        setTimeout(() => {
            this.scrollToElement(targetId, {
                updateHistory: false,
                isInitial: true
            });
        }, this.SCROLL_DELAY);
    },

    // Handle "Back to all posts" navigation
    handleBackNavigation() {
        const targetSection = sessionStorage.getItem('scrollToSection');
        if (targetSection) {
            sessionStorage.removeItem('scrollToSection');

            // Small delay to ensure page is loaded
            setTimeout(() => {
                this.scrollToElement(targetSection, {
                    updateHistory: false
                });
            }, this.SCROLL_DELAY);
        }
    },

    // Setup unified click handler for all hash links
    setupHashLinkHandlers(container = document) {
        if (containersWithHashHandlers.has(container)) return;
        containersWithHashHandlers.add(container);

        container.addEventListener('click', (e) => {
            // Check if clicked element or its parent is a hash link
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const hash = link.getAttribute('href');
            if (!hash || hash === '#') return;

            const targetId = hash.substring(1);
            if (!targetId) return;

            // Prevent default browser behavior
            e.preventDefault();

            // Scroll to the target
            this.scrollToElement(targetId, {
                updateHistory: true,
                smooth: true
            });
        });
    }
};
