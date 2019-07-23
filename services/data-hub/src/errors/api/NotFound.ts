import ApiError from './ApiError';

export default class NotFound extends ApiError {
    public constructor(message: string = 'Not Found') {
        super(404, message);
    }
}
