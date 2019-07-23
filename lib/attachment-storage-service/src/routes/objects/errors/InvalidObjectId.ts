import BadRequest from '../../../errors/api/BadRequest';

export default class InvalidObjectId extends BadRequest {
    public constructor() {
        super('Invalid object id');
    }
}
