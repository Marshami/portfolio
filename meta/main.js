console.log("✅ D3 script is running...");

// ====================
// 🚀 Global Data Array
// ====================
let data = [];

// ====================
// 🚀 Load Data from `meta/loc.csv`
// ====================
async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        commit: row.commit,
        author: row.author,
        date: new Date(row.date),  // Convert to JS date object
        datetime: new Date(row.datetime),
        line: +row.line,           // Convert to number
        depth: +row.depth,
        length: +row.length
    }));

    console.log("✅ Loaded Data:", data);

    if (data.length === 0) {
        console.error("❌ No data available for visualization!");
        return;
    }

    // Display Summary Stats
    displayStats();

    // Create Scatterplot
    createScatterplot();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

// ====================
// 🚀 Display Summary Stats
// ====================
function displayStats() {
    let totalCommits = new Set(data.map(d => d.commit)).size;
    let totalLines   = d3.sum(data, d => d.line);
    let avgFileLen   = d3.mean(data, d => d.length);

    const stats = d3.select("#stats")
        .append("dl")
        .attr("class", "stats");

    stats.append("dt").text("Total Commits");
    stats.append("dd").text(totalCommits);

    stats.append("dt").text("Total Lines of Code (LOC)");
    stats.append("dd").text(totalLines);

    stats.append("dt").text("Average File Length");
    stats.append("dd").text(avgFileLen.toFixed(2));

    console.log("✅ Stats Computed & Displayed");
}

// ====================
// 🚀 Create Scatterplot
// ====================
function createScatterplot() {
    console.log("🔄 Creating Scatterplot...");

    if (data.length === 0) {
        console.error("❌ No data available for scatterplot!");
        return;
    }

    const width = 1000, height = 600;
    const margin = { top: 50, right: 50, bottom: 50, left: 80 };

    // Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    console.log("✅ SVG Created");

    // Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([2, 30]); // Adjust max radius as needed

    // Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    console.log("✅ Scales & Axes Added");

    // Create Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("id", "commit-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("box-shadow", "2px 2px 10px rgba(0,0,0,0.2)");

    // Plot Circles
    const dots = svg.append("g").attr("class", "dots");
    dots.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.datetime.getHours()))
        .attr("r", d => rScale(d.line))
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.7)
        .on("mouseenter", function (event, d) {
            updateTooltipContent(d);
            tooltip.style("visibility", "visible");
            d3.select(this).attr("fill-opacity", 1);
        })
        .on("mousemove", function (event) {
            let tooltipWidth = tooltip.node().getBoundingClientRect().width;
            let tooltipHeight = tooltip.node().getBoundingClientRect().height;
            let x = event.pageX + 10;
            let y = event.pageY - tooltipHeight - 10;

            if (x + tooltipWidth > window.innerWidth) x = event.pageX - tooltipWidth - 10;
            if (y < 0) y = event.pageY + 10;

            tooltip.style("left", `${x}px`).style("top", `${y}px`);
        })
        .on("mouseleave", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this).attr("fill-opacity", 0.7);
        });

    // Brush for selecting commits
    const brush = d3.brush()
        .on("start brush end", (event) => {
            if (!event.selection) return;
            const [[x0, y0], [x1, y1]] = event.selection;

            const selectedData = data.filter(d => {
                const cx = xScale(d.datetime);
                const cy = yScale(d.datetime.getHours());
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
            });

            console.log("Selected commits:", selectedData);
        });

    const brushGroup = svg.append("g").call(brush);
    dots.raise();

    console.log("✅ Scatter Plot Created with", data.length, "points");
}

// ====================
// 🚀 Tooltip Content
// ====================
function updateTooltipContent(commit) {
    d3.select("#commit-tooltip")
        .html(`
            <strong>Commit:</strong> <a href="https://github.com/YOUR_REPO/commit/${commit.commit}" target="_blank">${commit.commit}</a><br>
            <strong>Date:</strong> ${commit.date.toDateString()}<br>
            <strong>Time:</strong> ${commit.datetime.toLocaleTimeString()}<br>
            <strong>Author:</strong> ${commit.author}<br>
            <strong>Lines Edited:</strong> ${commit.line}
        `);
}

// ====================
// 🚀 DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    console.log("✅ D3 script loaded and visualizations created!");
});
