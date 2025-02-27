console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

console.log("✅ D3 Loaded:", d3);

let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

let arc = arcGenerator({
    startAngle: 0,
    endAngle: 2 * Math.PI
});

console.log("✅ Arc Path Data:", arc); // Debugging log

let svg = d3.select('#projects-pie-plot');

console.log("✅ Selected SVG:", svg); // Debugging log

svg.append('path')
    .attr('d', arc)
    .attr('fill', 'red')
    .attr('stroke', 'black') // Debugging border
    .attr('stroke-width', 2);

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