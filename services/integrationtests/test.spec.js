process.env.AUTH_TYPE = 'basic';

const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });

//const request = require('supertest')('iam.openintegrationhub.com/login');

const username = process.env.username;
const password = process.env.password;

console.log(username);

let conf = null;

describe('User Routes', () => {

    let tokenUser = null; 
    let tokenAdmin = null;
    let app = null;
    
    test('Login test', async (done) => {
        process.env.IAM_AUTH_TYPE = 'basic';
        //setTimeout(async () => {

            const jsonPayload = {
                username,
                password,
            };
        
            const Login = {
            method: 'POST',
            uri: `http://iam.openintegrationhub.com/login`,
            json: true,
            body: jsonPayload,
            };
            const response = await request(Login);
            tokenAdmin = `Bearer ${response.body.token}`;
            console.log(response);
            done();
     //   }, 200); //timeout
    });
});
