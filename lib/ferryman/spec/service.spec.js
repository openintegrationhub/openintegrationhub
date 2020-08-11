/* eslint no-use-before-define: "off" */

describe('Service', () => {
    var service = require('../lib/service');
    var nock = require('nock');

    describe('execService', () => {

        beforeEach(() => {
            process.env.ELASTICIO_API_URI = 'http://apihost.com';
        });

        afterEach(() => {
            delete process.env.ELASTICIO_API_URI;
        });

        function makeEnv(env) {
            env.ELASTICIO_CFG = env.ELASTICIO_CFG || '{}';
            env.ELASTICIO_COMPONENT_PATH = env.ELASTICIO_COMPONENT_PATH || '/spec/component';
            env.ELASTICIO_POST_RESULT_URL = env.ELASTICIO_POST_RESULT_URL || 'http://test.com/123/456';
            env.ELASTICIO_API_URI = 'http://apihost.com';
            env.ELASTICIO_API_USERNAME = 'test@test.com';
            env.ELASTICIO_API_KEY = '5559edd';
            env.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL = 'https://localhost:2345';
            return env;
        }

        describe('error cases', () => {

            beforeEach(() => {
                nock('http://test.com:80')
                    .post('/123/456')
                    .reply(200, 'OK');
            });

            it('should fail if no ELASTICIO_POST_RESULT_URL provided', done => {

                service.processService('verifyCredentials', {})
                    .catch(checkError)
                    .done(done, done);

                function checkError(err) {
                    expect(err.message).toEqual('ELASTICIO_POST_RESULT_URL is not provided');
                }
            });

            it('should throw an error when there is no such service method', done => {

                service.processService('unknownMethod', makeEnv({}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unknown service method "unknownMethod"');
                }
            });

            it('should send error response if no ELASTICIO_CFG provided', done => {

                service.processService('verifyCredentials', { ELASTICIO_POST_RESULT_URL: 'http://test.com/123/456' })
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_CFG is not provided');
                }
            });

            it('should send error response if failed to parse ELASTICIO_CFG', done => {

                service.processService('verifyCredentials', makeEnv({
                    ELASTICIO_POST_RESULT_URL: 'http://test.com/123/456',
                    ELASTICIO_CFG: 'test'

                }))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unable to parse CFG');
                }
            });

            it('should send error response if component is not found', done => {

                service.processService('verifyCredentials', {
                    ELASTICIO_POST_RESULT_URL: 'http://test.com/123/456',
                    ELASTICIO_CFG: '{"param1":"param2"}',
                    ELASTICIO_API_URI: 'http://example.com',
                    ELASTICIO_API_USERNAME: 'admin',
                    ELASTICIO_API_KEY: 'key'
                })
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toMatch('Failed to load component.json');
                }
            });

            it('should throw an error when ELASTICIO_ACTION_OR_TRIGGER is not provided', done => {

                service.processService('getMetaModel', makeEnv({}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_ACTION_OR_TRIGGER is not provided');
                }
            });

            it('should throw an error when ELASTICIO_ACTION_OR_TRIGGER is not found', done => {

                service.processService('getMetaModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'unknown' }))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Trigger or action "unknown" is not found in component.json!');
                }
            });

            it('should throw an error when ELASTICIO_GET_MODEL_METHOD is not provided', done => {

                service.processService('selectModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update' }))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_GET_MODEL_METHOD is not provided');
                }
            });

            it('should throw an error when ELASTICIO_GET_MODEL_METHOD is not found', done => {

                //eslint-disable-next-line max-len
                service.processService('selectModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update', ELASTICIO_GET_MODEL_METHOD: 'unknown' }))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Method "unknown" is not found in "update" action or trigger');
                }
            });

        });

        describe('success cases', () => {

            beforeEach(() => {
                nock('http://test.com:80')
                    .post('/123/456')
                    .reply(200, 'OK');
            });

            describe('verifyCredentials', () => {

                it('should verify successfully when verifyCredentials.js is not available', done => {

                    service.processService('verifyCredentials', makeEnv({}))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({ verified: true });
                    }
                });

                it('should verify successfully when callback verified', done => {

                    //eslint-disable-next-line max-len
                    service.processService('verifyCredentials', makeEnv({ ELASTICIO_COMPONENT_PATH: '/spec/component2' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({ verified: true });
                    }
                });

                it('should NOT verify successfully when callback did not verify', done => {

                    //eslint-disable-next-line max-len
                    service.processService('verifyCredentials', makeEnv({ ELASTICIO_COMPONENT_PATH: '/spec/component3' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({ verified: false });
                    }
                });

                it('should verify successfully when promise resolves', done => {

                    //eslint-disable-next-line max-len
                    service.processService('verifyCredentials', makeEnv({ ELASTICIO_COMPONENT_PATH: '/spec/component4' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({ verified: true });
                    }
                });

                it('should NOT verify successfully when promise rejects', done => {

                    //eslint-disable-next-line max-len
                    service.processService('verifyCredentials', makeEnv({ ELASTICIO_COMPONENT_PATH: '/spec/component5' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            verified: false,
                            reason: 'Your API key is invalid'
                        });
                    }
                });

                it('should NOT verify successfully when error thrown synchronously', done => {

                    //eslint-disable-next-line max-len
                    service.processService('verifyCredentials', makeEnv({ ELASTICIO_COMPONENT_PATH: '/spec/component6' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            verified: false,
                            reason: 'Ouch. This occurred during verification.'
                        });
                    }
                });

            });

            describe('getMetaModel', () => {
                it('should return callback based model successfully', done => {

                    service.processService('getMetaModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            in: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        title: 'Name'
                                    }
                                }
                            }
                        });
                    }
                });
                it('should return promise based model successfully', done => {

                    service.processService('getMetaModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update1' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            in: {
                                type: 'object',
                                properties: {
                                    email: {
                                        type: 'string',
                                        title: 'E-Mail'
                                    }
                                }
                            }
                        });
                    }
                });
                it('should return error when promise rejects', done => {

                    service.processService('getMetaModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update2' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('error');
                        expect(result.data).toEqual({
                            message: 'Today no metamodels. Sorry!'
                        });
                    }
                });
            });

            describe('selectModel', () => {

                it('selectModel', done => {

                    //eslint-disable-next-line max-len
                    service.processService('selectModel', makeEnv({ ELASTICIO_ACTION_OR_TRIGGER: 'update', ELASTICIO_GET_MODEL_METHOD: 'getModel' }))
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            de: 'Germany',
                            us: 'USA',
                            ua: 'Ukraine'
                        });
                    }
                });

                it('selectModel with updateKeys event', done => {

                    var env = makeEnv({
                        ELASTICIO_ACTION_OR_TRIGGER: 'update',
                        ELASTICIO_GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                        ELASTICIO_CFG: '{"_account":"1234567890"}',
                        ELASTICIO_API_URI: 'http://apihost.com',
                        ELASTICIO_API_USERNAME: 'test@test.com',
                        ELASTICIO_API_KEY: '5559edd'
                    });

                    var nockScope = nock('http://apihost.com:80')
                        .matchHeader('Connection', 'Keep-Alive')
                        .put('/v1/accounts/1234567890', { keys: { oauth: { access_token: 'newAccessToken' } } })
                        .reply(200, 'Success');

                    service.processService('selectModel', env)
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(nockScope.isDone()).toEqual(true);
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            0: 'Mr',
                            1: 'Mrs'
                        });
                    }
                });

                it('selectModel with failed updateKeys event should return result anyway', done => {

                    var env = makeEnv({
                        ELASTICIO_ACTION_OR_TRIGGER: 'update',
                        ELASTICIO_GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                        ELASTICIO_CFG: '{"_account":"1234567890"}',
                        ELASTICIO_API_URI: 'http://apihost.com',
                        ELASTICIO_API_USERNAME: 'test@test.com',
                        ELASTICIO_API_KEY: '5559edd'
                    });

                    var nockScope = nock('http://apihost.com:80')
                        .matchHeader('Connection', 'Keep-Alive')
                        .put('/v1/accounts/1234567890', { keys: { oauth: { access_token: 'newAccessToken' } } })
                        .reply(400, 'Success');

                    service.processService('selectModel', env)
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(nockScope.isDone()).toEqual(true);
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            0: 'Mr',
                            1: 'Mrs'
                        });
                    }
                });

                it('selectModel returns a promise that resolves successfully', done => {

                    var env = makeEnv({
                        ELASTICIO_ACTION_OR_TRIGGER: 'update',
                        ELASTICIO_GET_MODEL_METHOD: 'promiseSelectModel',
                        ELASTICIO_CFG: '{"_account":"1234567890"}',
                        ELASTICIO_API_URI: 'http://apihost.com',
                        ELASTICIO_API_USERNAME: 'test@test.com',
                        ELASTICIO_API_KEY: '5559edd'
                    });

                    service.processService('selectModel', env)
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            de: 'de_DE',
                            at: 'de_AT'
                        });
                    }
                });

                it('selectModel returns a promise that sends a request', done => {

                    var env = makeEnv({
                        ELASTICIO_ACTION_OR_TRIGGER: 'update',
                        ELASTICIO_GET_MODEL_METHOD: 'promiseRequestSelectModel',
                        ELASTICIO_CFG: '{"_account":"1234567890"}',
                        ELASTICIO_API_URI: 'http://apihost.com',
                        ELASTICIO_API_USERNAME: 'test@test.com',
                        ELASTICIO_API_KEY: '5559edd'
                    });

                    var nockScope = nock('http://promise_target_url:80')
                        .get('/selectmodel')
                        .reply(200, {
                            a: 'x',
                            b: 'y'
                        });

                    service.processService('selectModel', env)
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(nockScope.isDone()).toEqual(true);
                        expect(result.status).toEqual('success');
                        expect(result.data).toEqual({
                            a: 'x',
                            b: 'y'
                        });
                    }
                });

                it('selectModel returns a promise that rejects', done => {

                    var env = makeEnv({
                        ELASTICIO_ACTION_OR_TRIGGER: 'update',
                        ELASTICIO_GET_MODEL_METHOD: 'promiseSelectModelRejected',
                        ELASTICIO_CFG: '{"_account":"1234567890"}',
                        ELASTICIO_API_URI: 'http://apihost.com',
                        ELASTICIO_API_USERNAME: 'test@test.com',
                        ELASTICIO_API_KEY: '5559edd'
                    });

                    service.processService('selectModel', env)
                        .then(checkResult)
                        .done(done, done);

                    function checkResult(result) {
                        expect(result.status).toEqual('error');
                        expect(result.data.message).toEqual('Ouch. This promise is rejected');
                    }
                });
            });

        });

        describe('sending error', () => {

            beforeEach(() => {
                nock('http://test.com:80')
                    .post('/111/222')
                    .reply(404, 'Page not found');
            });

            it('verifyCredentials', done => {

                //eslint-disable-next-line max-len
                service.processService('verifyCredentials', makeEnv({ ELASTICIO_POST_RESULT_URL: 'http://test.com/111/222' }))
                    .catch(checkError)
                    .done(done, done);

                function checkError(err) {
                    expect(err.message).toEqual('Failed to POST data to http://test.com/111/222 (404, Page not found)');
                }
            });

        });
    });
});
