const { encode } = require('base64-url');

module.exports = (id, secret) => `Basic ${encode(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`)}`; 
