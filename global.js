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
  
// Insert dark mode switch into the page
document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-switch">
        <option value="auto">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );
  
  const themeSwitch = document.getElementById("theme-switch");
  
  // Function to update the theme
  function setTheme(mode) {
    document.documentElement.style.setProperty("color-scheme", mode);
    localStorage.setItem("theme", mode); // Save user preference
  }
  
  // Load saved theme from localStorage (if exists)
  const savedTheme = localStorage.getItem("theme") || "auto";
  setTheme(savedTheme); // Apply saved theme
  themeSwitch.value = savedTheme; // Update dropdown to match
  
  // Event listener for theme selection
  themeSwitch.addEventListener("input", function (event) {
    setTheme(event.target.value);
  });