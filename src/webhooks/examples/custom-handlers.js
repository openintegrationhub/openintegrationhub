const { RequestHandlers, HttpApi, FlowsDao, MessagePublishers } = require('..');

class MyFlowsDao extends FlowsDao {
    // this method should fetch a flow by ID from some source, e.g. from DB or API
    findById(id) {
        return request.get(`/api/flows/${id}`);
    }
}

class MyMessagePublisher extends MessagePublishers.Base {
    // this method should send a received message to an "executor"
    // e.g. to some message queue or to post it by API call
    publish(flow, msg, msgOpts) {
        return amqpChannel.sendToQueue(qName, msg, msgOpts);
    }
}

// The methods of default handlers could be overridden by some custom logic.
class MyPostHandler extends RequestHandlers.Post {
    // overriding this method in order to provide custom authorization logic
    async authorize() {
        if (this._req.headers['x-hmac'] !== 'my-calculated-hmac') {
            const err = new Error('Unauthorized');
            err.statusCode = 403;
            throw err;
        }
    }
}

(async () => {
    const flowsDao = new MyFlowsDao();
    const messagePublisher = new MyMessagePublisher();
    const config = nconf; // config object with nconf-like (https://www.npmjs.com/package/nconf) API.

    const httpApi = new HttpApi(config, flowsDao);
    httpApi.setHeadHandler((req, res) => new RequestHandlers.Head(req, res).handle());
    httpApi.setGetHandler((req, res) => new RequestHandlers.Get(req, res, messagePublisher).handle());
    httpApi.setPostHandler((req, res) => new MyPostHandler(req, res, messagePublisher).handle());
    await httpApi.listen(8000);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
