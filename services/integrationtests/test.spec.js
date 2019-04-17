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
	    	//console.log("1. response: " + JSON.stringify(response)),
		tokenAdmin = JSON.stringify(response.body.token),	
		expect(response.statusCode).toEqual(200);
		//console.log("2. nur token: " + tokenAdmin);   
	    	});
            }
            catch(error){
	        console.log("Error: " + error);
            }
         }, 5000);
    done();
    });
	
    console.log("3. nur token: " + tokenAdmin);
	
    test('Get All Flows', async (done) => { 
	//console.log("4. nur token in neuer funktion: " + tokenAdmin);
	    
        const getAllFlows = {
            method: 'GET',
            uri: `http://flow-repository.openintegrationhub.com/flows`,
            headers: {
                "Authorization" : " Bearer " + tokenAdmin, 
                //header.set("Authorization :", "Bearer " + tokenAdmin);
            }
        };
	    
        try{
	  //  console.log(JSON.stringify(getAllFlows)),
	   // console.log("flows test " + tokenAdmin);
	}
	catch(error){
	//    console.log(error);
      	}
	    const response = await request(getAllFlows);
            expect(response.statusCode).toEqual(200);
	    done();
     });
    
    
});
