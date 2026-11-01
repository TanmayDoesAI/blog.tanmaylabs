---
layout: page
title: Search
permalink: /search/
---

<section class="search-panel" data-search-page data-index-url="{{ '/search.json' | relative_url }}">
  <form class="search-form" role="search">
    <label class="visually-hidden" for="site-search">Search all posts</label>
    <input id="site-search" name="q" type="search" autocomplete="off" placeholder="Search every post…" aria-describedby="search-help">
    <button type="submit">Search</button>
    <button class="search-clear" type="button">Clear</button>
  </form>
  <p id="search-help" class="search-help">Search titles and full post text. Press / to focus search and Escape to clear.</p>
  <p class="search-status" role="status" aria-live="polite"></p>
  <ol class="search-results"></ol>
</section>
<script src="{{ '/assets/js/search.js' | relative_url }}" defer></script>
