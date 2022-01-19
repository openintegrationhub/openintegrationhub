import ApiError from './ApiError';

export default class Forbidden extends ApiError {
    public constructor(message = 'Forbidden') {
        super(403, message);
    }
}
