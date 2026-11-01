---
layout: page
title: Topics
permalink: /topics/
---

Browse the archive by category or tag. Selecting a topic opens its matching post archive.

{% capture category_values %}{% for post in site.posts %}{% for category in post.categories %}{{ category }}|{% endfor %}{% endfor %}{% endcapture %}
{% assign categories = category_values | split: '|' | uniq | sort_natural %}
<section class="topic-section" aria-labelledby="categories-heading">
  <h2 id="categories-heading">Categories</h2>
  <ul class="topic-list">
    {% for category in categories %}
      {% if category != '' %}
        <li><a href="{{ '/search/' | relative_url }}?category={{ category | url_encode }}">{{ category | escape }}</a></li>
      {% endif %}
    {% endfor %}
  </ul>
</section>

{% capture tag_values %}{% for post in site.posts %}{% for tag in post.tags %}{{ tag }}|{% endfor %}{% endfor %}{% endcapture %}
{% assign tags = tag_values | split: '|' | uniq | sort_natural %}
<section class="topic-section" aria-labelledby="tags-heading">
  <h2 id="tags-heading">Tags</h2>
  <ul class="topic-list">
    {% for tag in tags %}
      {% if tag != '' %}
        <li><a href="{{ '/search/' | relative_url }}?tag={{ tag | url_encode }}">{{ tag | escape }}</a></li>
      {% endif %}
    {% endfor %}
  </ul>
</section>
