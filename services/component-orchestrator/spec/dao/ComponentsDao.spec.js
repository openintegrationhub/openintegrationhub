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
            IAM_TOKEN: 'kokoko'
        };
        const logger = {
            info: () => {},
            debug: () => {},
            error: () => {},
            trace: () => {}
        };

        cd = new ComponentsDao({config, logger});
        compRepo = nock(config.COMPONENT_REPOSITORY_BASE_URL, {
            reqheaders: {
                authorization: `Bearer ${config.IAM_TOKEN}`,
            },
        });
    });

    describe('#findById', () => {
        it('should call Component Repository', async () => {
            const scope = compRepo
                .get('/components/123')
                .reply(200, {
                    data: {
                        id: '123',
                        some: 'data'
                    }
                });

            expect(await cd.findById('123')).to.deep.equal({
                id: '123',
                some: 'data'
            });
            expect(scope.isDone()).to.be.true;
        });
    });
});
