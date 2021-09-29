const fetch = require('node-fetch');
const login = async ( username, password) => {
  const body = {
    username,
    password,
  };
  const response = await fetch(
    `${conf.iam.url}/login`,
    {
        method: 'post',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
    },
  );

  const data = await response.json();
  return data.token;
}

module.exports = { login };
