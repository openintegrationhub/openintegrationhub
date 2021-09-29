import ApiError from './ApiError';

export default class Unauthorized extends ApiError {
    public constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
