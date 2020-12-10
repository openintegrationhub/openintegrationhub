/* eslint class-methods-use-this: 0 */

class EventBusMock {
  constructor() {
    this.subscribers = {}
  }

  connect() {
    // empty
  }

  disconnect() {
    // empty
  }

  subscribe(topic, cb) {
    this.subscribers[topic] = cb
  }

  getSubscription(topic) {
    return this.subscribers[topic]
  }

  async trigger(topic, event) {
    if (!(topic in this.subscribers)) {
      return
    }
    await this.subscribers[topic](event)
  }
}

module.exports = EventBusMock
