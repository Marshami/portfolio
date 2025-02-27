console.log("Loading projects from JSON...");

async function loadProjects() {
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("No .projects container found!");
        return;
    }

    try {
        const projects = await fetchJSON('../lib/projects.json'); // ✅ Correct path
        console.log("Fetched projects:", projects); // ✅ Debugging log

        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}

loadProjects();