import ApiError from './ApiError';

export default class BadRequest extends ApiError {
    public constructor(message: string = 'BadRequest') {
        super(400, message);
    }
}
