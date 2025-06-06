// Main DOM content loaded event handler
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const legacyPostId = urlParams.get('post');

    if (legacyPostId) {
        /* keep 302-style redirect for old backlinks and preserve #anchor */
        const anchor = window.location.hash || ''; // e.g. "#results"
        window.location.replace(
            `/blog/${encodeURIComponent(legacyPostId)}/${anchor}`
        );
        return;
    }

    const routeMatch = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (routeMatch) {
        const slug = routeMatch[1]; // “fuzzing-with-llms”
        document.documentElement.classList.add('blog-post-page');
        document.body.classList.add('blog-post-page');

        // content is already in the DOM – just enhance it
        const container = document.getElementById('blog-post-content');
        if (container) {
            generateTableOfContents(container);
            await processCodeBlocks(container, slug);
            processInlineCodeBlocks(container);
            handleBlogPostHashNavigation();
        }
        return; // nothing else to do on a post page
    }

    // landing page
    await loadBlogPostsList();
    handleSectionScrolling();
});

// Function to handle hash navigation in blog posts
function handleBlogPostHashNavigation() {
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }
}

// Function to handle scrolling to sections
function handleSectionScrolling() {
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
}

// Function to format a date in a better international format
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
}

// Load blog posts list for the main page
async function loadBlogPostsList() {
    const blogPostsContainer = document.getElementById('blog-posts');
    if (!blogPostsContainer) return;

    try {
        const response = await fetch('blog/posts.json');
        if (!response.ok) {
            throw new Error('Failed to load blog posts');
        }

        const posts = await response.json();
        if (posts.length === 0) {
            blogPostsContainer.innerHTML =
                '<p>No blog posts yet. Check back later!</p>';
            return;
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Create HTML for the blog posts
        const postsHTML = posts
            .map(
                (post) => `
                <article class="blog-post-preview">
                    <h3><a href="/blog/${post.id}/">${post.title}</a></h3>
                    <div class="post-meta">
                        <span class="post-date">${formatDate(post.date)}</span>
                    </div>
                    <p>${post.summary}</p>
                    <a href="/blog/${
                        post.id
                    }/" class="read-more">Read more →</a>
                </article>
            `
            )
            .join('');

        blogPostsContainer.innerHTML = postsHTML;
    } catch (error) {
        console.error('Error loading blog posts:', error);
        blogPostsContainer.innerHTML =
            '<p>Failed to load blog posts. Please try again later.</p>';
    }
}

// Lazily load Shiki for syntax highlighting
let shikiLoaded = false;

async function loadShiki() {
    if (shikiLoaded) return true;

    try {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/shiki@0.14.3/dist/index.unpkg.iife.js';

        const scriptLoaded = new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });

        document.head.appendChild(script);
        await scriptLoaded;

        if (!window.shiki) {
            throw new Error('Shiki failed to load properly');
        }

        console.log('Shiki loaded successfully');

        // Load Tact grammar
        const response = await fetch('/grammar-tact.json');
        const tactGrammar = await response.json();
        console.log('Loaded Tact grammar:', tactGrammar.scopeName);
        window.customTactGrammar = tactGrammar;

        shikiLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to load Shiki:', error);
        return false;
    }
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function renderBlogPost(postId) {
    const blogPostContainer = document.getElementById('blog-post-content');
    if (!blogPostContainer) return;

    try {
        /* absolute instead of relative */
        const postsResponse = await fetch('/blog/posts.json');
        if (!postsResponse.ok)
            throw new Error('Failed to load blog posts metadata');

        const posts = await postsResponse.json();
        const post = posts.find((p) => p.id === postId);
        if (!post) {
            blogPostContainer.innerHTML = '<p>Blog post not found.</p>';
            return;
        }

        document.title = `${post.title} - Daniil Sedov`;
        const titleElement = document.getElementById('post-title');
        if (titleElement) titleElement.textContent = post.title;

        const dateElement = document.getElementById('post-date');
        if (dateElement)
            dateElement.textContent = `${formatDate(
                post.date
            )} · by Daniil Sedov`;

        /* absolute content fetch */
        const contentResponse = await fetch(
            `/blog/posts/${post.id}/index.html`
        );
        if (!contentResponse.ok)
            throw new Error('Failed to load blog post content');

        let content = await contentResponse.text();

        /* fix inner relative assets to absolute paths */
        content = content.replace(
            /(src|href)="(?!http|https|\/)(.*?)"/g,
            `$1="/blog/posts/${postId}/$2"`
        );

        blogPostContainer.innerHTML = content;

        generateTableOfContents(blogPostContainer);
        await processCodeBlocks(blogPostContainer, postId);
        processInlineCodeBlocks(blogPostContainer);

        requestAnimationFrame(handleBlogPostHashNavigation);
    } catch (error) {
        console.error('Error rendering blog post:', error);
        blogPostContainer.innerHTML =
            '<p>Failed to load blog post. Please try again later.</p>';
    }
}

