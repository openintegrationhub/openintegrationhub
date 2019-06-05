import ApiError from './ApiError';

export default class Conflict extends ApiError {
    public constructor(message: string = 'Conflict') {
        super(409, message);
    }
}
