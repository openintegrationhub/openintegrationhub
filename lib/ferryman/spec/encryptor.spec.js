
/* eslint global-require: 0 */ // --> OFF

describe('Cipher', () => {
  process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
  process.env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

  const cipher = require('../lib/encryptor.js');

  beforeEach(() => {
    spyOn(global, 'decodeURIComponent').andCallThrough();
    spyOn(global, 'encodeURIComponent').andCallThrough();
  });

  it('should encrypt & decrypt strings', () => {
    const content = 'B2B_L größere Firmenkunden 25% Rabatt';
    const result = cipher.encryptMessageContent(content);
    const decryptedResult = cipher.decryptMessageContent(result);
    expect(decryptedResult.toString()).toEqual(content.toString());
    expect(global.decodeURIComponent).not.toHaveBeenCalled();
    expect(global.encodeURIComponent).not.toHaveBeenCalled();
  });

  it('should encrypt & decrypt objects', () => {
    const content = { property1: 'Hello world' };
    const result = cipher.encryptMessageContent(content);
    const decryptedResult = cipher.decryptMessageContent(result);
    expect(decryptedResult).toEqual({ property1: 'Hello world' });
  });

  it('should encrypt & decrypt buffer', () => {
    const content = Buffer.from('Hello world');
    const result = cipher.encryptMessageContent(content.toString());
    const decryptedResult = cipher.decryptMessageContent(result);
    expect(decryptedResult).toEqual('Hello world');
  });

  it('should encrypt & decrypt message with buffers', () => {
    const content = {
      property1: Buffer.from('Hello world').toString(),
    };
    const result = cipher.encryptMessageContent(content);
    const decryptedResult = cipher.decryptMessageContent(result);
    expect(decryptedResult).toEqual({ property1: 'Hello world' });
  });

  it('should throw error if failed to decrypt', () => {
    let error;
    try {
      cipher.decryptMessageContent('dsdasdsad');
    } catch (err) {
      error = err;
    }
    expect(error.message).toMatch('Failed to decrypt message');
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  xit('should be compatible with Java-Sailor', () => {
    // eslint-disable-next-line max-len
    const javaResult = 'wXTeSuonL1KvG7eKJ1Dk/hUHeLOhr7GMC1mGa7JyGQ9ZGg6AdjrKKn0ktoFMNVU77uB9dRd+tqqe0GNKlH8yuJrM2JWNdMbAWFHDLK5PvSRgL/negMTlmEnk/5/V5wharU8Qs9SW6rFI/E78Nkqlmqgwbd7ovHyzuOQIZj3kT4h6CW7S2fWJ559jpByhwXU1T8ZcGPOs4T+356AqYTXj8q2QgnkduKY7sNTrXNDsQUIZpm7tbBmMkoWuE6BXTitN/56TI2SVpo7TEQ/ef4c11fnrnCkpremZl4qPCCQcXD/47gMTSbSIydZCFQ584PE64pAwwn7UxloSen059tKKYF1BtGmBaqj97mHAL8izh3wsDoG8GuMRo2GhKopHnZTm';

    const data = {
      body: {
        incomingProperty1: 'incomingValue1',
        incomingProperty2: 'incomingValue2',
      },
      attachments: {
        incomingAttachment2: 'incomingAttachment2Content',
        incomingAttachment1: 'incomingAttachment1Content',
      },
    };

    expect(cipher.decryptMessageContent(javaResult)).toEqual(data);
  });
});
