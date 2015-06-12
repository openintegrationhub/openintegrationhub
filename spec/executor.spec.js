describe('Executor', function () {

    var TaskExec = require('../lib/executor.js').TaskExec;
    var payload = {content: "MessageContent"};
    var cfg = {};

    it('Should execute passthrough trigger and emit all events - data, end', function () {

        var taskexec = new TaskExec();
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var module = require('./component/triggers/passthrough.js');
        var promise = taskexec.process(module, payload, cfg);

        expect(taskexec.emit).toHaveBeenCalled();
        expect(taskexec.emit.calls[0].args[0]).toEqual('data');
        expect(taskexec.emit.calls[1].args[0]).toEqual('end');
        expect(promise.isFulfilled).toBeTruthy();
    });

    it('Should reject if module is missing', function () {

        var taskexec = new TaskExec();
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var promise = taskexec.process({}, payload, cfg);

        expect(taskexec.emit).toHaveBeenCalled();
        expect(taskexec.emit.calls[0].args[0]).toEqual('error');
        expect(taskexec.emit.calls[0].args[1].message).toEqual('Process function is not found');
        expect(taskexec.emit.calls[1].args[0]).toEqual('end');
        expect(promise.isFulfilled).toBeTruthy();
    });

    it('Should execute rebound_trigger and emit all events - rebound, end', function () {

        var taskexec = new TaskExec();
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var module = require('./component/triggers/rebound_trigger.js');
        var promise = taskexec.process(module, payload, cfg);

        expect(taskexec.emit).toHaveBeenCalled();
        expect(taskexec.emit.calls[0].args[0]).toEqual('rebound');
        expect(taskexec.emit.calls[1].args[0]).toEqual('end');
        expect(promise.isFulfilled).toBeTruthy();
    });

    it('Should execute complex trigger, and emit all 6 events', function () {

        var taskexec = new TaskExec();
        taskexec.setTimeout(2000);
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var module = require('./component/triggers/datas_and_errors.js');
        var promise = taskexec.process(module, payload, cfg);

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 3000);

        runs(function(){
            expect(taskexec.emit).toHaveBeenCalled();
            expect(taskexec.emit.callCount).toEqual(6);
            expect(taskexec.emit.calls[0].args[0]).toEqual('data');
            expect(taskexec.emit.calls[1].args[0]).toEqual('error');
            expect(taskexec.emit.calls[5].args[0]).toEqual('end');
            expect(taskexec.dataCount).toEqual(3);
            expect(taskexec.errorCount).toEqual(2);
            expect(promise.isFulfilled()).toEqual(true);
        });
    });

    it('Should execute test_trigger and emit all events - 3 data events, 3 errors, 3 rebounds, 1 end', function () {

        var taskexec = new TaskExec();
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var module = require('./component/triggers/test_trigger.js');
        var promise = taskexec.process(module, payload, cfg);

        expect(taskexec.emit).toHaveBeenCalled();

        var calls = taskexec.emit.calls;

        expect(calls[0].args).toEqual(['data', 'Data 1']);
        expect(calls[1].args).toEqual(['data', {content:'Data 2'}]);
        expect(calls[2].args).toEqual(['data', undefined]);

        expect(calls[3].args).toEqual(['error', {message: 'Error 1', stack: 'Not Available', name: 'Error' }]);
        expect(calls[4].args).toEqual(['error', {message: 'Error 2', stack: jasmine.any(String), name: 'Error'}]);
        expect(calls[5].args).toEqual(['error', {message: 'Not Available', stack: 'Not Available', name: 'Error'}]);

        expect(calls[6].args).toEqual(['rebound', {message: 'Rebound Error 1', stack: 'Not Available', name: 'Error' }]);
        expect(calls[7].args).toEqual(['rebound', {message: 'Rebound Error 2', stack: jasmine.any(String), name: 'Error'}]);
        expect(calls[8].args).toEqual(['rebound', {message: 'Not Available', stack: 'Not Available', name: 'Error'}]);

        expect(calls[9].args[0]).toEqual('end');

        expect(promise.isFulfilled).toBeTruthy();
    });

});
