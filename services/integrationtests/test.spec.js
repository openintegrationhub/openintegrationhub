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
	expect(response.statusCode).toEqual(200);	
    	done();
    });		
    test('Get All Flows', async (done) => { 
	console.log("3. nur token: " + tokenAdmin);
        const getAllFlows = {
        	method: 'GET',
            	uri: `http://flow-repository.openintegrationhub.com/flows`,
            	headers: {
                	"Authorization" : " Bearer " + tokenAdmin, 
            	}
        };
	 const response = await request(getAllFlows);
         expect(response.statusCode).toEqual(200);
	 done();
     });
	
	
	
	
     test('Add a new flow to the repo', async (done) => { 
	process.env.IAM_AUTH_TYPE = 'basic';
	const createdFlow = {
        	"name": "My Flow",
  			"description": "My Flow",
  			"graph": {
    				"nodes": [
      				{
        				"id": "string",
        				"componentId": "string",
        				"command": "string",
        				"name": "string",
        				"description": "string",
        				"fields": {}
      				 }
    				],
    				"edges": [
      				{
        				"id": "string",
        				"config": {
          					"condition": "string",
          					"mapper": {}
        				},
        			"source": "string",
        			"target": "string"
      				}
    			]
  			},
          		"type": "ordinary",
  			"owners": [
    			{
      				"id": "string",
      				"type": "string"
    			}
  			]
	};    
        const addFlow = {
        	method: 'POST',
        	uri: `http://iam.openintegrationhub.com/flows`,
        	json: true,
		headers: {
                	"Authorization" : " Bearer " + tokenAdmin, 
            	},
        	body: createdFlow		
	};
	const response = await request(addFlow);
	expect(response.statusCode).toEqual(201);	
    	done();
    });
	
	
	
	
     test('Get Flow by Id', async (done) => { 
        const getFlowbyId = {
            	method: 'GET',
            	uri: `http://flow-repository.openintegrationhub.com/flows`,
            	headers: {
                	"Authorization" : " Bearer " + tokenAdmin,
		},
		page: 2
            }
        },
	 //const response = await request(Login);    
	 console.log(JSON.stringify(getFlowbyId));
	 const response = await request(getFlowbyId);
         expect(response.statusCode).toEqual(200);
	 done();
     });   
});
