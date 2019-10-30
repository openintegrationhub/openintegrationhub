import ApiError from './ApiError';

export default class Unauthorized extends ApiError {
    public constructor(message: string = 'Unauthorized') {
        super(401, message);
    }
}
