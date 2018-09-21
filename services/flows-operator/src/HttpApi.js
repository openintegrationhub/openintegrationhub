const express = require('express');

const Lib = require('lib');
const { Flow } = Lib;

class HttpApi {
    constructor(app) {
        this._logger = app.getLogger().child({service: "HttpApi"});
        this._crdClient = app.getK8s().getCRDClient();
        this._app = express();
        this._app.get('/v1/tasks/:taskId/steps/:stepId', this._getStepInfo.bind(this));
        this._app.get('/healthcheck', this._healthcheck.bind(this));
    }
    listen(listenPort) {
        this._logger.info({port: listenPort}, 'Going to listen for http');
        this._app.listen(listenPort);
    }
    async _getStepInfo(req, res) {
        this._logger.trace(req.params, 'Step info request');
        try {
            const flow = await this._crdClient.flows(req.params.taskId).get();
            if (!flow) {
                throw new Error('404');
            }
            const flowModel = new Flow(flow.body);
            const step = flowModel.getRecipeNodeByStepId(req.params.stepId);
            if (!step) {
                throw new Error('404');
            }
            res.status(200);
            res.set('Content-Type', 'application/json');
            res.end(JSON.stringify({
                id: req.params.stepId,
                function: step.function,
                config: step.data || {}
            }));
        } catch (e) {
            this._logger.error(req.params, 'Step info request');
            res.status(500);
            res.end();
            return;
        }
    }
    async _healthcheck(req, res) {
        this._logger.trace('Healthcheck request');
        res.status(200).end(); 
    }
}

module.exports = HttpApi;
