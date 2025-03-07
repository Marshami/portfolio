console.log("Lab 8 main.js loaded");

// We'll store the grouped commits here after loading loc.csv
let commits = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();           // Load and parse loc.csv
  createScatterplot(commits); // Create scatterplot
  displayCommitFiles(commits); // File-size “unit chart”
  buildNarrative(commits);    // Textual evolution
  displayStats(commits);      // Optional summary stats
});

/**
 * 1) LOAD DATA FROM loc.csv
 */
async function loadData() {
  // Example columns: commit, author, datetime, line, type, file
  const raw = await d3.csv("loc.csv", row => {
    return {
      commit: row.commit,
      author: row.author,
      date: new Date(row.datetime),
      lineCount: +row.line,
      fileType: row.type,
      file: row.file
    };
  });

  // Group the raw rows by commit ID
  const grouped = d3.groups(raw, d => d.commit).map(([commitId, rows]) => {
    const first = rows[0];
    return {
      commit: commitId,
      author: first.author,
      date: first.date,
      lines: rows.map(r => ({
        file: r.file,
        type: r.fileType,
        lineCount: r.lineCount
      }))
    };
  });

  // Sort ascending so the earliest commit is at index 0
  grouped.sort((a, b) => a.date - b.date);

  commits = grouped;
  console.log("Loaded CSV data => commits array:", commits);
}

/**
 * 2) SCATTERPLOT
 * (time on x-axis, hour-of-day on y-axis, radius ~ total lines)
 */
function createScatterplot(commitArray) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 600,
    height = 300,
    margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  // xScale: date/time
  const xScale = d3.scaleTime()
    .domain(d3.extent(commitArray, d => d.date))
    .range([margin.left, width - margin.right]);

  // yScale: hour-of-day
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // radius scale: total lines in each commit
  function getTotalLines(commit) {
    return d3.sum(commit.lines, x => x.lineCount);
  }
  const [minLines, maxLines] = d3.extent(commitArray, c => getTotalLines(c));
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 100])
    .range([3, 20]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  // Circles
  svg.selectAll("circle")
    .data(commitArray)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.date.getHours()))
    .attr("r", d => rScale(getTotalLines(d)))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("✅ Scatterplot created with", commitArray.length, "commits");
}

/**
 * 3) FILE-SIZE “UNIT CHART” IN <dl class="files">
 */
function displayCommitFiles(commitArray) {
  // Flatten all lines across all commits
  let allLines = [];
  commitArray.forEach(c => allLines.push(...c.lines));

  // Group by file
  let files = d3.groups(allLines, d => d.file).map(([file, lines]) => ({
    file,
    lines
  }));

  // Sort descending by # lines
  files.sort((a, b) => b.lines.length - a.lines.length);

  // Clear existing
  d3.select(".files").selectAll("div").remove();

  // Rebind
  const fileDivs = d3.select(".files")
    .selectAll("div")
    .data(files)
    .join("div");

  // dt: file name + line count
  fileDivs
    .append("dt")
    .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

  // dd: unit dots for each line
  fileDivs
    .append("dd")
    .selectAll("div.line")
    .data(d => d.lines)
    .join("div")
    .attr("class", "line")
    .style("background", ln => {
      // color by type if you want
      if (ln.type === "js") return "#ff7f0e";
      if (ln.type === "css") return "#1f77b4";
      if (ln.type === "html") return "#2ca02c";
      return "gray";
    });
}

/**
 * 4) TEXTUAL NARRATIVE / EVOLUTION
 * (Label the earliest commit as “my first commit”)
 */
function buildNarrative(commitArray) {
  const container = d3.select("#narrative");
  container.html("");

  // For each commit, build a short paragraph
  commitArray.forEach((commit, i) => {
    const dtString = commit.date.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });

    // total lines, # unique files
    const totalLines = d3.sum(commit.lines, ln => ln.lineCount);
    const fileCount = new Set(commit.lines.map(ln => ln.file)).size;

    // If i=0, label as “my first commit”
    const isFirst = (i === 0);
    const commitDesc = isFirst
      ? "his first commit"
      : "another commit";

    const p = container.append("p");
    p.html(`
      On ${dtString}, Takumi made 
      <a href="#" target="_blank">${commitDesc}</a>.
      He edited ${totalLines} lines across ${fileCount} files.
    `);
  });
}

/**
 * 5) OPTIONAL SUMMARY STATS
 */
function displayStats(commitArray) {
  const box = d3.select("#stats");
  box.html("");

  const totalCommits = commitArray.length;

  // sum up all lines
  const totalLines = d3.sum(commitArray, c =>
    d3.sum(c.lines, x => x.lineCount)
  );

  // unique files
  const fileSet = new Set();
  commitArray.forEach(c =>
    c.lines.forEach(ln => fileSet.add(ln.file))
  );

  box.append("p").html(`
    <strong>COMMITS</strong> ${totalCommits} &nbsp;
    <strong>FILES</strong> ${fileSet.size} &nbsp;
    <strong>TOTAL LOC</strong> ${totalLines}
  `);
}