let DomainDAO = require('./domain');
let SchemaDAO = require('./schema');

module.exports = {
    get DomainDAO() {
        return DomainDAO;
    },
    set DomainDAO(val) {
        DomainDAO = val;
    },
    get SchemaDAO() {
        return SchemaDAO;
    },
    set SchemaDAO(val) {
        SchemaDAO = val;
    },
};
