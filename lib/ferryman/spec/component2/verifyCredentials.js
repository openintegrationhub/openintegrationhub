module.exports = verify;

function verify(credentials, cb) {
    cb(null, {
        verified: true
    });
}
