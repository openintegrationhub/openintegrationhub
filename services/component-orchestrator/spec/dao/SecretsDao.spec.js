const SecretsDao = require('../../src/dao/SecretsDao');
const nock = require('nock');
const { expect } = require('chai');

describe('SecretsDao', () => {
    let sd;
    let secretService;
    const IAM_TOKEN = 'test-iam-token';
    const options = {
        auth: {
            token: IAM_TOKEN,
        },
    };

    beforeEach(() => {
        const config = {
            get(key) {
                return this[key];
            },
            SECRET_SERVICE_BASE_URL: 'http://secret-service.com/api/v1',
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

        sd = new SecretsDao({ config, logger });
        secretService = nock(config.SECRET_SERVICE_BASE_URL, {
            reqheaders: {
                authorization: `Bearer ${IAM_TOKEN}`,
            },
        });
    });

    describe('#findById', () => {
        it('should return secret data', async () => {
            const scope = secretService.get('/secrets/123').reply(200, {
                data: {
                    _id: '123',
                    value: {
                        some: 'data',
                    },
                },
            });

            expect(await sd.findById('123', options)).to.deep.equal({
                _id: '123',
                value: {
                    some: 'data',
                },
            });
            expect(scope.isDone()).to.be.true;
        });

        it('should return null if not found', async () => {
            const scope = secretService.get('/secrets/123').reply(404);

            expect(await sd.findById('123', options)).to.be.null;
            expect(scope.isDone()).to.be.true;
        });

        it('should throw an error if unexpected status code is returned', async () => {
            const scope = secretService.get('/secrets/123').reply(500);

            try {
                await sd.findById('123', options);
                throw new Error('Error is expected');
            } catch (e) {
                expect(e.message).to.equal('Failed to fetch the secret 123');
            }

            expect(scope.isDone()).to.be.true;
        });
    });
});
