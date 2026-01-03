import { CONFIG, Formatting, State } from './core.js';
import { DarkMode } from './theme.js';

export const SyntaxHighlighting = {
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
            }
            return await this.highlightGeneric(codeText, language, theme);
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

export const CodeBlocks = {
    countLines(text) {
        const normalized = (text || '').replace(/\n$/, '');
        if (!normalized) return 1;
        return normalized.split('\n').length;
    },

    normalizeCopiedText(text) {
        // Keep indentation and internal whitespace intact, but avoid an extra
        // trailing newline introduced by markdown/code fences.
        return (text || '').replace(/\n$/, '');
    },

    needsToggleForText(text) {
        return this.countLines(text) > CONFIG.UI.CODE_BLOCK_COLLAPSE_LINES;
    },

    async processAll(container, postId) {
        const codeBlocks = Array.from(container.querySelectorAll('pre > code'));
        if (codeBlocks.length === 0) return;

        // Build the UI first (copy/expand) so layout is consistent even if
        // syntax highlighting is slow/unavailable.
        const blocks = [];

        for (const codeElement of codeBlocks) {
            if (codeElement.closest('.prompt-container')) continue;

            const preElement = codeElement.parentNode;
            const codeText = codeElement.textContent || '';

            const { language, displayLanguage } = this.detectLanguage(codeElement);
            const languageId = language || 'text';
            const needsToggle = this.needsToggleForText(codeText);

            const block = this.transformBlock(
                preElement,
                codeText,
                languageId,
                displayLanguage || 'Text',
                needsToggle
            );
            if (block) blocks.push(block);
        }

        const shikiAvailable = postId !== 'measuring-llm-entropy' && await SyntaxHighlighting.load();
        if (!shikiAvailable) return;

        for (const block of blocks) {
            if (!block.language || block.language === 'text') continue;

            const highlightedHTML = await SyntaxHighlighting.highlight(block.codeText, block.language);
            if (highlightedHTML) {
                block.content.innerHTML = highlightedHTML;
            }
        }
    },

    detectLanguage(codeElement) {
        const langClass = codeElement.className.match(/language-(\w+)/);
        if (!langClass || !langClass[1]) {
            return { language: null, displayLanguage: 'Text' };
        }

        const language = langClass[1];
        const displayOverrides = {
            ts: 'TypeScript',
            tsx: 'TypeScript',
            js: 'JavaScript',
            jsx: 'JavaScript',
            py: 'Python',
            python: 'Python',
            python3: 'Python',
            func: 'FunC',
            fift: 'Fift',
            tact: 'Tact',
            tolk: 'Tolk',
            sh: 'Shell',
            bash: 'Bash',
            zsh: 'Zsh',
            json: 'JSON',
            yaml: 'YAML',
            yml: 'YAML',
            toml: 'TOML',
            md: 'Markdown',
            markdown: 'Markdown',
            html: 'HTML',
            css: 'CSS',
            scss: 'SCSS',
            sql: 'SQL',
            go: 'Go',
            rust: 'Rust',
            rs: 'Rust',
            c: 'C',
            cpp: 'C++',
            hpp: 'C++',
            cs: 'C#',
            java: 'Java',
            kotlin: 'Kotlin',
            swift: 'Swift',
            zig: 'Zig',
            lua: 'Lua'
        };

        const displayLanguage = displayOverrides[language] ||
            (language.charAt(0).toUpperCase() + language.slice(1));

        return { language, displayLanguage };
    },

    transformBlock(preElement, codeText, language, displayLanguage, needsToggle) {
        const container = this.createContainer(displayLanguage, needsToggle);
        container.dataset.language = (language || 'text').toLowerCase();
        container.dataset.lineCount = String(this.countLines(codeText));
        container.dataset.needsToggle = needsToggle ? 'true' : 'false';

        const content = this.createContent(preElement, needsToggle);

        container.appendChild(container.querySelector('.prompt-header'));
        container.appendChild(content);

        preElement.parentNode.replaceChild(container, preElement);

        this.addCopyFunctionality(container, codeText);
        if (needsToggle) this.addToggleFunctionality(container, content);

        return { container, content, codeText, language: container.dataset.language, needsToggle };
    },

    createContainer(displayLanguage, needsToggle) {
        const container = document.createElement('div');
        container.className = 'prompt-container';

        const header = document.createElement('div');
        header.className = 'prompt-header';

        const showToggle = Boolean(needsToggle);
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

    createContent(preElement, needsToggle) {
        const content = document.createElement('div');
        content.className = 'prompt-content';

        content.appendChild(preElement.cloneNode(true));

        // Default to fully expanded for shorter blocks.
        if (!needsToggle) {
            content.classList.add('expanded');
        }

        return content;
    },

    addCopyFunctionality(container, codeText) {
        const copyButton = container.querySelector('.prompt-copy');
        if (!copyButton) return;

        const textToCopy = this.normalizeCopiedText(codeText);
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();

            try {
                await navigator.clipboard.writeText(textToCopy);
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

        if (!toggleButton || !header) return;

        header.style.cursor = 'pointer';

        const toggle = (e) => {
            if (e) e.stopPropagation();

            const isExpanded = content.classList.contains('expanded');
            this.animateToggle(content, isExpanded);
            toggleButton.textContent = isExpanded ? 'Expand' : 'Collapse';
        };

        toggleButton.addEventListener('click', toggle);
        header.addEventListener('click', toggle);
    },

    // Smoothly animates between fixed collapsed height and fully expanded height.
    // Uses scrollHeight for the expanded target to avoid mobile layout quirks.
    animateToggle(content, isExpanded) {
        if (!content) return;

        // Cancel any in-flight animation cleanup to avoid getting stuck with
        // an inline height when the user toggles quickly (more common on mobile).
        if (content._toggleTimer) {
            clearTimeout(content._toggleTimer);
            content._toggleTimer = null;
        }

        const startHeight = content.getBoundingClientRect().height;
        content.style.height = `${startHeight}px`;
        content.style.overflow = 'hidden';
        void content.offsetWidth;

        if (isExpanded) {
            content.classList.remove('expanded');
            requestAnimationFrame(() => {
                content.style.height = `${CONFIG.UI.CODE_BLOCK_HEIGHT}px`;
            });
        } else {
            content.classList.add('expanded');
            requestAnimationFrame(() => {
                const endHeight = content.scrollHeight;
                content.style.height = `${endHeight}px`;
            });
        }

        content._toggleTimer = setTimeout(() => {
            content.style.height = '';
            content.style.overflow = '';
            content._toggleTimer = null;
        }, CONFIG.UI.ANIMATION_DURATION);
    },

    async reprocessAll() {
        const containers = document.querySelectorAll('.prompt-container[data-language]');
        if (containers.length === 0) return;

        const shikiAvailable = await SyntaxHighlighting.load();
        if (!shikiAvailable) return;

        for (const container of containers) {
            const content = container.querySelector('.prompt-content');

            if (!content) continue;

            const language = (container.dataset.language || 'text').toLowerCase();
            if (!language || language === 'text') continue;

            const codeElement = content.querySelector('pre code');
            if (!codeElement) continue;

            const codeText = codeElement.textContent || '';
            const highlightedHTML = await SyntaxHighlighting.highlight(codeText, language);
            if (highlightedHTML) content.innerHTML = highlightedHTML;
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

