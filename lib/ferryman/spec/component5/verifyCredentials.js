/* eslint no-unused-vars: 0 */ // --> OFF

function verify(credentials) {
  return Promise.reject(new Error('Your API key is invalid'));
}

module.exports = verify;
