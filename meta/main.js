console.log("Lab 8 main.js loaded");

/** Global Variables **/
let commits = [];
let ITEM_HEIGHT = 100;     // each commit's text block is 100px tall
let VISIBLE_COUNT = 5;     // how many commits to display at once
let scrollContainer, spacer, itemsContainer;

/** 
 * On DOMContentLoaded, do everything 
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  
  // 1) Load data from loc.csv
  await loadData();
  
  // 2) Initialize scrollytelling
  initScrollytelling();
  renderItems(0);  // show the first chunk

  // 3) On first load, show the same subset in the scatterplot
  const initialSlice = commits.slice(0, VISIBLE_COUNT);
  updateScatterplot(initialSlice);

  // 4) (Optional) display summary stats
  // displayStats(commits);
});

/**
 * 1) LOAD loc.csv
 * 
 * Adjust column names if your CSV differs. 
 * We expect: commit, author, datetime, line, file, type
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

  // Group rows by commit => each commit object
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
  console.log("Loaded CSV => commits array:", commits);
}

/**
 * 2) SET UP SCROLLING LOGIC
 */
function initScrollytelling() {
  // get references to the scrollytelling elements
  scrollContainer = d3.select("#scroll-container");
  spacer = d3.select("#spacer");
  itemsContainer = d3.select("#items-container");

  // total scrolling height
  const numCommits = commits.length;
  const totalHeight = Math.max(0, (numCommits - 1) * ITEM_HEIGHT);
  spacer.style("height", totalHeight + "px");

  // on scroll => figure out which slice of commits to display
  scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
}

/**
 * 3) RENDER COMMIT TEXT FOR THE CURRENT SCROLL SLICE
 *    Then update the scatterplot with that slice
 */
function renderItems(startIndex) {
  // clear old items
  itemsContainer.selectAll("div.scrolly-item").remove();

  // figure out slice: [startIndex .. startIndex+VISIBLE_COUNT)
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const newCommitSlice = commits.slice(startIndex, endIndex);

  // build one div per commit
  itemsContainer
    .selectAll("div.scrolly-item")
    .data(newCommitSlice)
    .join("div")
    .attr("class", "scrolly-item")
    .style("position", "absolute")
    .style("top", (_, i) => (i * ITEM_HEIGHT) + "px")
    .style("height", ITEM_HEIGHT + "px")
    .style("padding", "0.5em")
    .html((commit, i) => {
      // global index => startIndex + i
      const globalIndex = startIndex + i;

      // earliest commit => “his first commit,” else => “another commit”
      const desc = (globalIndex === 0) ? "his first commit" : "another commit";

      // date/time
      const dtString = commit.date.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short"
      });

      // lines and file count
      const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
      const fileCount = new Set(commit.lines.map(ln => ln.file)).size;

      // build paragraph
      return `
        On ${dtString}, ${commit.author} made 
        <a href="#" target="_blank">${desc}</a>.
        He edited ${totalLines} lines across ${fileCount} files.
      `;
    });

  // also update the chart to show this slice
  updateScatterplot(newCommitSlice);
}

/**
 * 4) UPDATE SCATTERPLOT WITH THE CURRENT SLICE
 */
function updateScatterplot(filteredCommits) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 600, height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  if (filteredCommits.length === 0) {
    // if no commits in slice, show a placeholder
    svg.append("text")
      .attr("x", width/2)
      .attr("y", height/2)
      .attr("text-anchor","middle")
      .text("No commits to display");
    return;
  }

  // xScale: time
  const xDomain = d3.extent(filteredCommits, d => d.date);
  const xScale = d3.scaleTime().domain(xDomain).range([margin.left, width - margin.right]);

  // if domain collapses to a single date => expand
  if (xDomain[0].getTime() === xDomain[1].getTime()) {
    const singleDay = xDomain[0];
    xScale.domain([d3.timeDay.offset(singleDay, -1), d3.timeDay.offset(singleDay, 1)]);
  }

  // yScale: hour of day
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // radius ~ total lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  let [minLines, maxLines] = d3.extent(filteredCommits, getTotalLines);
  if (minLines === maxLines) {
    minLines = 0; // ensure we don't get domain [500,500]
  }
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5));
  
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  // circles
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
 * 5) (Optional) DISPLAY SUMMARY STATS
 * 
 * If you want to fill #stats with dt/dd pairs, 
 * e.g. total commits, total lines, etc.
 */
function displayStats(allCommits) {
  const box = d3.select("#stats");
  box.html("");

  const totalCommits = allCommits.length;
  const totalLines = d3.sum(allCommits, c => d3.sum(c.lines, x => x.lineCount));
  const fileSet = new Set();
  allCommits.forEach(c => c.lines.forEach(ln => fileSet.add(ln.file)));

  box.append("dt").text("Total LOC");
  box.append("dd").text(totalLines);

  box.append("dt").text("Total Commits");
  box.append("dd").text(totalCommits);

  box.append("dt").text("Number of Files");
  box.append("dd").text(fileSet.size);

  console.log("Summary stats displayed");
}