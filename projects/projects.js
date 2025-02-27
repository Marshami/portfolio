export function renderProjects(projects, containerElement) {
    containerElement.innerHTML = '';  // Clear previous content
    
    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <h3>${project.title}</h3>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
        `;
        containerElement.appendChild(article);
    });
}

import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    const projectsContainer = document.querySelector('.projects'); // Select the container
    if (!projectsContainer) return; // Stop if the container is missing

    const projects = await fetchJSON('../lib/projects.json'); // Fetch projects
    renderProjects(projects, projectsContainer, 'h2'); // Render projects
}

loadProjects();