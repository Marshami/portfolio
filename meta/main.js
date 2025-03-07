console.log("Lab 8 main.js loaded");

/* GLOBAL VARIABLES */
let commits = [];
let ITEM_HEIGHT = 100;  // each commit text block is 100px tall
let VISIBLE_COUNT = 5;  // how many commits to show at once
let scrollContainer, spacer, itemsContainer;

/**
 * On DOM load: 
 *  1) Load CSV & parse
 *  2) Initialize scrollytelling
 *  3) Show first chunk & update chart
 *  4) Optionally show summary stats
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");

  await loadData();            // 1) load data
  initScrollytelling();        // 2) set up scroller
  renderItems(0);              // 3) show first chunk

  const firstSlice = commits.slice(0, VISIBLE_COUNT);
  updateScatterplot(firstSlice);

  // 4) (Optional) show summary stats
  // displayStats(commits);
});

/**
 * 1) LOAD loc.csv
 * 
 * Expects columns:
 *   commit, author, datetime, line, file, type
 * Adjust if yours differ.
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

  // Group by commit ID
  const grouped = d3.groups(raw, d => d.commit).map(([commitId, rows]) => {
    const first = rows[0];
    return {
      commit: commitId,
      author: first.author,
      date: first.date,
      lines: rows.map(r => ({
        file: r.file,
        type: r.type,
        lineCount: r.lineCount
      }))
    };
  });

  // Sort ascending => earliest commit at array[0]
  grouped.sort((a, b) => a.date - b.date);

  commits = grouped;
  console.log("Loaded CSV => commits array:", commits);
}

/**
 * 2) INITIALIZE SCROLLYTELLING
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");
  spacer = d3.select("#spacer");
  itemsContainer = d3.select("#items-container");

  const numCommits = commits.length;
  const totalHeight = Math.max(0, (numCommits - 1) * ITEM_HEIGHT);
  spacer.style("height", totalHeight + "px");

  // On scroll => slice commits & show them
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER SCROLLY ITEMS
 * 
 * We only show the commits in [startIndex..startIndex+VISIBLE_COUNT),
 * and then call updateScatterplot() with that slice.
 */
function renderItems(startIndex) {
  // Clear old
  itemsContainer.selectAll("div.scrolly-item").remove();

  // Build the slice
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const newCommitSlice = commits.slice(startIndex, endIndex);

  // For each commit, create a div
  itemsContainer.selectAll("div.scrolly-item")
    .data(newCommitSlice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("position", "absolute")
    .style("top", (_, i) => (i * ITEM_HEIGHT) + "px")
    .style("height", ITEM_HEIGHT + "px")
    .style("padding", "0.5em")
    .html((commit, i) => {
      // global index in the full array
      const globalIndex = startIndex + i;

      // earliest commit => "his first commit", else => "another commit"
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";

      // format date/time
      const dtString = commit.date.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short"
      });

      // lines + file count
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;

      // final sentence
      return `
        On ${dtString}, ${commit.author} made 
        <a href="#" target="_blank">${desc}</a>.
        He edited ${totalLines} lines across ${fileCount} files.
      `;
    });

  // Also update the scatterplot
  updateScatterplot(newCommitSlice);
}

/**
 * 4) UPDATE SCATTERPLOT
 * 
 * We only show the commits in the current slice.
 */
function updateScatterplot(filteredCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove(); // clear old

  const width = 600, height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  if (filteredCommits.length === 0) {
    // If empty slice => no commits to display
    svg.append("text")
      .attr("x", width/2)
      .attr("y", height/2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  // xScale: time
  const xExtent = d3.extent(filteredCommits, d => d.date);
  const xScale = d3.scaleTime()
    .domain(xExtent)
    .range([margin.left, width - margin.right]);

  // If domain collapses => expand
  if (xExtent[0].getTime() === xExtent[1].getTime()) {
    const singleDay = xExtent[0];
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
  let [minLines, maxLines] = d3.extent(filteredCommits, getTotalLines);
  if (minLines === maxLines) {
    minLines = 0; // avoid [500,500]
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
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

  console.log("Scatter updated for slice:", filteredCommits.length);
}

/**
 * 5) (OPTIONAL) DISPLAY SUMMARY STATS
 */
function displayStats(allCommits) {
  const container = d3.select("#stats");
  container.html(""); // clear

  const totalCommits = allCommits.length;
  const totalLines = d3.sum(allCommits, c => d3.sum(c.lines, ln => ln.lineCount));
  const fileSet = new Set();
  allCommits.forEach(c => c.lines.forEach(ln => fileSet.add(ln.file)));

  container.append("dt").text("Total LOC");
  container.append("dd").text(totalLines);

  container.append("dt").text("Total Commits");
  container.append("dd").text(totalCommits);

  container.append("dt").text("Number of Files");
  container.append("dd").text(fileSet.size);

  console.log("Summary stats displayed");
}