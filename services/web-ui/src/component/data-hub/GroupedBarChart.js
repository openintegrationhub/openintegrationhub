import React from 'react';
import { Bar } from 'react-chartjs-2';

const generateData = (contacts, products, documents) => ({
    labels: ['1'],
    datasets: [
        {
            label: '# of Contacts',
            data: [contacts.length],
            backgroundColor: 'rgb(255, 99, 132)',
            stack: 'Stack 0',
        },
        {
            label: '# of Products',
            data: [products.length],
            backgroundColor: 'rgb(54, 162, 235)',
            stack: 'Stack 1',
        },
        {
            label: '# of Documents',
            data: [documents.length],
            backgroundColor: 'rgb(75, 192, 192)',
            stack: 'Stack 2',
        },
    ],
});

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

const GroupedBar = ({ contacts, products, documents }) => (
    <>
        <div className='header'>
        </div>
        <Bar data={generateData(contacts, products, documents)} options={options} />
    </>
);

export default GroupedBar;
