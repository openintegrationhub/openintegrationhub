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
            data: Array.from({ length: days }, () => Math.floor(Math.random() * 200)),
            fill: false,
            backgroundColor: 'rgb(54, 162, 235)',
            borderColor: 'rgba(54, 162, 235, 0.8)',
            borderWidth: 3,
            yAxisID: 'y-axis-1',
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
        },
        {
            label: 'Contacts',
            data: Array.from({ length: days }, (val, ind) => Math.floor(ind * 15 + Math.random() * 400)),
            fill: false,
            borderWidth: 3,
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgba(255, 99, 132, 0.8)',
            yAxisID: 'y-axis-1',
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
        },
        {
            label: 'Documents',
            data: Array.from({ length: days }, (val, ind) => Math.floor(ind * 50 + Math.random() * 400)),
            fill: false,
            borderWidth: 3,
            backgroundColor: 'rgb(11, 174, 110)',
            borderColor: 'rgba(75, 192, 192, 0.8)',
            yAxisID: 'y-axis-1',
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
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
