class QueuePubSub {
  constructor(channel) {
    this.comsumerTag = null
    this.channel = channel
  }

  async subscribe(topic, callback) {
    if (this.consumerTag) {
      throw new Error('subscribe MUST NOT be called more than once')
    }

    const result = await this.channel.consume(topic, callback)
    this.consumerTag = result.consumerTag
    return result
  }

  publish() {

  }
}

module.exports = QueuePubSub