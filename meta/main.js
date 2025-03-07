console.log("Main.js loaded, scrollytelling with shifting x-axis");

/** GLOBALS **/
let commits = [];
let ITEM_HEIGHT = 100;   // Each commit block is 100px tall
let VISIBLE_COUNT = 5;   // How many commits to display at once in the scroller
let scrollContainer;     // We'll store references after DOMContentLoaded

/**
 * On DOM load:
 * 1) Load loc.csv
 * 2) Initialize scroller
 * 3) Render the first chunk
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();
  initScrollytelling();
  renderItems(0);
});

/**
 * 1) LOAD DATA FROM loc.csv
 *
 * Expects columns: commit, author, datetime, line, file, type
 * Group rows by commit => each commit has (date, author, lines), sorted ascending
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

  // Sort ascending => earliest commit at index 0
  grouped.sort((a, b) => a.date - b.date);
  commits = grouped;
  console.log("Loaded commits array:", commits);
}

/**
 * 2) SCROLLYTELLING SETUP
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");

  const numCommits = commits.length;
  const totalHeight = (numCommits - 1) * ITEM_HEIGHT; // total scrollable height

  // Insert a spacer if you want absolute positioning chunking
  // but if you aren't chunking absolutely, you can skip it
  scrollContainer.append("div")
    .attr("id", "spacer")
    .style("position", "absolute")
    .style("top", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("height", `${totalHeight}px`);

  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER ITEMS (TEXT) + SHIFT X-AXIS FOR JUST THAT SLICE
 */
function renderItems(startIndex) {
  // Clear old items
  scrollContainer.selectAll("div.scrolly-item").remove();

  // Slice the commits
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, endIndex);
  console.log(`Slicing from ${startIndex}..${endIndex}, got ${slice.length} commits`);

  // Display them in #scroll-container
  scrollContainer.selectAll("div.scrolly-item")
    .data(slice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("border-bottom", "1px solid #eee")
    .style("margin-bottom", "0.5rem")
    .html((commit, i) => {
      const globalIndex = startIndex + i;
      const dtString = commit.date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";
      return `
        On ${dtString}, ${commit.author} made
        <a href="#" target="_blank">${desc}</a>.<br/>
        He edited ${totalLines} lines across ${fileCount} files.
      `;
    });

  // Also update the scatterplot with just this slice => "sliding" domain
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => domain = [minDate, maxDate] for the slice
 */
function updateScatterplot(visibleCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 800, height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  if (!visibleCommits.length) {
    // If no commits in slice => show a placeholder
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  // x-axis domain: min->max date for this slice
  const minDate = d3.min(visibleCommits, d => d.date);
  const maxDate = d3.max(visibleCommits, d => d.date);

  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([margin.left, width - margin.right]);

  // If single day => expand ±1 day
  if (minDate.getTime() === maxDate.getTime()) {
    const singleDay = minDate;
    xScale.domain([
      d3.timeDay.offset(singleDay, -1),
      d3.timeDay.offset(singleDay, +1)
    ]);
  }

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))       // daily ticks for the slice
    .tickFormat(d3.timeFormat("%b %d"));

  // y-axis: hour of day (0..24)
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => `${d}:00`);

  // draw axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis);

  // radius ~ sum of lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  const [minLines, maxLines] = d3.extent(visibleCommits, getTotalLines);
  const rMin = minLines || 0;
  const rMax = (minLines === maxLines) ? rMin + 1 : maxLines || 1;

  const rScale = d3.scaleSqrt()
    .domain([rMin, rMax])
    .range([3, 25]);

  // Plot circles
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log(`Scatter updated with ${visibleCommits.length} commits, domain=`, xScale.domain());
}