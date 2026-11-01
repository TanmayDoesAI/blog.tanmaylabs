(function () {
  const page = document.querySelector("[data-search-page]");
  if (!page) return;

  const form = page.querySelector(".search-form");
  const input = form.querySelector("input[type=search]");
  const status = page.querySelector(".search-status");
  const results = page.querySelector(".search-results");
  const clearButton = page.querySelector(".search-clear");
  const params = new URLSearchParams(window.location.search);
  const tokensFor = (value) => value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);

  function addText(parent, tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function makeResult(post) {
    const item = document.createElement("li");
    item.className = "search-result";
    const heading = document.createElement("h2");
    const link = document.createElement("a");
    link.href = post.url;
    link.textContent = post.title;
    heading.appendChild(link);
    item.appendChild(heading);
    const meta = addText(item, "p", new Date(post.date).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    }), "search-result-meta");
    meta.setAttribute("datetime", post.date);
    addText(item, "p", post.excerpt || post.content.slice(0, 220), "post-excerpt");
    if (post.categories.length || post.tags.length) {
      const topics = document.createElement("p");
      topics.className = "search-result-tags";
      [...post.categories.map((value) => ["category", value]), ...post.tags.map((value) => ["tag", value])]
        .forEach(([kind, value]) => {
          const topic = document.createElement("a");
          topic.className = "tag";
          topic.href = `${window.location.pathname}?${kind}=${encodeURIComponent(value)}`;
          topic.textContent = value;
          topics.appendChild(topic);
        });
      item.appendChild(topics);
    }
    return item;
  }

  function render(posts) {
    const terms = tokensFor(input.value);
    const category = params.get("category");
    const tag = params.get("tag");
    const matches = posts.map((post) => {
      const title = post.title.toLocaleLowerCase();
      const categories = post.categories.map((value) => value.toLocaleLowerCase());
      const tags = post.tags.map((value) => value.toLocaleLowerCase());
      const body = `${post.excerpt} ${post.content}`.toLocaleLowerCase();
      if (category && !categories.includes(category.toLocaleLowerCase())) return null;
      if (tag && !tags.includes(tag.toLocaleLowerCase())) return null;
      if (!terms.every((term) => `${title} ${categories.join(" ")} ${tags.join(" ")} ${body}`.includes(term))) return null;
      const score = terms.reduce((total, term) => total + (title.includes(term) ? 10 : 0) +
        (categories.some((value) => value.includes(term)) ? 5 : 0) +
        (tags.some((value) => value.includes(term)) ? 4 : 0) + (body.includes(term) ? 1 : 0), 0);
      return { post, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date));

    results.replaceChildren(...matches.map(({ post }) => makeResult(post)));
    const filterLabel = category ? ` in category “${category}”` : tag ? ` tagged “${tag}”` : "";
    status.textContent = `${matches.length} ${matches.length === 1 ? "post" : "posts"} found${filterLabel}.`;
    results.hidden = matches.length === 0;
    if (!matches.length) addText(results, "li", "Try another search or clear the topic filter.");
  }

  input.value = params.get("q") || "";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = new URLSearchParams(window.location.search);
    if (input.value.trim()) next.set("q", input.value.trim());
    else next.delete("q");
    const query = next.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    params.delete("q");
    render(window.blogSearchPosts || []);
  });
  clearButton.addEventListener("click", () => {
    input.value = "";
    window.history.replaceState({}, "", window.location.pathname);
    window.location.reload();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      input.focus();
    }
    if (event.key === "Escape" && document.activeElement === input) {
      input.value = "";
      input.form.requestSubmit();
    }
  });

  fetch(page.dataset.indexUrl)
    .then((response) => {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    })
    .then((posts) => {
      window.blogSearchPosts = posts;
      render(posts);
    })
    .catch(() => { status.textContent = "Search is temporarily unavailable. Please try again later."; });
})();
