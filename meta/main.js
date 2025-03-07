console.log("Lab 8 main.js loaded - final scrollytelling version");

/** GLOBAL VARIABLES **/
// All commits after grouping
let commits = [];

// Each chunk of text is 100px high in scroller
let ITEM_HEIGHT = 100;  

// How many commits per chunk? (1 => user sees each commit individually)
let VISIBLE_COUNT = 10;

// We'll define references after the DOM loads
let scrollContainer;

/**
 * ON DOM READY:
 *  1) Load loc.csv
 *  2) Initialize scrollytelling
 *  3) Render from the top (startIndex=0)
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();        // parse CSV, group commits
  initScrollytelling();    // sets up scroll logic
  renderItems(0);          // display first chunk
});

/**
 * 1) LOAD loc.csv and GROUP by commit
 * 
 * We expect columns:
 *   commit, author, datetime, line, file, type
 * Then produce an array of commit objects sorted ascending by date.
 */
async function loadData() {
  const raw = await d3.csv("loc.csv", row => ({
    commit: row.commit,
    author: row.author,
    // parse the date so we can do time calculations
    date: new Date(row.datetime),
    lineCount: +row.line,
    file: row.file,
    type: row.type
  }));

  // Group rows by commit => each commit has .date, .author, .lines []
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

  // Sort ascending => earliest commit is commits[0]
  grouped.sort((a, b) => a.date - b.date);

  commits = grouped;
  console.log("Loaded commits array:", commits);
}

/**
 * 2) INIT SCROLLYTELLING
 * 
 * We'll create a "spacer" div so the scroller is tall enough.
 * Then each chunk is 100px tall (ITEM_HEIGHT).
 * 
 * If we have N commits, totalHeight = N * ITEM_HEIGHT (if VISIBLE_COUNT=1),
 * so user can scroll from top to bottom, each “page” of scroll showing 1 commit.
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");

  // total # of commits = commits.length
  // each commit is 100px => total scrollable height
  const totalHeight = commits.length * ITEM_HEIGHT;

  // Create the spacer so the scroller has enough vertical space
  scrollContainer
    .append("div")
    .attr("id", "spacer")
    .style("position", "absolute")
    .style("top", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("height", totalHeight + "px");

  // On scroll => figure out which chunk to display
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    // which "page"?
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    // clamp to avoid out-of-bounds
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER THE SCROLLY TEXT CHUNKS
 * 
 * We'll slice the commits from startIndex..(startIndex+VISIBLE_COUNT).
 * Then we absolutely position each chunk at y=(startIndex + i)*ITEM_HEIGHT.
 * After that, we call updateScatterplot for that chunk => 
 * ±5 days around the first commit's date in the chunk.
 */
function renderItems(startIndex) {
  // Clear old items
  scrollContainer.selectAll("div.scrolly-item").remove();

  // Slicing commits
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, endIndex);
  console.log(`renderItems for [${startIndex}..${endIndex}) => ${slice.length} commits`);

  // Create new blocks
  scrollContainer
    .selectAll("div.scrolly-item")
    .data(slice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("position", "absolute")
    .style("top", (_, i) => (startIndex + i) * ITEM_HEIGHT + "px")
    .style("height", ITEM_HEIGHT + "px")
    .style("border-bottom", "1px solid #eee")
    .style("padding", "0.5rem")
    .html((commit, i) => {
      // global index across all commits
      const globalIndex = startIndex + i;
      // date/time string
      const dtString = commit.date.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short"
      });
      // lines summary
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;
      // earliest commit => "his first commit"
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";

      return `
        <p>
          On ${dtString}, ${commit.author} made 
          <a href="#" target="_blank">${desc}</a>.<br/>
          He edited ${totalLines} lines across ${fileCount} files.
        </p>
      `;
    });

  // Now update the chart for just that chunk (±5 day window)
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => ±5 DAYS around the FIRST commit's date
 *    so x-axis doesn't get overcluttered, but user can “scroll” day by day.
 */
function updateScatterplot(visibleCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 800, height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // If slice is empty => nothing to show
  if (!visibleCommits.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  // We center on the first commit's date => ±5 days
  const centerDate = visibleCommits[0].date;
  const domainStart = d3.timeDay.offset(centerDate, -5);
  const domainEnd   = d3.timeDay.offset(centerDate, +5);

  // X scale => 11 days total
  const xScale = d3.scaleTime()
    .domain([domainStart, domainEnd])
    .range([margin.left, width - margin.right]);

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))  // one tick per day
    .tickFormat(d3.timeFormat("%b %d"));

  // Y scale => 0..24 hours
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);
  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => `${d}:00`);

  // Draw axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis);

  // radius => sum of lines in the chunk
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(visibleCommits, getTotalLines);
  if (minLines === maxLines) {
    // if all the same => expand so radius scale won't be zero
    minLines = 0;
    maxLines = (minLines + 1);
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // Circles => each commit in slice
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log(
    `Scatter updated for ${visibleCommits.length} commits, domain=`,
    xScale.domain()
  );
}
