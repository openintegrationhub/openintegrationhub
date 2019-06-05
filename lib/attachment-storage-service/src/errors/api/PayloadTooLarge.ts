import ApiError from './ApiError';

export default class PayloadTooLarge extends ApiError {
    public constructor(message: string = 'Payload Too Large') {
        super(413, message);
    }
}
