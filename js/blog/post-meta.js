import { CONFIG } from '../core.js';
import { ModalManager } from '../modals.js';
import { Navigation } from '../navigation.js';
import { ViewCount } from '../viewcount.js';

export const PostMeta = {
    init(postSlug) {
        this.hydratePostViewCount(postSlug);
        this.addCopyLinkButton();
        this.addCopyMarkdownButton(postSlug);
        this.addCitationButton(postSlug);
    },

    hydratePostViewCount(postSlug) {
        const viewElement = document.getElementById('post-view-count');
        if (!viewElement) return;

        const cachedViewCount = ViewCount.getCached(postSlug);
        viewElement.textContent = ViewCount.format(cachedViewCount);
        ViewCount.updateElement(viewElement, postSlug);
    },

    addCopyLinkButton() {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement) return;

        this.appendMetaButton(postMetaElement, {
            className: 'copy-link-btn',
            title: 'Copy link to this post',
            label: 'Copy link',
            onClick: async (button) => {
                try {
                    const canonicalUrl = Navigation.getCanonicalUrl();
                    await navigator.clipboard.writeText(canonicalUrl);
                    this.showCopyFeedback(button, 'Copied!', true);
                } catch (err) {
                    console.error('Failed to copy link:', err);
                    this.showCopyFeedback(button, 'Failed', false);
                }
            }
        });
    },

    addCopyMarkdownButton(postSlug) {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement) return;

        this.appendMetaButton(postMetaElement, {
            className: 'copy-markdown-btn',
            title: 'Copy as Markdown',
            label: 'Copy markdown',
            onClick: async (button) => {
                try {
                    const response = await fetch(`/blog/${postSlug}.md`);
                    if (!response.ok) throw new Error('Failed to fetch markdown');

                    const markdown = await response.text();
                    await navigator.clipboard.writeText(markdown);

                    this.showCopyFeedback(button, 'Copied!', true);
                } catch (err) {
                    console.error('Failed to copy markdown:', err);
                    this.showCopyFeedback(button, 'Failed', false);
                }
            }
        });
    },

    addCitationButton(postSlug) {
        const postMetaElement = document.querySelector('.post-meta');
        if (!postMetaElement) return;

        this.appendMetaButton(postMetaElement, {
            className: 'citation-btn',
            title: 'Generate citation',
            label: 'Cite',
            onClick: () => {
                this.showCitationModal(postSlug);
            }
        });
    },

    appendMetaButton(postMetaElement, { className, title, label, onClick }) {
        if (
            !postMetaElement ||
            postMetaElement.querySelector(`.${className}`)
        ) {
            return null;
        }

        const separator = document.createElement('span');
        separator.textContent = '·';
        separator.className = 'post-meta-sep';

        const button = document.createElement('button');
        button.className = className;
        button.title = title;
        button.textContent = label;

        button.addEventListener('click', () => {
            onClick(button);
        });

        postMetaElement.appendChild(separator);
        postMetaElement.appendChild(button);

        return button;
    },

    showCitationModal(postSlug) {
        const titleElement = document.getElementById('post-title');
        const dateElement = document.getElementById('post-date');
        if (!titleElement || !dateElement) return;

        const title = titleElement.textContent.trim();
        const dateText = dateElement.textContent || '';
        const url = Navigation.getCanonicalUrl();

        const dateParts = dateText.replace(/\u00A0/g, ' ').trim().split(/\s+/);
        if (dateParts.length < 3) return;

        const [day, month, year] = dateParts;

        const biblatexEntry = this.generateBibLaTeXEntry(
            title,
            year,
            month,
            day,
            url,
            postSlug
        );

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
                    <pre>${biblatexEntry}</pre>
                </div>
            </div>
        `;

        ModalManager.open(modal);

        ModalManager.wireDismiss(modal, { closeSelectors: '.citation-modal-close' });

        // Copy button
        const copyBtn = modal.querySelector('.citation-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(biblatexEntry);
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, CONFIG.UI.COPY_FEEDBACK_DURATION);
                } catch (err) {
                    console.error('Failed to copy citation:', err);
                }
            });
        }

        // ESC handled globally by KeyboardShortcuts via ModalManager
    },

    generateBibLaTeXEntry(title, year, month, day, url, slug) {
        const author = 'Sedov, Daniil';

        // Convert month to number for ISO date
        const monthNum = {
            January: '01',
            February: '02',
            March: '03',
            April: '04',
            May: '05',
            June: '06',
            July: '07',
            August: '08',
            September: '09',
            October: '10',
            November: '11',
            December: '12'
        }[month] || '01';

        // Format dates
        const publicationDate = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        const today = new Date();
        const accessDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

    showCopyFeedback(button, message, success) {
        const originalText = button.textContent;
        button.textContent = message;

        if (success) {
            const accentColor = getComputedStyle(document.body)
                .getPropertyValue('--accent-500')
                .trim();
            button.style.color = accentColor;
        }

        setTimeout(() => {
            button.textContent = originalText;
            button.style.color = '';
        }, CONFIG.UI.COPY_FEEDBACK_DURATION);
    }
};
