console.log("✅ D3 script is running...");

// ====================
// 🎯 Step 1: Load Data
// ====================

let data = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        commit: row.commit,
        author: row.author,
        date: new Date(row.date),
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
    const width = 1000, height = 600, margin = 50;
    
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin} ${height + margin}`)
        .append("g")
        .attr("transform", `translate(${margin}, ${margin})`);

    // X Scale - Time (Commit Timestamp)
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    // Y Scale - Hour of the Day
    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    // Dot Size Scale - Based on Lines Edited
    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([3, 15]);

    // X Axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    // Y Axis
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    // Dots (Commits)
    const dots = svg.append("g").selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.datetime.getHours()))
        .attr("r", d => rScale(d.line))
        .attr("fill", "steelblue")
        .style("opacity", 0.7)
        .on("mouseenter", (event, d) => showTooltip(event, d))
        .on("mouseleave", () => d3.select("#commit-tooltip").attr("hidden", true));

    // ====================
    // 🎯 Step 4: Add Brushing for Selection
    // ====================

    const brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("end", (event) => {
            const selection = event.selection;
            if (!selection) return;

            const [[x0, y0], [x1, y1]] = selection;

            const selectedCommits = data.filter(d => {
                let x = xScale(d.datetime);
                let y = yScale(d.datetime.getHours());
                return x >= x0 && x <= x1 && y >= y0 && y <= y1;
            });

            console.log("🔍 Selected Commits:", selectedCommits);
        });

    svg.append("g").call(brush);

    console.log("✅ Scatter Plot Created");
}

// ====================
// 🎯 Step 5: Add Tooltip for Hover
// ====================

function showTooltip(event, commit) {
    d3.select("#commit-link").attr("href", `https://github.com/YOUR_REPO/commit/${commit.commit}`).text(commit.commit);
    d3.select("#commit-date").text(commit.date.toDateString());
    d3.select("#commit-time").text(commit.datetime.toLocaleTimeString());
    d3.select("#commit-author").text(commit.author);
    d3.select("#commit-lines").text(commit.line);

    const tooltip = d3.select("#commit-tooltip")
        .attr("hidden", null)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`);
}