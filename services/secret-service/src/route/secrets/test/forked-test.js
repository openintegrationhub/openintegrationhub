require('dotenv').config();

const cluster = require('cluster');

const skmClients = require('os').cpus().length;
const getPort = require('get-port');
const supertest = require('supertest');
const nock = require('nock');
const conf = require('../../../conf');
const Server = require('../../../server');

const ports = [];
const childsDone = [];
const childsError = [];
global.__MONGO_URI__ = process.env.__MONGO_URI__;

(async () => {
    if (cluster.isMaster) {
        console.log(`Master ${process.pid} is running`);

        // get available ports
        for (let i = 0; i < skmClients; i++) {
            ports.push(await getPort());
        }

        // Fork workers.
        for (let i = 0; i < skmClients; i++) {
            cluster.fork({
                __MONGO_URI__: process.env.__MONGO_URI__,
                auth: process.env.auth,
                secretId: process.env.secretId,
                port: ports[i],
                NODE_ENV: 'test',
                id: i,
            });
        }

        cluster.on('exit', (worker, code) => {
            if (code === 0) {
                childsDone.push(worker);
                console.log(`done ${childsDone.length}`);
            } else {
                childsError.push(worker);
                console.log(`error ${childsError.length}`);
            }

            if (childsError.length + childsDone.length === skmClients) {
                console.log('end process');
                process.send({
                    ended: true,
                    clients: skmClients,
                    errors: childsError.length,
                    dones: childsDone.length,
                });
            }
        });
    } else {
    // start child server and request access token
        const port = process.env.port;
        const server = new Server({ port });
        const request = supertest(`http://localhost:${port}${conf.apiBase}`);

        // create refresh url mock
        nock('https://example.com')
            .post('/token')
            .reply(200, {
                access_token: 'new',
                expires_in: 0,
                refresh_token: 'new',
                scope: 'foo bar',
                token_type: 'Bearer',
                id_token: 'asdsdf',
            });

        try {
            // start server
            await server.start();
            // request ressource
            const token = await request.get(`/secrets/${process.env.secretId}/access-token`)
                .set(...process.env.auth.split(','))
                .expect(200);
            console.log(`response ${process.env.id}`, token.body);

            process.exit(0);
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
})();
