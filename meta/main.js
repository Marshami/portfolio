console.log("Main.js loaded - scroll through all dates");

/** GLOBAL VARIABLES **/
let commits = [];         // Will store an array of commit objects, sorted ascending
let ITEM_HEIGHT = 100;    // Each commit block is 100px tall
let VISIBLE_COUNT = 1;    // We'll show 1 commit per “page” so you see each commit’s date range
                          // (You can set this to 5 if you want 5 commits per chunk)
let scrollContainer;      // Reference to the left scroller container

/**
 * ON DOM LOAD:
 *  1) Load loc.csv
 *  2) Initialize scroller
 *  3) Render from index 0
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();
  initScrollytelling();
  renderItems(0);  // Show the first commit chunk
});

/**
 * 1) LOAD DATA from loc.csv
 * 
 * Expects columns:
 *   commit, author, datetime, line, file, type
 * 
 * We group rows by commit => each commit has (date, lines, author, etc.),
 * then sort ascending by date => earliest first.
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

  // Group by commit
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

  // Sort ascending => earliest commit is at index 0
  grouped.sort((a, b) => a.date - b.date);
  commits = grouped;
  console.log("Loaded commits:", commits);
}

/**
 * 2) SET UP SCROLLYTELLING
 * 
 * We'll have totalHeight = commits.length * ITEM_HEIGHT
 * So that by scrolling from top to bottom, you eventually see all commits.
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");
  
  const numCommits = commits.length;
  const totalHeight = numCommits * ITEM_HEIGHT; 
  // We’ll insert a spacer <div> to ensure the scroller is this tall
  scrollContainer.append("div")
    .attr("id", "spacer")
    .style("position", "absolute")
    .style("top", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("height", `${totalHeight}px`);
  
  // On scroll => figure out which single (or chunk of) commit(s) to show
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    // If VISIBLE_COUNT=1, each 100px scroll reveals the next commit
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER THE TEXT BLOCKS => SLICED COMMITS
 *    Then call updateScatterplot for that chunk’s date range
 */
function renderItems(startIndex) {
  // Clear old commit blocks
  scrollContainer.selectAll("div.scrolly-item").remove();
  
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, endIndex);
  console.log(`Slicing commits [${startIndex}..${endIndex}) => ${slice.length} commits`);

  // Build paragraphs for each commit in this slice
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
      const globalIndex = startIndex + i;  // commit’s index in full array
      const dtString = commit.date.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short"
      });
      // lines, file count
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;
      // earliest commit => "his first commit", otherwise => "another commit"
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";
      
      return `
        On ${dtString}, ${commit.author} made
        <a href="#" target="_blank">${desc}</a>.<br/>
        He edited ${totalLines} lines across ${fileCount} files.
      `;
    });

  // Update the chart domain so only these commits show
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => domain = min->max date of the slice => "sliding" x-axis
 */
function updateScatterplot(visibleCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 800, height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  if (visibleCommits.length === 0) {
    // If no commits in slice => show a placeholder
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  // find min & max date for this chunk
  const minDate = d3.min(visibleCommits, d => d.date);
  const maxDate = d3.max(visibleCommits, d => d.date);
  
  // xScale => just that chunk’s date range
  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([margin.left, width - margin.right]);

  // if minDate == maxDate => expand ±1 day to avoid zero-width domain
  if (minDate.getTime() === maxDate.getTime()) {
    const singleDay = minDate;
    xScale.domain([
      d3.timeDay.offset(singleDay, -1),
      d3.timeDay.offset(singleDay, +1)
    ]);
  }

  // daily ticks
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))
    .tickFormat(d3.timeFormat("%b %d"));

  // yScale => 0..24 hours
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

  // radius => sum of lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(visibleCommits, getTotalLines);
  if (minLines === maxLines) {
    // if same => expand
    minLines = 0;
    maxLines = minLines + 1;
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // circles
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log(`Scatter updated for slice = ${visibleCommits.length} commits, domain=`, xScale.domain());
}