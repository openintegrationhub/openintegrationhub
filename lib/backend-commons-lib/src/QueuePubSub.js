class QueuePubSub {
  constructor(channel) {
    this.comsumerTag = null
    this.channel = channel
  }

  async subscribe(queue, callback) {
    if (this.consumerTag) {
      throw new Error('subscribe MUST NOT be called more than once')
    }

    const result = await this.channel.consume(queue, callback)
    this.consumerTag = result.consumerTag
    return result
  }

  async ack(message) {
    this.channel.ack(message)
  }

  publish() {

  }
}

module.exports = QueuePubSub