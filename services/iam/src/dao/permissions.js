const Logger = require('@basaas/node-logger');
const Permission = require('./../models/permission');
const CONF = require('./../conf');

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

        log.debug('created.permission', Object.assign({}, data));

        auditLog.info('create.permission', { data });
        return instance.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.permission', { id, props });

        await Permission.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.info('updated.permission', { id, props });
        auditLog.info('update.permission', { data: props, id });

    },

    delete: async ({ id }) => {

        await Permission.deleteOne({ _id: id });
        log.debug('deleted.permission', { id });
        auditLog.info('delete.permission', { data: { id } });
    },

};

module.exports = PermissionsDAO;
