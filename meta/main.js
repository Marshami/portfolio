function createScatterplot() {
    const width = 1000, height = 600;

    // 1) Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // 2) Define Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.line))
        .range([2, 30]);

    // 3) Add Axes
    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`));

    // 4) Tooltip Setup
    const tooltip = d3.select("#commit-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("box-shadow", "2px 2px 10px rgba(0,0,0,0.2)");

    // 5) Plot Circles
    const dots = svg.append("g").attr("class", "dots");
    dots.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.datetime.getHours()))
        .attr("r", d => rScale(d.line))
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.7)
        .on("mouseenter", function (event, d) {
            updateTooltipContent(d);
            tooltip.style("visibility", "visible");

            d3.select(this).attr("fill-opacity", 1);
        })
        .on("mousemove", function (event) {
            let tooltipWidth = tooltip.node().getBoundingClientRect().width;
            let tooltipHeight = tooltip.node().getBoundingClientRect().height;
            let x = event.pageX + 10;
            let y = event.pageY - tooltipHeight - 10;

            // Prevent tooltip from going out of bounds
            if (x + tooltipWidth > window.innerWidth) {
                x = event.pageX - tooltipWidth - 10;
            }
            if (y < 0) {
                y = event.pageY + 10;
            }

            tooltip.style("left", `${x}px`)
                   .style("top", `${y}px`);
        })
        .on("mouseleave", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this).attr("fill-opacity", 0.7);
        });

    // 6) Brush for selecting commits
    const brush = d3.brush()
        .on("start brush end", (event) => {
            if (!event.selection) return;
            const [[x0, y0], [x1, y1]] = event.selection;

            const selectedData = data.filter(d => {
                const cx = xScale(d.datetime);
                const cy = yScale(d.datetime.getHours());
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
            });

            console.log("Selected commits:", selectedData);
        });

    const brushGroup = svg.append("g").call(brush);
    dots.raise();

    console.log("✅ Scatter Plot Created");
}