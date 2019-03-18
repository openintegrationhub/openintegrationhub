const getPort = require('get-port');
const supertest = require('supertest');
const JSZip = require('jszip');
const path = require('path');
const readdirp = require('readdirp');
const fs = require('fs');

const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

const zipFile = 'temp.zip';

describe('import', () => {
    beforeAll(async () => {
        port = await getPort();
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-import`,
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Bulk upload - zip', async (done) => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        const result = (await request.post('/domains')
            .set(...global.user1)
            .send({ data: domain })
            .expect(200)).body;

        const domain_ = result;

        // create zip file

        const zip = new JSZip();

        readdirp({ root: path.resolve(__dirname, '../../../test/data/valid'), fileFilter: '*.json' }, async (err, res) => {
            for (const file of res.files) {
                zip.file(file.path, fs.readFileSync(file.fullPath));
            }

            zip
                .generateNodeStream({ streamFiles: true })
                .pipe(fs.createWriteStream(path.resolve(__dirname, '../../../test', zipFile)))
                .on('finish', async () => {
                    console.log(path.resolve(__dirname, '../../../test', zipFile));
                    await request.post(`/domains/${domain_.data._id}/schemas/import`)
                        .set(...global.user1)
                        .set('content-type', 'application/zip')
                        .attach('zip', path.resolve(__dirname, '../../../test', zipFile))
                        .expect(200);
                    done();
                });

            // const content = await zip.generateAsync({ type: 'nodebuffer' });

            // const wstream = fs.createWriteStream('foo.zip');
            // // creates random Buffer of 100 bytes

            // wstream.write(content);
            // wstream.end();

            // console.log(content);
        });
    });
});
