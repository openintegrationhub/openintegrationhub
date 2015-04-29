describe('Cipher', function () {

    var cipher = require('../lib/cipher.js');

    it('should encrypt & decrypt strings', function () {
        var content = 'Hello world';
        var result = cipher.encryptMessageContent(content);
        var decryptedResult = cipher.decryptMessageContent(result);
        expect(decryptedResult.toString()).toEqual(content.toString());
    });

    it('should encrypt & decrypt objects', function () {
        var content = {property1: 'Hello world'};
        var result = cipher.encryptMessageContent(content);
        var decryptedResult = cipher.decryptMessageContent(result);
        expect(decryptedResult).toEqual({property1: 'Hello world'});
    });

    it('should encrypt & decrypt buffer', function () {
        var content = new Buffer('Hello world');
        var result = cipher.encryptMessageContent(content.toString());
        var decryptedResult = cipher.decryptMessageContent(result);
        expect(decryptedResult).toEqual('Hello world');
    });

    it('should encrypt & decrypt message with buffers', function () {
        var content = {
            property1: new Buffer('Hello world').toString()
        };
        var result = cipher.encryptMessageContent(content);
        var decryptedResult = cipher.decryptMessageContent(result);
        expect(decryptedResult).toEqual({property1: 'Hello world'});
    });

    it('should throw error if failed to decrypt', function () {
        expect(function(){
            cipher.decryptMessageContent("dsdasdsad");
        }).toThrow('Failed to decrypt message: Unexpected token d');
    });
});
