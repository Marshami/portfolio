import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct relative path

async function loadProjects() {
    console.log("Loading projects..."); // Debugging message

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("No .projects container found!");
        return;
    }

    try {
        const projects = await fetchJSON('../lib/projects.json'); // ✅ Correct path to JSON
        console.log("Fetched projects:", projects);

        if (projects.length === 0) {
            console.warn("No projects found in JSON!");
        }

        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}

loadProjects();