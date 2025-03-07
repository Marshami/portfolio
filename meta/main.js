console.log("Lab 8 main.js loaded");

// ==========================
// 1) MOCK DATA (for demo)
// ==========================
// If you have your actual CSV, you can skip this array 
// and do something like:
//   let data = [];
//   async function loadData() {
//     data = await d3.csv("loc.csv");
//     ...
//   }
let commits = [
  {
    date: new Date("2024-04-11T09:22"),
    message: "my first commit, and it was glorious",
    lines: [
      { file: "src/app.html", type: "html" },
      { file: "src/lib/index.js", type: "js" },
      // etc. you can replicate lines to show bigger files
    ]
  },
  {
    date: new Date("2024-04-10T20:17"),
    message: "another glorious commit",
    lines: [
      { file: "src/routes/contact/+page.svelte", type: "svelte" },
      { file: "src/routes/contact/+page.svelte", type: "svelte" },
      { file: "src/app.html", type: "html" },
    ]
  },
  {
    date: new Date("2024-03-11T11:14"),
    message: "another glorious commit",
    lines: [
      { file: "src/routes/projects/+page.svelte", type: "svelte" },
    ]
  },
  {
    date: new Date("2024-02-26T01:33"),
    message: "another glorious commit",
    lines: [
      { file: "src/routes/projects/+page.svelte", type: "svelte" },
      { file: "src/lib/Project.svelte", type: "svelte" },
      { file: "src/app.html", type: "html" },
      { file: "src/lib/index.js", type: "js" },
      { file: "src/lib/index.js", type: "js" },
    ]
  },
  {
    date: new Date("2024-03-04T10:35"),
    message: "another glorious commit",
    lines: [
      { file: "src/app.html", type: "html" },
      { file: "src/app.html", type: "html" },
      { file: "src/app.html", type: "html" },
    ]
  },
  {
    date: new Date("2024-03-21T01:38"),
    message: "another glorious commit",
    lines: [
      { file: "src/lib/Project.svelte", type: "svelte" },
      { file: "src/lib/Project.svelte", type: "svelte" },
    ]
  },
  {
    date: new Date("2024-03-12T13:11"),
    message: "another glorious commit",
    lines: [
      { file: "src/lib/Project.svelte", type: "svelte" },
      { file: "src/lib/index.js", type: "js" },
    ]
  },
  {
    date: new Date("2024-02-27T19:56"),
    message: "another glorious commit",
    lines: [
      { file: "src/app.html", type: "html" },
      { file: "src/lib/Project.svelte", type: "svelte" },
      { file: "src/lib/index.js", type: "js" },
    ]
  },
];

// ==========================
// 2) On DOM Load: Boot Up
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("IT'S ALIVE!");

  // Sort commits descending by date, so newest first:
  commits.sort((a, b) => b.date - a.date);

  // Build the chart
  createScatterplot(commits);

  // Build the file-size “unit chart”
  displayCommitFiles(commits);

  // Build the textual narrative
  buildNarrative(commits);

  // Optionally, display summary stats
  displayStats(commits);
});

// ==========================
// 3) Create Scatterplot
// ==========================
function createScatterplot(commitArray) {
  const container = d3.select("#chart");
  container.selectAll("svg").remove(); // clear old

  const width = 600,
    height = 300,
    margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // We'll map commits to their “time of day” (date.getHours()) vs. their date
  // But for demonstration, let's just do "index" on x-axis vs. hour on y-axis
  // or we can do date on x-axis. Up to you. We'll do date on x.
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commitArray, d => d.date))
    .range([margin.left, width - margin.right]);

  // hour of day
  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // radius = # lines in each commit
  const rScale = d3
    .scaleSqrt()
    .domain([0, d3.max(commitArray, d => d.lines.length)])
    .range([3, 15]);

  // x Axis
  const xAxis = d3.axisBottom(xScale).ticks(5);
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  // y Axis
  const yAxis = d3.axisLeft(yScale).ticks(5);
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // circles
  svg
    .selectAll("circle.commit-dot")
    .data(commitArray)
    .join("circle")
    .attr("class", "commit-dot")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => {
      const hour = d.date.getHours();
      return yScale(hour);
    })
    .attr("r", d => rScale(d.lines.length))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7);

  console.log("✅ Scatterplot created with", commitArray.length, "commits");
}

// ==========================
// 4) Display File Size “Unit Chart”
// ==========================
function displayCommitFiles(commitArray) {
  // Flatten all lines from all commits
  let allLines = [];
  commitArray.forEach(c => {
    // each c.lines is an array of { file, type }
    allLines.push(...c.lines);
  });

  // Group by file
  let files = d3.groups(allLines, d => d.file).map(([file, lines]) => ({
    file,
    lines,
  }));

  // Sort descending by # lines
  files.sort((a, b) => b.lines.length - a.lines.length);

  // Clear
  d3.select(".files").selectAll("div").remove();

  // Rebind
  const fileDivs = d3
    .select(".files")
    .selectAll("div")
    .data(files)
    .join("div");

  // dt: show file name & line count
  fileDivs
    .append("dt")
    .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

  // dd: unit dots
  fileDivs
    .append("dd")
    .selectAll("div.line")
    .data(d => d.lines)
    .join("div")
    .attr("class", "line")
    .style("background", line => {
      // color by file type or something if you want
      if (line.type === "html") return "orange";
      if (line.type === "js") return "red";
      if (line.type === "svelte") return "#ff6600";
      return "gray";
    });
}

// ==========================
// 5) Build “Evolution Over Time” Narrative
// ==========================
function buildNarrative(commitArray) {
  const narrative = d3.select("#narrative");
  narrative.html(""); // clear

  commitArray.forEach((commit, i) => {
    const dtString = commit.date.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Count how many unique files (like “6 files”):
    const uniqueFiles = new Set(commit.lines.map(d => d.file));
    // total lines is just array length:
    const totalLines = commit.lines.length;

    // build a short paragraph
    const p = narrative.append("p");

    // “On Thursday, April 11, 2024 at 9:22 AM, I made my first commit... etc.”
    p.html(`
      On ${dtString}, I made <a href="#" target="_blank">
      ${i === 0 ? "my first commit, and it was glorious" : "another glorious commit"}
      </a>. I edited ${totalLines} lines across ${uniqueFiles.size} files. 
      Then I looked over all I had made, and I saw that it was very good.
    `);
  });
}

// ==========================
// 6) Optional: Display Summary Stats
// ==========================
function displayStats(commitArray) {
  const statsBox = d3.select("#stats");
  statsBox.html("");

  const totalCommits = commitArray.length;

  // unique files
  let fileSet = new Set();
  commitArray.forEach(c => {
    c.lines.forEach(line => fileSet.add(line.file));
  });
  const totalFiles = fileSet.size;

  // total lines is the sum of all lines
  const totalLOC = d3.sum(commitArray, c => c.lines.length);

  // Now, just show them in an inline list:
  statsBox.append("p").html(`
    <strong>COMMITS</strong> ${totalCommits} &nbsp;
    <strong>FILES</strong> ${totalFiles} &nbsp;
    <strong>TOTAL LOC</strong> ${totalLOC}
  `);
}