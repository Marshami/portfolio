console.log("✅ D3 script is running...");

// ====================
// 🚀 Global Data Array
// ====================
let data = [];

// ====================
// 🚀 Load Data (loc.csv)
// ====================
async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        commit: row.commit,
        author: row.author,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
        line: +row.line, 
        depth: +row.depth,   
        length: +row.length,
    }));

    console.log("✅ Loaded Data:", data);

    // 1) Display summary stats
    displayStats();

    // 2) Create scatterplot
    createScatterplot();
}

// ====================
// 🚀 Display Summary Stats
// ====================
function displayStats() {
    const totalCommits = new Set(data.map(d => d.commit)).size;
    const totalLines = d3.sum(data, d => d.line);
    const avgFileLen = d3.mean(data, d => d.length);

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

    // ✅ Remove existing SVG before appending a new one
    d3.select("#chart").selectAll("svg").remove();

    const width = 1000, height = 600;

    // 1) Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    console.log("✅ SVG Created");

    // 2) Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([50, width - 50]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - 50, 50]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([2, 30]);

    console.log("✅ Scales Created: X & Y");

    // 3) Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height - 50})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .attr("transform", `translate(50, 0)`)
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    console.log("✅ Axes Added");

    // ✅ Ensure tooltip stays in DOM & is not removed
    let tooltip = d3.select("#commit-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("dl")
            .attr("id", "commit-tooltip")
            .attr("class", "info tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("box-shadow", "2px 2px 10px rgba(0,0,0,0.2)")
            .style("visibility", "hidden");
    }

    // 4) Plot Circles
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
            const tooltipWidth = tooltip.node().getBoundingClientRect().width;
            const tooltipHeight = tooltip.node().getBoundingClientRect().height;

            let xPos = event.pageX + 10;
            let yPos = event.pageY - tooltipHeight - 10;

            if (xPos + tooltipWidth > window.innerWidth) {
                xPos = event.pageX - tooltipWidth - 10;
            }
            if (yPos < 0) {
                yPos = event.pageY + 10;
            }

            tooltip.style("left", `${xPos}px`)
                   .style("top", `${yPos}px`);
        })
        .on("mouseleave", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this).attr("fill-opacity", 0.7);
        });

    // 6) Add Brushing with Highlight
    const brush = d3.brush()
        .on("start brush end", (event) => {
            if (!event.selection) return;
            const [[x0, y0], [x1, y1]] = event.selection;

            dots.selectAll("circle")
                .attr("fill", d => {
                    const cx = xScale(d.datetime);
                    const cy = yScale(d.datetime.getHours());
                    return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? "red" : "steelblue";
                });
        });

    svg.append("g").call(brush);
    dots.raise();

    console.log("✅ Scatter Plot Created with", data.length, "points");
}

// ====================
// 🚀 Tooltip Content
// ====================
function updateTooltipContent(commit) {
    d3.select("#commit-link")
      .attr("href", `https://github.com/YOUR_REPO/commit/${commit.commit}`)
      .text(commit.commit);

    d3.select("#commit-date").text(commit.date.toDateString());
    d3.select("#commit-time").text(commit.datetime.toLocaleTimeString());
    d3.select("#commit-author").text(commit.author);
    d3.select("#commit-lines").text(commit.line);
}

// ====================
// 🚀 DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    console.log("✅ D3 script loaded and visualizations created!");
});