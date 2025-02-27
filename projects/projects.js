import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);  // Controls the arc's size

let arc = arcGenerator({
    startAngle: 0,
    endAngle: 2 * Math.PI
});

console.log("Arc Path Data:", arc);  // ✅ Debugging output

d3.select('#projects-pie-plot')
    .append('path')
    .attr('d', arc)
    .attr('fill', 'red');  // ✅ Change this to any color

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