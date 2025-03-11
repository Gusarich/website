# Blog Instructions

This document explains how to add new blog posts to your website.

## Adding a New Blog Post

1. **Create a new folder** in the `/blog/posts` directory with your post's ID

    - Example: `/blog/posts/my-new-post/`

2. **Create an `index.html` file** inside this folder with just your blog post content

    - Example: `/blog/posts/my-new-post/index.html`
    - Only include the actual content of your post (paragraphs, headers, images, etc.)
    - No need to include the page template, header, footer, etc.

3. **Store images for your post** in the same folder

    - Example: `/blog/posts/my-new-post/image1.jpg`, `/blog/posts/my-new-post/image2.png`
    - Reference images in your post using relative paths: `<img src="image1.jpg" alt="Description">`

4. **Update the posts.json file** with information about your new post:

    ```json
    {
        "id": "my-new-post", // Must match the folder name
        "title": "Your Post Title",
        "date": "YYYY-MM-DD", // The date in ISO format
        "summary": "A brief summary of your post that will appear in the blog list"
    }
    ```

5. **Add your new post entry** to the posts.json array. The most recent posts (by date) will automatically appear at the top of your blog page.

## Blog Post Content Format

Your blog post content should be just the HTML you want to display in the post, without any page structure. For example:

```html
<p>This is the first paragraph of my blog post.</p>

<h3>A Subheading</h3>

<p>More content here...</p>

<img src="my-diagram.png" alt="A diagram explaining the concept" />

<p>As you can see in the diagram above...</p>

<ul>
    <li>Bullet point 1</li>
    <li>Bullet point 2</li>
</ul>

<p>Final thoughts and conclusion.</p>
```

The template, styling, navigation, and everything else will be added automatically.

## Working with Images

With the folder structure, adding images to your posts is simple:

1. Save your images in your post's folder (e.g., `/blog/posts/my-new-post/image.jpg`)
2. Reference them in your HTML using relative paths:
    ```html
    <img src="image.jpg" alt="Description of image" />
    ```

You can organize images in subfolders if needed:

```
/blog/posts/my-new-post/
  ├── index.html
  ├── images/
  │   ├── header.jpg
  │   ├── diagram1.png
  │   └── screenshot2.jpg
  └── other-files/
      └── example.pdf
```

Then reference them like this:

```html
<img src="images/header.jpg" alt="Header image" />
<a href="other-files/example.pdf">Download the PDF</a>
```

## How It Works

When someone visits your blog:

1. On the main page, the list of posts is shown with their titles and summaries
2. When they click on a post, they're taken to the generic post.html template
3. JavaScript loads the specific post content from its folder in /blog/posts/
4. The content is injected into the template, creating a complete page
