const path = require('path');
const fs = require('fs-extra');
const {
    processArchive,
} = require('./');

const { pack } = require('../packing');

describe('bulk', () => {
    test('processArchive - tgz', async () => {
        // create archive
        const src = path.resolve(__dirname, '../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../test-temp/temp.tgz');

        // pack
        await pack(
            'tgz',
            src,
            packDest,
        );

        const transformedSchemas = await processArchive(packDest);
        expect(transformedSchemas).toHaveLength(20);

        await fs.remove(path.dirname(packDest));
    });

    test('processArchive - zip', async () => {
        // create archive
        const src = path.resolve(__dirname, '../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../test-temp/temp.zip');

        // pack
        await pack(
            'zip',
            src,
            packDest,
        );

        const transformedSchemas = await processArchive(packDest);
        expect(transformedSchemas).toHaveLength(20);

        await fs.remove(path.dirname(packDest));
    });

    test('processArchive - invalid', async () => {
        let packDest = path.resolve(__dirname, '../../test/data/invalid.zip');
        await expect(processArchive(packDest)).rejects.toThrow();
        packDest = path.resolve(__dirname, '../../test/data/invalid.tgz');
        await expect(processArchive(packDest)).rejects.toThrow();
    });
});
