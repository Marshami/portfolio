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

// Define site pages
const pages = [
    { url: "/portfolio/index.html", title: "Home" },
    { url: "/portfolio/projects/index.html", title: "Projects" },
    { url: "/portfolio/contact/index.html", title: "Contact" },
    { url: "/portfolio/cv/index.html", title: "Resume" },
    { url: "https://github.com/Marshami", title: "Profile" } // External link
];

// Create the <nav> element
const nav = document.createElement("nav");

// Get the current page path
const currentPath = window.location.pathname;
console.log("DEBUG: Current Page Path:", currentPath); // Debugging

// Loop through pages and create links
for (let p of pages) {
    let link = document.createElement("a");
    link.href = p.url;
    link.textContent = p.title;

    console.log(`DEBUG: Comparing Current Path: ${currentPath} with ${p.url}`);

    // Highlight the current page correctly (handles missing index.html)
    if (
        currentPath === p.url || 
        currentPath.endsWith(p.url.replace("index.html", ""))
    ) {
        console.log(`Match found! Highlighting ${p.title}`);
        link.classList.add("current");
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

// Check if nav already exists to avoid duplication
if (!document.querySelector("nav")) {
    document.body.prepend(nav);
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contact-form");
  
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevents default form submission
  
        // Collect form data
        const formData = new FormData(form);
        const params = new URLSearchParams();
  
        for (let [key, value] of formData) {
          params.append(key, encodeURIComponent(value));
        }
  
        // Create the mailto link
        const mailtoLink = `mailto:your-email@example.com?subject=Contact Form Submission&body=${params}`;
  
        // Open the user's email client with formatted data
        window.location.href = mailtoLink;
      });
    }
  });

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching JSON:', error);
    }
}

export function renderProjects(projects, containerElement) {
  containerElement.innerHTML = ''; // Clear previous content

  projects.forEach(project => {
      const article = document.createElement('article');

      // Auto-adjust image path for GitHub Pages
      const isGitHubPages = window.location.hostname.includes("github.io");
      const basePath = isGitHubPages ? "/portfolio/" : "";  // ✅ Ensure no duplicate "portfolio/"

      const imageSrc = project.image.startsWith("http") 
          ? project.image 
          : `${basePath}${project.image}`;

      const fallbackImage = `${basePath}images/default.png`; // ✅ Correct default image path

      article.innerHTML = `
          <h2>${project.title}</h2>
          <img src="${imageSrc}" alt="${project.title}" onerror="this.onerror=null; this.src='${fallbackImage}';">
          <p>${project.description}</p>
      `;
      containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}