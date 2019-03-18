const path = require('path');
const fs = require('fs-extra');
const {
    processArchive,
} = require('./');

const { pack } = require('../packing');

describe('bulk', () => {
    test('processArchive', async () => {
        // create archive
        const src = path.resolve(__dirname, '../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../test/temp.tgz');

        // pack
        await pack(
            'tgz',
            src,
            packDest,
        );

        await processArchive(packDest);
        // const src = path.resolve(__dirname, '../../test/data/valid');
        // const packDest = path.resolve(__dirname, '../../test/temp.zip');
        // const unpackDest = path.resolve(__dirname, '../../test/fooo');

        // // pack
        // await pack(
        //     'zip',
        //     src,
        //     packDest,
        // );

        // // unpack
        // await unpack(
        //     'zip',
        //     packDest,
        //     unpackDest,
        // );

        // expect(fs.readdirSync(unpackDest)).toHaveLength(fs.readdirSync(src).length);

        // await fs.remove(packDest);
        // await fs.remove(unpackDest);
    });
});
