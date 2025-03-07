console.log("✅ D3 script is running...");

// ====================
// 🚀 GLOBAL ARRAYS & SETTINGS
// ====================
let data = [];               // All rows from loc.csv
let commits = [];            // Distilled commits for scrollytelling
let VISIBLE_COUNT = 6;       // How many scrollytelling items to show at once
let ITEM_HEIGHT = 120;       // Pixel height per scrollytelling item

// For scrollytelling elements:
let scrollContainer, spacer, itemsContainer;

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
        type: row.type, // e.g. "css", "js", "html"
        hour: new Date(row.datetime).getHours(), // for time-of-day analysis
    }));

    console.log("✅ Loaded Data:", data);

    // We can group by commit to produce a simpler “commits” array
    // Each commit entry can hold:
    //   commit ID, author, datetime, totalLines, plus an array of lines
    //   to facilitate the file-size “race.”
    const grouped = d3.groups(data, d => d.commit)
      .map(([commitId, rows]) => {
         const firstRow = rows[0];
         return {
           commit: commitId,
           author: firstRow.author,
           datetime: firstRow.datetime,
           hour: firstRow.hour,
           lines: rows.map(r => ({
             file: r.file,
             type: r.type,
             lineCount: r.line
           })),
           totalLines: d3.sum(rows, r => r.line)
         };
      });

    // Sort commits by date ascending:
    grouped.sort((a, b) => a.datetime - b.datetime);

    commits = grouped;
    console.log("✅ Aggregated commits for scrollytelling:", commits);

    // Initialize everything
    displayStats();     // summary stats
    createScatterplot(); // initial scatterplot
    initScrollytelling(); // set up scrollytelling
    renderItems(0);      // draw the first scrollytelling “page”

    // Initialize the file size “race”
    displayCommitFiles(commits);  // show all commits by default
}

// ====================
// 🚀 Display Summary Stats (Including Most Active Time of Day)
// ====================
function displayStats() {
    const totalCommits = new Set(data.map(d => d.commit)).size;
    const totalLines = d3.sum(data, d => d.line);

    // ✅ Group commits by time of day
    const timeCategories = {
        "Morning": data.filter(d => d.hour >= 6 && d.hour < 12).length,
        "Afternoon": data.filter(d => d.hour >= 12 && d.hour < 18).length,
        "Evening": data.filter(d => d.hour >= 18 && d.hour < 24).length,
        "Night": data.filter(d => d.hour >= 0 && d.hour < 6).length
    };

    // ✅ Find the time of day with the most commits
    const mostActiveTime = Object.entries(timeCategories)
        .reduce((max, entry) => (entry[1] > max[1] ? entry : max), ["None", 0])[0];

    console.log("Debug Stats:");
    console.log("Total Commits:", totalCommits);
    console.log("Total LOC:", totalLines);
    console.log("Most Active Time of Day:", mostActiveTime);

    // Clear previous stats
    d3.select("#stats").html("");

    const stats = d3.select("#stats")
        .append("dl")
        .attr("class", "stats");

    stats.append("dt").text("Total Commits");
    stats.append("dd").text(totalCommits);

    stats.append("dt").text("Total Lines of Code (LOC)");
    stats.append("dd").text(totalLines);

    stats.append("dt").text("Most Active Time of Day");
    stats.append("dd").text(mostActiveTime);

    console.log("✅ Stats Computed & Displayed");
}

// ====================
// 🚀 Create Scatterplot with Grid Lines
// ====================
function createScatterplot() {
    console.log("🔄 Creating Scatterplot...");

    if (data.length === 0) {
        console.error("❌ No data available for scatterplot!");
        return;
    }

    d3.select("#chart").selectAll("svg").remove(); // Remove previous chart

    const width = 1000, height = 600;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - margin.bottom, margin.top]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([3, 25]);

    // Add Grid Lines
    const xAxisGrid = d3.axisBottom(xScale)
        .tickSize(-height + margin.top + margin.bottom)
        .tickFormat("")
        .ticks(10);

    const yAxisGrid = d3.axisLeft(yScale)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat("")
        .ticks(10);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxisGrid)
        .selectAll("line")
        .style("stroke", "#ddd")
        .style("stroke-opacity", 0.5)
        .style("stroke-width", 0.7);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxisGrid)
        .selectAll("line")
        .style("stroke", "#ddd")
        .style("stroke-opacity", 0.5)
        .style("stroke-width", 0.7);

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
        .attr("cy", d => yScale(d.hour))
        .attr("r", d => rScale(d.line))
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.7);

    console.log("✅ Scatter Plot Created");

    // Add Brushing with Highlight
    const brush = d3.brush()
        .on("start brush end", (event) => {
            if (!event.selection) {
                dots.selectAll("circle")
                    .attr("fill", "steelblue")
                    .attr("fill-opacity", 0.7);
                updateSummary([]);
                return;
            }

            const [[x0, y0], [x1, y1]] = event.selection;

            const selectedData = data.filter(d => {
                const cx = xScale(d.datetime);
                const cy = yScale(d.hour);
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
            });

            dots.selectAll("circle")
                .attr("fill", d => selectedData.includes(d) ? "red" : "steelblue")
                .attr("fill-opacity", d => selectedData.includes(d) ? 1 : 0.2);

            updateSummary(selectedData);
        });

    svg.append("g").call(brush);
    dots.raise();
}

