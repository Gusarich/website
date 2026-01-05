import { hydrateListViewCounts } from './blog/list.js';
import { processPostPage } from './blog/post-page.js';

export const BlogPosts = {
    async loadList() {
        const allPostsContainer = document.getElementById('all-posts');
        const combinedContainer = document.getElementById('blog-posts');

        // Dedicated blog page with unified list.
        if (allPostsContainer) {
            hydrateListViewCounts(allPostsContainer);
            return;
        }

        // Homepage combined list (featured selection).
        if (combinedContainer) {
            hydrateListViewCounts(combinedContainer);
        }
    },
    processPostPage
};
