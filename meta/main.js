console.log("Lab 8 main.js loaded");

/** 
 * Global variables 
 */
let commits = [];             // Will store grouped commits
let ITEM_HEIGHT = 100;        // How tall each scrolly "block" is
let VISIBLE_COUNT = 5;        // How many commits to show at once
let scrollContainer, itemsContainer, spacer;

/** 
 * On page load, do everything 
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  
  // 1) Load & parse data
  await loadData();
  
  // 2) Initialize scrollytelling
  initScrollytelling();
  // Render the first chunk so something displays on load
  renderItems(0);

  // 3) Also show the same first chunk in the scatterplot
  const initialSlice = commits.slice(0, VISIBLE_COUNT);
  updateScatterplot(initialSlice);

  // 4) If you want summary stats, you can call displayStats(commits) here
  // displayStats(commits);
});

/**
 * 1) LOAD loc.csv
 * 
 * Adapts to a CSV that has columns:
 *   commit, author, datetime, line, file, type
 * e.g. 
 * commit: "abc123"
 * author: "Takumi"
 * datetime: "2025-02-04T17:47"
 * line: "101"
 * file: "src/main.js"
 * type: "js"
 */
async function loadData() {
  const raw = await d3.csv("loc.csv", row => ({
    commit: row.commit,
    author: row.author,
    date: new Date(row.datetime),
    lineCount: +row.line,
    file: row.file,
    type: row.type
  }));

  // Group rows by commit
  // => each commit has { commitId, author, date, lines: [{file, type, lineCount}, ...] }
  const grouped = d3.groups(raw, d => d.commit).map(([commitId, rows]) => {
    const firstRow = rows[0];
    return {
      commit: commitId,
      author: firstRow.author,
      date: firstRow.date,
      lines: rows.map(r => ({
        file: r.file,
        type: r.type,
        lineCount: r.lineCount
      }))
    };
  });

  // Sort ascending so the earliest commit is index 0
  grouped.sort((a, b) => a.date - b.date);

  commits = grouped;
  console.log("Loaded CSV => commits array:", commits);
}

/**
 * 2) INIT SCROLLYTELLING 
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");
  spacer = d3.select("#spacer");
  itemsContainer = d3.select("#items-container");

  // total scrollable height
  const numCommits = commits.length;
  const totalHeight = Math.max(0, (numCommits - 1) * ITEM_HEIGHT);
  spacer.style("height", totalHeight + "px");

  // On scroll, figure out which portion to show
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, numCommits - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER COMMITS IN THE SCROLL AREA
 * 
 * We'll slice the commits array to match the visible portion, 
 * build paragraphs, and also update the scatterplot with that subset.
 */
function renderItems(startIndex) {
  // Clear old
  itemsContainer.selectAll("div.scrolly-item").remove();

  // Build the slice
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const newCommitSlice = commits.slice(startIndex, endIndex);

  // Create one div per visible commit
  const blocks = itemsContainer
    .selectAll("div.scrolly-item")
    .data(newCommitSlice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("position", "absolute")
    .style("top", (_, i) => (i * ITEM_HEIGHT) + "px")
    .style("height", ITEM_HEIGHT + "px")
    .style("padding", "0.5em")
    .style("border-bottom", "1px solid #eee");

  // Fill in the text
  blocks.html((commit, i) => {
    // "i" is the index within newCommitSlice, but we might want the global index
    const globalIndex = startIndex + i;
    const dtString = commit.date.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short"
    });
    // total lines, file count
    const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
    const fileCount = new Set(commit.lines.map(ln => ln.file)).size;

    // If it's the earliest commit overall => "his first commit"
    const desc = (globalIndex === 0)
      ? "his first commit"
      : "another commit";

    return `
      On ${dtString}, ${commit.author} made 
      <a href="#" target="_blank">${desc}</a>.
      He edited ${totalLines} lines across ${fileCount} files.
    `;
  });

  // Also update the scatterplot with this slice
  updateScatterplot(newCommitSlice);
}

/**
 * 4) UPDATE SCATTERPLOT 
 *    (We only show the commits in the slice)
 */
function updateScatterplot(filteredCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 600,
    height = 300,
    margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  if (filteredCommits.length === 0) {
    // If no commits in slice, do nothing
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("No commits to display");
    return;
  }

  // xScale: time
  const xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.date))
    .range([margin.left, width - margin.right]);

  // If the domain collapses to one date, expand it:
  if (xScale.domain()[0].getTime() === xScale.domain()[1].getTime()) {
    let singleDay = xScale.domain()[0];
    xScale.domain([
      d3.timeDay.offset(singleDay, -1),
      d3.timeDay.offset(singleDay, 1)
    ]);
  }

  // yScale: hour of day
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // radius: sum of lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(filteredCommits, c => getTotalLines(c));
  if (minLines === maxLines) {
    // if same lines => expand a bit
    minLines = 0;
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  // Circles
  svg.selectAll("circle")
    .data(filteredCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("Scatter updated for slice:", filteredCommits.length, "commits");
}

/**
 * 5) (Optional) Display summary stats
 */
function displayStats(allCommits) {
  const container = d3.select("#stats");
  container.html(""); // clear

  const totalCommits = allCommits.length;
  const totalLines = d3.sum(allCommits, c =>
    d3.sum(c.lines, ln => ln.lineCount)
  );
  let fileSet = new Set();
  allCommits.forEach(c => c.lines.forEach(ln => fileSet.add(ln.file)));

  // create dt/dd for each stat
  container.append("dt").text("Total LOC");
  container.append("dd").text(totalLines);

  container.append("dt").text("Total Commits");
  container.append("dd").text(totalCommits);

  container.append("dt").text("Number of Files");
  container.append("dd").text(fileSet.size);

  // Add more stats if desired
  console.log("Summary stats displayed");
}