/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');

const express = require('express');
const bodyParser = require('body-parser');

const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// Gets overview of data distribution
// , can('tenant.all')
router.get('/', jsonParser, async (req, res) => {

  const percentageIn = 55;
  const percentageInLeft = 100 - percentageIn;

  const percentageOut = 85;
  const percentageOutLeft = 100 - percentageOut;

  const svg1 = `<svg width="120px" height="120px" viewBox="0 0 42 42" class="donut" xmlns="http://www.w3.org/2000/svg">
    <circle class="donutHole" cx="21" cy="21" r="15.91549430918954" fill="#ffffff"></circle>
    <circle class="donutRing" cx="21" cy="21" r="12.91549430918954" fill="transparent" stroke="#dddddd" stroke-width="3"></circle>
    <circle class="donutSegment" cx="21" cy="21" r="12.91549430918954" fill="transparent" stroke="#62C5C6" stroke-width="3" stroke-dasharray="${percentageIn} ${percentageInLeft}" stroke-dashoffset="-25"></circle>
    <circle class="donutRing" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#dddddd" stroke-width="3"></circle>
    <circle class="donutSegment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#24AEA2" stroke-width="3" stroke-dasharray="${percentageOut} ${percentageOutLeft}" stroke-dashoffset="-25"></circle>
  </svg>`;

  const image1 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg1);
  // console.log(image1);


  const html = `<html>
  <head>
    <title>Graph of flows</title>
    <style>
        #graph {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0px;
            left: 0px;
            z-index: 999;
        }
        #overlay {
          width: 100px;
          height: 200px;
          max-width: 0px;
          max-height: 0px;
          background-color: #fff;
          box-shadow: 0 18px 38px rgba(0,0,0,0.30), 0 14px 12px rgba(0,0,0,0.20);
          border-radius: 2px;
          padding: 0px;
          overflow: hidden;
          position: absolute;
          z-index: 100000;
          transition: 0.25s ease-in;
        }

        #overlay.show {
          max-width: 100px;
          max-height: 200px;
          padding: 15px;
          transition: 0.25s ease-in;
        }
    </style>
    <script src="${config.governanceServiceBaseUrl}/static/cytoscape.min.js"></script>
  </head>
  <body>
  <div id="overlay">
    Gimme some data
  </div>
  <div id="graph"></div>
    <script>
      // @todo: get graph data from api
      var apiUrl = '${config.governanceServiceBaseUrl}/dashboard/graph';

      var graph = cytoscape({
        container: document.getElementById('graph'),
        elements: [
            { data: { id: 'a', name: 'Wice', image: '${image1}',}, 'classes': 'color1' },
            { data: {
              id: 'b',
              name: 'Snazzy',
              image: '${image1}',
            },
            'classes': 'color2' },
            { data: { id: 'c', name: 'Google Contacts' }, 'classes': 'color1' },
            { data: { id: 'd', name: 'Microsoft Contacts' }, 'classes': 'color2' },
            { data: { id: 'e', name: 'Gmail' }, 'classes': 'color1' },
            {
              data: {
                id: 'ab',
                source: 'a',
                target: 'b',
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'bc',
                source: 'b',
                target: 'c',
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'cd',
                source: 'c',
                target: 'd',
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'de',
                source: 'd',
                target: 'e',
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'ea',
                source: 'e',
                target: 'a'
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'ac',
                source: 'a',
                target: 'c'
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'ae',
                source: 'a',
                target: 'e'
              },
              'classes': 'edge color0'
            },
            {
              data: {
                id: 'db',
                source: 'd',
                target: 'b'
              },
              'classes': 'edge color0'
            },
          ],
          style: [
  					{
  						selector: 'node',
  						css: {
                // shape: 'round-rectangle',
                shape: 'circle',
  							width: 100,
  							height: 100,
  							//'background-color':'#61bffc',
                'background-color':'#fffff',
                'background-image': 'data(image)',
                //'background-fit': 'cover',
                //'background-width': 50,
                //'background-height': 10,
                //'background-position-x': 5,
  							content: 'data(name)',
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
              selector: 'edge',
              css: {
                'line-color':'#ddd',
                'line-style': 'dashed',
                'line-dash-offset': 0,
                'line-dash-pattern': [4, 4],
                'curve-style': 'bezier', // 'taxi',
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
      graph.on('click', '*', function(event){
        var overlay = document.getElementById('overlay');
        overlay.classList.remove('show');
      });

      graph.on('click', 'node', function(event){
        var overlay = document.getElementById('overlay');
        overlay.classList.remove('show');
        console.log(event);
        console.log("Click on:" + event.target.data("name"));
        console.log('x:', event.renderedPosition.x);
        console.log('y:', event.renderedPosition.y);

        //overlay
        overlay.style.left = event.renderedPosition.x;
        overlay.style.top = event.renderedPosition.y;
        overlay.classList.add('show');
      });

      // Animation
      var offset = 0;
      function animate() {
        offset += 0.2
        graph.edges().animate({
          style: {'line-dash-offset': -offset}
        });
        requestAnimationFrame(animate);
      }

      graph.ready(() => {
        animate()
      });

    </script>
  </body>
</html>`;

  res.status(200).send(html);
});


module.exports = router;
