process.env.AUTH_TYPE = 'basic';

const request = require('supertest')('http://iam.openintegrationhub.com/login');
const username = process.env.username;
const password = process.env.password;

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
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', '\/application\/json\/')
                .expect(200);
            tokenAdmin = `Bearer ${response.body.token}`;
            done();
     //   }, 200); //timeout
    });
});
