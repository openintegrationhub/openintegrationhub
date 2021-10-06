const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const cluster = require('cluster');
const skmInstances = require('os').cpus().length;

const supertest = require('supertest');
const nock = require('nock');
const iamMock = require('../../../test/iamMock');
const conf = require('../../../conf');
const token = require('../../../test/tokens');
const Server = require('../../../server');

const amountRequestWorkers = 3;
const amountRequestsPerWorker = 10;

const ports = [];

const skmWorkers = [];
const requestWorkers = [];
let doneRequestWorker = 0;
let failedRequestWorker = 0;

global.__MONGO_URI__ = process.env.__MONGO_URI__;

(async () => {
    function startRequestWorker() {
        // Fork workers.
        for (let i = 0; i < amountRequestWorkers; i++) {
            const worker = cluster.fork({
                type: 'requestWorker',
                auth: process.env.auth,
                secretId: process.env.secretId,
                ports: JSON.stringify(ports),
                NODE_ENV: 'test',
                id: i,
            });
            requestWorkers.push(worker.id);
        }
    }

    function skmMessageHandler(msg) {
        if (!msg.error) {
            skmWorkers.push(msg.id);
        }

        if (skmWorkers.length === skmInstances) {
            startRequestWorker();
        }
    }

    iamMock.setup();

    if (cluster.isMaster) {
        console.log(`Master ${process.pid} is running`);

        // get available ports
        for (let i = 0; i < skmInstances; i++) {
            ports.push(await getPort());
        }

        // Fork workers.
        for (let i = 0; i < skmInstances; i++) {
            const worker = cluster.fork({
                type: 'skmInstance',
                DEBUG_MODE: false,
                __MONGO_URI__: process.env.__MONGO_URI__,
                auth: process.env.auth,
                secretId: process.env.secretId,
                port: ports[i],
                NODE_ENV: 'test',
                id: i,
            });
            worker.on('message', skmMessageHandler);
        }

        cluster.on('exit', (worker, code) => {
            if (requestWorkers.indexOf(worker.id) !== -1) {
                if (code === 0) {
                    doneRequestWorker++;
                } else {
                    failedRequestWorker++;
                }
            }
            if (doneRequestWorker + failedRequestWorker === amountRequestWorkers) {
                // kill instances
                skmWorkers.forEach((id) => {
                    cluster.workers[id].send({ exit: true });
                });
                process.send({
                    failed: failedRequestWorker,
                    done: doneRequestWorker,
                });
                process.exit(0);
            }
        });
    } else if (process.env.type === 'skmInstance') {
        const port = process.env.port;
        const server = new Server({ port });
        const example = nock('https://example.com');

        example
            .persist()
            .post('/token')
            .reply((uri, requestBody, cb) => {
                setTimeout(() => {
                    cb(null, [200, {
                        access_token: 'new',
                        expires_in: -1,
                        refresh_token: 'new',
                        scope: 'foo bar',
                        token_type: 'Bearer',
                        id_token: 'asdsdf',
                    }]);
                }, 10);
            });
        try {
            process.on('message', async ({ exit }) => {
                if (exit) {
                    await server.stop();
                    process.exit(0);
                }
            });
            // start server
            await server.start();
            process.send({
                id: cluster.worker.id,
                error: null,
            });
        } catch (err) {
            process.send({
                id: cluster.worker.id,
                error: err,
            });
        }
    } else {
        // start request worker
        const ports = JSON.parse(process.env.ports);
        const randomPort = ports[Math.floor(Math.random() * ports.length)];
        const request = supertest(`http://localhost:${randomPort}${conf.apiBase}`);
        const promises = [];

        for (let i = 0; i < amountRequestsPerWorker; i++) {
            process.env.REQUEST_ID = i;
            promises.push(request.get(`/secrets/${process.env.secretId}?forkedTestRequest`)
                .set(...process.env.auth.split(','))
                .expect(200));
        }

        try {
            await Promise.race(promises);
            process.exit(0);
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
})();
