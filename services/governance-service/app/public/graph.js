
window.initGraph = function(id, elements) {
  window.graph = cytoscape({
    container: document.getElementById(id),
    elements: elements,
      style: [
        {
          selector: 'node',
          css: {
            // shape: 'round-rectangle',
            shape: 'ellipse',
            width: 100,
            height: 100,
            //'background-color':'#61bffc',
            'background-color':'#ffffff',
            'background-image': 'data(image)',
            //'background-fit': 'cover',
            //'background-width': 50,
            //'background-height': 10,
            //'background-position-x': 5,
            content: 'data(id)',
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': 1,
            'border-opacity': 0.0,
            //'border-width': 4,
            //'border-style': 'solid',
            //'border-color': '#51afec',
            //'border-opacity': 0.9,

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
            'line-color':'#ddd',
            'line-style': 'dashed',
            'line-dash-offset': 0,
            'line-dash-pattern': [4, 4],
            'curve-style': 'bezier', // 'taxi',
            width: 'data(width)',
            'target-arrow-color': '#ddd',
            'target-arrow-shape': 'triangle',
          }
        },
        {
          selector: 'label',
          css: {
            // color: '#fff',
            color: '#666',
            'font-size': '10',
          }
        }
      ],
      layout: {
        name: 'cose', // grid
        directed: false,
        padding: 10,
        fit: true
    }
  });

  // Add extra info


  // Handle clicks
  window.graph.on('click', 'graph', function(event){
    var overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
  });

  document.getElementById("graph").addEventListener("wheel", function(){
     var overlay = document.getElementById('overlay');
     overlay.classList.remove('show');
  });

  window.graph.on('tap', function(event){
    if(event.target === graph){
      var overlay = document.getElementById('overlay');
      overlay.classList.remove('show');
    }
  });


  window.graph.on('click', 'node', function(event){
    event.stopPropagation();
    var overlay = document.getElementById('overlay');
    overlay.classList.remove('show');
    console.log(event);
    console.log("Click on:" + event.target.data("id"));
    console.log('x:', event.renderedPosition.x);
    console.log('y:', event.renderedPosition.y);

    var nodeFlows = event.target.data("nodeFlows");

    overlay.innerHTML = `
      <div><h3>Connector</h3></div>
      <div><span>Out:</span> <b>${event.target.data("received")}</b></div>

      <div><span>In</span></div>
      <div><span>Created:</span> <b>${event.target.data("created")}</b></div>
      <div><span>Updated:</span> <b>${event.target.data("updated")}</b></div>
      <div><span>Deleted:</span> <b class="deleted">${event.target.data("deleted")}</b></div>

      <div><h3>Flows</h3></div>
      <div><span>In:</span> <b>${nodeFlows.flowsIn}</b></div>
      <div><span>Out:</span> <b>${nodeFlows.flowsOut}</b></div>
      <div class="flowList"><span><img src="/static/icons/move_to_inbox_black_24dp.svg"></span> <b>${nodeFlows.in.join(', ')}</b></div>
      <div class="flowList"><span><img src="/static/icons/outbox_black_24dp.svg"></span> <b>${nodeFlows.out.join(', ')}</b></div>
    `;

    //⇤⇥

    //overlay
    var h = event.renderedPosition.y
    var w = event.renderedPosition.x;
    var height = document.getElementById('overlay').offsetHeight;
    var width = document.getElementById('overlay').offsetWidth;

    var hDiff = (h + height) - window.innerHeight;
    var wDiff = (w + width) - window.innerWidth;

    if (hDiff > 0) h = h - hDiff;
    if (wDiff > 0) w = w - wDiff;

    overlay.style.left = w;
    overlay.style.top = h;
    overlay.classList.add('show');
  });
}

window.animateGraph = function() {
  // Animation
  var offset = 0;
  function animate() {
    offset += 0.2
    window.graph.edges().animate({
      style: {'line-dash-offset': -offset}
    });
    requestAnimationFrame(animate);
  }

  window.graph.ready(() => {
    animate()
  });
}
