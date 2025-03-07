console.log("Main.js loaded");

/** GLOBALS **/
let commits = [];

/**
 * On DOMContentLoaded:
 *  1) Load loc.csv
 *  2) Build left scroller with all commits
 *  3) Build scatterplot with date on x-axis & hour-of-day on y-axis
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");

  await loadData();        // load and parse your CSV
  buildNarrative();        // create a scrollable list of all commits
  buildScatterplot();      // plot all commits with day on x, hour on y
});

/**
 * 1) LOAD DATA
 * 
 * Expects columns in loc.csv:
 *   commit, author, datetime, line, file, type
 * e.g.
 * commit: "abc123"
 * author: "Takumi Inoue"
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

  // Group rows by commit => array of commit objects
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

  // Sort ascending by date => earliest commit first
  grouped.sort((a, b) => a.date - b.date);

  commits = grouped;
  console.log("Loaded CSV => commits array:", commits);
}

/**
 * 2) BUILD THE NARRATIVE
 * 
 * Puts ALL commits in #scroll-container. 
 * The earliest is "his first commit," subsequent ones "another commit."
 */
function buildNarrative() {
  const container = d3.select("#scroll-container");
  container.html(""); // clear existing

  commits.forEach((commit, i) => {
    // earliest commit => "his first commit," else => "another commit"
    const desc = (i === 0) ? "his first commit" : "another commit";

    // line/file stats
    const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
    const fileCount = new Set(commit.lines.map(ln => ln.file)).size;

    const dtString = commit.date.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short"
    });

    // Append a <div> for each commit
    container.append("div")
      .style("border-bottom", "1px solid #eee")
      .style("padding", "0.5rem 0")
      .html(`
        <p>
          On ${dtString}, ${commit.author} made 
          <a href="#" target="_blank">${desc}</a>.<br/>
          He edited ${totalLines} lines across ${fileCount} files.
        </p>
      `);
  });
}

/**
 * 3) BUILD THE SCATTERPLOT
 * 
 * x-axis = day ticks from earliest to latest date
 * y-axis = hour of day (0..23)
 * radius ~ sum of lines
 */
function buildScatterplot() {
  const container = d3.select("#chart");
  container.selectAll("svg").remove(); // clear old

  const width = 800, height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  if (!commits.length) {
    svg.append("text")
      .attr("x", width/2)
      .attr("y", height/2)
      .attr("text-anchor","middle")
      .text("No commits to display");
    return;
  }

  // Time domain from earliest to latest
  const xDomain = d3.extent(commits, d => d.date);
  const xScale = d3.scaleTime()
    .domain(xDomain)
    .range([margin.left, width - margin.right]);

  // daily ticks => one per day from min to max
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1))                  // one tick per day
    .tickFormat(d3.timeFormat("%b %d"));         // e.g. "Feb 04"

  // yScale => 0..24 hours
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => `${d}:00`);

  // Build axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // radius => sum of lines
  const getTotalLines = c => d3.sum(c.lines, ln => ln.lineCount);
  const [minLines, maxLines] = d3.extent(commits, d => getTotalLines(d)) || [0,1];
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([3, 25]);

  // Plot circles
  svg.selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("Scatterplot built with all commits");
}