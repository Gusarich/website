document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on a blog post page or the main page
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');

    if (postId) {
        // We're on a blog post page, load and render the specific post
        // Add class to both HTML and body for blog post specific styling
        document.documentElement.classList.add('blog-post-page');
        document.body.classList.add('blog-post-page');
        await renderBlogPost(postId);
        // Hash navigation is now handled in renderBlogPost using requestAnimationFrame
    } else {
        // We're on the main page, load and render the post list
        await loadBlogPostsList();

        // Handle scrolling to any section based on hash or stored targetSection
        handleSectionScrolling();
    }
});

// Function to handle hash navigation in blog posts
function handleBlogPostHashNavigation() {
    // Check if there's a hash in the URL
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            // Scroll to the target element with smooth behavior
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }
}

// Function to handle scrolling to sections
function handleSectionScrolling() {
    // Get the target section from either sessionStorage or URL hash
    let targetSection = sessionStorage.getItem('scrollToSection');
    const urlHash = window.location.hash.substring(1); // Remove the # character

    // If we have a hash in the URL, use that instead of sessionStorage
    if (urlHash) {
        targetSection = urlHash;
    }

    // If we have a target section, scroll to it
    if (targetSection) {
        // Clear the sessionStorage value
        sessionStorage.removeItem('scrollToSection');

        // Scroll to the target section with smooth behavior
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

async function loadBlogPostsList() {
    const blogPostsContainer = document.getElementById('blog-posts');

    if (!blogPostsContainer) return; // Not on the main page with blog list

    try {
        // Fetch the blog posts metadata
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
                <h3><a href="blog/post.html?post=${post.id}">${
                    post.title
                }</a></h3>
                <div class="post-meta">
                    <span class="post-date">${formatDate(post.date)}</span>
                </div>
                <p>${post.summary}</p>
                <a href="blog/post.html?post=${
                    post.id
                }" class="read-more">Read more →</a>
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

async function renderBlogPost(postId) {
    const blogPostContainer = document.getElementById('blog-post-content');

    if (!blogPostContainer) return; // Not on a blog post page

    try {
        // First, get the post metadata
        const postsResponse = await fetch('../blog/posts.json');

        if (!postsResponse.ok) {
            throw new Error('Failed to load blog posts metadata');
        }

        const posts = await postsResponse.json();
        const post = posts.find((p) => p.id === postId);

        if (!post) {
            blogPostContainer.innerHTML = '<p>Blog post not found.</p>';
            return;
        }

        // Update the page title
        document.title = `${post.title} - Daniil Sedov`;

        // Update the post header
        const titleElement = document.getElementById('post-title');
        if (titleElement) titleElement.textContent = post.title;

        const dateElement = document.getElementById('post-date');
        if (dateElement) dateElement.textContent = formatDate(post.date);

        // Fetch the post content - now looking for index.html in a folder named after the post
        const contentResponse = await fetch(
            `../blog/posts/${post.id}/index.html`
        );

        if (!contentResponse.ok) {
            // Try the old format as fallback for backward compatibility
            const oldFormatResponse = await fetch(
                `../blog/posts/${post.id}.html`
            );

            if (!oldFormatResponse.ok) {
                throw new Error('Failed to load blog post content');
            }

            const content = await oldFormatResponse.text();
            blogPostContainer.innerHTML = content;
            return;
        }

        let content = await contentResponse.text();

        // Fix relative image and link paths to correctly point to the blog post's folder
        content = content.replace(
            /(src|href)="(?!http|https|\/)(.*?)"/g,
            `$1="../blog/posts/${postId}/$2"`
        );

        // Insert the content
        blogPostContainer.innerHTML = content;

        // After content is inserted, transform code blocks to expandable prompts
        transformCodeBlocksToPrompts();

        // Generate and insert the table of contents
        generateTableOfContents(blogPostContainer);

        // Use requestAnimationFrame to ensure the DOM is fully updated before handling hash navigation
        requestAnimationFrame(() => {
            // Handle any hash navigation after the DOM is completely updated
            handleBlogPostHashNavigation();
        });
    } catch (error) {
        console.error('Error rendering blog post:', error);
        if (blogPostContainer) {
            blogPostContainer.innerHTML =
                '<p>Failed to load blog post. Please try again later.</p>';
        }
    }
}

// Function to generate a table of contents from headings
function generateTableOfContents(container) {
    // Find all headings to include in the TOC (h2, h3, h4)
    const headings = container.querySelectorAll('h2, h3, h4');

    if (headings.length < 3) {
        // Don't add TOC for posts with very few headings
        return;
    }

    // Create a list of heading data with IDs
    const tocItems = [];

    headings.forEach((heading, index) => {
        // Create an ID for the heading if it doesn't have one
        if (!heading.id) {
            // Create a slug from the heading text
            const slug = heading.textContent
                .trim()
                .toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-'); // Replace spaces with hyphens

            // Add index to ensure uniqueness
            heading.id = `heading-${slug}-${index}`;
        }

        tocItems.push({
            id: heading.id,
            text: heading.textContent.trim(),
            level: parseInt(heading.tagName.substring(1)), // Get the number from h2, h3, etc.
        });
    });

    // Create the TOC container
    const tocContainer = document.createElement('div');
    tocContainer.className = 'toc-container';

    // Create the TOC header
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
        <h3>Table of Contents</h3>
        <button class="toc-toggle">Expand</button>
    `;

    // Create the TOC content
    const tocContent = document.createElement('div');
    tocContent.className = 'toc-content collapsed';

    // Create the TOC list
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    // Add items to the TOC list
    tocItems.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.className = `toc-h${item.level}`;

        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.textContent = item.text;

        // Add smooth scrolling behavior
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById(item.id);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                // Update URL hash without jumping
                history.pushState(null, null, `#${item.id}`);
            }
        });

        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    tocContent.appendChild(tocList);
    tocContainer.appendChild(tocHeader);
    tocContainer.appendChild(tocContent);

    // Function to toggle TOC visibility with consistent appearance
    const toggleToc = () => {
        tocContent.classList.toggle('collapsed');
        tocToggle.textContent = tocContent.classList.contains('collapsed')
            ? 'Expand'
            : 'Collapse';
    };

    // Add event listener for toggling the TOC
    const tocToggle = tocContainer.querySelector('.toc-toggle');
    tocToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        toggleToc();
    });

    // Make the entire header clickable for toggling
    tocHeader.addEventListener('click', () => {
        toggleToc();
    });

    // Insert the TOC at the beginning of the content, but after any introductory paragraph
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading) {
        // Insert before the first heading
        container.insertBefore(tocContainer, firstHeading);
    } else {
        // If no headings, insert at the beginning
        container.insertBefore(tocContainer, container.firstChild);
    }

    // Apply smooth scrolling to all heading links in the document
    applyHeadingLinks(container);
}

