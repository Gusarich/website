export const THEME_CHANGE_EVENT = 'theme-change';

export const DarkMode = {
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
        // Keep <html> and <body> in sync:
        // - The inline flash-prevention scripts set theme on <html>
        // - Most CSS uses body.dark-mode selectors
        const htmlIsDark = document.documentElement.classList.contains('dark-mode');
        const bodyIsDark = document.body.classList.contains('dark-mode');

        if (htmlIsDark && !bodyIsDark) document.body.classList.add('dark-mode');
        if (!htmlIsDark && bodyIsDark) document.documentElement.classList.add('dark-mode');
    },

    updateButtonIcon(button) {
        const isDark = this.isDark();
        button.textContent = isDark ? '☀️' : '🌙';
    },

    toggle(button) {
        const isDark = !this.isDark();

        document.documentElement.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('dark-mode', isDark);

        this.updateButtonIcon(button);

        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch {
            // Ignore localStorage errors (e.g. private mode restrictions)
        }

        document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { isDark } }));
    },

    isDark() {
        return (
            document.documentElement.classList.contains('dark-mode') ||
            document.body.classList.contains('dark-mode')
        );
    }
};