// Function to process all code blocks in a container
async function processCodeBlocks(container, postId) {
    // Find all code blocks
    const codeBlocks = container.querySelectorAll('pre > code');
    if (codeBlocks.length === 0) return;

    // Try to load Shiki for syntax highlighting
    const shikiAvailable =
        postId !== 'measuring-llm-entropy' && (await loadShiki());

    // Process each code block
    for (const codeElement of codeBlocks) {
        const preElement = codeElement.parentNode;
        const codeText = codeElement.textContent;

        // Check for language class
        let language = null;
        let displayLanguage = 'Text';
        const langClass = codeElement.className.match(/language-(\w+)/);

        if (langClass && langClass[1]) {
            language = langClass[1];
            displayLanguage =
                language.charAt(0).toUpperCase() + language.slice(1);
        }

        // Handle syntax highlighting if available
        let highlightedHTML = null;
        if (language && shikiAvailable && language !== 'text') {
            try {
                // Special case for Tact language
                if (language === 'tact' && window.customTactGrammar) {
                    const highlighter = await window.shiki.getHighlighter({
                        theme: 'github-light',
                        langs: [
                            {
                                id: 'tact',
                                scopeName: window.customTactGrammar.scopeName,
                                grammar: window.customTactGrammar,
                                aliases: ['tact'],
                            },
                        ],
                    });

                    highlightedHTML = highlighter.codeToHtml(codeText, {
                        lang: 'tact',
                    });
                    displayLanguage = 'Tact';
                }
                // For other languages (but not 'text')
                else {
                    const highlighter = await window.shiki.getHighlighter({
                        theme: 'github-light',
                        langs: [language],
                    });

                    highlightedHTML = highlighter.codeToHtml(codeText, {
                        lang: language,
                    });
                }
            } catch (error) {
                console.warn(`Failed to highlight ${language} code:`, error);
                // Fall back to plain text
                highlightedHTML = `<pre class="shiki" style="background-color: #f7f9fb"><code>${escapeHtml(
                    codeText
                )}</code></pre>`;
                displayLanguage = 'Text';
            }
        }

        // Create the code block container
        transformCodeBlock(
            preElement,
            codeText,
            displayLanguage,
            highlightedHTML
        );
    }
}

