// ===================================================================
// BLOG.JS - Main JavaScript file for blog functionality
// ===================================================================
// 1. Configuration & Constants
// 2. State Management
// 3. Dark Mode Module
// 4. View Count Module
// 5. URL & Navigation Module
// 6. Date & Formatting Utilities
// 7. Syntax Highlighting Module
// 8. Code Block Processing Module
// 9. Table of Contents Module
// 10. Section Breadcrumb Module
// 11. Blog Post Loading Module
// 12. Image Processing Module
// 13. Main Initialization
// ===================================================================

// ===================================================================
// 1. CONFIGURATION & CONSTANTS
// ===================================================================
const CONFIG = {
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
        CODE_BLOCK_EXPAND_THRESHOLD: 20,
        ANIMATION_DURATION: 300,
        COPY_FEEDBACK_DURATION: 2000,
        INLINE_CODE_FEEDBACK_DURATION: 600
    },
    TOC: {
        MIN_HEADINGS: 3
    }
};

// ===================================================================
// 2. STATE MANAGEMENT
// ===================================================================
const State = {
    shikiLoaded: false,
    customTactGrammar: null
};

// ===================================================================
// 3. DARK MODE MODULE
// ===================================================================
const DarkMode = {
    init() {
        const button = this.createToggleButton();
        document.body.appendChild(button);
        
        this.transferInitialState();
        this.updateButtonIcon(button);
        
        button.addEventListener('click', () => this.toggle(button));
    },
    
    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'dark-mode-toggle';
        button.className = 'dark-mode-toggle';
        button.title = 'Toggle dark mode';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.textContent = '🌙';
        return button;
    },
    
    transferInitialState() {
        if (document.documentElement.classList.contains('dark-mode')) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    },
    
    updateButtonIcon(button) {
        const isDark = document.body.classList.contains('dark-mode');
        button.textContent = isDark ? '☀️' : '🌙';
    },
    
    async toggle(button) {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        this.updateButtonIcon(button);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        await CodeBlocks.reprocessAll();
        Images.processThemeAware(document);
    },
    
    isDark() {
        return document.body.classList.contains('dark-mode');
    }
};

// ===================================================================
// 4. VIEW COUNT MODULE
// ===================================================================
const ViewCount = {
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
        const viewCount = await this.fetch(postId);
        const formatted = this.format(viewCount);
        if (element.textContent !== formatted) {
            element.textContent = formatted;
        }
    }
};

