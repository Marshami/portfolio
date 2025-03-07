console.log("✅ Lab 8 main.js loaded");

// ===============================
// 1. Global Data + Setup
// ===============================

let commits = [];
let NUM_ITEMS_COMMITS = 50;       // how many commits we want to simulate
let ITEM_HEIGHT_COMMITS = 100;    // how tall each item in scroller #1
let VISIBLE_COUNT_COMMITS = 5;    // how many items to show at once

let scrollContainerCommits, spacerCommits, itemsContainerCommits;

let fileTypeColor = d3.scaleOrdinal(d3.schemeTableau10);

// For a second scrolly (files):
let scrollContainerFiles, spacerFiles, itemsContainerFiles;
let NUM_ITEMS_FILES = 10;
let ITEM_HEIGHT_FILES = 80;
let VISIBLE_COUNT_FILES = 5;

// ===============================
// 2. Load or Mock Data
// ===============================
async function loadData() {
  // If you have a real CSV:
  // commits = await d3.csv("loc.csv", d => ({
  //   commit: d.commit,
  //   datetime: new Date(d.datetime),
  //   author: d.author,
  //   linesEdited: +d.line,
  //   type: d.type,
  //   ...
  // }));

  // For demonstration, let’s generate mock commits
  commits = d3.range(50).map(i => {
    const date = new Date(2025, 2, i % 30, i % 24); // just a random date
    return {
      commit: "abc" + i,
      datetime: date,
      hour: date.getHours(),
      totalLines: Math.floor(Math.random() * 500) + 20,
      lines: d3.range(Math.floor(Math.random() * 50) + 10).map(() => ({
        file: i % 2 === 0 ? "main.js" : "style.css",
        type: i % 3 === 0 ? "js" : (i % 3 === 1 ? "css" : "html")
      }))
    };
  });

  // In real usage, you might unify lines differently. This is just a placeholder.
  // Each commit has 'lines' array with objects {file, type}.

  console.log("Loaded mock commits:", commits);
  setupScrollytellingCommits();
  createScatterplot();
  renderItemsCommits(0);

  // Similarly, set up second scrolly if needed
  setupScrollytellingFiles();
  renderItemsFiles(0);

  // Also display the unit chart for all commits (or you might do it scrollytelling-based).
  displayCommitFiles(commits);
}

// ===============================
// 3. Scatterplot for Commits
// ===============================
function createScatterplot() {
  const width = 600, height = 400, margin = 40;

  d3.select("#chart-commits").selectAll("svg").remove();

  const svg = d3.select("#chart-commits")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin, width - margin]);

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin, margin]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([3, 20]);

  // Axes
  const xAxis = d3.axisBottom(x).ticks(5);
  const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => `${d}:00`);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin}, 0)`)
    .call(yAxis);

  // Plot circles
  svg.selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", d => x(d.datetime))
    .attr("cy", d => y(d.hour))
    .attr("r", d => r(d.totalLines))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget).attr("fill", "orange");
    })
    .on("mouseout", (event, d) => {
      d3.select(event.currentTarget).attr("fill", "steelblue");
    });
}

// ===============================
// 4. Commit Files "Race" (Unit Chart)
// ===============================
function displayCommitFiles(someCommits) {
  // Flatten out the lines from all commits
  let lines = someCommits.flatMap(d => d.lines);

  // Group lines by file name
  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

  // Sort by number of lines descending
  files = d3.sort(files, d => -d.lines.length);

  // Clear existing
  d3.select(".files").selectAll("div").remove();

  // Re-bind
  const fileDivs = d3.select(".files")
    .selectAll("div")
    .data(files)
    .join("div");

  // dt holds the filename and line count
  fileDivs.append("dt")
    .html(d => `<code>${d.name}</code> <small>${d.lines.length} lines</small>`);

  // dd holds the “unit dots”
  fileDivs.append("dd")
    .selectAll("div.line")
    .data(d => d.lines)
    .join("div")
    .attr("class", "line")
    .style("background", d => fileTypeColor(d.type));
}

// ===============================
// 5. Scrollytelling Setup (Commits)
// ===============================
function setupScrollytellingCommits() {
  NUM_ITEMS_COMMITS = commits.length;
  scrollContainerCommits = d3.select("#scroll-container-commits");
  spacerCommits = d3.select("#spacer-commits");
  itemsContainerCommits = d3.select("#items-container-commits");

  // total scrolling height
  const totalHeight = (NUM_ITEMS_COMMITS - 1) * ITEM_HEIGHT_COMMITS;
  spacerCommits.style("height", totalHeight + "px");

  scrollContainerCommits.on("scroll", () => {
    const scrollTop = scrollContainerCommits.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT_COMMITS);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT_COMMITS));
    renderItemsCommits(startIndex);
  });
}

function renderItemsCommits(startIndex) {
  itemsContainerCommits.selectAll("div.item-commit").remove();

  const endIndex = Math.min(startIndex + VISIBLE_COUNT_COMMITS, commits.length);
  const slice = commits.slice(startIndex, endIndex);

  // Re-draw scrolly text items
  itemsContainerCommits.selectAll("div.item-commit")
    .data(slice)
    .join("div")
    .attr("class", "item-commit")
    .style("top", (_, i) => (i * ITEM_HEIGHT_COMMITS) + "px")
    .html((d, i) => {
      return `
        <p><strong>Commit:</strong> ${d.commit}</p>
        <p>${d.datetime.toLocaleString()}</p>
        <p>Edited ${d.totalLines} lines</p>
      `;
    });

  // If you also want to filter your scatterplot or something else:
  // updateScatterplot(slice);

  // Or update your file chart to show only lines from these commits
  // displayCommitFiles(slice);
}

// ===============================
// 6. Scrollytelling Setup (Files)
// ===============================
function setupScrollytellingFiles() {
  scrollContainerFiles = d3.select("#scroll-container-files");
  spacerFiles = d3.select("#spacer-files");
  itemsContainerFiles = d3.select("#items-container-files");

  // for demonstration, let's imagine we just have 10 “file states”
  NUM_ITEMS_FILES = 10;
  const totalHeight = (NUM_ITEMS_FILES - 1) * ITEM_HEIGHT_FILES;
  spacerFiles.style("height", totalHeight + "px");

  scrollContainerFiles.on("scroll", () => {
    const scrollTop = scrollContainerFiles.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT_FILES);
    startIndex = Math.max(0, Math.min(startIndex, NUM_ITEMS_FILES - VISIBLE_COUNT_FILES));
    renderItemsFiles(startIndex);
  });
}

function renderItemsFiles(startIndex) {
  itemsContainerFiles.selectAll("div.item-file").remove();

  const endIndex = startIndex + VISIBLE_COUNT_FILES;
  const slice = d3.range(startIndex, endIndex);

  // For a real dataset, you'd map each slice index to a “state” of the code
  // or to a time-based subset of commits. For the example, we just show placeholders.
  itemsContainerFiles.selectAll("div.item-file")
    .data(slice)
    .join("div")
    .attr("class", "item-file")
    .style("top", (_, i) => (i * ITEM_HEIGHT_FILES) + "px")
    .html((d, i) => {
      return `<p>Section #${d}: This might correspond to some state or date range of the code.</p>`;
    });

  // If you want your file chart to update:
  // displayCommitFiles(...some subset of commits here...);
}

// ===============================
// 7. On DOM Load
// ===============================
document.addEventListener("DOMContentLoaded", loadData);