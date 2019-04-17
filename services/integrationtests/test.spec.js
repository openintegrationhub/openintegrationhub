process.env.AUTH_TYPE = 'basic';
const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });
const username = process.env.username;
const password = process.env.password;
let conf = null;

describe('User Routes', () => {

    let tokenUser = null; 
    let tokenAdmin = "";
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
        
            try{
	   // const reponse = await request(Login);
	    request(Login).then(response => {
	    	//console.log(JSON.stringify(response));
		expect(response.statusCode).toEqual(200);
                tokenAdmin = "Bearer "+ response.body.token;
		//console.log(tokenAdmin);    
	    });
                    }
            catch(error){
	        console.log(error);
            }
            //console.log(response);
        });
    done();
    });
       
    test('Get All Flows', async (done) => { 
	
	
        const getAllFlows = {
            method: 'GET',
            uri: `http://flow-repository.openintegrationhub.com/flows`,
            headers: {
                "Authorization: " + tokenAdmin,
                //header.set("Authorization :", "Bearer " + tokenAdmin);
            },
        };
        try{
		console.log(JSON.stringify(getAllFlows)),
		console.log("flows test " + tokenAdmin); 
        	
	} catch(error){
		console.log(error);
      }
	    const response = await request(getAllFlows);
        	expect(response.statusCode).toEqual(200);
		done();
     });
    
    
});