// ===================================================================
// 5. URL & NAVIGATION MODULE
// ===================================================================
const Navigation = {
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
        const cleanPathname = pathname.endsWith('/') ? pathname : pathname + '/';
        
        return productionDomain + cleanPathname;
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
        }, 100);
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
            }, 100);
        }
    },
    
    // Setup unified click handler for all hash links
    setupHashLinkHandlers(container = document) {
        // Remove any existing handlers first to prevent duplicates
        container.querySelectorAll('a[href^="#"]').forEach(link => {
            // Clone the node to remove all event listeners
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        // Add single unified handler using event delegation
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

// ===================================================================
// 6. DATE & FORMATTING UTILITIES
// ===================================================================
const Formatting = {
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-GB', options).replace(/ /g, '\u00A0');
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===================================================================
// 7. SYNTAX HIGHLIGHTING MODULE
// ===================================================================
const SyntaxHighlighting = {
    async load() {
        if (State.shikiLoaded) return true;
        
        try {
            await this.loadShikiScript();
            await this.loadTactGrammar();
            State.shikiLoaded = true;
            return true;
        } catch (error) {
            console.error('Failed to load syntax highlighting:', error);
            return false;
        }
    },
    
    async loadShikiScript() {
        const script = document.createElement('script');
        script.src = CONFIG.SHIKI.CDN_URL;
        
        const scriptLoaded = new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });
        
        document.head.appendChild(script);
        await scriptLoaded;
        
        if (!window.shiki) {
            throw new Error('Shiki failed to load properly');
        }
    },
    
    async loadTactGrammar() {
        const response = await fetch('/grammar-tact.json');
        const tactGrammar = await response.json();
        State.customTactGrammar = tactGrammar;
        console.log('Loaded Tact grammar:', tactGrammar.scopeName);
    },
    
    async highlight(codeText, language) {
        if (!State.shikiLoaded || !language || language === 'text') {
            return null;
        }
        
        const theme = DarkMode.isDark() ? CONFIG.SHIKI.THEMES.DARK : CONFIG.SHIKI.THEMES.LIGHT;
        
        try {
            if (language === 'tact' && State.customTactGrammar) {
                return await this.highlightTact(codeText, theme);
            } else {
                return await this.highlightGeneric(codeText, language, theme);
            }
        } catch (error) {
            console.warn(`Failed to highlight ${language} code:`, error);
            return this.getFallbackHtml(codeText);
        }
    },
    
    async highlightTact(codeText, theme) {
        const highlighter = await window.shiki.getHighlighter({
            theme: theme,
            langs: [{
                id: 'tact',
                scopeName: State.customTactGrammar.scopeName,
                grammar: State.customTactGrammar,
                aliases: ['tact']
            }]
        });
        
        return highlighter.codeToHtml(codeText, { lang: 'tact' });
    },
    
    async highlightGeneric(codeText, language, theme) {
        const highlighter = await window.shiki.getHighlighter({
            theme: theme,
            langs: [language]
        });
        
        return highlighter.codeToHtml(codeText, { lang: language });
    },
    
    getFallbackHtml(codeText) {
        const surfaceBg = getComputedStyle(document.body).getPropertyValue('--n-surface-50').trim();
        return `<pre class="shiki" style="background-color: ${surfaceBg}"><code>${Formatting.escapeHtml(codeText)}</code></pre>`;
    }
};

// ===================================================================
// 8. CODE BLOCK PROCESSING MODULE
// ===================================================================
const CodeBlocks = {
    async processAll(container, postId) {
        const codeBlocks = container.querySelectorAll('pre > code');
        if (codeBlocks.length === 0) return;
        
        const shikiAvailable = postId !== 'measuring-llm-entropy' && await SyntaxHighlighting.load();
        
        for (const codeElement of codeBlocks) {
            await this.processBlock(codeElement, shikiAvailable);
        }
    },
    
    async processBlock(codeElement, shikiAvailable) {
        const preElement = codeElement.parentNode;
        const codeText = codeElement.textContent;
        
        const { language, displayLanguage } = this.detectLanguage(codeElement);
        
        let highlightedHTML = null;
        if (language && shikiAvailable && language !== 'text') {
            highlightedHTML = await SyntaxHighlighting.highlight(codeText, language);
        }
        
        this.transformBlock(preElement, codeText, displayLanguage || 'Text', highlightedHTML);
    },
    
    detectLanguage(codeElement) {
        const langClass = codeElement.className.match(/language-(\w+)/);
        if (!langClass || !langClass[1]) {
            return { language: null, displayLanguage: 'Text' };
        }
        
        const language = langClass[1];
        const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1);
        
        return { language, displayLanguage };
    },
    
    transformBlock(preElement, codeText, displayLanguage, highlightedHTML) {
        const container = this.createContainer(displayLanguage, !!highlightedHTML);
        const content = this.createContent(preElement, highlightedHTML);
        
        container.appendChild(container.querySelector('.prompt-header'));
        container.appendChild(content);
        
        preElement.parentNode.replaceChild(container, preElement);
        
        this.addCopyFunctionality(container, codeText);
        
        if (!highlightedHTML) {
            this.addToggleFunctionality(container, content);
        }
    },
    
    createContainer(displayLanguage, isHighlighted) {
        const container = document.createElement('div');
        container.className = 'prompt-container';
        
        const header = document.createElement('div');
        header.className = 'prompt-header';
        
        const showToggle = !isHighlighted;
        header.innerHTML = `
            <h5>${displayLanguage}</h5>
            <div class="prompt-actions">
                <button class="prompt-copy" title="Copy to clipboard">Copy</button>
                ${showToggle ? '<button class="prompt-toggle" title="Expand/Collapse">Expand</button>' : ''}
            </div>
        `;
        
        container.appendChild(header);
        return container;
    },
    
    createContent(preElement, highlightedHTML) {
        const content = document.createElement('div');
        content.className = 'prompt-content';
        
        if (highlightedHTML) {
            content.innerHTML = highlightedHTML;
            content.style.height = 'auto';
        } else {
            content.appendChild(preElement.cloneNode(true));
        }
        
        return content;
    },
    
    addCopyFunctionality(container, codeText) {
        const copyButton = container.querySelector('.prompt-copy');
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            try {
                await navigator.clipboard.writeText(codeText.trim());
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, CONFIG.UI.COPY_FEEDBACK_DURATION);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    },
    
    addToggleFunctionality(container, content) {
        const toggleButton = container.querySelector('.prompt-toggle');
        const header = container.querySelector('.prompt-header');
        
        if (!toggleButton) return;
        
        const toggle = (e) => {
            if (e) e.stopPropagation();
            
            const isExpanded = content.classList.contains('expanded');
            this.animateToggle(content, isExpanded);
            toggleButton.textContent = isExpanded ? 'Expand' : 'Collapse';
        };
        
        toggleButton.addEventListener('click', toggle);
        
        setTimeout(() => {
            const contentElement = content.querySelector('pre');
            if (!contentElement) return;
            
            const contentHeight = contentElement.scrollHeight;
            const threshold = CONFIG.UI.CODE_BLOCK_HEIGHT + CONFIG.UI.CODE_BLOCK_EXPAND_THRESHOLD;
            
            if (contentHeight <= threshold) {
                toggleButton.classList.add('hidden');
                content.style.height = 'auto';
                header.style.cursor = 'default';
            } else {
                header.style.cursor = 'pointer';
                header.addEventListener('click', toggle);
            }
        }, 0);
    },
    
    animateToggle(content, isExpanded) {
        const currentHeight = window.getComputedStyle(content).height;
        
        content.style.height = currentHeight;
        void content.offsetWidth;
        
        content.classList.toggle('expanded');
        
        requestAnimationFrame(() => {
            if (!isExpanded) {
                content.style.height = 'auto';
                const expandedHeight = window.getComputedStyle(content).height;
                content.style.height = currentHeight;
                
                requestAnimationFrame(() => {
                    content.style.height = expandedHeight;
                    setTimeout(() => {
                        content.style.height = '';
                    }, CONFIG.UI.ANIMATION_DURATION);
                });
            } else {
                requestAnimationFrame(() => {
                    content.style.height = `${CONFIG.UI.CODE_BLOCK_HEIGHT}px`;
                });
            }
        });
    },
    
    async reprocessAll() {
        const containers = document.querySelectorAll('.prompt-container');
        
        for (const container of containers) {
            const header = container.querySelector('.prompt-header h5');
            const content = container.querySelector('.prompt-content');
            
            if (!header || !content) continue;
            
            const preElement = content.querySelector('pre');
            if (!preElement) continue;
            
            const codeElement = preElement.querySelector('code');
            if (!codeElement) continue;
            
            const codeText = codeElement.textContent;
            const language = header.textContent.toLowerCase();
            
            const shikiAvailable = window.shiki && language !== 'text';
            
            if (shikiAvailable) {
                const highlightedHTML = await SyntaxHighlighting.highlight(codeText, language);
                if (highlightedHTML) {
                    content.innerHTML = highlightedHTML;
                }
            }
        }
    },
    
    processInline(container) {
        const inlineCodeElements = container.querySelectorAll('code:not(.inline-code)');
        
        for (const codeElement of inlineCodeElements) {
            if (codeElement.closest('pre')) continue;
            
            this.makeInlineClickable(codeElement);
        }
    },
    
    makeInlineClickable(codeElement) {
        codeElement.classList.add('inline-code');
        codeElement.style.cursor = 'pointer';
        codeElement.title = 'Click to copy';
        
        const originalText = codeElement.textContent;
        let timeoutId = null;
        
        codeElement.addEventListener('click', async (e) => {
            if (e.target.closest('a')) return;
            
            e.stopPropagation();
            
            try {
                await navigator.clipboard.writeText(originalText.trim());
                
                if (timeoutId) clearTimeout(timeoutId);
                
                this.flashInlineSuccess(codeElement);
                
                timeoutId = setTimeout(() => {
                    this.resetInlineStyle(codeElement);
                }, CONFIG.UI.INLINE_CODE_FEEDBACK_DURATION);
            } catch (err) {
                console.error('Failed to copy inline code:', err);
            }
        });
    },
    
    flashInlineSuccess(codeElement) {
        // Add success class for quick transition in
        codeElement.classList.add('flash-success');
        codeElement.classList.remove('flash-reset');
    },
    
    resetInlineStyle(codeElement) {
        // Remove success class and add reset class for smooth transition out
        codeElement.classList.remove('flash-success');
        codeElement.classList.add('flash-reset');
        
        // Clean up the reset class after transition completes
        setTimeout(() => {
            codeElement.classList.remove('flash-reset');
        }, 250);
    }
};

// ===================================================================
// 9. TABLE OF CONTENTS MODULE
// ===================================================================
const TableOfContents = {
    generate(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        if (headings.length < CONFIG.TOC.MIN_HEADINGS) return;
        
        const tocItems = this.extractHeadings(headings);
        const tocContainer = this.createContainer(tocItems);
        
        this.insertIntoContent(container, tocContainer);
        this.addHeadingLinks(container);
    },
    
    extractHeadings(headings) {
        const items = [];
        
        headings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = this.generateId(heading.textContent, index);
            }
            
            items.push({
                id: heading.id,
                text: heading.textContent.trim(),
                level: parseInt(heading.tagName.substring(1))
            });
        });
        
        return items;
    },
    
    generateId(text, index) {
        const slug = text.trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        return `heading-${slug}-${index}`;
    },
    
    createContainer(tocItems) {
        const container = document.createElement('div');
        container.className = 'toc-container';
        
        const header = this.createHeader();
        const content = this.createContent(tocItems);
        
        container.appendChild(header);
        container.appendChild(content);
        
        this.addToggleFunctionality(container, header, content);
        
        return container;
    },
    
    createHeader() {
        const header = document.createElement('div');
        header.className = 'toc-header';
        header.innerHTML = `
            <h3>Table of Contents</h3>
            <button class="toc-toggle">Expand</button>
        `;
        return header;
    },
    
    createContent(tocItems) {
        const content = document.createElement('div');
        content.className = 'toc-content collapsed';
        content.style.height = '0px';
        
        const list = document.createElement('ul');
        list.className = 'toc-list';
        
        tocItems.forEach(item => {
            const listItem = this.createListItem(item);
            list.appendChild(listItem);
        });
        
        content.appendChild(list);
        return content;
    },
    
    createListItem(item) {
        const listItem = document.createElement('li');
        listItem.className = `toc-h${item.level}`;
        
        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.textContent = item.text;
        
        // No need for individual event handler - Navigation module handles it
        
        listItem.appendChild(link);
        return listItem;
    },
    
    addToggleFunctionality(container, header, content) {
        const toggle = container.querySelector('.toc-toggle');
        
        const toggleToc = (e) => {
            // Prevent double-triggering when clicking the button
            if (e && e.target === toggle) {
                e.stopPropagation();
            }
            
            const isCollapsed = content.classList.contains('collapsed');
            this.animateToggle(content, isCollapsed);
            toggle.textContent = isCollapsed ? 'Collapse' : 'Expand';
        };
        
        // Make the entire header clickable
        header.addEventListener('click', toggleToc);
    },
    
    animateToggle(content, isCollapsed) {
        const currentHeight = window.getComputedStyle(content).height;
        
        content.style.height = currentHeight;
        void content.offsetWidth;
        
        content.classList.toggle('collapsed');
        
        requestAnimationFrame(() => {
            if (isCollapsed) {
                content.style.height = 'auto';
                const expandedHeight = window.getComputedStyle(content).height;
                content.style.height = currentHeight;
                
                requestAnimationFrame(() => {
                    content.style.height = expandedHeight;
                    setTimeout(() => {
                        content.style.height = '';
                    }, CONFIG.UI.ANIMATION_DURATION);
                });
            } else {
                requestAnimationFrame(() => {
                    content.style.height = '0px';
                });
            }
        });
    },
    
    insertIntoContent(container, tocContainer) {
        const firstHeading = container.querySelector('h2, h3');
        if (firstHeading) {
            container.insertBefore(tocContainer, firstHeading);
        } else {
            container.insertBefore(tocContainer, container.firstChild);
        }
    },
    
    addHeadingLinks(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        
        headings.forEach(heading => {
            if (!heading.id) return;
            
            this.makeHeadingClickable(heading);
            this.addLinkIcon(heading);
        });
    },
    
    makeHeadingClickable(heading) {
        heading.style.cursor = 'pointer';
        
        heading.addEventListener('click', (e) => {
            // Only handle clicks directly on the heading, not on child elements
            if (e.target === heading || e.target.tagName === 'CODE') {
                e.preventDefault();
                Navigation.scrollToElement(heading.id, {
                    updateHistory: true,
                    smooth: true
                });
            }
        });
    },
    
    addLinkIcon(heading) {
        const link = document.createElement('a');
        link.className = 'heading-link';
        link.href = `#${heading.id}`;
        link.innerHTML = ' #';
        link.setAttribute('aria-label', 'Anchor link');
        
        heading.appendChild(link);
        
        // No need for click handler - Navigation module handles it via delegation
    }
};

