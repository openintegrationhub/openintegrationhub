const Logger = require('@basaas/node-logger');
const App = require('../model/App');

const conf = require('./../conf');

const auditLog = Logger.getAuditLogger(`${conf.logging.namespace}/AppDao`);

module.exports = {

    async create(obj) {
        const app = new App({ ...obj });
        await app.save();
        auditLog.info('app.create', { data: app.toJSON() });
        return app.toJSON();
    },
    async find(query = {}) {
        return App.find(query)
            .lean();
    },
    async findOne(query) {
        return App.findOne(query)
            .lean();
    },
    async update(query, obj) {
        const app = await App.findOneAndUpdate(query, { $set: obj }, { new: true }).lean();
        auditLog.info('app.update', { data: { ...query, ...obj } });
        return app;
    },
    async delete({ id }) {
        await App.deleteOne({ _id: id });
        auditLog.info('app.delete', { data: { _id: id } });
    },
    async deleteAll(query) {
        await App.deleteMany(query);
        auditLog.info('app.deleteAll', { data: { ...query } });
    },

};
