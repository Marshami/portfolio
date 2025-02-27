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
        // Combine date & timezone to get a local date object
        date: new Date(row.date + 'T00:00' + row.timezone),
        // Full datetime object
        datetime: new Date(row.datetime),
        line: +row.line,       // # of lines in this row
        depth: +row.depth,     // Nesting depth in code
        length: +row.length,   // Length of that line
    }));

    console.log("✅ Loaded Data:", data);

    // 1) Display summary stats (commits, lines, file length, etc.)
    displayStats();

    // 2) Create scatterplot (commits by time of day)
    createScatterplot();
}

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
    const width = 1000, height = 600;

    // 1) Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // 2) Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    // Y axis is 0–24 hours
    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    // Radius scale based on # lines in each commit
    const [minLine, maxLine] = d3.extent(data, d => d.line);
    const rScale = d3.scaleSqrt()
        .domain([minLine, maxLine])
        .range([2, 30]); // Adjust max radius as needed

    // 3) Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

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
        .on("mouseenter", (event, d) => {
            updateTooltipContent(d);
            d3.select("#commit-tooltip").attr("hidden", null);
            // Make hovered dot fully opaque
            d3.select(event.currentTarget).attr("fill-opacity", 1);
        })
        .on("mousemove", (event) => {
            // Move tooltip with mouse
            d3.select("#commit-tooltip")
              .style("left", event.pageX + "px")
              .style("top", event.pageY + "px");
        })
        .on("mouseleave", (event) => {
            d3.select("#commit-tooltip").attr("hidden", true);
            d3.select(event.currentTarget).attr("fill-opacity", 0.7);
        });

    // 5) Brush for selecting commits
    const brush = d3.brush()
        .on("start brush end", (event) => {
            // event.selection = [[x0, y0], [x1, y1]]
            if (!event.selection) return; // no selection
            const [[x0, y0], [x1, y1]] = event.selection;
            
            // Filter data within the brush
            const selectedData = data.filter(d => {
                const cx = xScale(d.datetime);
                const cy = yScale(d.datetime.getHours());
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
            });

            console.log("Selected commits:", selectedData);
        });

    // Place the brush below the dots so tooltips still work
    const brushGroup = svg.append("g").call(brush);
    // Raise the dots above the brush overlay
    dots.raise();

    console.log("✅ Scatter Plot Created");
}

function createScatterplot() {
    const width = 1000, height = 600;

    // 1) Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // 2) Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([2, 30]);

    // 3) Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    // 4) Tooltip Setup
    const tooltip = d3.select("#commit-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("box-shadow", "2px 2px 10px rgba(0,0,0,0.2)");

    // 5) Plot Circles
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

            // Prevent tooltip from going out of bounds
            if (x + tooltipWidth > window.innerWidth) {
                x = event.pageX - tooltipWidth - 10;
            }
            if (y < 0) {
                y = event.pageY + 10;
            }

            tooltip.style("left", `${x}px`)
                   .style("top", `${y}px`);
        })
        .on("mouseleave", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this).attr("fill-opacity", 0.7);
        });

    // 6) Brush for selecting commits
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

    console.log("✅ Scatter Plot Created");
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