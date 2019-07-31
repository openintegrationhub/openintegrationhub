const find = require('lodash/find');
const AccountModel = require('../../models/account');

class Account {
    constructor(data) {
        this.data = data;
        this.accountId = String(this.data._id);
    }

    claims() {

        const claims = {
            sub: this.data._id, 
            username: this.data.username,
            firstname: this.data.firstname,
            lastname: this.data.lastname,
            status: this.data.status,
            roles: this.data.roles,
            tenant: this.data.tenant,
            // memberships: this.data.memberships,
            permissions: this.data.permissions,
            // currentContext: find(this.data.memberships, { active: true }),
            confirmed: this.data.confirmed,
        };
        return claims; 
    }

    static async findById(ctx, id, token) {
        const data = await AccountModel.findOne({ _id: id }).populate('roles');
        return new Account(data);
    }
}

module.exports = Account;
