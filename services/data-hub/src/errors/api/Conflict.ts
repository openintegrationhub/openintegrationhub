import ApiError from './ApiError';

export default class Conflict extends ApiError {
    public constructor(message = 'Conflict') {
        super(409, message);
    }
}
