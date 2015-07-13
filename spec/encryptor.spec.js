describe('Cipher', function () {

    process.env.MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    process.env.MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

    var cipher = require('../lib/encryptor.js');

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

    it('should be compatible with Java-Sailor', function(){

        var javaResult = "TOxRVfC2S4QDUzw6tzpoVNzi5ldNj+qGGrx2bMJLTn+0mgv3+xZNxMPHI5HdsTq+pBF3oXzgNmaFkXWGou0rPkyhSdpk/" +
            "ZjI6YciJrFhtOk9Bgh5ScAO/cZYChDertRLGjGNtm4/XTVdYCw5LBdyYDSoGfYt2K+09NtzoOGrK4KGAKhZm4BaEfCFTeGU" +
            "vXpSCaiUxaHxro7OpxvO1Y5EA/ZBJIXWjhTMyc8E0WF12+wCq1eByfl5WXvEOqksfk1FGOIjqxCn9UEo995Y2f0YMA==";

        var data = {
            "body": {
                "incomingProperty1": "incomingValue1",
                "incomingProperty2": "incomingValue2"
            },
            "attachments": {
                "incomingAttachment2": "incomingAttachment2Content",
                "incomingAttachment1": "incomingAttachment1Content"
            }
        };

        expect(cipher.decryptMessageContent(javaResult)).toEqual(data);
    });
});
