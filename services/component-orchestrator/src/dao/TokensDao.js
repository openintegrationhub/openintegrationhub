module.exports = class TokensDao {
    constructor({iamClient}) {
        this._iamClient = iamClient;
    }

    async getTokenForUser(userId) {
        const { token } = await this._iamClient.createToken({
            accountId: userId,
            expiresIn: -1,
            description: 'Created by Component Orchestrator',
            new: false
        });

        return token;
    }

    async deleteTokenForUser() {
        return true; //@todo: implement
    }
};
