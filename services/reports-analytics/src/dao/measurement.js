const Measurement = require('../model/measurement');

module.exports = {

    async createCollection() {
        await Measurement.createCollection();
    },

    async create(obj) {
        await Measurement.create([obj], {});
    },

    async get() {
        return await Measurement.find();
    },
};
