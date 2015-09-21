describe('API client', function () {

    var ApiClient = require('../lib/apiClient.js');
    var nock = require('nock');
    var client = new ApiClient('http://test.com').auth('user', 'pass');

    var keys = {
        "oauth": {
            "access_token": "aToken",
            "refreshToken": "rToken"
        }
    };

    it('should send PUT request to API server', function (done) {

        var nockScope = nock('http://test.com:80')
            .put('/v1/accounts/553e4aecbe9de24859000002', {"keys": keys})
            .reply(200, "Success");

        client.updateKeys('553e4aecbe9de24859000002', keys).then(function checkResult() {
            expect(nockScope.isDone()).toEqual(true);
            done();
        });
    });

    it('should send PUT request to API server', function (done) {

        var nockScope = nock('http://test.com:80')
            .put('/v1/accounts/553e4aecbe9de24859000002', {"keys": keys})
            .reply(404, "Page not found");

        client.updateKeys('553e4aecbe9de24859000002', keys).catch(function checkError(err) {
            expect(err.message).toEqual('Failed to update keys: API server replied with status 404 ("Page not found")');
            expect(nockScope.isDone()).toEqual(true);
            done();
        });
    });

    it('should reject is account ID is missing', function (done) {

        client.updateKeys('', keys).catch(function checkError(err) {
            expect(err.message).toEqual('Failed to update keys: accountId is not provided!');
            done();
        });
    });
});
