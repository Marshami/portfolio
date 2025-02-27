import { fetchJSON, renderProjects } from './global.js'; // ✅ Correct path for root

async function displayLatestProjects() {
    console.log("Loading latest projects for homepage...");

    const projectsContainer = document.querySelector('.projects'); // ✅ Select container
    if (!projectsContainer) {
        console.error("No .projects container found on homepage!");
        return;
    }

    try {
        const projects = await fetchJSON('./lib/projects.json'); // ✅ Correct path for homepage
        console.log("Fetched projects:", projects);

        if (projects.length === 0) {
            console.warn("No projects found in JSON!");
        }

        const latestProjects = projects.slice(0, 3); // ✅ Show only first 3 projects
        renderProjects(latestProjects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}

displayLatestProjects();

import { fetchGitHubData } from './global.js';

async function displayGitHubStats() {
    const githubData = await fetchGitHubData('marshami');  // Replace with your username
    const profileStats = document.querySelector('#profile-stats');

    if (profileStats) {
        profileStats.innerHTML = `
            <dl>
                <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                <dt>Followers:</dt><dd>${githubData.followers}</dd>
                <dt>Following:</dt><dd>${githubData.following}</dd>
            </dl>
        `;
    }
}

displayGitHubStats();
