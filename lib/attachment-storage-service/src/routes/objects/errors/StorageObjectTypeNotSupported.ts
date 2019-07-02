import UnsupportedMediaType from '../../../errors/api/UnsupportedMediaType';

export default class StorageObjectTypeNotSupported extends UnsupportedMediaType {
    public constructor() {
        super('Object type not supported or missing');
    }
}
