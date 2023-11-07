const Secret = require('../../../src/drivers/kubernetes/Secret');
const { expect } = require('chai');

describe('FlowSecret', () => {
    let secret;

    beforeEach(() => {
        secret = new Secret({
            metadata: {
                name: 'my-secret',
            },
            data: {
                username: 'password',
            },
        });
    });

    describe('id', () => {
        it('should return metadata.name', () => {
            expect(secret.id).to.equal('my-secret');
        });
    });

    describe('name', () => {
        it('should return metadata.name', () => {
            expect(secret.name).to.equal('my-secret');
        });
    });

    describe('#setMetadataValue', () => {
        it('should set metadata.name', () => {
            secret.setMetadataValue('name', 'my-super-secret');
            expect(secret.name).to.equal('my-super-secret');
        });
    });

    describe('#getMetadataValue', () => {
        it('should get metadata.name', () => {
            expect(secret.getMetadataValue('name')).to.equal('my-secret');
        });
    });

    describe('#toDescriptor', () => {
        it('should return K8s descriptor', () => {
            expect(secret.toDescriptor()).to.deep.equal({
                apiVersion: 'v1',
                data: {
                    username: 'cGFzc3dvcmQ=',
                },
                kind: 'Secret',
                metadata: {
                    name: 'my-secret',
                },
            });
        });
    });

    describe('#fromDescriptor', () => {
        it('should return K8s descriptor', () => {
            const secret = Secret.fromDescriptor({
                apiVersion: 'v1',
                data: {
                    username: 'c2VjcmV0LXBhc3N3b3Jk',
                },
                kind: 'Secret',
                metadata: {
                    name: 'my-new-secret',
                },
            });
            expect(secret.data.username).to.equal('secret-password');
            expect(secret.name).to.equal('my-new-secret');
        });
    });
});
