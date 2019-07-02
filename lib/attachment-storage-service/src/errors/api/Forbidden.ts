import ApiError from './ApiError';

export default class Forbidden extends ApiError {
    public constructor(message: string = 'Forbidden') {
        super(403, message);
    }
}
