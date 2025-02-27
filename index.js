import { fetchJSON, renderProjects, fetchGitHubData } from './global.js'; // ✅ Import functions

console.log("✅ Homepage script running...");

async function displayLatestProjects() {
    console.log("Loading latest projects for homepage...");

    const projectsContainer = document.querySelector('.projects'); // ✅ Select container
    if (!projectsContainer) {
        console.error("❌ No .projects container found on homepage!");
        return;
    }

    try {
        const projects = await fetchJSON('./lib/projects.json'); // ✅ Fetch project data
        console.log("✅ Fetched projects:", projects);

        if (projects.length === 0) {
            console.warn("⚠️ No projects found in JSON!");
            projectsContainer.innerHTML = "<p>No recent projects available.</p>"; // Show message if empty
            return;
        }

        const latestProjects = projects.slice(0, 3); // ✅ Show only first 3 projects
        renderProjects(latestProjects, projectsContainer, 'h2'); // ✅ Render projects

    } catch (error) {
        console.error("❌ Error fetching projects:", error);
    }
}

displayLatestProjects();

async function displayGitHubStats() {
    console.log("Loading GitHub stats...");

    const profileStats = document.querySelector('#profile-stats');
    if (!profileStats) {
        console.error("❌ No GitHub stats container found!");
        return;
    }

    // ✅ Show a loading message while fetching data
    profileStats.innerHTML = `<p>Loading GitHub stats...</p>`;

    try {
        const githubData = await fetchGitHubData('marshami');  // ✅ Replace with your GitHub username

        console.log("✅ Fetched GitHub Data:", githubData);

        if (!githubData) {
            profileStats.innerHTML = `<p>❌ Error loading GitHub stats.</p>`;
            return;
        }

        profileStats.innerHTML = `
            <dl>
                <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                <dt>Followers:</dt><dd>${githubData.followers}</dd>
                <dt>Following:</dt><dd>${githubData.following}</dd>
            </dl>
        `;

    } catch (error) {
        console.error("❌ Error fetching GitHub stats:", error);
        profileStats.innerHTML = `<p>❌ Unable to load GitHub stats.</p>`;
    }
}

displayGitHubStats();