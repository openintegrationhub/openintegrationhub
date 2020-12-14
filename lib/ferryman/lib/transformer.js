const jsonata = require('jsonata');
const { latestActiveConnection } = require('./amqp.js');
const log = require('./logging.js');

// This function serves as the primary interface for transformations.
// It acts as the first step in each (potential) transformation, deciding which mapping (if any) to use

function transform(object, cfg = {}, defaultMapping = false) {
    let transformedObject = object;

    // If transformation is set to be skipped, simply return original object, wrapped in the expected data key
    if (cfg.skipTransformation === true) {
        return transformedObject;
    }

    // If a custom mapping was injected, use it instead
    if (cfg.customMapping) {
        try {
            const expression = jsonata(cfg.customMapping);
            transformedObject = expression.evaluate(transformedObject);
            return transformedObject;
        } catch (e) {
            log.error('Could not apply custom mapping!');
            log.error(e);
            return transformedObject;
        }
    }

    // Otherwise, use the desired default mapping
    if (defaultMapping) {
        if (typeof defaultMapping === 'function') {
            transformedObject = defaultMapping(object, cfg);
        } else {
            log.error('Passed defaultMapping is not a function!');
        }
    }

    return transformedObject;
}

module.exports = {
    transform
};
