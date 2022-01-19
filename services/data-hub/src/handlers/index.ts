import scoreObject from './scorer';
import tagObject from './tagger';
import dedupeObject from './deduplicator';
import transformObject from './transformer';

export default {
    score: scoreObject,
    tag: tagObject,
    deduplicate: dedupeObject,
    transform: transformObject
}
