console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

console.log("✅ D3 Loaded:", d3);

// ====================
// 🎯 Step 3: Load Project Data and Prepare Pie Chart
// ====================

let allProjects = []; // ✅ Store project data globally

async function loadProjects() {
    console.log("Loading projects from JSON...");

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("No .projects container found!");
        return;
    }

    const jsonPath = window.location.pathname.includes('/projects/')
        ? '../lib/projects.json'
        : './lib/projects.json';

    try {
        allProjects = await fetchJSON(jsonPath); // ✅ Store projects globally
        console.log("✅ Loaded projects:", allProjects);

        renderProjects(allProjects, projectsContainer, 'h2');
        renderPieChart(allProjects); // ✅ Initial Pie Chart Render

    } catch (error) {
        console.error("❌ Error fetching projects:", error);
    }
}

loadProjects();

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

    // ✅ Fix: Use a consistent color scale based on year labels
    let colorScale = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(data.map(d => d.label)); // Maps colors to years

    let pieGenerator = d3.pie().value(d => d.value);
    let arcData = pieGenerator(data);

    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(80); // ✅ Ensures slices maintain correct proportions

    let svg = d3.select('#projects-pie-plot');

    svg.selectAll('*').remove();

    svg.selectAll('path')
        .data(arcData)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', d => colorScale(d.data.label)) // ✅ Assigns color by year
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('click', (event, d) => filterProjectsByYear(d.data.label));

    console.log("✅ Pie chart should now be visible!");

    // ✅ Step 2: Add a Legend
    renderLegend(data, colorScale);
}

// ====================
// 🎯 Step 2: Add a Legend
// ====================

function renderLegend(data, colorScale) {
    let legend = d3.select('.legend');

    legend.selectAll('*').remove();

    legend.selectAll('li')
        .data(data)
        .join('li')
        .html(d => `
            <span class="swatch" style="background:${colorScale(d.label)}"></span> 
            ${d.label} <em>(${d.value})</em>
        `)
        .on('click', (event, d) => filterProjectsByYear(d.label)); // ✅ Allows filtering by clicking legend
}

// ====================
// 🎯 Step 5: Filter Projects When Clicking Pie Slice or Legend
// ====================

function filterProjectsByYear(year) {
    console.log(`✅ Filtering projects by year: ${year}`);

    let filteredProjects = projects.filter(project => project.year === year);

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects); // ✅ Ensures pie chart updates dynamically
}

// ====================
// 🎯 Step 4: Search Projects in Real Time
// ====================

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    let query = event.target.value.toLowerCase();

    // ✅ Filter the projects using `lib/projects.json`
    let filteredProjects = allProjects.filter(project => 
        Object.values(project).join(' ').toLowerCase().includes(query)
    );

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects); // ✅ Update pie chart with filtered data
});

// ✅ Load Projects and Render Everything
loadProjects();