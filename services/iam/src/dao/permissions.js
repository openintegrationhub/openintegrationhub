const Logger = require('@basaas/node-logger');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Permission = require('../models/permission');
const CONF = require('../conf');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/permissionDao`);
const auditLog = Logger.getAuditLogger('permission');

const PermissionsDAO = {

    find: (filter) => {

        const query = filter || {};

        return Permission.find(query).lean();
    },

    findOne: (filter) => {
        const query = filter || {};

        return Permission.findOne(query).lean();
    },

    create: async (data) => {

        const instance = new Permission(data);

        await instance.save();

        log.debug('created.permission', { ...data });
        const event = new Event({
            headers: {
                name: 'iam.permission.created',
            },
            payload: { role: data.name.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('create.permission', { data });
        return instance.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.permission', { id, props });

        await Permission.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.debug('updated.permission', { id, props });
        auditLog.info('update.permission', { data: props, id });
        const event = new Event({
            headers: {
                name: 'iam.permission.modified',
            },
            payload: { role: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);

    },

    delete: async ({ id }) => {

        await Permission.deleteOne({ _id: id });
        log.debug('deleted.permission', { id });
        auditLog.info('delete.permission', { data: { id } });
        const event = new Event({
            headers: {
                name: 'iam.permission.deleted',
            },
            payload: { role: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
    },

};

module.exports = PermissionsDAO;
