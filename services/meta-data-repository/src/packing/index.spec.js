const path = require('path');
const fs = require('fs-extra');
const {
    getFileType,
    pack,
    unpack,
} = require('./');


describe('packing', () => {
    test('getFileType', async () => {
        expect(
            getFileType('uploads/fppp.zip'),
        ).toBe('zip');
        expect(
            getFileType('uploads/fppp.tgz'),
        ).toBe('tgz');
        expect(
            getFileType('uploads/fppp.tar.gz'),
        ).toBe('tgz');
        expect(
            getFileType('uploads/fppp'),
        ).toBe(null);
        expect(
            getFileType('uploads/fppp.zips'),
        ).toBe(null);
    });

    test('pack and unpack zip', async () => {
        const src = path.resolve(__dirname, '../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../test/temp.zip');
        const unpackDest = path.resolve(__dirname, '../../test/fooo');

        // pack
        await pack(
            'zip',
            src,
            packDest,
        );

        // unpack
        await unpack(
            'zip',
            packDest,
            unpackDest,
        );

        expect(fs.readdirSync(unpackDest)).toHaveLength(
            fs
                .readdirSync(src)
                .filter(filename => filename !== '.DS_Store')
                .length,
        );

        await fs.remove(packDest);
        await fs.remove(unpackDest);
    });

    test('pack and unpack tgz', async () => {
        const src = path.resolve(__dirname, '../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../test/temp.tgz');
        const unpackDest = path.resolve(__dirname, '../../test/fooo');

        // pack
        await pack(
            'tgz',
            src,
            packDest,
        );

        // unpack
        await unpack(
            'tgz',
            packDest,
            unpackDest,
        );

        expect(fs.readdirSync(unpackDest)).toHaveLength(
            fs
                .readdirSync(src)
                .length,
        );

        await fs.remove(packDest);
        await fs.remove(unpackDest);
    });
});
