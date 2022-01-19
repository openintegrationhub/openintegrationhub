
const testData = require('./testdata.json');
const { exampleRefactoredRule } = require('./examples');

const { LogicGateway } = require('./rule-impl');

describe('Suite', () => {

    let engine;

    beforeEach(() => {
        engine = new LogicGateway({ rule: exampleRefactoredRule, snapshotData: testData });
    });

    test('success case', () => {
        const result = engine.process()
        console.log('Result', result);
        expect(result).toBeTruthy();
        expect(result.action).toEqual(exampleRefactoredRule.actions.positive.action);
        expect(result.data).toEqual(exampleRefactoredRule.actions.positive.data);
    });

    test('negative case', () => {
        const copyExample = { ...exampleRefactoredRule };
        copyExample.operands[0].value.data = 'fail';
        const engine2 = new LogicGateway({ rule: copyExample, snapshotData: testData });
        const result = engine2.process()
        console.log('Result', result);
        expect(result.action).toEqual(exampleRefactoredRule.actions.negative.action);
        expect(result.data).toEqual(exampleRefactoredRule.actions.negative.data);
    });

});


