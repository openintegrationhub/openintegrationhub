const { ComponentLogger } = require('../../lib/logging');

describe('Logging', () => {
    it('should not fail', () => {
        const logger = new ComponentLogger({});
        const child = logger.child({ component: 'test' });
        child.level('trace');
        child.info('Hello info');
        child.trace('Hello trace');
    });
});
