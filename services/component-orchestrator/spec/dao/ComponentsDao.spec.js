const ComponentsDao = require('../../src/dao/ComponentsDao');
const nock = require('nock');
const { expect } = require('chai');

describe('ComponentsDao', () => {
    let cd;
    let compRepo;

    beforeEach(() => {
        const config = {
            get(key) {
                return this[key];
            },
            COMPONENT_REPOSITORY_BASE_URL: 'http://comp-repo.com',
            IAM_TOKEN: 'kokoko',
        };
        const logger = {
            info: () => {},
            debug: () => {},
            error: () => {},
            trace: () => {},
        };

        cd = new ComponentsDao({ config, logger });
        compRepo = nock(config.COMPONENT_REPOSITORY_BASE_URL, {
            reqheaders: {
                authorization: `Bearer ${config.IAM_TOKEN}`,
            },
        });
    });

    describe('#findById', () => {
        it('should return component data', async () => {
            const scope = compRepo.get('/components/123').reply(200, {
                data: {
                    id: '123',
                    some: 'data',
                },
            });

            expect(await cd.findById('123')).to.deep.equal({
                id: '123',
                some: 'data',
            });
            expect(scope.isDone()).to.be.true;
        });

        it('should return null if not found', async () => {
            const scope = compRepo.get('/components/123').reply(404);

            expect(await cd.findById('123')).to.be.null;
            expect(scope.isDone()).to.be.true;
        });

        it('should throw an error if unexpected status code is returned', async () => {
            const scope = compRepo.get('/components/123').reply(500);

            try {
                await cd.findById('123');
                throw new Error('Error is expected');
            } catch (e) {
                expect(e.message).to.equal('Failed to fetch the component 123');
            }

            expect(scope.isDone()).to.be.true;
        });
    });
});
