process.env.AUTH_TYPE = 'basic';
const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });
const username = process.env.username;
const password = process.env.password;
let conf = null;

let tokenUser = null; 
let tokenAdmin = null;
let app = null;

describe('User Routes', () => {
  
    test('Login test', async (done) => {
	process.env.IAM_AUTH_TYPE = 'basic';
        const jsonPayload = {
        		username,
        		password,
	};
        const Login = {
        	method: 'POST',
        	uri: `http://iam.openintegrationhub.com/login`,
        	json: true,
        	body: jsonPayload
        };
	const response = await request(Login);
	
	const getToken = async res => {
		try {
		token = await Promise.resolve(res.body.token);
		}
		catch (error) {
			console.log(error);
		}
		return token; 
	};
	
	tokenAdmin = await getToken(response); 
	console.log("1 .: " + tokenAdmin);
	expect(response.statusCode).toEqual(200);	
    	done();
    });
	
    //console.log("2. nur token: " + tokenAdmin);
	
    test('Get All Flows', async (done) => { 
	console.log("3. nur token: " + tokenAdmin);
        const getAllFlows = {
            method: 'GET',
            uri: `http://flow-repository.openintegrationhub.com/flows`,
            headers: {
                "Authorization" : " Bearer " + tokenAdmin, 
            }
        };
	 console.log("logging all" + JSON.stringify(getAllFlows));
	 const response = await request(getAllFlows);
         expect(response.statusCode).toEqual(200);
	 done();
     });
    
    
});
