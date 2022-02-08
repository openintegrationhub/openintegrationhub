import React from 'react';
import { Line } from 'react-chartjs-2';

const days = 31;

const labels = Array.from(Array(days + 1).keys());
labels.shift();

const data = {
    labels,
    datasets: [
        {
            label: 'Products',
            data: Array.from({ length: days }, () => Math.floor(Math.random() * 20)),
            fill: false,
            backgroundColor: 'rgb(54, 162, 235)',
            borderColor: 'rgba(54, 162, 235, 0.8)',
            borderWidth: 3,
            yAxisID: 'y-axis-1',
        },
        {
            label: 'Contacts',
            data: Array.from({ length: days }, () => Math.floor(Math.random() * 44)),
            fill: false,
            borderWidth: 3,
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgba(255, 99, 132, 0.8)',
            yAxisID: 'y-axis-1',
        },
        {
            label: 'Documents',
            data: Array.from({ length: days }, () => Math.floor(Math.random() * 80)),
            fill: false,
            borderWidth: 3,
            backgroundColor: 'rgb(11, 174, 110)',
            borderColor: 'rgba(75, 192, 192, 0.8)',
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
        </div>
        <Line data={data} options={options} />
    </>
);

export default MultiAxisLineChart;
