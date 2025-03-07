console.log("Lab 8 main.js loaded");

// A global array of commit objects, which we'll build from loc.csv
let commits = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("IT’S ALIVE!");
  await loadData();          // load your real CSV data
  createScatterplot(commits); // build the scatterplot
  displayCommitFiles(commits); // build the file-size “unit chart”
  buildNarrative(commits);   // textual evolution
  displayStats(commits);     // optional summary
});

// =============================
// 1) LOAD loc.csv
// =============================
async function loadData() {
  // Suppose your loc.csv has columns:
  // commit, author, datetime, line, type, etc.
  // e.g. row.commit, row.author, row.datetime, row.line, row.type
  // (If your CSV has a “date” or “timeZone” column, adjust as needed.)
  const raw = await d3.csv("loc.csv", row => {
    return {
      commit: row.commit,
      author: row.author,
      // parse date/time from row.datetime
      date: new Date(row.datetime),
      lineCount: +row.line,
      fileType: row.type,
      file: row.file  // if there's a "file" column too
    };
  });

  // Group rows by commit
  const grouped = d3.groups(raw, d => d.commit).map(([commitId, rows]) => {
    // each commit has many rows
    // pick e.g. the first row to get the date, author, etc.
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

  // Sort commits by date descending (newest first) or ascending
  grouped.sort((a, b) => b.date - a.date);

  commits = grouped; // store in global array
  console.log("Loaded CSV data => commits array:", commits);
}

// =============================
// 2) CREATE SCATTERPLOT
// =============================
function createScatterplot(commitArray) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove();

  const width = 600, height = 300, margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // xScale: time
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commitArray, d => d.date))
    .range([margin.left, width - margin.right]);

  // yScale: hour of day (just as an example)
  const yScale = d3
    .scaleLinear()
    .domain([0, 24]) // 0–24 hours
    .range([height - margin.bottom, margin.top]);

  // rScale: radius ~ # lines in that commit
  // each commit’s total lines is sum of all row.lineCount
  const getTotalLines = d => d3.sum(d.lines, x => x.lineCount);
  const rDomain = d3.extent(commitArray, d => getTotalLines(d));
  const rScale = d3.scaleSqrt().domain(rDomain).range([3, 20]);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5));

  // Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  // draw circles
  svg.selectAll("circle")
    .data(commitArray)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => {
      // for “hour of day,” parse from d.date.getHours()
      const hour = d.date.getHours();
      return yScale(hour);
    })
    .attr("r", d => {
      const totalLines = getTotalLines(d);
      return rScale(totalLines);
    })
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("✅ Scatterplot created from real CSV data");
}

// =============================
// 3) DISPLAY FILE-SIZE “UNIT CHART”
// =============================
function displayCommitFiles(commitArray) {
  // Flatten lines from all commits
  let allLines = [];
  commitArray.forEach(c => {
    allLines.push(...c.lines); // e.g. c.lines = [{file, type, lineCount}, ...]
  });

  // Group lines by file
  let files = d3.groups(allLines, d => d.file).map(([file, lines]) => ({
    file,
    lines
  }));

  // Sort descending by # of lines
  files.sort((a, b) => b.lines.length - a.lines.length);

  // Clear old
  d3.select(".files").selectAll("div").remove();

  // Rebind
  const fileDivs = d3.select(".files")
    .selectAll("div")
    .data(files)
    .join("div");

  // dt: show file + total lines
  fileDivs
    .append("dt")
    .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

  // dd: the “unit dots”
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
      // etc. fallback:
      return "gray";
    });
}

// =============================
// 4) TEXTUAL NARRATIVE
// =============================
function buildNarrative(commitArray) {
  const container = d3.select("#narrative");
  container.html("");

  commitArray.forEach((c, i) => {
    // date string
    let dt = c.date.toLocaleString(undefined, {dateStyle: "full", timeStyle: "short"});
    // how many unique files
    let uniqueFiles = new Set(c.lines.map(d => d.file));
    // total lines
    let totalLines = d3.sum(c.lines, x => x.lineCount);

    // Example narrative
    let p = container.append("p");
    p.html(`
      On ${dt}, I made <a href="#" target="_blank">
      ${i === 0 ? "my first commit, and it was glorious" : "another glorious commit"}
      </a>. I edited ${totalLines} lines across ${uniqueFiles.size} files. 
      Then I looked over all I had made, and I saw that it was very good.
    `);
  });
}

// =============================
// 5) OPTIONAL SUMMARY STATS
// =============================
function displayStats(commitArray) {
  const box = d3.select("#stats");
  box.html("");

  // total commits
  let totalCommits = commitArray.length;

  // total lines
  let totalLines = d3.sum(commitArray, c =>
    d3.sum(c.lines, x => x.lineCount)
  );

  // unique files
  let fileSet = new Set();
  commitArray.forEach(c => {
    c.lines.forEach(ln => fileSet.add(ln.file));
  });
  let totalFiles = fileSet.size;

  // add a quick summary
  box.append("p").html(`
    <strong>COMMITS</strong> ${totalCommits} &nbsp;
    <strong>FILES</strong> ${totalFiles} &nbsp;
    <strong>TOTAL LOC</strong> ${totalLines}
  `);
}