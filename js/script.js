// --- DOM Elements ---
const svg = d3.select("svg#graph-svg");
const connectionsInput = d3.select("#connections");
const generateButton = d3.select("#generate-button");
const graphContainer = d3.select("#graph-container");
const svgElement = svg.node();

// --- D3 Setup & Constants ---
let width = graphContainer.node().getBoundingClientRect().width;
let height = graphContainer.node().getBoundingClientRect().height;

const defaultNodeRadius = 9;
const hoverNodeRadiusIncrease = 5;
const arrowMarkerSize = 5;
const zoomTransitionDuration = 250;
const recenterTransitionDuration = 600;

// --- Get CSS Variables ---
const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-color').trim();
const linkColor = getComputedStyle(document.documentElement).getPropertyValue('--link-color').trim();
const nodeStrokeColor = getComputedStyle(document.documentElement).getPropertyValue('--node-stroke').trim();
const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();

// --- D3 Simulation ---
// Initialize simulation but don't start it with data yet
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(100).strength(0.5)) // Adjusted distance/strength
    .force("charge", d3.forceManyBody().strength(-150)) // Slightly stronger repulsion
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(defaultNodeRadius + hoverNodeRadiusIncrease).strength(0.9));

// --- SVG Element Containers (initialized once) ---
const g = svg.append("g"); // Main container for zoom/pan
const linkGroup = g.append("g").attr("class", "links");
const nodeGroup = g.append("g").attr("class", "nodes");
const labelGroup = g.append("g").attr("class", "labels");

// --- Arrow Marker Definitions (defined once) ---
const defs = svg.append("defs"); // Append defs directly to svg, not 'g'
const markerRefXDefault = defaultNodeRadius + arrowMarkerSize + 2;
const markerRefXHighlight = defaultNodeRadius + hoverNodeRadiusIncrease + arrowMarkerSize + 2;

defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10").attr("refX", markerRefXDefault).attr("refY", 0)
    .attr("markerWidth", arrowMarkerSize).attr("markerHeight", arrowMarkerSize)
    .attr("orient", "auto-start-reverse").append("path").attr("d", "M0,-5L10,0L0,5")
    .attr("fill", linkColor); // Use CSS var directly

defs.append("marker")
    .attr("id", "arrow-highlight")
    .attr("viewBox", "0 -5 10 10").attr("refX", markerRefXHighlight).attr("refY", 0)
    .attr("markerWidth", arrowMarkerSize + 1).attr("markerHeight", arrowMarkerSize + 1)
    .attr("orient", "auto-start-reverse").append("path").attr("d", "M0,-5L10,0L0,5")
    .attr("fill", highlightColor); // Use CSS var directly


// --- Data Storage (will be populated dynamically) ---
let currentNodes = [];
let currentLinks = [];
let neighbors = new Map(); // To store neighbor relationships
let linkedByIndex = {}; // For quick link lookup
let currentHighlight = null; // Track hovered node

// --- Color Scale (can be kept if desired, otherwise nodes are single color) ---
const pastelColors = ["#a6cee3", "#b2df8a", "#fdbf6f", "#cab2d6", "#ffff99", "#e31a1c"];
const pastelColorScale = d3.scaleOrdinal(pastelColors); // Assign colors based on node ID hash or order?


// --- Parsing Function ---
function parseInput(text) {
    const lines = text.split('\n');
    const nodes = new Map(); // Use Map to store unique nodes {id: 'name', group: ...}
    const links = [];
    const nodeColorTracker = {}; // Track colors assigned
    let colorIndex = 0;

    lines.forEach(line => {
        line = line.trim();
        if (!line || !line.includes('->')) return; // Skip empty or invalid lines

        const parts = line.split('->');
        if (parts.length !== 2) return; // Ensure correct format

        const sourceName = parts[0].trim();
        const targetName = parts[1].trim();

        if (!sourceName || !targetName) return; // Skip if names are empty

        // Add nodes if they don't exist, assign a color group
        if (!nodes.has(sourceName)) {
            if (!(sourceName in nodeColorTracker)) {
                nodeColorTracker[sourceName] = pastelColorScale(colorIndex % pastelColors.length);
                colorIndex++;
            }
            nodes.set(sourceName, { id: sourceName, color: nodeColorTracker[sourceName] });
        }
        if (!nodes.has(targetName)) {
             if (!(targetName in nodeColorTracker)) {
                nodeColorTracker[targetName] = pastelColorScale(colorIndex % pastelColors.length);
                colorIndex++;
            }
           nodes.set(targetName, { id: targetName, color: nodeColorTracker[targetName] });
        }

        // Add link (D3 simulation uses node objects/ids, not just names here)
        links.push({ source: sourceName, target: targetName, value: 1 }); // value is optional
    });

    return { nodes: Array.from(nodes.values()), links: links };
}