// ===================================================================
// 10. SECTION BREADCRUMB MODULE  
// ===================================================================
const SectionBreadcrumb = {
    init(container) {
        const headings = this.getAllHeadings(container);
        if (headings.length === 0) return;
        
        this.headings = headings;
        this.createBreadcrumb();
        this.setupScrollListener();
    },
    
    getAllHeadings(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        return Array.from(headings).map(h => {
            // Get text without the link icon
            let text = h.textContent.trim();
            const linkIcon = h.querySelector('.heading-link');
            if (linkIcon) {
                text = text.replace(linkIcon.textContent, '').trim();
            }
            
            return {
                element: h,
                text: text,
                level: parseInt(h.tagName.substring(1))
                // We'll calculate position dynamically instead of storing it
            };
        }).filter(h => h.text !== 'Table of Contents'); // Exclude TOC
    },
    
    createBreadcrumb() {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'section-breadcrumb';
        breadcrumb.innerHTML = '<span class="breadcrumb-content"></span>';
        document.body.appendChild(breadcrumb);
        this.breadcrumbElement = breadcrumb;
        this.contentElement = breadcrumb.querySelector('.breadcrumb-content');
        
        // Setup click handlers for breadcrumb links using event delegation
        this.breadcrumbElement.addEventListener('click', (e) => {
            const link = e.target.closest('.breadcrumb-link');
            if (!link) return;
            
            e.preventDefault();
            
            // Handle top link specially
            if (link.classList.contains('breadcrumb-top')) {
                window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
                });
                // Clear the hash from URL when going to top
                history.replaceState(null, null, window.location.pathname);
            } else {
                // Use the unified navigation for other links
                const hash = link.getAttribute('href');
                if (hash && hash !== '#') {
                    const targetId = hash.substring(1);
                    Navigation.scrollToElement(targetId, {
                        updateHistory: true,
                        smooth: true
                    });
                }
            }
        });
    },
    
    setupScrollListener() {
        let ticking = false;
        
        const updateBreadcrumb = () => {
            const scrollPos = window.scrollY + 100; // Offset for better detection
            const activeSection = this.findActiveSection(scrollPos);
            
            if (activeSection) {
                this.updateBreadcrumbContent(activeSection);
                this.breadcrumbElement.classList.add('visible');
                document.body.classList.add('breadcrumb-visible');
            } else {
                this.breadcrumbElement.classList.remove('visible');
                document.body.classList.remove('breadcrumb-visible');
            }
            
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateBreadcrumb);
                ticking = true;
            }
        });
        
        // Initial check
        updateBreadcrumb();
    },
    
    findActiveSection(scrollPos) {
        // Get current positions of all headings using getBoundingClientRect
        const headingsWithPos = this.headings.map(h => ({
            ...h,
            top: h.element.getBoundingClientRect().top + window.scrollY
        }));
        
        // Find all headings that are above the current scroll position
        const passedHeadings = headingsWithPos.filter(h => h.top <= scrollPos);
        if (passedHeadings.length === 0) return null;
        
        // Get the last (most recent) heading we've passed
        const currentHeading = passedHeadings[passedHeadings.length - 1];
        
        // Build the hierarchy based on the current heading
        let h2 = null;
        let h3 = null;
        let h4 = null;
        
        // Find the parent H2
        for (let i = passedHeadings.length - 1; i >= 0; i--) {
            if (passedHeadings[i].level === 2) {
                h2 = passedHeadings[i];
                break;
            }
        }
        
        // If current is H3 or H4, find parent H3
        if (currentHeading.level >= 3 && h2) {
            for (let i = passedHeadings.length - 1; i >= 0; i--) {
                if (passedHeadings[i].level === 3 && passedHeadings[i].top > h2.top) {
                    h3 = passedHeadings[i];
                    break;
                }
            }
        }
        
        // Set the appropriate level based on current heading
        if (currentHeading.level === 2) {
            h2 = currentHeading;
            h3 = null;
            h4 = null;
        } else if (currentHeading.level === 3) {
            h3 = currentHeading;
            h4 = null;
        } else if (currentHeading.level === 4) {
            h4 = currentHeading;
        }
        
        return { h2, h3, h4 };
    },
    
    updateBreadcrumbContent(section) {
        const parts = [];
        
        // Always add link to scroll to top
        parts.push(`<a href="#" class="breadcrumb-link breadcrumb-top">↑</a>`);
        
        if (section.h2) {
            const h2Id = section.h2.element.id;
            parts.push(`<a href="#${h2Id}" class="breadcrumb-link breadcrumb-h2">${section.h2.text}</a>`);
        }
        if (section.h3) {
            const h3Id = section.h3.element.id;
            parts.push(`<a href="#${h3Id}" class="breadcrumb-link breadcrumb-h3">${section.h3.text}</a>`);
        }
        if (section.h4) {
            const h4Id = section.h4.element.id;
            parts.push(`<a href="#${h4Id}" class="breadcrumb-link breadcrumb-h4">${section.h4.text}</a>`);
        }
        
        this.contentElement.innerHTML = parts.join('<span class="breadcrumb-separator"> › </span>');
    }
};

