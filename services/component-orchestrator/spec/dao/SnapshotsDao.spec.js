const SnapshotsDao = require('../../src/dao/SnapshotsDao');
const nock = require('nock');
const { expect } = require('chai');

describe('SnapshotsDao', () => {
    let sd;
    let snapshotsService;
    const IAM_TOKEN = 'test-iam-token';
    const auth = {
        token: IAM_TOKEN,
    };
    const flowId = 123;
    const stepId = 1;

    beforeEach(() => {
        const config = {
            get(key) {
                return this[key];
            },
            SNAPSHOTS_SERVICE_BASE_URL: 'http://snapshots-service.com/api/v1',
        };
        const logger = {
            child() {
                return {
                    info: () => {},
                    debug: () => {},
                    error: () => {},
                    trace: () => {},
                };
            },
        };

        sd = new SnapshotsDao({ config, logger });
        snapshotsService = nock(config.SNAPSHOTS_SERVICE_BASE_URL, {
            reqheaders: {
                authorization: `Bearer ${IAM_TOKEN}`,
            },
        });
    });

    describe('#findOne', () => {
        it('should return secret data', async () => {
            const scope = snapshotsService.get(`/snapshots/flows/${flowId}/steps/${stepId}`).reply(200, {
                data: {
                    snapshot: 123,
                },
            });

            expect(await sd.findOne({ flowId, stepId, auth })).to.deep.equal({
                snapshot: 123,
            });
            expect(scope.isDone()).to.be.true;
        });

        it('should return null if not found', async () => {
            const scope = snapshotsService.get(`/snapshots/flows/${flowId}/steps/${stepId}`).reply(404);

            expect(await sd.findOne({ flowId, stepId, auth })).to.be.null;
            expect(scope.isDone()).to.be.true;
        });

        it('should throw an error if unexpected status code is returned', async () => {
            const scope = snapshotsService.get(`/snapshots/flows/${flowId}/steps/${stepId}`).reply(500);

            try {
                await sd.findOne({ flowId, stepId, auth });
                throw new Error('Error is expected');
            } catch (e) {
                expect(e.message).to.equal('Failed to fetch the snapshot 123:1');
            }

            expect(scope.isDone()).to.be.true;
        });
    });
});
