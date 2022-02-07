import React from 'react';
import { Bar } from 'react-chartjs-2';

const data = {
  labels: ['1'],
  datasets: [
    {
      label: '# of Contacts',
      data: [518],
      backgroundColor: 'rgb(255, 99, 132)',
      stack: 'Stack 0',
    },
    {
      label: '# of Products',
      data: [225],
      backgroundColor: 'rgb(54, 162, 235)',
      stack: 'Stack 1',
    },
    {
      label: '# of Documents',
      data: [1049, 10, 13, 15, 22, 30],
      backgroundColor: 'rgb(75, 192, 192)',
      stack: 'Stack 2',
    },
  ],
};

const options = {
  scales: {
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
        },
      },
    ],
  },
};

const GroupedBar = () => (
  <>
    <div className='header'>
    </div>
    <Bar data={data} options={options} />
  </>
);

export default GroupedBar;
