document.addEventListener("DOMContentLoaded", function() {
  
  const siteHostname = window.location.hostname;
  
  const contentLinks = document.querySelectorAll('.post-content a');
  
  contentLinks.forEach(link => {
    if (link.hostname && link.hostname !== siteHostname) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
});