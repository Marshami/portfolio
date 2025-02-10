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

// Define the site pages
const pages = [
    { url: "index.html", title: "Home" },
    { url: "projects/index.html", title: "Projects" },
    { url: "contact/index.html", title: "Contact" },
    { url: "cv/index.html", title: "Resume" },
    { url: "https://github.com/Marshami", title: "Profile" } // Example external link
  ];
  
  // Create the <nav> element
  const nav = document.createElement("nav");
  
  // Loop through pages and create links
  for (let p of pages) {
    let link = document.createElement("a");
    link.href = p.url;
    link.textContent = p.title;
  
    // Highlight the current page
    if (window.location.pathname.includes(p.url)) {
      link.classList.add("current");
    }
  
    // Adjust relative URLs for subpages
    if (!p.url.startsWith("http") && !window.location.pathname.includes("index.html")) {
      link.href = "../" + p.url;
    }
  
    // Open external links in a new tab
    if (p.url.startsWith("http")) {
      link.target = "_blank";
    }
  
    nav.appendChild(link);
  }
  
  // Insert the navigation at the top of the <body>
  document.body.prepend(nav);
  