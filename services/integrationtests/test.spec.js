process.env.AUTH_TYPE = 'basic';
const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });
const username = process.env.username;
const password = process.env.password;
let conf = null;

describe('User Routes', () => {

    let tokenUser = null; 
    let tokenAdmin = null;
    let app = null;
    
    test('Login test', async (done) => {
        process.env.IAM_AUTH_TYPE = 'basic';
            const jsonPayload = {
                username,
                password,
            };
        
        setTimeout(async () => {
            const Login = {
            method: 'POST',
            uri: `http://iam.openintegrationhub.com/login`,
            json: true,
            body: jsonPayload,
            };
        
            const response = await request(Login);
        
            expect(response.statusCode).toEqual(200);
            tokenAdmin = `Bearer ${response.body.token}`;
            done();
            
        });
    });      
});