// Unified function to transform a code block
function transformCodeBlock(
    preElement,
    codeText,
    displayLanguage,
    highlightedHTML = null
) {
    // Create container elements
    const container = document.createElement('div');
    container.className = 'prompt-container';

    // Create header with title and buttons
    const header = document.createElement('div');
    header.className = 'prompt-header';

    // Always include copy button, but toggle button is only for non-highlighted blocks
    const showToggle = highlightedHTML === null;
    header.innerHTML = `
        <h5>${displayLanguage}</h5>
        <div class="prompt-actions">
            <button class="prompt-copy" title="Copy to clipboard">Copy</button>
            ${
                showToggle
                    ? '<button class="prompt-toggle" title="Expand/Collapse">Expand</button>'
                    : ''
            }
        </div>
    `;

    // Create content container
    const content = document.createElement('div');
    content.className = 'prompt-content';

    // Add code content - either highlighted or original
    if (highlightedHTML) {
        content.innerHTML = highlightedHTML;
        content.style.height = 'auto'; // Always show full height for highlighted blocks
    } else {
        content.appendChild(preElement.cloneNode(true));
    }

    // Assemble container and replace original element
    container.appendChild(header);
    container.appendChild(content);
    preElement.parentNode.replaceChild(container, preElement);

    // Add copy button functionality
    const copyButton = container.querySelector('.prompt-copy');
    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard
            .writeText(codeText.trim())
            .then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
            });
    });

    // Add expand/collapse functionality if needed
    const toggleButton = container.querySelector('.prompt-toggle');
    if (toggleButton) {
        const togglePrompt = (e) => {
            if (e) e.stopPropagation();

            // Get current state
            const isExpanded = content.classList.contains('expanded');
            const currentHeight = window.getComputedStyle(content).height;

            // Prepare for animation
            content.style.height = currentHeight;
            void content.offsetWidth; // Force reflow

            // Toggle expanded state
            content.classList.toggle('expanded');

            // Animate height
            requestAnimationFrame(() => {
                if (!isExpanded) {
                    // Expanding
                    content.style.height = 'auto';
                    const expandedHeight =
                        window.getComputedStyle(content).height;
                    content.style.height = currentHeight;

                    requestAnimationFrame(() => {
                        content.style.height = expandedHeight;
                        setTimeout(() => {
                            content.style.height = '';
                        }, 300);
                    });
                } else {
                    // Collapsing
                    requestAnimationFrame(() => {
                        content.style.height = '200px';
                    });
                }
            });

            // Update button text
            toggleButton.textContent = isExpanded ? 'Expand' : 'Collapse';
        };

        toggleButton.addEventListener('click', togglePrompt);

        // Check if we need the toggle button
        setTimeout(() => {
            const contentElement = content.querySelector('pre');
            if (contentElement) {
                const contentHeight = contentElement.scrollHeight;
                const visibleHeight = 200; // Default height

                if (contentHeight <= visibleHeight + 20) {
                    // Content fits without expanding
                    toggleButton.classList.add('hidden');
                    content.style.height = 'auto';
                    header.style.cursor = 'default';
                    toggleButton.removeEventListener('click', togglePrompt);
                } else {
                    // Content needs expanding
                    header.style.cursor = 'pointer';
                    header.addEventListener('click', togglePrompt);
                }
            }
        }, 0);
    }
}

// Function to process inline code blocks (code tags not inside pre tags)
function processInlineCodeBlocks(container) {
    // Find all code elements
    const allCodeElements = container.querySelectorAll('code');

    for (const codeElement of allCodeElements) {
        // Skip if it's already processed
        if (codeElement.classList.contains('inline-code')) {
            continue;
        }

        // Skip if it's inside a pre tag (code block)
        if (codeElement.closest('pre')) {
            continue;
        }

        // Add the inline-code class
        codeElement.classList.add('inline-code');

        // Store original content for copying
        const originalText = codeElement.textContent;

        // Add click-to-copy functionality
        codeElement.style.cursor = 'pointer';
        codeElement.title = 'Click to copy';

        // Store timeout ID for handling multiple clicks
        let timeoutId = null;

        codeElement.addEventListener('click', (e) => {
            // Don't trigger if the code is inside a link
            if (e.target.closest('a')) {
                return;
            }

            e.stopPropagation();

            // Copy to clipboard
            navigator.clipboard
                .writeText(originalText.trim())
                .then(() => {
                    // Clear any existing timeout
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }

                    // Visual feedback - briefly change background color
                    codeElement.style.backgroundColor = '#c8e6c9'; // Light green

                    // Store the timeout ID for potential clearing
                    timeoutId = setTimeout(() => {
                        codeElement.style.backgroundColor = '#f7f9fb'; // Reset to page background color
                    }, 400); // Increased duration
                })
                .catch((err) => {
                    console.error('Failed to copy inline code:', err);
                });
        });
    }
}

