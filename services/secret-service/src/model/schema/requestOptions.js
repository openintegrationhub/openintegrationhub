const { Schema } = require('mongoose');

// const field = {
//     name: {
//         type: String,
//         required: true,
//     },
//     value: {
//         type: String,
//         required: true,
//     },
// };

// const header = {
//     name: {
//         type: String,
//         required: true,
//     },
//     value: {
//         type: String,
//         required: true,
//     },
// };

const requestOptions = new Schema({
    url: {
        type: String,
        required: true,
    },
    method: {
        type: String,
        enum: ['GET', 'POST'],
        default: 'GET',
    },
    headers: {},
    fields: {},
}, { _id: false });

module.exports = requestOptions;
