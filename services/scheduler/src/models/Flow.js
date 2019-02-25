const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cronParser = require('cron-parser');

const schema = new Schema({
    graph: Schema.Types.Mixed,
    cron: String,
    dueExecution: Date
});

//@todo: indexes

Object.assign(schema.statics, {
    findForScheduling({limit = 20} = {}) {
        const currentDateTime = new Date();
        const query = {
            status: 'started',
            dueExecution: {
                $exists: true,
                $lt: currentDateTime
            }
        };

        const queryOptions = {
            sort: {
                dueExecution: 1
            },
            limit
        };

        return this.find(query, null, queryOptions);
    }
});

Object.assign(schema.methods, {
    getFirstNode() {
        return this.graph.nodes.find(n => n.first); //@todo: edit this logic
    },
    updateDueExecutionAccordingToCron() {
        const interval = cronParser.parseExpression(this.cron);
        this.dueExecution = interval.next();
    }
});

module.exports = mongoose.model('Flow', schema);
