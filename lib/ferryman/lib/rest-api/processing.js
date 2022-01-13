const { isFunction } = require('lodash');

module.exports = {
    async processAction(req, res, next) {
        try {
            const { ferryman } = req;
            const { actionName, data, secretId } = req.body;

            if (!actionName) {
                return next({ status: 400, message: '"actionName" missing.' });
            }

            const action = await ferryman.componentReader.loadTriggerOrAction(actionName);

            if (!isFunction(action.process)) {
                return next({ status: 400, message: `No valid action could be found with the name "${actionName}"` });
            }

            return await action.process(req,res, next, { actionName, data, secretId });

        } catch (err) {
            next(err);
        }
    }
};

