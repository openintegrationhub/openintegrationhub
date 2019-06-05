import NotFound from '../../../errors/api/NotFound';

export default class StorageObjectNotFound extends NotFound {
    public constructor() {
        super('Object Not Found');
    }
}
