import ApiError from './ApiError';

export default class PayloadTooLarge extends ApiError {
    public constructor(message = 'Payload Too Large') {
        super(413, message);
    }
}
