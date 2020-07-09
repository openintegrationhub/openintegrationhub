const EventEmitter = require('events');
const cp = require('child_process');

// None of the npm package I've found has the method sendKill so I have to create this class

class ShellTester extends EventEmitter {
    constructor({ timeout = ShellTester.TIMEOUT_DEFAULT, filename = 'run.js', env = process.env, args = [] } = {}) {
        super();

        this._filename = filename;
        this._args = args;

        this._promise = new Promise((resolve, reject) => {
            this._promiseResolve = resolve;
            this._promiseReject = reject;
        });

        this._env = env;

        this._timeoutHandlerActivate(timeout);

        this._exitResult = null;
    }

    static init(options) {
        return new ShellTester(options);
    }

    _timeoutHandlerActivate(timeout) {
        this._timeoutTimer = setTimeout(() => {
            this._promiseReject(new Error('ShellTester timeout'));
        }, timeout);
    }

    _timeoutClear() {
        clearTimeout(this._timeoutTimer);
    }

    run() {
        const options = {
            env: this._env
        };

        //// Uncomment this code in order to figure out, what's going on in the child process stdout/stderr in logs
        //// this._fork.stdout won't stops working after sendKill(), so the only way to debug  –  it's log files
        // const fs = require('fs');
        // fs.writeFileSync('./out.log', '');
        // fs.writeFileSync('./err.log', '');
        // const out = fs.openSync('./out.log', 'a');
        // const err = fs.openSync('./err.log', 'a');
        // options.stdio = ['ipc', out, err];

        this._fork = cp.fork(this._filename, this._args, options);

        this._fork.on('exit', this._onExitHandler.bind(this));
    }

    _onExitHandler(code, signal) {
        this._exitResult = { code, signal };
        this.emit('exit', { code, signal });
        this._timeoutClear();
        this._promiseResolve(this._exitResult);
    }

    sendKill(signal = 'SIGTERM') {
        return this._fork.kill(signal);
    }

    getPromise() {
        return this._promise;
    }

    getExitResult() {
        return this._exitResult;
    }
}

ShellTester.TIMEOUT_DEFAULT = 5000;

module.exports = ShellTester;
