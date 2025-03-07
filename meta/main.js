console.log("✅ D3 script is running...");

// ===============
// GLOBALS
// ===============
let data = [];
let commits = [];

// For pinned scrollytelling:
let SCROLL_ITEM_HEIGHT = 180;   // each “step” is 180px tall
let VISIBLE_STEPS = 6;         // how many steps we render at once
let scrollContainer, spacer, stepsContainer;

// ===============
// Load Data
// ===============
async function loadData() {
  data = await d3.csv("loc.csv", (row) => ({
    commit: row.commit,
    author: row.author,
    file: row.file,
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
    line: +row.line,
    type: row.type,
    hour: new Date(row.datetime).getHours(),
  }));

  // Group rows by commit so we can easily display scrollytelling for each commit
  const grouped = d3.groups(data, d => d.commit)
    .map(([commitId, rows]) => {
      const first = rows[0];
      return {
        commit: commitId,
        author: first.author,
        datetime: first.datetime,
        totalLines: d3.sum(rows, r => r.line),
        lines: rows.map(r => ({
          file: r.file,
          type: r.type,
          lineCount: r.line
        })),
        hour: first.hour,
      };
    });

  // Sort commits by date ascending
  grouped.sort((a, b) => a.datetime - b.datetime);
  commits = grouped;

  console.log("✅ Loaded Data:", data);
  console.log("✅ Aggregated commits:", commits);

  // Now initialize your existing stuff
  displayStats();
  createScatterplot(); // your original chart
  setupPinnedChart();   // sets up a second pinned chart or reuses the same data
  initScrollytelling(); // sets up the scrollytelling on the right
  renderSteps(0);       // draw the first steps

  // Initialize file-size race
  displayCommitFiles(commits);
}

// ===============
// Original Display Stats
// ===============
function displayStats() {
  // (unchanged from your code)
  const totalCommits = new Set(data.map(d => d.commit)).size;
  const totalLines = d3.sum(data, d => d.line);

  const timeCategories = {
    "Morning": data.filter(d => d.hour >= 6 && d.hour < 12).length,
    "Afternoon": data.filter(d => d.hour >= 12 && d.hour < 18).length,
    "Evening": data.filter(d => d.hour >= 18 && d.hour < 24).length,
    "Night": data.filter(d => d.hour >= 0 && d.hour < 6).length
  };

  const mostActiveTime = Object.entries(timeCategories)
    .reduce((max, e) => (e[1] > max[1] ? e : max), ["None",0])[0];

  d3.select("#stats").html("");
  const dl = d3.select("#stats").append("dl").attr("class","stats");
  dl.append("dt").text("Total Commits");     dl.append("dd").text(totalCommits);
  dl.append("dt").text("Total Lines of Code"); dl.append("dd").text(totalLines);
  dl.append("dt").text("Most Active Time");  dl.append("dd").text(mostActiveTime);

  console.log("✅ Stats displayed");
}

// ===============
// Original createScatterplot
// (this is the big chart in #chart up top)
// ===============
function createScatterplot() {
  // (unchanged from your code)
  if(!data.length) return;

  d3.select("#chart").selectAll("svg").remove();

  const width = 1000, height = 600;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.datetime))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.line))
    .range([3, 25]);

  // Axis
  svg.append("g")
     .attr("transform", `translate(0, ${height - margin.bottom})`)
     .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d")));

  svg.append("g")
     .attr("transform", `translate(${margin.left},0)`)
     .call(d3.axisLeft(yScale).tickFormat(d => d + ":00"));

  // Plot
  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hour))
    .attr("r", d => rScale(d.line))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("✅ Scatterplot created");
}

// ===============
// LAB 8: SET UP PINNED CHART
// ===============
function setupPinnedChart() {
  // If you want a second chart in #pinned-chart, do it here:
  // For instance, just copy the logic from createScatterplot
  // or do something simpler.

  const container = d3.select("#pinned-chart");
  container.selectAll("svg").remove();

  const width = 400, height = 400;
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  // Just a placeholder “pinned chart”:
  svg.append("text")
    .attr("x", width/2)
    .attr("y", height/2)
    .attr("text-anchor","middle")
    .style("font-size","18px")
    .text("Pinned Chart Here");
}

// ===============
// LAB 8: SCROLLYTELLING SETUP
// ===============
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-narrative");
  spacer = d3.select("#scroll-spacer");
  stepsContainer = d3.select("#scroll-steps");

  // total items = commits
  const numCommits = commits.length;
  const totalHeight = Math.max(0, (numCommits - 1) * SCROLL_ITEM_HEIGHT);
  spacer.style("height", totalHeight + "px");

  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / SCROLL_ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, numCommits - VISIBLE_STEPS));
    renderSteps(startIndex);
  });
}

function renderSteps(startIndex) {
  stepsContainer.selectAll("div.step").remove();

  const endIndex = Math.min(startIndex + VISIBLE_STEPS, commits.length);
  const slice = commits.slice(startIndex, endIndex);

  stepsContainer.selectAll("div.step")
    .data(slice)
    .join("div")
    .attr("class", "step")
    .style("top", (_, i) => `${i * SCROLL_ITEM_HEIGHT}px`)
    .style("height", SCROLL_ITEM_HEIGHT + "px")
    .html(d => {
      const dt = d.datetime.toLocaleString();
      return `
        <h3>Commit: ${d.commit}</h3>
        <p>Date/Time: ${dt}</p>
        <p>Total lines edited: ${d.totalLines}</p>
        <p>By: ${d.author}</p>
      `;
    });

  // If you want to highlight or filter the pinned chart by these commits, you can do so here:
  // highlightPinnedChart(slice);
}

// ===============
// LAB 8: FILE SIZE RACE
// ===============
function displayCommitFiles(someCommits) {
  // Flatten lines
  const allLines = someCommits.flatMap(c => c.lines);

  // Group by file
  let files = d3.groups(allLines, d => d.file).map(([file, lines]) => ({
    file,
    lines
  }));

  // Sort descending
  files.sort((a,b) => b.lines.length - a.lines.length);

  // Clear
  d3.select(".files").selectAll("div").remove();

  const fileDivs = d3.select(".files")
    .selectAll("div")
    .data(files)
    .join("div");

  fileDivs.append("dt")
    .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

  fileDivs.append("dd")
    .selectAll("div.line")
    .data(d => d.lines)
    .join("div")
    .attr("class","line")
    .style("background", d => {
      // color by type
      if (d.type === "js") return "#ff7f0e";
      if (d.type === "css") return "#1f77b4";
      if (d.type === "html") return "#2ca02c";
      return "gray";
    });
}

// ===============
// DOM Ready
// ===============
document.addEventListener("DOMContentLoaded", loadData);