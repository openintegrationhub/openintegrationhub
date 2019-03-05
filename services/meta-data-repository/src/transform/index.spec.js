const path = require('path');
const readdirp = require('readdirp');
const {
    readFile, transformSchema, validateSchema, processSchema, processSchemaFiles,
} = require('./');

describe('transform', () => {
    test('validateSchema - valid', async (done) => {
        readdirp({ root: path.resolve(__dirname, 'test/valid'), fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                validateSchema(await readFile(file.fullPath), file.fullPath);
            }
            expect(true).toEqual(true);
            done();
        });
    });

    test('validateSchema - invalid', async () => {
        const filePath = path.resolve(__dirname, 'test/invalid/addresses/V1/person.json');
        const file = await readFile(filePath);
        expect(() => validateSchema(file, filePath)).toThrow(Error);
    });

    test('transformSchema - valid', async (done) => {
        readdirp({ root: path.resolve(__dirname, 'test/valid'), fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                await transformSchema(await readFile(file.fullPath), {
                    location: file.fullPath,
                });
            }
            expect(true).toEqual(true);
            done();
        });
    });

    test('transformSchema - invalid', async () => {
        const filePath = path.resolve(__dirname, 'test/invalid/addresses/V1/person.json');
        const file = await readFile(filePath);
        await expect(transformSchema(file, {
            location: filePath,
        }))
            .rejects
            .toThrow(Error);
    });

    test('processSchema - valid', async (done) => {
        readdirp({ root: path.resolve(__dirname, 'test/valid'), fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                await processSchema(await readFile(file.fullPath), file.fullPath, {
                    location: file.fullPath,
                });
            }
            expect(true).toEqual(true);
            done();
        });
    });

    test('processSchema - invalid', async () => {
        const filePath = path.resolve(__dirname, 'test/invalid/addresses/V1/person.json');
        const file = await readFile(filePath);
        await expect(processSchema(file, filePath, {
            location: filePath,
        }))
            .rejects
            .toThrow(Error);
    });

    test('processSchemaFiles - valid', async (done) => {
        readdirp({ root: path.resolve(__dirname, 'test/valid'), fileFilter: '*.json' }, async (err, res) => {
            const results = await processSchemaFiles(res.files.map(file => file.fullPath));
            expect(Object.keys(results).length).toEqual(res.files.length);
            done();
        });
    });

    test('processSchemaFiles - invalid', async (done) => {
        readdirp({ root: path.resolve(__dirname, 'test/invalid'), fileFilter: '*.json' }, async (err, res) => {
            await expect(processSchemaFiles(res.files.map(file => file.fullPath)))
                .rejects
                .toThrow(Error);
            done();
        });
    });
});
