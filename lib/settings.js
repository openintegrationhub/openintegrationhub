var QUEUES = {
    subscribe: {
        messages: {
            name: process.env.IN_QUEUE,
            options: {
                durable: true,
                autoDelete: false
            }
        }
    },
    publish: {
        messages: {
            name: process.env.OUT_QUEUE,
            options: {
                durable: true,
                autoDelete: false
            }
        },
        snapshots: {
            name: process.env.OUT_QUEUE,
            options: {
                durable: true,
                autoDelete: false
            }
        },
        errors: {
            name: process.env.SNAPSHOT_QUEUE,
            options: {
                durable: true,
                autoDelete: false
            }
        }
    }
};

exports.QUEUES = QUEUES;
