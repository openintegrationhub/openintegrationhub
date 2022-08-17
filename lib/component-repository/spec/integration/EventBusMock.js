class EventBusMock {
    constructor() {
        this.subscribers = {};
    }
    connect() {
        //empty
    }
    disconnect() {
        //empty
    }
    subscribe(topic, cb) {
        this.subscribers[topic] = cb;
    }

    publish() {

    }
    
    async trigger(topic, event) {
        if (!(topic in this.subscribers)) {
            return;
        }
        await this.subscribers[topic](event);
    }
}

module.exports = EventBusMock;
