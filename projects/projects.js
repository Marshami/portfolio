import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

async function loadProjects() {
    console.log("Loading projects from JSON...");

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("No .projects container found!");
        return;
    }

    // Dynamically determine correct JSON path
    const jsonPath = window.location.pathname.includes('/projects/')
        ? '../lib/projects.json'  // ✅ Correct path for /projects/index.html
        : './lib/projects.json';  // ✅ Correct path for home page

    try {
        const projects = await fetchJSON(jsonPath); 
        console.log("Fetched projects:", projects);

        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}

loadProjects();