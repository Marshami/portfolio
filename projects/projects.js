console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

console.log("✅ D3 Loaded:", d3);

// ====================
// 🎯 Step 1.4: Creating a Static Pie Chart
// ====================

// Sample data: Each number represents a slice size
let data = [1, 2, 3, 4, 5];

// ✅ Create a D3 Pie Generator (Computes startAngle & endAngle for each slice)
let pieGenerator = d3.pie();  
let arcData = pieGenerator(data);  // ✅ This generates multiple slices

// ✅ Create an Arc Generator (Defines how slices are drawn)
let arcGenerator = d3.arc()
    .innerRadius(0)  // Ensures it's a pie chart (not a donut)
    .outerRadius(50); // Defines the size of the pie

// ✅ D3 Color Scale to Assign Different Colors
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// ✅ Select the `<svg>` container
let svg = d3.select('#projects-pie-plot');

console.log("✅ Selected SVG:", svg);

// ✅ Remove the old full-circle arc
svg.selectAll('path').remove();

// ✅ Bind `arcData` to `path` elements and create pie slices
svg.selectAll('path')
    .data(arcData)  // ✅ Use calculated slice data
    .join('path')
    .attr('d', arcGenerator) // ✅ Generates correct arc for each slice
    .attr('fill', (d, i) => colors(i)) // ✅ Assigns a different color to each slice
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

console.log("✅ Pie chart should now be visible!");

// ====================
// ✅ Load Projects JSON & Render Projects
// ====================

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