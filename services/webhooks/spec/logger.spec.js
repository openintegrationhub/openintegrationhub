'use strict';

describe('Logger', () => {
    const logger = require('../lib/logger.js');

    it('should create task logger properly', () => {

        let result = logger.createTaskLogger({
            taskId: '5220610c64d36a13ea000001'
        });

        expect(result).toBeDefined();
    });

    describe('req serializer', () => {

        var log;

        beforeEach(() => {
            log = logger.createDefaultLogger('5220610c64d36a13ea000001');
        });

        it('should adapt bunyan req serializer properly if req.connection is set', () => {

            let req = {
                params: {
                    id: '5220610c64d36a13ea000001'
                },
                route: {
                    keys: {}
                },
                headers: {
                    'content-type': 'application/json'
                },
                url: '/hook/5220610c64d36a13ea000001',
                method: 'POST',
                originalUrl: '/hook/5220610c64d36a13ea000001',
                query: {
                    id: '123'
                },
                body: {
                    msg: 'to be logged'
                },
                connection: {
                    remoteAddress: '127.0.0.1',
                    remotePort: 8000
                }
            };

            let result = log.serializers.req(req);

            expect(result).toEqual({
                method: 'POST',
                url: '/hook/5220610c64d36a13ea000001',
                headers: {
                    'content-type': 'application/json'
                },
                remoteAddress: '127.0.0.1',
                remotePort: 8000,
                body: {
                    msg: 'to be logged'
                },
                query: {
                    id: '123'
                }
            })
            ;
        });

        it('should do nothing if req.connection is not set', () => {

            let result = log.serializers.req();

            expect(result).toBeUndefined();
        });
    });
});
