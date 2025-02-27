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

async function loadProjects() {
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    document.querySelector('.projects-title').textContent = `Projects (${projects.length})`;
    renderProjects(projects, projectsContainer, 'h2');
}
