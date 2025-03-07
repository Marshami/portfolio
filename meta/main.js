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
 *
 * We'll create a "spacer" div so the scroller is tall enough.
 * If we have N commits, totalHeight = N * ITEM_HEIGHT (if VISIBLE_COUNT=1),
 * so user can scroll from top to bottom, each “page” of scroll showing that many commits.
 */
function initScrollytelling() {
  scrollContainer = d3.select("#scroll-container");

  // total # of commits => commits.length
  // each chunk is ITEM_HEIGHT => total scrollable height
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
 * After that, we call updateScatterplot for that chunk => using the chunk's actual min–max date + 2 days padding.
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

  // When user clicks a link => revert all circles, highlight & show info for that commit
  d3.selectAll(".commit-link").on("click", (evt) => {
    evt.preventDefault(); // no navigation
    const commitID = evt.currentTarget.dataset.commit;

    // revert all circles
    d3.selectAll("circle").attr("fill", "steelblue").attr("fill-opacity", 0.7);
    d3.select("body").selectAll(".tooltip").style("display", "none");

    // find the circle & dispatch "mouseenter" => highlight it & show tooltip
    const circleEl = document.getElementById(`circle-${commitID}`);
    if (circleEl) {
      circleEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    }
  });

  // Now update the chart for just that chunk
  updateScatterplot(slice);
}

/**
 * 4) UPDATE SCATTERPLOT => actual min–max date of the chunk, plus ±2 days padding
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

  // find min & max date in the slice
  const sliceMin = d3.min(visibleCommits, d => d.date);
  const sliceMax = d3.max(visibleCommits, d => d.date);

  // Expand domain by ±2 days
  let domainStart = d3.timeDay.offset(sliceMin, -2);
  let domainEnd   = d3.timeDay.offset(sliceMax, +2);

  // If the entire chunk is the same day => expand ±1 day
  if (sliceMin.getTime() === sliceMax.getTime()) {
    domainStart = d3.timeDay.offset(sliceMin, -1);
    domainEnd   = d3.timeDay.offset(sliceMax, +1);
  }

  // X scale
  const xScale = d3.scaleTime()
    .domain([domainStart, domainEnd])
    .range([margin.left, width - margin.right]);

  // daily ticks
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))
    .tickFormat(d3.timeFormat("%b %d"));

  // y scale => 0..24 hours
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
    minLines = 0;
    maxLines = minLines + 1;
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // ================ TOOLTIP SETUP ================
  const tooltip = d3.select("body").selectAll(".tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("display", "none");

  // Circles => each commit in slice
  svg.selectAll("circle")
    .data(visibleCommits)
    .join("circle")
    // give each circle an id => circle-<commitID>
    .attr("id", d => `circle-${d.commit}`)
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    .on("mouseenter", (event, d) => {
      // revert all circles first
      d3.selectAll("circle").attr("fill", "steelblue").attr("fill-opacity", 0.7);
      tooltip.style("display", "none");

      // highlight this circle
      d3.select(event.currentTarget).attr("fill", "red").attr("fill-opacity", 1);

      // show tooltip
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
      // revert all circles => none remains highlighted
      d3.selectAll("circle").attr("fill", "steelblue").attr("fill-opacity", 0.7);
      tooltip.style("display", "none");
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

  // Example stats
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