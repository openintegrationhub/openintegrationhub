import React from 'react';
import { Line } from 'react-chartjs-2';

// const data = {
//   labels: ['1', '2', '3', '4', '5', '6'],
//   datasets: [
//     {
//       label: '# of Votes',
//       data: [12, 19, 3, 5, 2, 3],
//       fill: false,
//       backgroundColor: 'rgb(255, 99, 132)',
//       borderColor: 'rgba(255, 99, 132, 0.2)',
//       yAxisID: 'y-axis-1',
//     },
//     {
//       label: '# of No Votes',
//       data: [1, 2, 1, 1, 2, 2],
//       fill: false,
//       backgroundColor: 'rgb(54, 162, 235)',
//       borderColor: 'rgba(54, 162, 235, 0.2)',
//       yAxisID: 'y-axis-2',
//     },
//   ],
// };

// const options = {
//   scales: {
//     yAxes: [
//       {
//         type: 'linear',
//         display: true,
//         position: 'left',
//         id: 'y-axis-1',
//       },
//       {
//         type: 'linear',
//         display: true,
//         position: 'right',
//         id: 'y-axis-2',
//         gridLines: {
//           drawOnArea: false,
//         },
//       },
//     ],
//   },
// };
const data = {
  // labels: ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'],
  labels: Array.from(Array(30).keys()),
  datasets: [
    {
      label: 'Products',
      data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 30)),
      fill: false,
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgba(255, 99, 132, 0.5)',
      borderWidth: 3,
      yAxisID: 'y-axis-1',
    },
    {
      label: 'Contacts',
      data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 5)),
      fill: false,
      borderWidth: 3,
      backgroundColor: 'rgb(54, 162, 235)',
      borderColor: 'rgba(54, 162, 235, 0.5)',
      yAxisID: 'y-axis-1',
    },
  ],
};

const options = {
  scales: {
    yAxes: [
      {
        type: 'linear',
        display: true,
        position: 'left',
        id: 'y-axis-1',
      },
      {
        type: 'linear',
        display: true,
        position: 'right',
        id: 'y-axis-1',
        gridLines: {
          drawOnArea: false,
        },
      },
    ],
  },
};

const MultiAxisLineChart = () => (
  <>
    <div className='header'>
      <h1 className='title'>Multi Axis Line Chart</h1>
    </div>
    <Line data={data} options={options} />
  </>
);

export default MultiAxisLineChart;
