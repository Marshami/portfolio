console.log("IT’S ALIVE!");

function $$(selector, context = document) {
 return Array.from(context.querySelectorAll(selector));
}

// Select all navigation links
const navLinks = document.querySelectorAll("nav a");

// Find the current page link
const currentLink = Array.from(navLinks).find(
  (a) => a.href === window.location.href
);

// Add the "current" class if found
if (currentLink) {
  currentLink.classList.add("current");
}