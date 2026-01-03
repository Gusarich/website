import { CONFIG, Formatting, Links } from './core.js';
import { CodeBlocks } from './code.js';
import { Images, SectionBreadcrumb, Tables, TableOfContents } from './content.js';
import { ModalManager } from './modals.js';
import { Navigation } from './navigation.js';
import { ViewCount } from './viewcount.js';

export const BlogPosts = {
    async loadList() {
        const allPostsContainer = document.getElementById('all-posts');
        const combinedContainer = document.getElementById('blog-posts');

        // Dedicated blog page with unified list
        if (allPostsContainer) {
            await this.loadAllPosts(allPostsContainer);
            return;
        }

        // Homepage combined list (featured selection)
        if (combinedContainer) {
            await this.loadFeatured(combinedContainer);
        }
    },

    async loadAllPosts(container) {
        try {
            const response = await fetch('/blog/posts.json');
            if (!response.ok) throw new Error('Failed to load blog posts');

            const posts = await response.json();
            if (!Array.isArray(posts) || posts.length === 0) {
                container.innerHTML = '<p>No posts yet.</p>';
                return;
            }

            // Sort newest first
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));

            container.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
            posts.forEach(post => {
                ViewCount.updateElement(
                    document.querySelector(`[data-post-id="${post.id}"]`),
                    post.id
                );
            });
        } catch (error) {
            console.error('Error loading posts:', error);
            container.innerHTML = '<p>Failed to load posts.</p>';
        }
    },

    async loadFeatured(container) {
        try {
            const response = await fetch('/blog/posts.json');
            if (!response.ok) throw new Error('Failed to load blog posts');

            const posts = await response.json();
            const featuredIds = [
                'ton-vanity',
                'ai-in-2026',
                'billions-of-tokens-later',
                'fuzzing-with-llms'
            ];

            const featured = posts
                .filter(post => featuredIds.includes(post.id))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            container.innerHTML = featured.map(p => this.createPostHTML(p)).join('');

            featured.forEach(post => {
                ViewCount.updateElement(
                    document.querySelector(`[data-post-id="${post.id}"]`),
                    post.id
                );
            });
        } catch (error) {
            console.error('Error loading featured posts:', error);
            container.innerHTML = '<p>Failed to load posts. Please try again later.</p>';
        }
    },

    getTypeEmoji(type) {
        if (type === 'essay') return '✍️';
        if (type === 'project') return '🛠️';
        return '🔬';
    },

    createPostHTML(post) {
        const type = (post.type || 'research');
        const emoji = this.getTypeEmoji(type);
        const typeLabel =
            type === 'essay' ? 'Essay' : type === 'project' ? 'Project' : 'Research';
        return `
            <article class="blog-post-preview">
                <h3><span class="post-type-emoji" title="${typeLabel}">${emoji}</span><a href="/blog/${post.id}/">${post.title}</a></h3>
                <div class="post-meta">
                    <span class="post-date">${Formatting.formatDate(post.date)}</span>
                    <span class="post-meta-sep">·</span>
                    <span class="post-views" data-post-id="${post.id}">${ViewCount.format(ViewCount.getCached(post.id))}</span>
                </div>
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
        return `@online{${citationKey},
  author  = {${author}},
  title   = {${title}},
  date    = {${publicationDate}},
  url     = {${url}},
  urldate = {${accessDate}},
  note    = {Blog post}
}`;
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
        void this.updateViewCount(slug);
        this.addCopyLinkButton();
        this.addCopyMarkdownButton(slug);
        this.addCitationButton(slug);

        const container = document.getElementById('blog-post-content');
        if (container) {
            await this.enhanceContent(container, slug);
        }

        // Hide bottom back-link if page doesn't need scrolling
        this.maybeToggleBottomBackLink();
        setTimeout(() => this.maybeToggleBottomBackLink(), 0);
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.maybeToggleBottomBackLink(), 150);
        });
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
        Tables.enhance(container);
        // Update theme-aware images and apply lazy/async attributes
        Images.processThemeAware(container);
        Links.ensurePointerForLinkOnlyListItems(container);
        Navigation.handleInitialHash();
    },

    maybeToggleBottomBackLink() {
        const article = document.querySelector('article.blog-post');
        if (!article) return;

        const needsScroll = document.documentElement.scrollHeight > window.innerHeight + 4;
        const bottomBack = document.getElementById('bottom-back-link');

        if (needsScroll) {
            if (!bottomBack) {
                const container = document.getElementById('blog-post-content');
                if (!container || !container.parentNode) return;
                const wrapper = document.createElement('div');
                wrapper.className = 'blog-post-content';
                const link = document.createElement('a');
                link.id = 'bottom-back-link';
                link.href = '/blog/';
                link.className = 'back-link';
                link.textContent = '← Back to all posts';
                wrapper.appendChild(link);
                container.parentNode.insertBefore(wrapper, container.nextSibling);
            }
            return;
        }

        if (bottomBack && bottomBack.parentNode) {
            bottomBack.parentNode.remove();
        }
    }
};
