const path = require('path');
const fs = require('fs-extra');
const readdirp = require('readdirp');
const { SchemaValidationError, SchemaReferenceError } = require('../error');

const {
    transformSchema,
    validateSchema,
    resolveRelativePath,
    transformURI,
    URIfromId,
} = require('./');

describe('transform', () => {
    test('URIfromId', async () => {
        expect(
            URIfromId('http://localhost/foo/bar'),
        ).toBe('/foo/bar');
        expect(
            URIfromId('localhost/foo/bar'),
        ).toBe('localhost/foo/bar');
        expect(
            URIfromId('file:///localhost/foo/bar'),
        ).toBe('/localhost/foo/bar');
    });

    test('transformURI', async () => {
        expect(
            transformURI({ domain: 'foo', id: 'https://github.com/Fooo' }),
        ).toBe('domains/foo/schemas/Fooo');

        expect(
            transformURI({ domain: 'foo', id: 'Fooo' }),
        ).toBe('domains/foo/schemas/Fooo');

        expect(
            transformURI({ domain: 'foo', id: 'Fooo/blub' }),
        ).toBe('domains/foo/schemas/Fooo/blub');

        expect(
            transformURI({ domain: 'foo', id: 'file:///Fooo/bar' }),
        ).toBe('domains/foo/schemas/Fooo/bar');

        expect(
            transformURI({ domain: 'foo', id: 'C:\\Fooo\\bar' }),
        ).toBe('domains/foo/schemas/Fooo/bar');
    });

    test('validateSchema - valid', async (done) => {
        readdirp({ root: path.resolve(__dirname, '../../test/data/valid'), fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                validateSchema({
                    schema: await fs.readFile(file.fullPath, 'utf-8'),
                    filePath: file.fullPath,
                });
            }
            expect(true).toEqual(true);
            done();
        });
    });

    test('validateSchema - invalid', async () => {
        const filePath = path.resolve(__dirname, '../../test/data/invalid/addresses/V1/person.json');
        const file = await fs.readFile(filePath, 'utf-8');
        expect(() => validateSchema({ schema: file, filePath })).toThrow(SchemaValidationError);
    });

    test('validateSchema - virtual', async () => {
        validateSchema({
            schema: {
                $schema: 'http://json-schema.org/schema#',
                $id: 'https://github.com/organizationV2.json',
                title: 'Organization',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the organization',
                        example: 'Great Company',
                    },
                    logo: {
                        type: 'string',
                        description: 'Logo of the organization',
                        example: 'http://example.org/logo.png',
                        foo: {
                            $rel: '#/properties/name',
                        },
                    },
                },

            },
        });

        expect(true).toEqual(true);
    });

    test('transformSchema - valid', async (done) => {
        const root = path.resolve(__dirname, '../../test/data/valid/');
        readdirp({ root, fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                await transformSchema({
                    schema: await fs.readFile(file.fullPath, 'utf-8'),
                    jsonRefsOptions: {
                        location: file.fullPath,
                        root,
                    },
                });
            }
            expect(true).toEqual(true);
            done();
        });
    });

    test('transformSchema - invalid', async () => {
        const root = path.resolve(__dirname, '../../test/data/invalid/');
        const filePath = path.resolve(root, 'addresses/V1/person.json');
        const file = await fs.readFile(filePath, 'utf-8');
        await expect(
            transformSchema({
                schema: file,
                jsonRefsOptions: {
                    location: filePath,
                    root,
                },
            }),
        ).rejects.toThrow(SchemaReferenceError);
    });

    test('transformSchema - virtual', async () => {
        const transformed = await transformSchema({
            schema: {
                $schema: 'http://json-schema.org/schema#',
                $id: 'https://github.com/organizationV2.json',
                title: 'Organization',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the organization',
                        example: 'Great Company',
                    },
                    logo: {
                        type: 'string',
                        description: 'Logo of the organization',
                        example: 'http://example.org/logo.png',
                        foo: {
                            $ref: '#/properties/name',
                        },
                    },
                },

            },
        });
        expect(transformed.schema.$id).toContain('organizationV2.json');
        expect(transformed.schema.$id).not.toContain('https://github.com');
    });

    test('resolveRelativePath', async () => {
        const root = path.resolve(__dirname, '../../test/data/valid/');
        expect(resolveRelativePath({
            filePath: 'organization.json',
            location: path.resolve(root, 'addresses/V1/organization.json'),
            root,
        })).toEqual('/addresses/V1/organization.json');

        expect(resolveRelativePath({
            filePath: '../../oih-data-record.json',
            location: path.resolve(root, 'addresses/V1/organization.json'),
            root,
        })).toEqual('/oih-data-record.json');

        expect(resolveRelativePath({
            filePath: '../oih-data-record.json',
            location: path.resolve(root, 'addresses/personV2.json'),
            root,
        })).toEqual('/oih-data-record.json');

        expect(resolveRelativePath({
            filePath: '../../documents/extended/Document.json',
            location: path.resolve(root, 'addresses/V1/organization.json'),
            root,
        })).toEqual('/documents/extended/Document.json');

        expect(resolveRelativePath({
            filePath: '../../products/product.json',
            location: path.resolve(root, 'addresses/V1/organization.json'),
            root,
        })).toEqual('/products/product.json');
    });
});
