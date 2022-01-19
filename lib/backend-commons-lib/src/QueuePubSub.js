class QueuePubSub {
  constructor(channel) {
    this.channel = channel
  }

  async subscribe(queue, callback) {
    const result = await this.channel.consume(queue, callback)
    this.consumerTag = result.consumerTag
    return result
  }

  async ack(message) {
    this.channel.ack(message)
  }

  onRecover(newChannel) {
    this.channel = newChannel
    this.consumerTag = null
  }

  publish() {

  }
}

module.exports = QueuePubSub