
class EventBusMock {
    connect() {

    }

    disconnect() {

    }

    constructor() {
        this.stack = [];
    }

    subscribe(name, cb) {
        this.stack.push({ name, cb });
    }

    trigger(name, expectedPayload) {
        this.stack.forEach((e) => {
            if (e.name === name) {
                e.cb({
                    ack: () => {},
                    payload: expectedPayload,
                });
            }
        });
    }
}

module.exports = EventBusMock;
