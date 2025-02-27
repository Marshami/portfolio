console.log("✅ D3 script is running...");

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js'; // ✅ Correct path from /projects/

console.log("✅ D3 Loaded:", d3);

// ====================
// 🎯 Global Variables
// ====================
let allProjects = [];    // Stores all projects loaded from JSON
let selectedYear = null; // Tracks which year is selected (pie slice / legend)
let searchQuery = '';    // Tracks the current search input

// ====================
// 🎯 Step 3: Load Project Data and Prepare Pie Chart
// ====================

async function loadProjects() {
    console.log("Loading projects from JSON...");

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
        console.error("❌ No .projects container found!");
        return;
    }

    // Determine correct JSON path
    const jsonPath = window.location.pathname.includes('/projects/')
        ? '../lib/projects.json'
        : './lib/projects.json';

    try {
        allProjects = await fetchJSON(jsonPath); // Store projects globally
        console.log("✅ Loaded projects:", allProjects);

        // Initially render everything (no filters applied)
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
    console.log("🔄 Rendering Pie Chart with", projects.length, "projects");

    let rolledData = d3.rollups(
        projects,
        v => v.length,
        d => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    let svg = d3.select('#projects-pie-plot');
    svg.selectAll('*').remove(); // ✅ Clear old chart

    // ✅ If no data, show "No Projects Found" and return
    if (data.length === 0) {
        console.warn("⚠️ No projects available!");
        d3.select('.chart-container').append('p')
            .attr('class', 'no-projects-msg')
            .text("No Projects Found");
        return;
    }

    // ✅ Remove any old "No Projects Found" messages if projects exist
    d3.select('.no-projects-msg').remove();

    // ✅ Persistent color scale based on years
    let allYears = [...new Set(allProjects.map(project => project.year))];
    let colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(allYears);

    let pieGenerator = d3.pie().value(d => d.value);
    let arcData = pieGenerator(data);

    let arcGenerator = d3.arc().innerRadius(0).outerRadius(80);

    let paths = svg.selectAll('path')
        .data(arcData)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', d => colorScale(d.data.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('opacity', d => (selectedYear && d.data.label !== selectedYear) ? 0.4 : 1)
        .on('click', (event, d) => {
            console.log("🔄 Pie Slice Clicked:", d.data.label);
            selectedYear = (selectedYear === d.data.label) ? null : d.data.label;
            filterProjects();
        })
        .on('mouseover', function (event, d) {
            paths.style('opacity', p => (p.data.label !== d.data.label) ? 0.4 : 1);
        })
        .on('mouseout', function () {
            paths.style('opacity', d => (selectedYear && d.data.label !== selectedYear) ? 0.4 : 1);
        });

    renderLegend(data, colorScale);
}

// ====================
// 🎯 Step 2: Add a Legend
// ====================

function renderLegend(data, colorScale) {
    console.log("🔄 Rendering Legend");

    let legend = d3.select('.legend');
    legend.selectAll('*').remove();

    legend.selectAll('li')
        .data(data)
        .join('li')
        .html(d => `
            <span class="swatch" style="background:${colorScale(d.label)}"></span> 
            ${d.label} <em>(${d.value})</em>
        `)
        .style('opacity', d => (selectedYear && d.label !== selectedYear) ? 0.4 : 1) // ✅ Desaturate in legend
        .on('click', (event, d) => {
            console.log("🔄 Legend Item Clicked:", d.label);
            selectedYear = (selectedYear === d.label) ? null : d.label;
            filterProjects();
        });
}

// ====================
// 🎯 Step 5: Filter Projects (Combined Search + Pie Slice Filter)
// ====================

function filterProjects() {
    console.log(`🔄 Filtering projects | Search: "${searchQuery}" | Year: "${selectedYear}"`);

    if (!allProjects.length) {
        console.warn("⚠️ No projects available for filtering!");
        return;
    }

    let filteredProjects = allProjects.filter(project => {
        let matchesSearch = Object.values(project).join(' ').toLowerCase().includes(searchQuery);
        let matchesYear = selectedYear ? project.year === selectedYear : true;
        return matchesSearch && matchesYear;
    });

    console.log("✅ Filtered Projects:", filteredProjects);

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects);
}

// ====================
// 🎯 Step 4: Search Projects in Real Time
// ====================

let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value.toLowerCase(); // ✅ Store the new query
    console.log("🔄 Search Query Updated:", searchQuery);
    filterProjects();
});

// End of file