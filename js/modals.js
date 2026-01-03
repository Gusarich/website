export const ModalManager = {
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

export const KeyboardShortcuts = {
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

            switch (key) {
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
    }
};

