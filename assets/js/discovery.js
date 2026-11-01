(function () {
  function appendText(parent, tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  const article = document.querySelector("article.post");
  if (!article) return;

  const headings = [...article.querySelectorAll(".post-content h2, .post-content h3")]
    .filter((heading) => heading.id);
  const toc = document.querySelector(".post-toc");
  const tocList = toc?.querySelector("ul");
  if (toc && tocList && headings.length >= 3) {
    headings.forEach((heading) => {
      const item = document.createElement("li");
      if (heading.tagName === "H3") item.className = "toc-level-3";
      const link = document.createElement("a");
      link.href = `#${encodeURIComponent(heading.id)}`;
      link.textContent = heading.textContent;
      item.appendChild(link);
      tocList.appendChild(item);
    });
    toc.hidden = false;
  }

  const related = document.querySelector(".related-posts");
  const relatedList = related?.querySelector("ul");
  if (!related || !relatedList) return;
  const categories = related.dataset.categories.split("|").filter(Boolean).map((v) => v.toLocaleLowerCase());
  const tags = related.dataset.tags.split("|").filter(Boolean).map((v) => v.toLocaleLowerCase());
  fetch(related.dataset.indexUrl)
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("index unavailable")))
    .then((posts) => posts.map((post) => {
      const sharedCategories = post.categories.filter((value) => categories.includes(value.toLocaleLowerCase())).length;
      const sharedTags = post.tags.filter((value) => tags.includes(value.toLocaleLowerCase())).length;
      return { post, score: sharedCategories * 2 + sharedTags };
    }).filter(({ post, score }) => post.url !== related.dataset.currentUrl && score > 0)
      .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
      .slice(0, 3)
      .forEach(({ post }) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = post.url;
        link.textContent = post.title;
        item.appendChild(link);
        relatedList.appendChild(item);
      }))
    .then(() => { if (relatedList.children.length) related.hidden = false; })
    .catch(() => {});
})();
