const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    flowId: {
        type: String,
    },
    userId: {
        type: String,
    },
    tokenId: {
        type: String,
    },
    token: {
        type: String,
    },
});
schema.index({ flowId: 1, userId: 1 }, { unique: true });

const IamToken = mongoose.model('IamToken', schema);

module.exports = class TokensDao {
    constructor({ iamClient }) {
        this._iamClient = iamClient;
    }

    async getTokenByFlowId({ flowId }) {
        return IamToken.findOne({ flowId });
    }

    async getTokenForFlowAndUser({ userId, flowId }) {
        const [oldToken] = await IamToken.find({ flowId, userId });
        if (oldToken) {
            return oldToken.token;
        }

        const { id: tokenId, token } = await this._iamClient.createToken({
            accountId: userId,
            expiresIn: -1,
            description: `Created by Component Orchestrator for flow ${flowId}`,
            forceNew: true,
            customPermissions: ['secrets.secret.readRaw'],
        });

        await IamToken.create({
            flowId,
            userId,
            token,
            tokenId,
        });

        return token;
    }

    async deleteTokenForFlowAndUser({ flowId, userId }) {
        const tokens = await IamToken.find({
            flowId,
            userId,
        });

        for (const token of tokens) {
            await this._iamClient.deleteTokenById(token.tokenId);
            await token.remove();
        }
    }
};
