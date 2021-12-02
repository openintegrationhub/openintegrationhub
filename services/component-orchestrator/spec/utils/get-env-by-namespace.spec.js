const chai = require('chai');
const { expect } = chai;
const { getEnvByNamespace } = require('../../src/utils')

chai.use(require('sinon-chai'));

describe('getEnvByNamespace', () => {
    it('should detect FEATURE* env vars and return them', async () => {

        let namespace = /^FEATURE_/

        process.env.FEATURE_FOO = 'true'
        process.env.FEATURE_BAR = 1234
        process.env.FEATURE_BAR_BAZ = 1234
        process.env.NO_FEATURE_BAR = 'will be ignored'
        const featureEnvs = getEnvByNamespace(namespace)

        expect(Object.entries(featureEnvs)).to.have.length(3)

        expect(featureEnvs['FEATURE_FOO']).to.equal('true');
        expect(featureEnvs['FEATURE_BAR']).to.equal('1234');
        expect(featureEnvs['FEATURE_BAR_BAZ']).to.equal('1234');
        expect(featureEnvs['NO_FEATURE_BAR']).to.equal(undefined);
    });

    it('should detect COMPONENT_FEATURE* env vars and return them', async () => {

        let namespace = /^COMPONENT_FEATURE_/

        process.env.COMPONENT_FEATURE_FOO = 'true'
        process.env.COMPONENT_FEATURE_BAR_BAZ = 1234

        const featureEnvs = getEnvByNamespace(namespace)

        expect(Object.entries(featureEnvs)).to.have.length(2)

        expect(featureEnvs['COMPONENT_FEATURE_FOO']).to.equal('true');
        expect(featureEnvs['COMPONENT_FEATURE_BAR_BAZ']).to.equal('1234');
    });
});
