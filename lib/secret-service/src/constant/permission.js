module.exports = {
    restricted: {
        secretDeleteAny: 'lynx.secret.delete', // 'lynx.secret.delete',
        authClientDeleteAny: 'lynx.secret.delete', // 'lynx.secret.delete',
    },
    common: {
        secretReadRaw: 'lynx.secret.read.raw', // 'lynx.secret.read.raw'
        authClientReadRaw: 'lynx.auth.client.read.raw', // 'lynx.auth.client.read.raw'
    },
};
