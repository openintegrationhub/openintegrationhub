class SchemaValidationError extends Error {
    constructor(...args) {
        super(...args);
        this.name = 'SchemaValidationError';
        Error.captureStackTrace(this, SchemaValidationError);
    }
}


class SchemaReferenceError extends Error {
    constructor(...args) {
        super(...args);
        this.name = 'SchemaReferenceError';
        Error.captureStackTrace(this, SchemaReferenceError);
    }
}

module.exports = {
    SchemaValidationError,
    SchemaReferenceError,
};
