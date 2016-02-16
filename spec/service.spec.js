process.env.COMPONENT_PATH = '/spec/component';
describe('Service', function(){
    var service = require('../lib/service');
    var nock = require('nock');

    describe('execService', function(){

        beforeEach(function() {
            process.env.ELASTICIO_API_URI = 'http://apihost.com';
        });

        afterEach(function() {
            delete process.env.ELASTICIO_API_URI;
        });

        function makeEnv(env) {
            env.ELASTICIO_CFG = env.ELASTICIO_CFG || '{}';
            env.ELASTICIO_COMPONENT_PATH = '/spec/component';
            env.ELASTICIO_POST_RESULT_URL = env.ELASTICIO_POST_RESULT_URL || 'http://test.com/123/456';
            env.ELASTICIO_API_URI = 'http://apihost.com';
            env.ELASTICIO_API_USERNAME = 'test@test.com';
            env.ELASTICIO_API_KEY = '5559edd';
            return env;
        }

        describe('error cases', function(){

            beforeEach(function(){
                nock('http://test.com:80')
                    .post('/123/456')
                    .reply(200, "OK");
            });

            it('should fail if no ELASTICIO_POST_RESULT_URL provided', function(done){

                service.processService('verifyCredentials', {})
                    .catch(checkError)
                    .done(done, done);

                function checkError(err){
                    expect(err.message).toEqual('ELASTICIO_POST_RESULT_URL is not provided');
                }
            });

            it('should throw an error when there is no such service method', function(done){

                service.processService('unknownMethod', makeEnv({}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unknown service method "unknownMethod"');
                }
            });

            it('should send error response if no ELASTICIO_CFG provided', function(done){

                service.processService('verifyCredentials', {'ELASTICIO_POST_RESULT_URL':'http://test.com/123/456'})
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_CFG is not provided');
                }
            });

            it('should send error response if failed to parse ELASTICIO_CFG', function(done){

                service.processService('verifyCredentials', makeEnv({
                    ELASTICIO_POST_RESULT_URL: 'http://test.com/123/456',
                    ELASTICIO_CFG: 'test',

                }))
                .then(checkResult)
                .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unable to parse CFG');
                }
            });

            it('should send error response if component is not found', function(done){

                service.processService('verifyCredentials', {
                    ELASTICIO_POST_RESULT_URL: 'http://test.com/123/456',
                    ELASTICIO_CFG: '{"param1":"param2"}',
                    ELASTICIO_API_URI: 'http://example.com',
                    ELASTICIO_API_USERNAME: 'admin',
                    ELASTICIO_API_KEY: 'key'
                })
                .then(checkResult)
                .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toMatch('Failed to load component.json');
                }
            });

            it('should throw an error when ELASTICIO_ACTION_OR_TRIGGER is not provided', function(done){

                service.processService('getMetaModel', makeEnv({}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_ACTION_OR_TRIGGER is not provided');
                }
            });

            it('should throw an error when ELASTICIO_ACTION_OR_TRIGGER is not found', function(done){

                service.processService('getMetaModel', makeEnv({ELASTICIO_ACTION_OR_TRIGGER: 'unknown'}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Trigger or action "unknown" is not found in component.json!');
                }
            });

            it('should throw an error when ELASTICIO_GET_MODEL_METHOD is not provided', function(done){

                service.processService('selectModel', makeEnv({ELASTICIO_ACTION_OR_TRIGGER: 'update'}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ELASTICIO_GET_MODEL_METHOD is not provided');
                }
            });

            it('should throw an error when ELASTICIO_GET_MODEL_METHOD is not found', function(done){

                service.processService('selectModel', makeEnv({ELASTICIO_ACTION_OR_TRIGGER: 'update', ELASTICIO_GET_MODEL_METHOD: 'unknown'}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Method "unknown" is not found in "update" action or trigger');
                }
            });

        });

        describe('success cases', function(){

            beforeEach(function(){
                nock('http://test.com:80')
                    .post('/123/456')
                    .reply(200, "OK");
            });

            it('verifyCredentials', function(done){

                service.processService('verifyCredentials', makeEnv({}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual({verified: true});
                }
            });

            it('getMetaModel', function(done){

                service.processService('getMetaModel', makeEnv({ELASTICIO_ACTION_OR_TRIGGER: 'update'}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('metamodel');
                }
            });

            it('selectModel', function(done){

                service.processService('selectModel', makeEnv({ELASTICIO_ACTION_OR_TRIGGER: 'update', ELASTICIO_GET_MODEL_METHOD: 'getModel'}))
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model');
                }
            });

            it('selectModel with updateKeys event', function(done){

                var env = makeEnv({
                    ELASTICIO_ACTION_OR_TRIGGER: 'update',
                    ELASTICIO_GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                    ELASTICIO_CFG: '{"_account":"1234567890"}',
                    ELASTICIO_API_URI: 'http://apihost.com',
                    ELASTICIO_API_USERNAME: 'test@test.com',
                    ELASTICIO_API_KEY: '5559edd'
                });

                var nockScope = nock('http://apihost.com:80')
                    .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                    .reply(200, "Success");

                service.processService('selectModel', env)
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result){
                    expect(nockScope.isDone()).toEqual(true);
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model2');
                }
            });

            it('selectModel with failed updateKeys event should return result anyway', function(done){

                var env = makeEnv({
                    ELASTICIO_ACTION_OR_TRIGGER: 'update',
                    ELASTICIO_GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                    ELASTICIO_CFG: '{"_account":"1234567890"}',
                    ELASTICIO_API_URI: 'http://apihost.com',
                    ELASTICIO_API_USERNAME: 'test@test.com',
                    ELASTICIO_API_KEY: '5559edd'
                });

                var nockScope = nock('http://apihost.com:80')
                    .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                    .reply(400, "Success");

                service.processService('selectModel', env)
                    .then(checkResult)
                    .done(done, done);

                function checkResult(result) {
                    expect(nockScope.isDone()).toEqual(true);
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model2');
                }
            });

        });

        describe('sending error', function(){

            beforeEach(function(){
                nock('http://test.com:80')
                    .post('/111/222')
                    .reply(404, "Page not found");
            });

            it('verifyCredentials', function(done){

                service.processService('verifyCredentials', makeEnv({ELASTICIO_POST_RESULT_URL: 'http://test.com/111/222'}))
                    .catch(checkError)
                    .done(done, done);

                function checkError(err){
                    expect(err.message).toEqual('Failed to POST data to http://test.com/111/222 (404, Page not found)');
                }
            });

        });
    });
});