// --- Graph Rendering Function ---
function renderGraph(nodesData, linksData) {
    currentNodes = nodesData; // Store for interactions
    currentLinks = linksData; // Store for interactions

    // --- Update Helper Structures for Interactions ---
    neighbors = new Map();
    linkedByIndex = {};
    currentHighlight = null; // Reset highlight on redraw

    linksData.forEach(link => {
        // Ensure source/target are node objects if needed by interaction logic later
        // D3 link force handles ids correctly, but our highlight logic might need objects
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (!neighbors.has(sourceId)) neighbors.set(sourceId, new Set());
        if (!neighbors.has(targetId)) neighbors.set(targetId, new Set());
        neighbors.get(sourceId).add(targetId);
        neighbors.get(targetId).add(sourceId); // Assuming undirected for highlighting neighbors
        linkedByIndex[`${sourceId},${targetId}`] = linkedByIndex[`${targetId},${sourceId}`] = true;
    });

    // --- Update Simulation ---
    simulation.nodes(nodesData);
    simulation.force("link").links(linksData);

    // --- Draw Links (using D3 join) ---
    const link = linkGroup
        .selectAll("line")
        .data(linksData, d => `${d.source.id}-${d.target.id}`) // Use source/target object ids if they exist
        .join("line")
        .attr("marker-end", "url(#arrow)");

    // --- Draw Nodes (using D3 join) ---
    const node = nodeGroup
        .selectAll("circle")
        .data(nodesData, d => d.id) // Key function is important!
        .join("circle")
        .attr("r", defaultNodeRadius)
        .attr("fill", d => d.color || pastelColorScale(0)) // Use assigned color or default
        .call(drag(simulation)) // Re-apply drag handler
        .on("mouseover", handleMouseOver) // Re-apply mouseover
        .on("mouseout", handleMouseOut); // Re-apply mouseout

    // Add tooltips
    node.select("title").remove(); // Remove old tooltip if exists
    node.append("title").text(d => d.id);

    // --- Draw Labels (using D3 join) ---
    const label = labelGroup
        .selectAll("text")
        .data(nodesData, d => d.id) // Key function
        .join("text")
        .attr("class", "node-label")
        .text(d => d.id)
        .attr("x", defaultNodeRadius + 7)
        .attr("y", 5);


    // --- Simulation Tick ---
    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // --- Restart Simulation ---
    simulation.alpha(1).restart(); // Restart with high alpha to rearrange
}


// --- Drag Handler ---
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
        d3.select(this).raise();
        svg.style("cursor", "grabbing");
    }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        // Keep fx/fy unless user explicitly wants them to reset on drag end
        // d.fx = null;
        // d.fy = null;
        svg.style("cursor", "grab");
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}

// --- Interaction Handlers (Highlighting) ---
function handleMouseOver(event, d) {
    // No search input now, just highlight on hover
    currentHighlight = d;
    highlightNeighbors(d);
}

function handleMouseOut(event, d) {
    currentHighlight = null;
    clearHighlights();
}

