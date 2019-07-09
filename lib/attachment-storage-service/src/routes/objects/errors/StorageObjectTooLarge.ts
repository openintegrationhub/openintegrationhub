import PayloadTooLarge from '../../../errors/api/PayloadTooLarge';

export default class StorageObjectTooLarge extends PayloadTooLarge {
    public constructor() {
        super('Object too large');
    }
}
