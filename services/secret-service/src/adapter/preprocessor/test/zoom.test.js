const fetch = require('node-fetch');
const zoomApi = require('../zoom');

jest.mock('node-fetch');

describe('Zoom API Tests', () => {
    const secret = {
        value: {},
    };

    const tokenResponse = {
        access_token: 'your_access_token',
    };

    it('fetches user data successfully', async () => {
        const mockJson = jest.fn().mockResolvedValue({ id: 'user123' });
        const mockResponse = {
            ok: true,
            json: mockJson,
        };
        fetch.mockResolvedValue(mockResponse);

        await zoomApi({ secret, tokenResponse });

        expect(secret.value.externalId).toBe('user123');
    });

    it('handles fetch error', async () => {
        const mockResponse = {
            ok: false,
            statusText: 'Unauthorized',
        };
        fetch.mockResolvedValue(mockResponse);

        await expect(zoomApi({ secret, tokenResponse })).rejects.toThrowError(
            'Failed to fetch user data: Unauthorized',
        );
    });
});