// Function to apply proper linking to all headings
function applyHeadingLinks(container) {
    const headings = container.querySelectorAll('h2, h3, h4');

    headings.forEach((heading) => {
        // Only add pointer cursor if the heading has an ID (making it linkable)
        if (heading.id) {
            // Add pointer cursor to the heading itself
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

            // Smooth scroll behavior
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById(heading.id).scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                history.pushState(null, null, `#${heading.id}`);
            });

            // Add click event to the heading itself
            heading.addEventListener('click', (e) => {
                // Only trigger if the click was directly on the heading, not on a child element
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

    // Also apply smooth scrolling to all hash links in the blog post
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

// Function to transform code blocks into expandable, copyable prompt sections
function transformCodeBlocksToPrompts() {
    // Look for pre > code elements
    const codeBlocks = document.querySelectorAll(
        '.blog-post-content pre.codehilite'
    );

    codeBlocks.forEach((preElement, index) => {
        const codeElement = preElement.querySelector('code');
        if (!codeElement) return;

        const promptText = codeElement.textContent;

        // Try to find the title from preceding heading
        let promptTitle = `Prompt ${index + 1}`;

        // Look for the closest h4 before this pre element
        let currentElement = preElement.previousElementSibling;
        while (currentElement) {
            if (currentElement.tagName === 'H4') {
                promptTitle = currentElement.textContent.trim();
                break;
            }
            // If we hit another pre element or a higher-level heading, stop looking
            if (
                currentElement.tagName === 'PRE' ||
                ['H1', 'H2', 'H3'].includes(currentElement.tagName)
            ) {
                break;
            }
            currentElement = currentElement.previousElementSibling;
        }

        // Create the new prompt container
        const promptContainer = document.createElement('div');
        promptContainer.className = 'prompt-container';

        // Create header with title and buttons
        const promptHeader = document.createElement('div');
        promptHeader.className = 'prompt-header';
        promptHeader.innerHTML = `
            <h5>${promptTitle}</h5>
            <div class="prompt-actions">
                <button class="prompt-copy" title="Copy to clipboard">Copy</button>
                <button class="prompt-toggle" title="Expand/Collapse">Expand</button>
            </div>
        `;

        // Add the code content
        const promptContent = document.createElement('div');
        promptContent.className = 'prompt-content';
        promptContent.appendChild(preElement.cloneNode(true));

        // Add header and content to container
        promptContainer.appendChild(promptHeader);
        promptContainer.appendChild(promptContent);

        // Replace the original pre element with our new container
        preElement.parentNode.replaceChild(promptContainer, preElement);

        // Add event listeners
        const toggleButton = promptContainer.querySelector('.prompt-toggle');
        const copyButton = promptContainer.querySelector('.prompt-copy');

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            promptContent.classList.toggle('expanded');
            toggleButton.textContent = promptContent.classList.contains(
                'expanded'
            )
                ? 'Collapse'
                : 'Expand';
        });

        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard
                .writeText(promptText.trim())
                .then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                })
                .catch((err) => {
                    console.error('Failed to copy: ', err);
                });
        });

        // Make the whole header clickable to toggle
        promptHeader.addEventListener('click', () => {
            promptContent.classList.toggle('expanded');
            toggleButton.textContent = promptContent.classList.contains(
                'expanded'
            )
                ? 'Collapse'
                : 'Expand';
        });

        // Check if expansion is needed by comparing scroll height to client height
        // We need to do this after a short delay to ensure content is properly rendered
        setTimeout(() => {
            const preInPrompt = promptContent.querySelector('pre');
            if (preInPrompt) {
                const contentHeight = preInPrompt.scrollHeight;
                const visibleHeight = 200; // This is the max-height set in CSS

                // If content fits within the default height (with a small margin for error)
                if (contentHeight <= visibleHeight + 20) {
                    toggleButton.classList.add('hidden');
                    promptContent.style.maxHeight = 'none'; // No need for height limit
                    promptHeader.style.cursor = 'default'; // Remove pointer cursor

                    // Remove the click handler for the header
                    promptHeader.removeEventListener('click', () => {});
                }
            }
        }, 100);
    });
}
