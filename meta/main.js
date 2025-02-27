console.log("✅ D3 script is running...");

// Load Data
let data = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        commit: row.commit,
        author: row.author,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
        line: +row.line,  // Convert strings to numbers
        depth: +row.depth,
        length: +row.length,
    }));

    console.log("✅ Loaded Data:", data);

    // Compute and display stats
    displayStats();

    // Create scatterplot
    createScatterplot();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

// ====================
// 🎯 Step 2: Display Summary Stats
// ====================

function displayStats() {
    let totalCommits = new Set(data.map(d => d.commit)).size;
    let totalLines = d3.sum(data, d => d.line);
    let avgFileLength = d3.mean(data, d => d.length);

    const statsContainer = d3.select("#stats").append("dl").attr("class", "stats");
    
    statsContainer.append("dt").text("Total Commits");
    statsContainer.append("dd").text(totalCommits);
    
    statsContainer.append("dt").text("Total Lines of Code (LOC)");
    statsContainer.append("dd").text(totalLines);
    
    statsContainer.append("dt").text("Average File Length");
    statsContainer.append("dd").text(avgFileLength.toFixed(2));

    console.log("✅ Stats Computed & Displayed");
}

// ====================
// 🎯 Step 3: Create Scatterplot
// ====================

function createScatterplot() {
    const width = 1000, height = 600;
    
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    svg.append("g").selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.datetime.getHours()))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .on("mouseenter", (event, d) => updateTooltipContent(d))
        .on("mouseleave", () => d3.select("#commit-tooltip").attr("hidden", true));

    console.log("✅ Scatter Plot Created");
}

// ====================
// 🎯 Step 4: Add Tooltip
// ====================

function updateTooltipContent(commit) {
    d3.select("#commit-link").attr("href", `https://github.com/YOUR_REPO/commit/${commit.commit}`).text(commit.commit);
    d3.select("#commit-date").text(commit.date.toDateString());
    d3.select("#commit-time").text(commit.datetime.toLocaleTimeString());
    d3.select("#commit-author").text(commit.author);
    d3.select("#commit-lines").text(commit.line);

    d3.select("#commit-tooltip").attr("hidden", null);
}
