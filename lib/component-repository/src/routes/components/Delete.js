module.exports = async function (req, res, next) {
    const { component } = req;
    await component.remove();
    res.statusCode = 204;
    return next();
};
