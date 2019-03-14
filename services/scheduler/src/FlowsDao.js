const { FlowsDao } = require('@openintegrationhub/scheduler');
const Flow = require('./models/Flow');

class OIH_FlowsDao extends FlowsDao {
    constructor({config, logger}) {
        super();
        this._config = config;
        this._logger = logger;
    }

    async findForScheduling() {
        return Flow.findForScheduling({limit: this._config.get('FLOWS_PER_TICK_LIMIT')})
    }

    async planNextRun(flow) {
        flow.updateDueExecutionAccordingToCron();
        await flow.save();
    }
}

module.exports = OIH_FlowsDao;
