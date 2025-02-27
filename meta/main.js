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
        type: row.type, // File type (css, js, html)
    }));

    console.log("✅ Loaded Data:", data);

    displayStats();
    createScatterplot();
}

// ====================
// 🚀 Display Summary Stats
// ====================
function displayStats() {
    const totalCommits = new Set(data.map(d => d.commit)).size;
    const totalLines = d3.sum(data, d => d.line);

    const stats = d3.select("#stats")
        .append("dl")
        .attr("class", "stats");

    stats.append("dt").text("Total Commits");
    stats.append("dd").text(totalCommits);

    stats.append("dt").text("Total Lines of Code (LOC)");
    stats.append("dd").text(totalLines);

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

    d3.select("#chart").selectAll("svg").remove(); // ✅ Remove previous chart

    const width = 1000, height = 600;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    console.log("✅ SVG Created");

    // Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - margin.bottom, margin.top]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([3, 25]); // ✅ Adjusted for better visualization

    console.log("✅ Scales Created");

    // Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height - margin.bottom})`)
       .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%a %d")));

    svg.append("g")
       .attr("transform", `translate(${margin.left}, 0)`)
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    console.log("✅ Axes Added");

    // Plot Circles
    const dots = svg.append("g").attr("class", "dots");
    dots.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.datetime.getHours()))
        .attr("r", d => rScale(d.line))
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.7);

    console.log("✅ Scatter Plot Created");

    // Add Brushing with Highlight
    const brush = d3.brush()
        .on("start brush end", (event) => {
            if (!event.selection) {
                dots.selectAll("circle").attr("fill", "steelblue").attr("fill-opacity", 0.7);
                updateSummary([]);
                return;
            }

            const [[x0, y0], [x1, y1]] = event.selection;

            const selectedData = data.filter(d => {
                const cx = xScale(d.datetime);
                const cy = yScale(d.datetime.getHours());
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
            });

            dots.selectAll("circle")
                .attr("fill", d => selectedData.includes(d) ? "red" : "steelblue")
                .attr("fill-opacity", d => selectedData.includes(d) ? 1 : 0.2); // ✅ Non-selected dots fade

            updateSummary(selectedData);
        });

    svg.append("g").call(brush);
    dots.raise();
}

// ====================
// 🚀 Update Summary Stats on Selection
// ====================
function updateSummary(selectedData) {
    d3.select("#selected-summary").remove();

    if (selectedData.length === 0) return;

    const totalSelected = selectedData.length;
    const typeCounts = d3.rollups(selectedData, v => d3.sum(v, d => d.line), d => d.type);
    const totalLines = d3.sum(selectedData, d => d.line);

    const summary = d3.select("#chart")
        .append("div")
        .attr("id", "selected-summary")
        .style("margin-top", "20px")
        .html(`<p>${totalSelected} commits selected</p>`);

    typeCounts.forEach(([type, lines]) => {
        const percentage = ((lines / totalLines) * 100).toFixed(1);
        summary.append("p").html(
            `<strong>${type.toUpperCase()}</strong><br>${lines} lines<br>(${percentage}%)`
        );
    });
}

// ====================
// 🚀 DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    console.log("✅ D3 script loaded and visualizations created!");
});