// ===================================================================
// 11. BLOG POST LOADING MODULE
// ===================================================================
const BlogPosts = {
    async loadList() {
        const container = document.getElementById('blog-posts');
        if (!container) return;
        
        const existingPosts = container.querySelectorAll('.blog-post-preview');
        if (existingPosts.length > 0) {
            this.updateViewCounts(container);
            return;
        }
        
        await this.loadDynamically(container);
    },
    
    updateViewCounts(container) {
        const viewElements = container.querySelectorAll('[data-post-id]');
        
        viewElements.forEach(element => {
            const postId = element.getAttribute('data-post-id');
            const cachedCount = ViewCount.getCached(postId);
            element.textContent = ViewCount.format(cachedCount);
        });
        
        viewElements.forEach(element => {
            const postId = element.getAttribute('data-post-id');
            ViewCount.updateElement(element, postId);
        });
    },
    
    async loadDynamically(container) {
        try {
            const response = await fetch('blog/posts.json');
            if (!response.ok) throw new Error('Failed to load blog posts');
            
            const posts = await response.json();
            if (posts.length === 0) {
                container.innerHTML = '<p>No blog posts yet. Check back later!</p>';
                return;
            }
            
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const postsHTML = posts.map(post => this.createPostHTML(post)).join('');
            container.innerHTML = postsHTML;
            
            posts.forEach(post => {
                ViewCount.updateElement(
                    document.querySelector(`[data-post-id="${post.id}"]`),
                    post.id
                );
            });
        } catch (error) {
            console.error('Error loading blog posts:', error);
            container.innerHTML = '<p>Failed to load blog posts. Please try again later.</p>';
        }
    },
    
    createPostHTML(post) {
        return `
            <article class="blog-post-preview">
                <h3><a href="/blog/${post.id}/">${post.title}</a></h3>
                <div class="post-meta">
                    <span class="post-date">${Formatting.formatDate(post.date)}</span>
                    <span class="post-meta-sep">·</span>
                    <span class="post-views" data-post-id="${post.id}">${ViewCount.format(ViewCount.getCached(post.id))}</span>
                </div>
                <p>${post.summary}</p>
                <a href="/blog/${post.id}/" class="read-more">Read more →</a>
            </article>
        `;
    },
    
    addCopyLinkButton() {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement || postMetaElement.querySelector('.copy-link-btn')) return;
        
        const button = this.createCopyButton();
        const separator = document.createElement('span');
        separator.textContent = '·';
        separator.className = 'post-meta-sep';
        
        postMetaElement.appendChild(separator);
        postMetaElement.appendChild(button);
    },
    
    addCopyMarkdownButton(slug) {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement || postMetaElement.querySelector('.copy-markdown-btn')) return;
        
        const separator = document.createElement('span');
        separator.textContent = '·';
        separator.className = 'post-meta-sep';
        
        const button = document.createElement('button');
        button.className = 'copy-markdown-btn';
        button.title = 'Copy as Markdown';
        button.textContent = 'Copy markdown';
        
        button.addEventListener('click', async () => {
            try {
                const response = await fetch(`/blog/${slug}/${slug}.md`);
                if (!response.ok) throw new Error('Failed to fetch markdown');
                
                const markdown = await response.text();
                await navigator.clipboard.writeText(markdown);
                
                this.showCopyFeedback(button, 'Copied!', true);
            } catch (err) {
                console.error('Failed to copy markdown:', err);
                this.showCopyFeedback(button, 'Failed', false);
            }
        });
        
        postMetaElement.appendChild(separator);
        postMetaElement.appendChild(button);
    },
    
    addCitationButton(slug) {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement || postMetaElement.querySelector('.citation-btn')) return;
        
        const separator = document.createElement('span');
        separator.textContent = '·';
        separator.className = 'post-meta-sep';
        
        const button = document.createElement('button');
        button.className = 'citation-btn';
        button.title = 'Generate citation';
        button.textContent = 'Cite';
        
        button.addEventListener('click', () => {
            this.showCitationModal(slug);
        });
        
        postMetaElement.appendChild(separator);
        postMetaElement.appendChild(button);
    },
    
    showCitationModal(slug) {
        // Get post metadata
        const title = document.querySelector('#post-title').textContent.trim();
        const dateElement = document.getElementById('post-date');
        const dateText = dateElement ? dateElement.textContent : '';
        const url = Navigation.getCanonicalUrl();
        
        // Parse date
        const dateParts = dateText.replace(/\u00A0/g, ' ').split(' ');
        const day = dateParts[0];
        const month = dateParts[1];
        const year = dateParts[2];
        
        // Generate BibTeX citation
        const bibtex = this.generateBibTeXCitation(title, year, month, day, url, slug);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'citation-modal';
        modal.innerHTML = `
            <div class="citation-modal-content">
                <div class="citation-modal-header">
                    <h3>BibLaTeX</h3>
                    <div class="citation-modal-actions">
                        <button class="citation-copy-btn">Copy</button>
                        <button class="citation-modal-close" aria-label="Close">✕</button>
                    </div>
                </div>
                <div class="citation-modal-body">
                    <pre>${bibtex}</pre>
                </div>
            </div>
        `;
        
        ModalManager.open(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.citation-modal-close');
        closeBtn.addEventListener('click', () => {
            ModalManager.close(modal);
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                ModalManager.close(modal);
            }
        });
        
        // Copy button
        const copyBtn = modal.querySelector('.citation-copy-btn');
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(bibtex);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy citation:', err);
            }
        });
        
        // ESC handled globally by KeyboardShortcuts via ModalManager
    },
    
    generateBibTeXCitation(title, year, month, day, url, slug) {
        const author = 'Sedov, Daniil';
        
        // Convert month to number for ISO date
        const monthNum = {
            'January': '01', 'February': '02', 'March': '03',
            'April': '04', 'May': '05', 'June': '06',
            'July': '07', 'August': '08', 'September': '09',
            'October': '10', 'November': '11', 'December': '12'
        }[month] || '01';
        
        // Format dates
        const publicationDate = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        const today = new Date();
        const accessDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Generate unique citation key
        const citationKey = `sedov${year}${slug.replace(/-/g, '')}`;
        
        // Use biblatex @online format (modern standard for web sources)
        const bibtex = `@online{${citationKey},
  author  = {${author}},
  title   = {${title}},
  date    = {${publicationDate}},
  url     = {${url}},
  urldate = {${accessDate}},
  note    = {Blog post}
}`;
        
        return bibtex;
    },
    
    createCopyButton() {
        const button = document.createElement('button');
        button.className = 'copy-link-btn';
        button.title = 'Copy link to this post';
        button.textContent = 'Copy link';
        
        button.addEventListener('click', async () => {
            try {
                const canonicalUrl = Navigation.getCanonicalUrl();
                await navigator.clipboard.writeText(canonicalUrl);
                
                this.showCopyFeedback(button, 'Copied!', true);
            } catch (err) {
                console.error('Failed to copy link:', err);
                this.showCopyFeedback(button, 'Failed', false);
            }
        });
        
        return button;
    },
    
    showCopyFeedback(button, message, success) {
        const originalText = button.textContent;
        button.textContent = message;
        
        if (success) {
            const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-500').trim();
            button.style.color = accentColor;
        }
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.color = '';
        }, CONFIG.UI.COPY_FEEDBACK_DURATION);
    },
    
    async processPostPage(slug) {
        document.documentElement.classList.add('blog-post-page');
        document.body.classList.add('blog-post-page');
        
        this.showCachedViewCount(slug);
        this.updateViewCount(slug);
        this.addCopyLinkButton();
        this.addCopyMarkdownButton(slug);
        this.addCitationButton(slug);
        
        const container = document.getElementById('blog-post-content');
        if (container) {
            await this.enhanceContent(container, slug);
        }
    },
    
    showCachedViewCount(slug) {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement) return;
        
        const dateElement = document.getElementById('post-date');
        if (!dateElement || postMetaElement.querySelector('.post-author')) return;
        
        const cachedViewCount = ViewCount.getCached(slug);
        const nbsp = '\u00A0';
        const dateText = dateElement.textContent;
        
        // Clear and rebuild the post-meta div properly
        postMetaElement.innerHTML = '';
        
        // Add date
        const dateSpan = document.createElement('span');
        dateSpan.id = 'post-date';
        dateSpan.className = 'post-date-text';
        dateSpan.textContent = dateText;
        postMetaElement.appendChild(dateSpan);
        
        // Add separator
        const sep1 = document.createElement('span');
        sep1.className = 'post-meta-sep';
        sep1.textContent = '·';
        postMetaElement.appendChild(sep1);
        
        // Add author
        const authorSpan = document.createElement('span');
        authorSpan.className = 'post-author';
        authorSpan.textContent = `by${nbsp}Daniil${nbsp}Sedov`;
        postMetaElement.appendChild(authorSpan);
        
        // Add separator
        const sep2 = document.createElement('span');
        sep2.className = 'post-meta-sep';
        sep2.textContent = '·';
        postMetaElement.appendChild(sep2);
        
        // Add view count
        const viewSpan = document.createElement('span');
        viewSpan.className = 'post-views-text';
        viewSpan.id = 'post-view-count';
        viewSpan.textContent = ViewCount.format(cachedViewCount);
        postMetaElement.appendChild(viewSpan);
    },
    
    async updateViewCount(slug) {
        const viewCount = await ViewCount.fetch(slug);
        const viewElement = document.getElementById('post-view-count');
        if (viewElement && viewElement.textContent !== ViewCount.format(viewCount)) {
            viewElement.textContent = ViewCount.format(viewCount);
        }
    },
    
    async enhanceContent(container, slug) {
        TableOfContents.generate(container);
        SectionBreadcrumb.init(container);
        await CodeBlocks.processAll(container, slug);
        CodeBlocks.processInline(container);
        // Update theme-aware images and apply lazy/async attributes
        Images.processThemeAware(container);
        Navigation.setupHashLinkHandlers(container);
        Navigation.handleInitialHash();
    }
};

