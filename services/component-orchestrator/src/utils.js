module.exports = {
    getEnvByNamespace(namespace) {
        const featureEnvs = {}
        for(let key of Object.keys(process.env)) {
            if (key.match(namespace)) {
                featureEnvs[key] = process.env[key]
            }
        }

        return featureEnvs
    }
}