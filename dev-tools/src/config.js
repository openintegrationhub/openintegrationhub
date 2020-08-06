const path = require("path")

const repositoryRoot = path.resolve(__dirname, "../../")
const devToolsRoot = path.resolve(__dirname, "../")

module.exports = {
  repositoryRoot,
  devToolsRoot,
  nodeVersion: "12",
  services: [
    {
      name: "iam",
      dir: path.resolve(repositoryRoot, "services/iam"),
    },
  ],
}
