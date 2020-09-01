module.exports = [
  {
    distribution: {
      type: "docker",
      image: "openintegrationhub/dev-connector:latest",
    },
    access: "private",
    name: "Development Component (Private)",
    description: "A component just for testing",
    owners: [
      {
        id: "t1_admin@local.dev",
        type: "user",
      },
    ],
  },
]
