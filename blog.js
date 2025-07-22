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
// 10. Blog Post Loading Module
// 11. Image Processing Module
// 12. Main Initialization
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
    
    handleHashNavigation() {
        if (window.location.hash) {
            const targetId = window.location.hash.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                targetElement.scrollIntoView({
                    behavior: respectsReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        }
    },
    
    handleSectionScrolling() {
        let targetSection = sessionStorage.getItem('scrollToSection');
        const urlHash = window.location.hash.substring(1);
        
        if (urlHash) {
            targetSection = urlHash;
        }
        
        if (targetSection) {
            sessionStorage.removeItem('scrollToSection');
            const sectionElement = document.getElementById(targetSection);
            if (sectionElement) {
                sectionElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    },
    
    addSmoothScrolling(container) {
        const hashLinks = container.querySelectorAll('a[href^="#"]');
        hashLinks.forEach(link => {
            if (!link.classList.contains('heading-link')) {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        e.preventDefault();
                        const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        targetElement.scrollIntoView({
                            behavior: respectsReducedMotion ? 'auto' : 'smooth',
                            block: 'start'
                        });
                        history.pushState(null, null, `#${targetId}`);
                    }
                });
            }
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
        const flashColor = getComputedStyle(document.body).getPropertyValue('--success-500').trim();
        const textColor = getComputedStyle(document.body).getPropertyValue('--success-text').trim();
        
        codeElement.style.setProperty('background-color', flashColor, 'important');
        codeElement.style.setProperty('color', textColor, 'important');
    },
    
    resetInlineStyle(codeElement) {
        codeElement.style.backgroundColor = '';
        codeElement.style.color = '';
        codeElement.style.border = '';
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
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById(item.id);
            if (targetElement) {
                const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                targetElement.scrollIntoView({
                    behavior: respectsReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
                history.pushState(null, null, `#${item.id}`);
            }
        });
        
        listItem.appendChild(link);
        return listItem;
    },
    
    addToggleFunctionality(container, header, content) {
        const toggle = container.querySelector('.toc-toggle');
        
        const toggleToc = (e) => {
            if (e) e.stopPropagation();
            
            const isCollapsed = content.classList.contains('collapsed');
            this.animateToggle(content, isCollapsed);
            toggle.textContent = isCollapsed ? 'Collapse' : 'Expand';
        };
        
        toggle.addEventListener('click', toggleToc);
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
        
        Navigation.addSmoothScrolling(container);
    },
    
    makeHeadingClickable(heading) {
        heading.style.cursor = 'pointer';
        
        heading.addEventListener('click', (e) => {
            if (e.target === heading) {
                const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                document.getElementById(heading.id).scrollIntoView({
                    behavior: respectsReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
                history.pushState(null, null, `#${heading.id}`);
            }
        });
    },
    
    addLinkIcon(heading) {
        const link = document.createElement('a');
        link.className = 'heading-link';
        link.href = `#${heading.id}`;
        link.innerHTML = ' 🔗';
        link.style.opacity = '0';
        link.style.fontSize = '0.85em';
        link.style.textDecoration = 'none';
        link.style.transition = 'opacity 0.2s';
        
        heading.appendChild(link);
        
        heading.addEventListener('mouseenter', () => {
            link.style.opacity = '0.6';
        });
        
        heading.addEventListener('mouseleave', () => {
            link.style.opacity = '0';
        });
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            document.getElementById(heading.id).scrollIntoView({
                behavior: respectsReducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });
            history.pushState(null, null, `#${heading.id}`);
        });
    }
};

// ===================================================================
// 10. BLOG POST LOADING MODULE
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
        separator.textContent = ' · ';
        separator.className = 'post-meta-separator';
        
        postMetaElement.appendChild(separator);
        postMetaElement.appendChild(button);
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
        
        const container = document.getElementById('blog-post-content');
        if (container) {
            await this.enhanceContent(container, slug);
        }
    },
    
    showCachedViewCount(slug) {
        const dateElement = document.getElementById('post-date');
        if (!dateElement || dateElement.textContent.includes('views')) return;
        
        const cachedViewCount = ViewCount.getCached(slug);
        const nbsp = '\u00A0';
        const currentText = dateElement.textContent;
        
        if (currentText.includes('by')) {
            const parts = currentText.split(' · ');
            const dateText = parts[0];
            const authorText = parts[1] || `by${nbsp}Daniil${nbsp}Sedov`;
            
            dateElement.innerHTML = this.createPostMetaHTML(dateText, authorText, cachedViewCount);
        } else {
            dateElement.innerHTML = this.createPostMetaHTML(currentText, `by${nbsp}Daniil${nbsp}Sedov`, cachedViewCount);
        }
    },
    
    createPostMetaHTML(dateText, authorText, viewCount) {
        return `<span class="post-date-text">${dateText}</span> <span class="post-meta-sep">·</span> <span class="post-author">${authorText}</span> <span class="post-meta-sep">·</span> <span class="post-views-text" id="post-view-count">${ViewCount.format(viewCount)}</span>`;
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
        await CodeBlocks.processAll(container, slug);
        CodeBlocks.processInline(container);
        Images.processThemeAware(container);
        Navigation.handleHashNavigation();
    }
};

// ===================================================================
// 11. IMAGE PROCESSING MODULE
// ===================================================================
const Images = {
    processThemeAware(container) {
        const themeImages = container.querySelectorAll('.theme-image[data-base-src]');
        const isDarkMode = DarkMode.isDark();
        
        themeImages.forEach(img => {
            const baseSrc = img.getAttribute('data-base-src');
            const themedSrc = this.getThemedSource(baseSrc, isDarkMode);
            
            if (img.src && img.complete) {
                img.src = themedSrc;
                return;
            }
            
            this.lazyLoad(img, baseSrc);
        });
    },
    
    getThemedSource(baseSrc, isDarkMode) {
        const suffix = isDarkMode ? '_dark' : '_light';
        const ext = baseSrc.split('.').pop();
        return baseSrc.replace(`.${ext}`, `${suffix}.${ext}`);
    },
    
    lazyLoad(img, baseSrc) {
        if (!img.src || img.src === '' || img.src === window.location.href) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const isDark = DarkMode.isDark();
                        entry.target.src = this.getThemedSource(baseSrc, isDark);
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '50px' });
            
            observer.observe(img);
        }
    }
};

// ===================================================================
// 12. MAIN INITIALIZATION
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
    Navigation.handleSectionScrolling();
}

function handleBlogPostHashNavigation() {
    Navigation.handleHashNavigation();
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
    Navigation.handleSectionScrolling();
});