// ===================================================================
// 12. IMAGE PROCESSING MODULE
// ===================================================================
const Images = {
    processThemeAware(container) {
        const themeImages = container.querySelectorAll('.theme-image[data-base-src]');
        const isDarkMode = DarkMode.isDark();
        
        themeImages.forEach(img => {
            const baseSrc = img.getAttribute('data-base-src');
            const themedSrc = this.getThemedSource(baseSrc, isDarkMode);
            
            // Always update src for theme-aware images
            img.src = themedSrc;
        });
        
        // Apply sensible defaults for all images in scope
        this.applyImageAttributes(container);
    },
    
    getThemedSource(baseSrc, isDarkMode) {
        const suffix = isDarkMode ? '_dark' : '_light';
        const ext = baseSrc.split('.').pop();
        return baseSrc.replace(`.${ext}`, `${suffix}.${ext}`);
    },
    
    applyImageAttributes(container) {
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
    }
};

// ===================================================================
// 14. MODAL MANAGER
// ===================================================================
const ModalManager = {
    baseZ: 1000,
    stack: [],
    open(modalEl) {
        // Assign stacking z-index per modal overlay
        const z = this.baseZ + this.stack.length * 10;
        modalEl.style.zIndex = String(z);
        this.stack.push(modalEl);
        document.body.appendChild(modalEl);
        document.body.classList.add('modal-open');
    },
    close(modalEl) {
        const idx = this.stack.indexOf(modalEl);
        if (idx !== -1) this.stack.splice(idx, 1);
        if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        if (this.stack.length === 0) document.body.classList.remove('modal-open');
    },
    closeTop() {
        const top = this.stack[this.stack.length - 1];
        if (top) this.close(top);
    },
    closeAll() {
        while (this.stack.length) {
            this.close(this.stack[this.stack.length - 1]);
        }
    },
    hasOpen() {
        return this.stack.length > 0;
    }
};

