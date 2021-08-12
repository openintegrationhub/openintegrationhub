
const testData = require('./testdata.json');
const { example1 } = require('./examples');

const { EngineGoBroom } = require('./rule-impl');

describe('Suite', () => {

    let engine;

    beforeEach(() => {
        engine = new EngineGoBroom(example1, testData);
    });

    test('success case', () => {
        const result = engine.process()
        console.log('Result', result);
        expect(result).toBeTruthy();
        expect(result.action).toEqual(example1.actions.positive.action);
        expect(result.data).toEqual(example1.actions.positive.data);
    });

    test('negative case', () => {
        const copyExample = { ...example1 };
        copyExample.operands[0].value.data = 'fail';
        const engine2 = new EngineGoBroom(copyExample, testData);
        const result = engine2.process()
        console.log('Result', result);
        expect(result.action).toEqual(example1.actions.negative.action);
        expect(result.data).toEqual(example1.actions.negative.data);
    });

});