function updateSummary(selectedData) {
    d3.select("#selected-summary").remove();

    const summary = d3.select("#chart")
        .append("div")
        .attr("id", "selected-summary")
        .style("margin-top", "20px")
        .style("text-align", "center");

    // If no commits are selected
    if (selectedData.length === 0) {
        summary.append("p").text("No commits selected").style("font-style", "italic");
        return;
    }

    const totalSelected = selectedData.length;
    const typeCounts = d3.rollups(
      selectedData,
      v => d3.sum(v, d => d.line),
      d => d.type
    );
    const totalLines = d3.sum(selectedData, d => d.line);

    summary.append("p").text(`${totalSelected} commits selected`);

    // Quick table layout
    const table = summary.append("div")
        .attr("class", "summary-table")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("gap", "50px")
        .style("margin-top", "10px");

    typeCounts.forEach(([type, lines]) => {
        const percentage = ((lines / totalLines) * 100).toFixed(1);

        const column = table.append("div")
            .attr("class", "summary-column")
            .style("text-align", "center")
            .style("font-family", "monospace");

        column.append("p").html(`<strong>${type.toUpperCase()}</strong>`);
        column.append("p").text(`${lines} lines`);
        column.append("p").text(`(${percentage}%)`);
    });
}

// ====================
// 🚀 LAB 8 ADDITION: SCROLLYTELLING
// ====================
function initScrollytelling() {
    scrollContainer = d3.select("#scroll-container");
    spacer = d3.select("#spacer");
    itemsContainer = d3.select("#items-container");

    // We have as many items as commits
    let numItems = commits.length;
    let totalHeight = Math.max(0, (numItems - 1) * ITEM_HEIGHT);
    spacer.style("height", totalHeight + "px");

    // On scroll, figure out which chunk of commits to show
    scrollContainer.on("scroll", () => {
        const scrollTop = scrollContainer.property("scrollTop");
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, numItems - VISIBLE_COUNT));
        renderItems(startIndex);
    });
}

// We'll create a narrative chunk for each commit
function renderItems(startIndex) {
    // Clear old items
    itemsContainer.selectAll("div.scrolly-item").remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    const slice = commits.slice(startIndex, endIndex);

    // Create new items
    itemsContainer.selectAll("div.scrolly-item")
      .data(slice)
      .join("div")
      .attr("class", "scrolly-item")
      .style("position", "absolute")
      .style("top", (_, i) => `${i * ITEM_HEIGHT}px`)
      .style("height", ITEM_HEIGHT + "px")
      .style("padding", "0.5em")
      .style("border-bottom", "1px solid #eee")
      .html(d => {
        const dt = d.datetime.toLocaleString();
        return `
          <p><strong>Commit:</strong> ${d.commit}</p>
          <p>Date/Time: ${dt}</p>
          <p>Lines edited: ${d.totalLines}</p>
        `;
      });

    // If you want to filter your scatterplot or file chart to only these commits:
    // let commitIds = new Set(slice.map(d => d.commit));
    // updateScatterplotToSubset(commitIds);
    // displayCommitFiles(slice);
}

// ====================
// 🚀 LAB 8 ADDITION: FILE SIZE RACE (UNIT CHART)
// ====================
function displayCommitFiles(someCommits) {
    // Flatten lines from all commits
    let allLines = [];
    someCommits.forEach(c => {
        // c.lines = array of { file, type, lineCount }
        // We'll replicate each lineCount as that many lines or just treat lineCount as 1 each
        // For a simpler approach, treat lineCount as if each is 1 line
        // Or, if your data is 1 row = 1 line, just push them directly
        // For demonstration, we’ll just push each entry once
        // but you can get fancier if needed
        allLines.push(...c.lines);
    });

    // Group lines by file
    let files = d3.groups(allLines, d => d.file)
      .map(([file, lines]) => ({
        file,
        lines
      }));
    // Sort by number of lines descending
    files.sort((a, b) => b.lines.length - a.lines.length);

    // Clear existing
    d3.select(".files").selectAll("div").remove();

    // Re-bind
    const fileDiv = d3.select(".files")
      .selectAll("div")
      .data(files)
      .join("div");

    // dt: show file name & line count
    fileDiv.append("dt")
      .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

    // dd: unit dots
    fileDiv.append("dd")
      .selectAll("div.line")
      .data(d => d.lines)
      .join("div")
      .attr("class", "line") // styled in CSS
      .style("background", d => {
        // color by file type or something
        // if your CSV has `d.type`, you can do an ordinal scale
        if (d.type === "js") return "#ff7f0e";
        if (d.type === "css") return "#1f77b4";
        if (d.type === "html") return "#2ca02c";
        return "gray";
      });
}

// ====================
// 🚀 DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    console.log("✅ D3 script loaded and visualizations created!");
});