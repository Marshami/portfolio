console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

console.log("✅ D3 Loaded:", d3);

// ====================
// 🎯 Step 3: Load Project Data and Prepare Pie Chart
// ====================

async function loadProjects() {
    console.log("Loading projects from JSON...");

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("No .projects container found!");
        return;
    }

    // ✅ Determine correct JSON path
    const jsonPath = window.location.pathname.includes('/projects/')
        ? '../lib/projects.json'  // ✅ Correct path for /projects/index.html
        : './lib/projects.json';  // ✅ Correct path for home page

    try {
        const projects = await fetchJSON(jsonPath);
        console.log("✅ Fetched projects:", projects);

        renderProjects(projects, projectsContainer, 'h2');
        renderPieChart(projects); // ✅ Render Pie Chart with project data

    } catch (error) {
        console.error("❌ Error fetching projects:", error);
    }
}

// ====================
// 🎯 Step 1.5 - Step 3: Generate Pie Chart Based on Project Data
// ====================

function renderPieChart(projects) {
    // ✅ Group projects by year and count occurrences
    let rolledData = d3.rollups(
        projects,
        v => v.length,
        d => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    console.log("✅ Processed Pie Data:", data);

    // ✅ Create Pie Generator (Computes startAngle & endAngle for each slice)
    let pieGenerator = d3.pie().value(d => d.value);
    let arcData = pieGenerator(data);  // ✅ Generates multiple slices

    // ✅ Create an Arc Generator (Defines how slices are drawn)
    let arcGenerator = d3.arc()
        .innerRadius(0)  // Ensures it's a pie chart (not a donut)
        .outerRadius(50); // Defines the size of the pie

    // ✅ D3 Color Scale to Assign Different Colors
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // ✅ Select the `<svg>` container
    let svg = d3.select('#projects-pie-plot');

    console.log("✅ Selected SVG:", svg);

    // ✅ Clear old chart
    svg.selectAll('*').remove();

    // ✅ Bind `arcData` to `path` elements and create pie slices
    svg.selectAll('path')
        .data(arcData)
        .join('path')
        .attr('d', arcGenerator) // ✅ Generates correct arc for each slice
        .attr('fill', (d, i) => colors(i)) // ✅ Assigns a different color to each slice
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('click', (event, d) => filterProjectsByYear(d.data.label)); // ✅ Step 5: Click to filter projects

    console.log("✅ Pie chart should now be visible!");

    // ✅ Step 2: Add a Legend
    renderLegend(data, colors);
}

// ====================
// 🎯 Step 2: Add a Legend
// ====================

function renderLegend(data, colors) {
    let legend = d3.select('.legend');

    // ✅ Clear old legend
    legend.selectAll('*').remove();

    // ✅ Create legend items dynamically
    legend.selectAll('li')
        .data(data)
        .join('li')
        .style('color', (d, i) => colors(i)) // Assign correct color
        .html(d => `<span class="swatch" style="background:${colors(d.label)}"></span> ${d.label} <em>(${d.value})</em>`)
        .on('click', (event, d) => filterProjectsByYear(d.label)); // ✅ Step 5: Click to filter projects
}

// ====================
// 🎯 Step 5: Filter Projects When Clicking Pie Slice or Legend
// ====================

function filterProjectsByYear(year) {
    console.log(`✅ Filtering projects by year: ${year}`);

    let filteredProjects = projects.filter(project => project.year === year);

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
}

// ====================
// 🎯 Step 4: Search Projects in Real Time
// ====================

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    let query = event.target.value.toLowerCase();

    let filteredProjects = projects.filter(project => 
        Object.values(project).join(' ').toLowerCase().includes(query)
    );

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects); // ✅ Update the pie chart dynamically
});

// ✅ Load Projects and Render Everything
loadProjects();