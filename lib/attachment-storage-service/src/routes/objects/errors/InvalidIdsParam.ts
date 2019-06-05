import BadRequest from '../../../errors/api/BadRequest';

export default class InvalidIdsParam extends BadRequest {
    public constructor() {
        super('Invalid ids param');
    }
}
