import { fetchJSON, renderProjects } from './global.js';

async function displayLatestProjects() {
    const projects = await fetchJSON('./lib/projects.json');
    const latestProjects = projects.slice(0, 3); // Select first 3 projects
    const projectsContainer = document.querySelector('.projects');
    renderProjects(latestProjects, projectsContainer, 'h2');
}

displayLatestProjects();
