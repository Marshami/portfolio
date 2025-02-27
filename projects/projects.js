import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    const projectsContainer = document.querySelector('.projects'); // Select the container
    if (!projectsContainer) return; // Stop if the container is missing

    const projects = await fetchJSON('../lib/projects.json'); // Fetch projects
    renderProjects(projects, projectsContainer, 'h2'); // Render projects
}

loadProjects();
