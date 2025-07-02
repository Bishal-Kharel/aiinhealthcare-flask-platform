document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (footer) {
    const footerLinks = footer.querySelectorAll("nav a");
    footerLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        console.log(`Navigating to ${e.target.getAttribute("href")}`);
        // Add navigation logic here if needed
      });
    });
  }
});
