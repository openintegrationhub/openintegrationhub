export default class ApiError extends Error {
    public readonly status: number;
    public readonly message: string;
    public readonly contentType: string;
    public constructor(status = 500, message = 'Internal Server Error') {
        if (status < 400 || status > 599) {
            throw new Error('Invalid error code');
        }
        super(message);
        this.contentType = 'text/plain';
        this.status = status;
        this.message = message;
    }
}


