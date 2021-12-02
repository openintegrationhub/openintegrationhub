module.exports = {
    async verify(req, res, next) {
        try {
            res.sendStatus(200);
        } catch (err) {
            next(err);
        }
    }
};

