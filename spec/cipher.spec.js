describe('Cipher', function () {

    process.env.MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
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
        var error;
        try {
            cipher.decryptMessageContent("dsdasdsad");
        } catch (err) {
            error = err;
        }
        expect(error.message).toMatch('Failed to decrypt message');
    });

    it('should be compatible with Java-Sailor', function () {
        process.env.MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
        var result = cipher.encryptMessageContent({"someKey":"someValue"});
        expect(result).toEqual('MhcbHNshDRy6RNubmFJ+u4tcKKTKT6H50uYMyBXhws1xjvVKRtEC0hEg0/R2Zecy');
    });

    it('should be compatible with Java-Sailor', function () {
        process.env.MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
        var result = cipher.decryptMessageContent('MhcbHNshDRy6RNubmFJ+u4tcKKTKT6H50uYMyBXhws1xjvVKRtEC0hEg0/R2Zecy');
        expect(result).toEqual({"someKey":"someValue"});
    });
});
