const testData = require('./testdata.json');
const { example1 } = require('./examples');

const { EngineGoBroom } = require('./rule-impl');

const engine = new EngineGoBroom(example1, testData);
engine.process();