function highlightNeighbors(centerNodeData) {
    const centerNodeId = centerNodeData.id;
    const neighborNodeIds = neighbors.get(centerNodeId) || new Set();
    const allHighlightNodeIds = new Set(neighborNodeIds).add(centerNodeId);

    // Determine which links to highlight (connected to the center node)
    const highlightLinkSet = new Set();
    linkGroup.selectAll("line").each(function(l) {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        if (sourceId === centerNodeId || targetId === centerNodeId) {
            highlightLinkSet.add(l);
        }
    });

    // Update markers for highlighted state
    svg.select("#arrow-highlight").attr("refX", markerRefXHighlight);
    svg.select("#arrow").attr("refX", markerRefXDefault); // Ensure default is correct

    // Fade non-highlighted nodes and increase size/stroke of highlighted ones
    nodeGroup.selectAll("circle")
        .classed("faded", n => !allHighlightNodeIds.has(n.id))
        .filter(n => allHighlightNodeIds.has(n.id))
        .classed("highlighted", true)
        .attr("r", defaultNodeRadius + hoverNodeRadiusIncrease)
        .raise(); // Bring highlighted nodes to front

    // Fade non-highlighted links and style highlighted ones
    linkGroup.selectAll("line")
        .classed("faded", l => !highlightLinkSet.has(l))
        .filter(l => highlightLinkSet.has(l))
        .classed("highlighted", true)
        .attr("marker-end", "url(#arrow-highlight)");

    // Fade non-highlighted labels
    labelGroup.selectAll("text")
        .classed("faded-label", lbl => !allHighlightNodeIds.has(lbl.id))
        .filter(lbl => allHighlightNodeIds.has(lbl.id))
        .raise(); // Bring highlighted labels to front
}

function clearHighlights() {
    nodeGroup.selectAll("circle")
        .classed("faded", false)
        .classed("highlighted", false)
        .attr("r", defaultNodeRadius);

    linkGroup.selectAll("line")
        .classed("faded", false)
        .classed("highlighted", false)
        .attr("marker-end", "url(#arrow)");

    labelGroup.selectAll("text")
        .classed("faded-label", false);
}

// --- Zoom Behavior ---
const zoomHandler = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (event) => {
        g.attr("transform", event.transform); // Apply zoom transform to the main 'g' container
    });

svg.call(zoomHandler)
   .on("dblclick.zoom", null); // Disable double-click zoom

// --- Zoom Button Event Listeners ---
d3.select("#zoom-in").on("click", () => {
     svg.transition().duration(zoomTransitionDuration).call(zoomHandler.scaleBy, 1.3);
});
d3.select("#zoom-out").on("click", () => {
    svg.transition().duration(zoomTransitionDuration).call(zoomHandler.scaleBy, 1 / 1.3);
});
d3.select("#zoom-recenter").on("click", () => {
    svg.transition().duration(recenterTransitionDuration).call(zoomHandler.transform, d3.zoomIdentity);
});

// --- Generate Button Listener ---
generateButton.on("click", () => {
    const inputText = connectionsInput.property("value");
    const { nodes, links } = parseInput(inputText);

    if (nodes.length === 0) {
        // Clear the graph if input is empty or invalid
        linkGroup.selectAll("line").remove();
        nodeGroup.selectAll("circle").remove();
        labelGroup.selectAll("text").remove();
        simulation.nodes([]); // Clear simulation nodes
        simulation.force("link").links([]); // Clear simulation links
        simulation.alpha(0).stop(); // Stop simulation
        return; // Exit if no nodes
    }
    renderGraph(nodes, links);
});

// --- Responsive Resize ---
function handleResize() {
    width = graphContainer.node().getBoundingClientRect().width;
    height = graphContainer.node().getBoundingClientRect().height;
    svg.attr("width", width).attr("height", height); // Update SVG dimensions if needed
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart(); // Gently restart simulation on resize
}
window.addEventListener('resize', handleResize);

// --- Initial Load ---
// Optional: Load with default example data
const initialData = `App -> Web
Web -> API
API -> Database
App -> API
Web -> Auth Service
Auth Service -> Database`;
connectionsInput.property("value", initialData); // Set default text
generateButton.dispatch("click"); // Simulate click to render initial graph
handleResize(); // Initial size calculation


// --- Optional: Center View Function (might be less useful without search) ---
// function centerViewOnNode(nodeData) { ... }