process.env.COMPONENT_PATH = '/spec/component';
describe('Service', function(){
    var Q = require('q');
    var request = require('request');
    var service = require('../lib/service');
    var nock = require('nock');

    describe('execService', function(){

        function makeEnv(env) {
            env.CFG = env.CFG || '{}';
            env.COMPONENT_PATH = '/spec/component';
            env.POST_RESULT_URL = env.POST_RESULT_URL || 'http://test.com/123/456';
            env.API_URI = 'http://apihost.com';
            env.API_USERNAME = 'test@test.com';
            env.API_KEY = '5559edd';
            return env;
        }

        describe('error cases', function(){

            beforeEach(function(){
                nock('http://test.com:80')
                    .post('/123/456')
                    .reply(200, "OK");
            });

            it('should fail if no POST_RESULT_URL provided', function(done){

                service.processService('verifyCredentials', {})
                    .catch(checkError)
                    .done();

                function checkError(err){
                    expect(err.message).toEqual('POST_RESULT_URL is not provided');
                    done();
                }
            });

            it('should throw an error when there is no such service method', function(done){

                service.processService('unknownMethod', makeEnv({}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unknown service method "unknownMethod"');
                    done();
                }
            });

            it('should send error response if no CFG provided', function(done){

                service.processService('verifyCredentials', {'POST_RESULT_URL':'http://test.com/123/456'})
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('CFG is not provided');
                    done();
                }
            });

            it('should send error response if failed to parse CFG', function(done){

                service.processService('verifyCredentials', {'POST_RESULT_URL':'http://test.com/123/456', CFG: 'test'})
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Unable to parse CFG');
                    done();
                }
            });

            it('should send error response if component is not found', function(done){

                service.processService('verifyCredentials', {'POST_RESULT_URL':'http://test.com/123/456', CFG: '{"param1":"param2"}'})
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toMatch('Failed to load component.json');
                    done();
                }
            });

            it('should throw an error when ACTION_OR_TRIGGER is not provided', function(done){

                service.processService('getMetaModel', makeEnv({}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('ACTION_OR_TRIGGER is not provided');
                    done();
                }
            });

            it('should throw an error when ACTION_OR_TRIGGER is not found', function(done){

                service.processService('getMetaModel', makeEnv({ACTION_OR_TRIGGER: 'unknown'}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Trigger or action "unknown" is not found in component.json!');
                    done();
                }
            });

            it('should throw an error when GET_MODEL_METHOD is not provided', function(done){

                service.processService('selectModel', makeEnv({ACTION_OR_TRIGGER: 'update'}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('GET_MODEL_METHOD is not provided');
                    done();
                }
            });

            it('should throw an error when GET_MODEL_METHOD is not found', function(done){

                service.processService('selectModel', makeEnv({ACTION_OR_TRIGGER: 'update', GET_MODEL_METHOD: 'unknown'}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('error');
                    expect(result.data.message).toEqual('Method "unknown" is not found in "update" action or trigger');
                    done();
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
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual({verified: true});
                    done();
                }
            });

            it('getMetaModel', function(done){

                service.processService('getMetaModel', makeEnv({ACTION_OR_TRIGGER: 'update'}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('metamodel');
                    done();
                }
            });

            it('selectModel', function(done){

                service.processService('selectModel', makeEnv({ACTION_OR_TRIGGER: 'update', GET_MODEL_METHOD: 'getModel'}))
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model');
                    done();
                }
            });

            it('selectModel with updateKeys event', function(done){

                var env = makeEnv({
                    ACTION_OR_TRIGGER: 'update',
                    GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                    CFG: '{"_account":"1234567890"}',
                    API_URI: 'http://apihost.com',
                    API_USERNAME: 'test@test.com',
                    API_KEY: '5559edd'
                });

                var nockScope = nock('http://apihost.com:80')
                    .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                    .reply(200, "Success");

                service.processService('selectModel', env)
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(nockScope.isDone()).toEqual(true);
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model2');
                    done();
                }
            });

            xit('selectModel with failed updateKeys event', function(done){

                var env = makeEnv({
                    ACTION_OR_TRIGGER: 'update',
                    GET_MODEL_METHOD: 'getModelWithKeysUpdate',
                    CFG: '{"_account":"1234567890"}',
                    API_URI: 'http://apihost.com',
                    API_USERNAME: 'test@test.com',
                    API_KEY: '5559edd'
                });

                var nockScope = nock('http://apihost.com:80')
                    .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                    .reply(400, "Success");

                service.processService('selectModel', env)
                    .then(checkResult)
                    .done();

                function checkResult(result){
                    expect(nockScope.isDone()).toEqual(true);
                    expect(result.status).toEqual('success');
                    expect(result.data).toEqual('model2');
                    done();
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

                service.processService('verifyCredentials', makeEnv({POST_RESULT_URL: 'http://test.com/111/222'}))
                    .catch(checkError)
                    .done();

                function checkError(err){
                    expect(err.message).toEqual('Failed to POST data to http://test.com/111/222 (404, Page not found)');
                    done();
                }
            });

        });
    });
});