window.initGraph = function (id, elements) {
  window.graph = cytoscape({
    container: document.getElementById(id),
    elements,
    style: [
      {
        selector: 'node',
        css: {
          // shape: 'round-rectangle',
          shape: 'ellipse',
          width: 100,
          height: 100,
          selectionColor: '#ffffff',
          selectionGlowColor: '#ffffff',
          hoverGlowColor: '#ffffff',
          // 'background-color':'#61bffc',
          'background-color': '#ffffff',
          'background-image': 'data(image)',
          // 'background-fit': 'cover',
          // 'background-width': 50,
          // 'background-height': 10,
          // 'background-position-x': 5,
          content: 'data(id)',
          'text-valign': 'center',
          'text-halign': 'center',
          'border-width': 1,
          'border-opacity': 0.0,
          // 'border-width': 4,
          // 'border-style': 'solid',
          // 'border-color': '#51afec',
          // 'border-opacity': 0.9,

        },
      },
      {
        selector: 'node:active',
        css: {
          'overlay-opacity': 0.666,
          'overlay-color': '#ddd',
          'overlay-shape': 'ellipse',
        },
      },
      {
        selector: 'node:selected',
        css: {
          'overlay-opacity': 0.666,
          'overlay-color': '#ddd',
          'overlay-shape': 'ellipse',
        },
      },
      {
        selector: 'edge',
        css: {
          'line-color': '#ddd',
          'line-style': 'dashed',
          'line-dash-offset': 0,
          'line-dash-pattern': [4, 4],
          'curve-style': 'bezier', // 'taxi',
          width: 'data(width)',
          'target-arrow-color': '#ddd',
          'target-arrow-shape': 'triangle',
        },
      },
      {
        selector: 'label',
        css: {
          // color: '#fff',
          color: '#666',
          'font-size': '10',
        },
      },
    ],
    layout: {
      name: 'cose', // grid
      directed: false,
      padding: 10,
      fit: true,
    },
  });

  // Add extra info

  // Handle clicks
  window.graph.on('click', 'graph', (event) => {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
  });

  document.getElementById('graph').addEventListener('wheel', () => {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
  });

  window.graph.on('tap', (event) => {
    if (event.target === graph) {
      const overlay = document.getElementById('overlay');
      overlay.classList.remove('show');
    }
  });

  window.graph.on('click', 'node', (event) => {
    event.stopPropagation();
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
    console.log(event);
    console.log(`Click on:${event.target.data('id')}`);
    console.log('x:', event.renderedPosition.x);
    console.log('y:', event.renderedPosition.y);

    const nodeFlows = event.target.data('nodeFlows');

    overlay.innerHTML = `
      <div><span>Received:</span> <b>${event.target.data("received")}</b></div>
      <div><span>Sent:</span> <b>${event.target.data("sent")}</b></div>

      <div><span>Created:</span> <b>${event.target.data("created")}</b></div>
      <div><span>Updated:</span> <b>${event.target.data("updated")}</b></div>
      <div><span>Deleted:</span> <b>${event.target.data("deleted")}</b></div>

      <div><h3>Flows</h3></div>
      <div><span>In:</span> <b>${nodeFlows.flowsIn}</b></div>
      <div><span>Out:</span> <b>${nodeFlows.flowsOut}</b></div>

      <div class="flowList"><span>⇤</span> <b>${nodeFlows.in.join(', ')}</b></div>
      <div class="flowList"><span>⇥</span> <b>${nodeFlows.out.join(', ')}</b></div>
    `;

    // overlay
    let h = event.renderedPosition.y;
    let w = event.renderedPosition.x;
    const height = 340;
    const width = 140;

    const hDiff = (h + height) - window.innerHeight;
    const wDiff = (w + width) - window.innerWidth;

    if (hDiff > 0) h -= hDiff;
    if (wDiff > 0) w -= wDiff;

    overlay.style.left = w;
    overlay.style.top = h;
    overlay.classList.add('show');
  });
};

window.animateGraph = function () {
  // Animation
  let offset = 0;
  function animate() {
    offset += 0.2;
    window.graph.edges().animate({
      style: { 'line-dash-offset': -offset },
    });
    requestAnimationFrame(animate);
  }

  window.graph.ready(() => {
    animate();
  });
};
