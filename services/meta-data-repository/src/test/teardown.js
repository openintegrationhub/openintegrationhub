module.exports = async () => {
    console.log('Teardown mongod');
    await global.__MONGOD__.stop();
};
