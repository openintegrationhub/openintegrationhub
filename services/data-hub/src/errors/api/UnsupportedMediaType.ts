import ApiError from './ApiError';

export default class UnsupportedMediaType extends ApiError {
    public constructor(message = 'Unsupported Media Type') {
        super(415, message);
    }
}
