module.exports = async function (req, res, next) {
    const { virtualComponent } = req;

    res.data = virtualComponent;
    return next();
};
