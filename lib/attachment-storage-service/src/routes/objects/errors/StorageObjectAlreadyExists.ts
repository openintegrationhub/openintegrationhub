import Conflict from '../../../errors/api/Conflict';

export default class StorageObjectAlreadyExists extends Conflict {
    public constructor() {
        super('Object already exists');
    }
}
