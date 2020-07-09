module.exports = verify;

function verify(credentials) {
    return Promise.reject(new Error('Your API key is invalid'));
}
