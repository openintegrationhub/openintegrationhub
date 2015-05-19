describe('Executor', function () {

    var TaskExec = require('../lib/executor.js').TaskExec;
    var payload = {content: "MessageContent"};
    var headers = {};
    var stepData = {};
    var cfg = {};

    it('Should execute passthrough trigger and emit all events - data, end', function () {

        var taskexec = new TaskExec(headers, stepData);
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

        var taskexec = new TaskExec(headers, stepData);
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

        var taskexec = new TaskExec(headers, stepData);
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

        var taskexec = new TaskExec(headers, stepData);
        taskexec.on('error', function(){});
        spyOn(taskexec, 'emit').andCallThrough();

        var module = require('./component/triggers/datas_and_errors.js');
        var promise = taskexec.process(module, payload, cfg);

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(taskexec.emit).toHaveBeenCalled();
            expect(taskexec.emit.callCount).toEqual(6);
            expect(taskexec.emit.calls[0].args[0]).toEqual('data');
            expect(taskexec.emit.calls[1].args[0]).toEqual('error');
            expect(taskexec.emit.calls[5].args[0]).toEqual('end');
            expect(taskexec.taskStat.dataCount).toEqual(3);
            expect(taskexec.taskStat.errorCount).toEqual(2);
            expect(promise.isFulfilled()).toEqual(true);
        });


    });

});
