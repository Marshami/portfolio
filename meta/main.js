console.log("Main.js loaded - scrollytelling with a ±5-day sliding window");

/** GLOBAL VARIABLES **/
let commits = [];
let ITEM_HEIGHT = 100;   // Each commit text block is 100px tall
let VISIBLE_COUNT = 1;   // We'll show 1 commit per chunk by default (easy to see date sliding)
let scrollContainer;

/**
 * On DOM load:
 * 1) Load loc.csv
 * 2) Initialize scroller
 * 3) Render from index=0
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
 * Groups rows by commit => each commit has { date, author, lines[] }, sorted ascending.
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
 * 2) INIT SCROLLYTELLING
 *
 * We'll create a tall spacer so you can scroll through each commit in order.
 * If you have 30 commits, totalHeight = 30 * 100 = 3000px.
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");

  const numCommits = commits.length;
  const totalHeight = numCommits * ITEM_HEIGHT; // 1 commit per 100px

  // Insert a spacer div for absolute positioning or just to ensure scrollable height
  scrollContainer.append("div")
    .attr("id", "spacer")
    .style("position", "absolute")
    .style("top", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("height", `${totalHeight}px`);

  // On scroll => figure out which commit index to show
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER THE TEXT BLOCKS FOR THE SLICE, THEN SHIFT X-AXIS BY ±5 DAYS
 */
function renderItems(startIndex) {
  // Remove old blocks
  scrollContainer.selectAll("div.scrolly-item").remove();

  // For a chunk of commits:
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, endIndex);
  console.log(`Slicing commits [${startIndex}..${endIndex}) => ${slice.length} commits`);

  // Build paragraphs for each commit
  scrollContainer.selectAll("div.scrolly-item")
    .data(slice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("position", "absolute")
    .style("top", (_, i) => `${(startIndex + i) * ITEM_HEIGHT}px`)
    .style("height", ITEM_HEIGHT + "px")
    .style("border-bottom", "1px solid #eee")
    .style("padding", "0.5rem")
    .html((commit, i) => {
      const globalIndex = startIndex + i;
      const dtString = commit.date.toLocaleString(undefined, {dateStyle: "full", timeStyle: "short"});
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;
      // earliest overall commit => "his first commit"
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";

      return `
        On ${dtString}, ${commit.author} made 
        <a href="#" target="_blank">${desc}</a>.<br/>
        He edited ${totalLines} lines across ${fileCount} files.
      `;
    });

  // Update the chart domain => ±5 days around the first commit's date
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => ±5 DAYS AROUND THE FIRST COMMIT DATE
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
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  // We'll pick the first commit's date in the slice as the "centerDate"
  const centerDate = visibleCommits[0].date;

  // We want 5 days before, 5 days after => total 11 days
  const domainStart = d3.timeDay.offset(centerDate, -5);
  const domainEnd   = d3.timeDay.offset(centerDate, +5);

  // xScale => that 11-day window
  const xScale = d3.scaleTime()
    .domain([domainStart, domainEnd])
    .range([margin.left, width - margin.right]);

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))         // daily ticks in that window
    .tickFormat(d3.timeFormat("%b %d")); // "Feb 04", etc.

  // yScale => 0..24 hours
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);
  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => `${d}:00`);

  // draw axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // radius => sum of lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(visibleCommits, getTotalLines);
  if (minLines === maxLines) {
    // if all the same => expand
    minLines = 0;
    maxLines = minLines + 1;
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // circles => just the commits in slice
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log(
    `Scatter updated for slice of ${visibleCommits.length} commits, domain =`,
    xScale.domain()
  );
}