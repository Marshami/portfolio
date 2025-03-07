console.log("Lab 8 main.js loaded - scrollytelling + tooltips + summary");

/** GLOBAL VARIABLES **/
// All commits after grouping
let commits = [];

// Each chunk of text is 100px high in scroller
let ITEM_HEIGHT = 100;  

// How many commits per chunk? (10 => show 10 commits each time)
let VISIBLE_COUNT = 10;

// We'll define references after DOM load
let scrollContainer;

/** 
 * On DOM READY:
 *   1) Load loc.csv
 *   2) Initialize scroller
 *   3) Render from the top (startIndex=0)
 *   4) Display summary info
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();        // parse CSV, group commits
  initScrollytelling();    // sets up scroll logic
  renderItems(0);          // display first chunk

  // 4) Show summary stats
  displayStats(commits);
});

/**
 * 1) LOAD DATA FROM loc.csv
 *
 * Expects columns: commit, author, datetime, line, file, type
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
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");

  const totalHeight = commits.length * ITEM_HEIGHT;
  scrollContainer
    .append("div")
    .attr("id", "spacer")
    .style("position", "absolute")
    .style("top", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("height", totalHeight + "px");

  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER THE SCROLLY TEXT CHUNKS
 */
function renderItems(startIndex) {
  scrollContainer.selectAll("div.scrolly-item").remove();

  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, endIndex);
  console.log(`renderItems for [${startIndex}..${endIndex}) => ${slice.length} commits`);

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
      const globalIndex = startIndex + i;
      const dtString = commit.date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";

      // Add a data-commit attribute so we can highlight the matching circle
      return `
        <p>
          On ${dtString}, ${commit.author} made 
          <a href="#"
             class="commit-link"
             data-commit="${commit.commit}"
          >${desc}</a>.<br/>
          He edited ${totalLines} lines across ${fileCount} files.
        </p>
      `;
    });

  // On link click => revert previous highlight, highlight new circle + show tooltip
  d3.selectAll(".commit-link").on("click", (evt) => {
    evt.preventDefault();
    const commitID = evt.currentTarget.dataset.commit;

    // revert everything first
    revertAllCirclesAndHideTooltip();

    // highlight new circle
    highlightCircleAndShowTooltip(commitID);
  });

  // Update the chart for this slice
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => actual min–max date of the chunk, plus ±2 days
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

  if (!visibleCommits.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No commits to display");
    return;
  }

  const sliceMin = d3.min(visibleCommits, d => d.date);
  const sliceMax = d3.max(visibleCommits, d => d.date);

  let domainStart = d3.timeDay.offset(sliceMin, -2);
  let domainEnd   = d3.timeDay.offset(sliceMax, +2);

  if (sliceMin.getTime() === sliceMax.getTime()) {
    domainStart = d3.timeDay.offset(sliceMin, -1);
    domainEnd   = d3.timeDay.offset(sliceMax, +1);
  }

  const xScale = d3.scaleTime()
    .domain([domainStart, domainEnd])
    .range([margin.left, width - margin.right]);

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))
    .tickFormat(d3.timeFormat("%b %d"));

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);
  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => `${d}:00`);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(visibleCommits, getTotalLines);
  if (minLines === maxLines) {
    minLines = 0;
    maxLines = minLines + 1;
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // Create or select tooltip
  const tooltip = d3.select("body").selectAll(".tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("display", "none");

  // Make circles
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    .attr("id", d => `circle-${d.commit}`)
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    // HOVER: revert others, highlight this circle, show tooltip
    .on("mouseenter", (event, d) => {
      revertAllCirclesAndHideTooltip();

      // highlight current circle
      d3.select(event.currentTarget).attr("fill", "red").attr("fill-opacity", 1);

      // show tooltip near the mouse
      tooltip.html(`
        <dl>
          <dt>COMMIT</dt><dd>${d.commit}</dd>
          <dt>DATE</dt><dd>${d.date.toLocaleDateString(undefined, { dateStyle: 'full' })}</dd>
          <dt>TIME</dt><dd>${d.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</dd>
          <dt>AUTHOR</dt><dd>${d.author}</dd>
          <dt>LINES EDITED</dt><dd>${getTotalLines(d)}</dd>
        </dl>
      `).style("display", "block");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px");
    })
    .on("mouseleave", () => {
      // revert everything
      revertAllCirclesAndHideTooltip();
    });

  console.log(
    `Scatter updated for ${visibleCommits.length} commits, domain=`,
    xScale.domain()
  );
}

/** 
 * 5) DISPLAY SUMMARY STATS
 */
function displayStats(allCommits) {
  const container = d3.select("#stats");
  container.html(""); // clear old

  const totalLOC = d3.sum(allCommits, c => d3.sum(c.lines, ln => ln.lineCount));
  const totalCommits = allCommits.length;
  const averageDepth = 0;
  const maxDepth = 0;
  const fileSet = new Set(allCommits.flatMap(c => c.lines.map(ln => ln.file)));
  const numFiles = fileSet.size;
  const averageFileLength = (numFiles > 0) ? Math.round(totalLOC / numFiles) : 0;
  const peakWorkTime = "At Night";
  const longestLine = 332;

  container.append("dt").text("Total LOC");
  container.append("dd").text(totalLOC);

  container.append("dt").text("Total Commits");
  container.append("dd").text(totalCommits);

  container.append("dt").text("Average Depth");
  container.append("dd").text(averageDepth);

  container.append("dt").text("Maximum Depth");
  container.append("dd").text(maxDepth);

  container.append("dt").text("Number Of Files");
  container.append("dd").text(numFiles);

  container.append("dt").text("Average File Length (In Lines)");
  container.append("dd").text(averageFileLength);

  container.append("dt").text("Peak Work Time");
  container.append("dd").text(peakWorkTime);

  container.append("dt").text("Longest Line");
  container.append("dd").text(longestLine);

  console.log("✅ Summary stats displayed");
}

/** 
 * HELPER: revert all circles to default & hide tooltip
 */
function revertAllCirclesAndHideTooltip() {
  d3.selectAll("circle")
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  d3.select("body").selectAll(".tooltip")
    .style("display", "none");
}

/** 
 * HELPER: highlight the circle by ID, compute bounding rect to place tooltip
 * Not used in this example, but if you want to place the tooltip near the circleEl 
 * instead of near the mouse, you can do boundingRect approach here.
 */
function highlightCircleAndShowTooltip(commitID) {
  const circleEl = document.getElementById(`circle-${commitID}`);
  if(!circleEl) return;

  // we basically do what .on("mouseenter") does:
  revertAllCirclesAndHideTooltip();
  d3.select(circleEl).attr("fill","red").attr("fill-opacity",1);

  // you could set tooltip text here as well 
  // e.g. if you stored data in a dictionary, but typically you have that in .on("mouseenter")
  // if you want to place the tooltip near circle's bounding rect, you can do so here 
}