// Function to generate a table of contents from headings
function generateTableOfContents(container) {
    // Find all headings to include in the TOC
    const headings = container.querySelectorAll('h2, h3, h4');
    if (headings.length < 3) return; // Don't add TOC for very few headings

    // Create a list of heading data with IDs
    const tocItems = [];
    headings.forEach((heading, index) => {
        // Create an ID for the heading if it doesn't have one
        if (!heading.id) {
            const slug = heading.textContent
                .trim()
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
            heading.id = `heading-${slug}-${index}`;
        }

        tocItems.push({
            id: heading.id,
            text: heading.textContent.trim(),
            level: parseInt(heading.tagName.substring(1)),
        });
    });

    // Create TOC container
    const tocContainer = document.createElement('div');
    tocContainer.className = 'toc-container';

    // Create TOC header
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
        <h3>Table of Contents</h3>
        <button class="toc-toggle">Expand</button>
    `;

    // Create TOC content
    const tocContent = document.createElement('div');
    tocContent.className = 'toc-content collapsed';
    tocContent.style.height = '0px';

    // Create TOC list
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    // Add TOC items
    tocItems.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.className = `toc-h${item.level}`;

        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.textContent = item.text;

        // Add smooth scrolling
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById(item.id);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                history.pushState(null, null, `#${item.id}`);
            }
        });

        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    tocContent.appendChild(tocList);
    tocContainer.appendChild(tocHeader);
    tocContainer.appendChild(tocContent);

    // Add toggle functionality
    const tocToggle = tocContainer.querySelector('.toc-toggle');
    const toggleToc = (e) => {
        if (e) e.stopPropagation();

        const isCollapsed = tocContent.classList.contains('collapsed');
        const currentHeight = window.getComputedStyle(tocContent).height;

        tocContent.style.height = currentHeight;
        void tocContent.offsetWidth;

        tocContent.classList.toggle('collapsed');

        requestAnimationFrame(() => {
            if (isCollapsed) {
                tocContent.style.height = 'auto';
                const expandedHeight =
                    window.getComputedStyle(tocContent).height;
                tocContent.style.height = currentHeight;

                requestAnimationFrame(() => {
                    tocContent.style.height = expandedHeight;
                    setTimeout(() => {
                        tocContent.style.height = '';
                    }, 300);
                });
            } else {
                requestAnimationFrame(() => {
                    tocContent.style.height = '0px';
                });
            }
        });

        tocToggle.textContent = isCollapsed ? 'Collapse' : 'Expand';
    };

    tocToggle.addEventListener('click', toggleToc);
    tocHeader.addEventListener('click', toggleToc);

    // Insert the TOC at the beginning of the content
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading) {
        container.insertBefore(tocContainer, firstHeading);
    } else {
        container.insertBefore(tocContainer, container.firstChild);
    }

    // Apply heading links
    applyHeadingLinks(container);
}

// Function to apply linking to all headings
function applyHeadingLinks(container) {
    const headings = container.querySelectorAll('h2, h3, h4');

    headings.forEach((heading) => {
        if (heading.id) {
            heading.style.cursor = 'pointer';

            // Add a small link icon that appears on hover
            const link = document.createElement('a');
            link.className = 'heading-link';
            link.href = `#${heading.id}`;
            link.innerHTML = ' 🔗';
            link.style.opacity = '0';
            link.style.fontSize = '0.8em';
            link.style.textDecoration = 'none';
            link.style.transition = 'opacity 0.2s';

            heading.appendChild(link);

            // Show link icon on hover
            heading.addEventListener('mouseenter', () => {
                link.style.opacity = '0.6';
            });

            heading.addEventListener('mouseleave', () => {
                link.style.opacity = '0';
            });

            // Add smooth scrolling
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById(heading.id).scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                history.pushState(null, null, `#${heading.id}`);
            });

            // Make the heading itself clickable
            heading.addEventListener('click', (e) => {
                if (e.target === heading) {
                    document.getElementById(heading.id).scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                    history.pushState(null, null, `#${heading.id}`);
                }
            });
        }
    });

    // Apply smooth scrolling to all hash links
    const allHashLinks = container.querySelectorAll('a[href^="#"]');
    allHashLinks.forEach((link) => {
        if (!link.classList.contains('heading-link')) {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                    history.pushState(null, null, `#${targetId}`);
                }
            });
        }
    });
}