// ===================================================================
// 15. KEYBOARD SHORTCUTS MODULE
// ===================================================================
const KeyboardShortcuts = {
    init() {
        this.setupShortcuts();
        this.createHelpModal();
    },
    
    setupShortcuts() {
        let lastGPress = 0;
        
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input/textarea
            if (e.target.matches('input, textarea, select')) return;
            
            // Handle ESC to close the topmost modal
            if (e.key === 'Escape' && ModalManager.hasOpen()) {
                e.preventDefault();
                ModalManager.closeTop();
                return;
            }
            
            // Ignore if modifier keys are pressed (except shift for ? and G)
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            
            const key = e.key;
            
            switch(key) {
                case 'j':
                    // Vim: scroll down
                    e.preventDefault();
                    window.scrollBy({ top: 100, behavior: 'smooth' });
                    break;
                    
                case 'k':
                    // Vim: scroll up
                    e.preventDefault();
                    window.scrollBy({ top: -100, behavior: 'smooth' });
                    break;
                    
                case 'g':
                    // Vim: gg to go to top
                    const now = Date.now();
                    if (now - lastGPress < 500) {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        lastGPress = 0;
                    } else {
                        lastGPress = now;
                    }
                    break;
                    
                case 'G':
                    // Vim: G to go to bottom
                    e.preventDefault();
                    window.scrollTo({ 
                        top: document.documentElement.scrollHeight, 
                        behavior: 'smooth' 
                    });
                    break;
                    
                case 'd':
                    // Vim: half page down
                    e.preventDefault();
                    window.scrollBy({ 
                        top: window.innerHeight / 2, 
                        behavior: 'smooth' 
                    });
                    break;
                    
                case 'u':
                    // Vim: half page up
                    e.preventDefault();
                    window.scrollBy({ 
                        top: -window.innerHeight / 2, 
                        behavior: 'smooth' 
                    });
                    break;
                    
                case 'h':
                    // Home (not vim, but useful)
                    e.preventDefault();
                    if (window.location.pathname !== '/') {
                        window.location.href = '/';
                    }
                    break;
                    
                case 't':
                    // Toggle theme
                    e.preventDefault();
                    const button = document.getElementById('dark-mode-toggle');
                    if (button) button.click();
                    break;
                    
                case 'c':
                    // Cite (on blog posts)
                    if (document.body.classList.contains('blog-post-page')) {
                        e.preventDefault();
                        const citeBtn = document.querySelector('.citation-btn');
                        if (citeBtn) citeBtn.click();
                    }
                    break;
                    
                case '?':
                    // Show help
                    e.preventDefault();
                    this.showHelpModal();
                    break;
            }
        });
    },
    
    createHelpModal() {
        // Create help modal HTML
        this.helpModalHTML = `
            <div class="keyboard-help-modal">
                <div class="keyboard-help-content">
                    <div class="keyboard-help-header">
                        <h3>Keyboard Shortcuts</h3>
                        <button class="keyboard-help-close">✕</button>
                    </div>
                    <div class="keyboard-help-body">
                        <div class="keyboard-help-section">
                            <h4>Vim Navigation</h4>
                            <div class="keyboard-shortcut">
                                <kbd>j</kbd> <span>Scroll down</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>k</kbd> <span>Scroll up</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>d</kbd> <span>Half page down</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>u</kbd> <span>Half page up</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>g</kbd> <kbd>g</kbd> <span>Go to top</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>G</kbd> <span>Go to bottom</span>
                            </div>
                        </div>
                        <div class="keyboard-help-section">
                            <h4>Actions</h4>
                            <div class="keyboard-shortcut">
                                <kbd>h</kbd> <span>Go home</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>t</kbd> <span>Toggle theme</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>c</kbd> <span>Cite (in blog post)</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>?</kbd> <span>Show this help</span>
                            </div>
                            <div class="keyboard-shortcut">
                                <kbd>ESC</kbd> <span>Close modals</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    showHelpModal() {
        // Create and show new modal without closing others
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = this.helpModalHTML;
        const modal = modalDiv.firstElementChild;
        ModalManager.open(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.keyboard-help-close');
        closeBtn.addEventListener('click', () => {
            ModalManager.close(modal);
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                ModalManager.close(modal);
            }
        });
    },
    
    closeModals() {
        // Close all modals via manager (kept for compatibility)
        ModalManager.closeAll();
    }
};

// ===================================================================
// 15. MAIN INITIALIZATION
// ===================================================================
function initDarkMode() {
    DarkMode.init();
}

async function reprocessCodeBlocks() {
    await CodeBlocks.reprocessAll();
}

function processThemeAwareImages(container) {
    Images.processThemeAware(container);
}

function applyHeadingLinks(container) {
    TableOfContents.addHeadingLinks(container);
}

async function loadBlogPostsList() {
    await BlogPosts.loadList();
}

function handleSectionScrolling() {
    Navigation.handleBackNavigation();
}

function handleBlogPostHashNavigation() {
    Navigation.handleInitialHash();
}

function getViewsCount(postId) {
    return ViewCount.getCached(postId);
}

function formatViewsCount(count) {
    return ViewCount.format(count);
}

async function fetchViewCount(postId) {
    return await ViewCount.fetch(postId);
}

function addCopyLinkButton() {
    BlogPosts.addCopyLinkButton();
}

function generateTableOfContents(container) {
    TableOfContents.generate(container);
}

async function processCodeBlocks(container, postId) {
    await CodeBlocks.processAll(container, postId);
}

function processInlineCodeBlocks(container) {
    CodeBlocks.processInline(container);
}

// Main entry point
document.addEventListener('DOMContentLoaded', async () => {
    DarkMode.init();
    KeyboardShortcuts.init();
    
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
});
