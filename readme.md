# TanmayLabs Blog

This is the repository for my personal blog, [blog.tanmaylabs.me](https://blog.tanmaylabs.me).

It's built with Jekyll and served by Cloudflare Pages (since 2026-11-07). The site is built and deployed from the author's home server (a WSL2 laptop; it used to be a Raspberry Pi), so the public site stays up even when that machine is off. See [Hosting and checks](#hosting-and-checks).

> **Branches:** `cloudflare-pages` (this branch) is the live site since 2026-11-07. `prod` is kept as it was: the self-hosted setup (Docker on the home server behind a Cloudflare tunnel) that the blog's homelab posts describe. The entire Docker environment can be run on any platform that supports Docker containers. This includes personal servers, a VPS from providers like DigitalOcean or Linode, and container hosting platforms like Railway. Alternatively, you can build the static site and deploy it to services like GitHub Pages, Netlify, or Vercel.

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
    > **Stale on the live host:** the repo `docker-compose.yml` is the original Raspberry Pi / ARM64 config (image `mrxder/jekyll-docker-arm64`, port 3001 on all interfaces). It is not what runs on the x86_64 WSL2 host. There, use the ignored local file instead: `docker compose -f .bundle/compose.local.yml up -d` (see `.bundle/README-local.md`; it binds `127.0.0.1:3001` only). The plain command above is still fine on an ARM64 machine.
3.  **Access the site:**
    Open your browser and navigate to [http://localhost:3001](http://localhost:3001).

The site rebuilds automatically when you change files. `docker-compose.yml` runs in production mode, so canonical, Open Graph, feed and structured-data URLs use `https://blog.tanmaylabs.me` and LiveReload is off. For local development with LiveReload, run `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

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
## Interactive charts (Tool Selection Lab)

Posts can embed interactive Apache ECharts charts. ECharts (pinned 5.6.0, vendored in `assets/lib/echarts/`) and `assets/js/tool-selection-charts.js` load only on posts with `interactive_charts: true` in their front matter.

```liquid
{% include tool-selection-chart.html chart="completion" %}   {# completion by strategy #}
{% include tool-selection-chart.html chart="tradeoff" %}     {# reliability vs tokens per completed task #}
{% include tool-selection-chart.html chart="complexity" %}   {# single-tool vs multi-step #}
{% include tool-selection-results.html %}                    {# collapsible table + CSV/JSON downloads #}
```

- Data lives in `assets/data/tool-selection-charts.json` (plus the two CSV downloads). To use another file, pass `data="/assets/data/other.json"` (same schema).
- `_data/tool_selection_charts.json` must be an identical copy of the JSON; it only feeds the no-JavaScript table. Refresh it with `cp assets/data/tool-selection-charts.json _data/tool_selection_charts.json`.
- Optional per-include overrides: `title`, `subtitle`, and (complexity chart) `featured="all,hybrid,..."`.

## Hosting and checks

- **Hosting:** Cloudflare Pages serves the built `_site`. Deploys run on the author's own machine after every build; GitHub does not deploy and this public repo holds no credentials.
- **Checks before every deploy** (the same scripts run locally and in CI):
  - `scripts/pages-stage.sh <_site> <stage>` refuses a broken build (missing `index.html`, `404.html` or `feed.xml`, too few files), leaves out files that must never be public (dotfiles, symlinks, `.md .yml .env .sh .py …`) and writes the Pages `_headers` file.
  - `scripts/check-links.py <stage>` fails if any internal link or asset points at a missing file.
- **CI:** `.github/workflows/pages.yml` builds the site with the pinned gems in `.github/ci/Gemfile.lock` and runs both scripts on pushes to `cloudflare-pages` and on pull requests. It is checks only: read-only token, no secrets, actions pinned by commit SHA, so pull requests from forks have nothing to leak.
- `404.html` is the not-found page (Pages needs it, otherwise unknown URLs would return the home page).
