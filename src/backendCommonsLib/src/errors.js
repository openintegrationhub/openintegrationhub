class HttpError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.status = code;
    }
}
class ResourceNotFoundError extends HttpError {
    constructor(message) {
        super(404, message);
    }
}

module.exports = {
    HttpError,
    ResourceNotFoundError
};
