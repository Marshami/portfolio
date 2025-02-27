console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

console.log("✅ D3 Loaded:", d3);

// ====================
// 🎯 Global Variables
// ====================
let allProjects = [];   // Stores all projects loaded from JSON
let selectedYear = null;  // Tracks which year is selected (pie slice / legend)
let searchQuery = '';     // Tracks the current search input

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

    // Determine correct JSON path
    const jsonPath = window.location.pathname.includes('/projects/')
        ? '../lib/projects.json'
        : './lib/projects.json';

    try {
        allProjects = await fetchJSON(jsonPath); // Store projects globally
        console.log("✅ Loaded projects:", allProjects);

        // Initially render everything (no filters yet)
        filterProjects();

    } catch (error) {
        console.error("❌ Error fetching projects:", error);
    }
}

loadProjects();

// ====================
// 🎯 Step 1.5 - Step 3: Generate Pie Chart Based on Filtered Data
// ====================

function renderPieChart(projects) {
    let rolledData = d3.rollups(
        projects,
        v => v.length,
        d => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    // Create a color scale based on each year label
    let colorScale = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(data.map(d => d.label));

    let pieGenerator = d3.pie().value(d => d.value);
    let arcData = pieGenerator(data);

    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(80);

    let svg = d3.select('#projects-pie-plot');
    svg.selectAll('*').remove(); // Clear old chart

    svg.selectAll('path')
        .data(arcData)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', d => colorScale(d.data.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('click', (event, d) => {
            // Toggle selected year
            selectedYear = (selectedYear === d.data.label) ? null : d.data.label;
            filterProjects(); // Apply combined filters (search + year)
        });

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
        .on('click', (event, d) => {
            // Toggle selected year
            selectedYear = (selectedYear === d.label) ? null : d.label;
            filterProjects(); // Apply combined filters (search + year)
        });
}

// ====================
// 🎯 Step 5: Filter Projects (Combined Search + Pie Slice Filter)
// ====================

function filterProjects() {
    // Apply both filters: searchQuery and selectedYear
    let filteredProjects = allProjects.filter(project => {
        let matchesSearch = Object.values(project).join(' ').toLowerCase().includes(searchQuery);
        let matchesYear = selectedYear ? project.year === selectedYear : true;
        return matchesSearch && matchesYear;
    });

    // Render the filtered list and pie chart
    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects);
}

// ====================
// 🎯 Step 4: Search Projects in Real Time
// ====================

let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value.toLowerCase(); // Store the new query
    filterProjects(); // Apply combined filters
});

// End of file