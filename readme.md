# TanmayLabs Blog

This is the repository for my personal blog, [blog.tanmaylabs.me](https://blog.tanmaylabs.me).

It's built with Jekyll. While I currently serve it from my Raspberry Pi, the entire Docker environment can be run on any platform that supports Docker containers. This includes personal servers, a VPS from providers like DigitalOcean or Linode, and container hosting platforms like Railway. Alternatively, you can build the static site and deploy it to services like GitHub Pages, Netlify, or Vercel.

## Running Locally

This project uses Docker and Docker Compose to ensure a consistent development environment.

### Steps
1.  **Clone the repository:**
    ```sh
    git clone https://github.com/TanmayDoesAI/blog.tanmaylabs.git
    cd blog.tanmaylabs
    ```
2.  **Run the Docker container:**
    ```sh
    docker-compose up
    ```
3.  **Access the site:**
    Open your browser and navigate to [http://localhost:3001](http://localhost:3001).

The site will automatically rebuild and reload when you make changes to the files.

## Managing Content
### Adding a New Post

1.  Create a new Markdown file in the `_posts` directory.
2.  The filename must follow the format `YYYY-MM-DD-your-post-title.md`.
3.  Add the following front matter to the top of the file, customizing it for your post:

    ```yaml
    ---
    layout: post
    title: "Your Post Title"
    date: YYYY-MM-DD HH:MM:SS -ZZZZ
    categories: [category1, category2]
    tags: [tag1, tag2, tag3]
    author: Your Name
    excerpt: "A short, one-sentence summary of your post."
    ---

    Start writing your post content here...
    ```

### Modifying Site Configuration

Global settings for the blog can be changed in the `_config.yml` file. Here you can update:

-   `title`: The main title of your blog.
-   `description`: A short subtitle for your blog.
-   `author`: Your name and email.
-   `navigation`: Add or remove links from the site's main navigation menu.
-   `social`: Your social media handles.