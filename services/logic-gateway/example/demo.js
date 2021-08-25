const testData = require('./testdata.json');
const testDataSnapshotRepo = require('./testdata-snapshot-repo.json');
const { example1, exampleRefactoredRule, exampleRefactoredRule2 } = require('./examples');

const { LogicGateway } = require('./rule-impl');

// const l1 = new LogicGateway({ rule: example1, snapshotData: testData });
// console.log(l1.process());

const l2 = new LogicGateway({ rule: exampleRefactoredRule2, snapshotData: testDataSnapshotRepo.data });
console.log(l2.process());

const l3 = new LogicGateway({ rule: exampleRefactoredRule, snapshotData: testDataSnapshotRepo.data });
console.log(l3.process());
