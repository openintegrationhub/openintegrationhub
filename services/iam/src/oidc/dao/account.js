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
            role: this.data.role,
            memberships: this.data.memberships,
            confirmed: this.data.confirmed,
        };
        return claims; 
    }

    static async findById(ctx, id) {
        const data = await AccountModel.findOne({ _id: id });
        return new Account(data);
    }
}

module.exports = Account;
