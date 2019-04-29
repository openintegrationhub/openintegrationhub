process.env.AUTH_TYPE = 'basic';
const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });
const username = process.env.username;
const password = process.env.password;
let conf = null;

let tokenUser = null; 
let tokenAdmin = null;
let flowID = null;

describe('User Routes', () => {
	beforeEach(() => {
		jest.setTimeout(10000);
	});

    test('--- LOGIN & TOKEN ---', async (done) => {
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
		
    test('--- GET All FLOWS ---', async (done) => { 
		//console.log("3. nur token: " + tokenAdmin);
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

    test('--- ADD NEW FLOW ---', async (done) => { 
		process.env.IAM_AUTH_TYPE = 'basic';
		const createdFlow = {
        	"name": "Dennis' flow",
  			"description": "My test Flow",
  			"graph": {
    				"nodes": [
      				{
        				"id": "integration-tests",
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
        	uri: `http://flow-repository.openintegrationhub.com/flows`,
        	json: true,
			headers: {
                	"Authorization" : " Bearer " + tokenAdmin, 
            },
        	body: createdFlow		
		};
	     
		//console.log(JSON.stringify(addFlow));     
		const response = await request(addFlow);
	     
		const getFlowID = async res => {
		try {
			id = await Promise.resolve(res.body.data.id);
		}
		catch (error) {
			console.log(error);
		}
		return id; 
		};	
		flowID = await getFlowID(response); 
	     
		expect(response.statusCode).toEqual(201);
    	done();
	});
	
	test('--- GET FLOW BY ID ---', async (done) => { 
		const getFlowById = {
				method: 'GET',
					uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}`,
					headers: {
						"Authorization" : " Bearer " + tokenAdmin, 
					}
			};

		const response = await request(getFlowById);
		
		expect(response.statusCode).toEqual(200);
		done();
	});


	test('--- PATCH FLOW BY ID ---', async (done) => { 
		const getFlowData = {
				method: 'GET',
					uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}`,
					headers: {
						"Authorization" : " Bearer " + tokenAdmin, 
					}
		};
		const response = await request(getFlowData);
		
		console.log(JSON.stringify(response.body));
	
		const getNameFromFlow = async res => {
			try {
				flowName = await Promise.resolve(res.body);
			}
			catch (error) {
				console.log(error);
			}
			return flowName; 
			};
		
		const currentFlowName = await getNameFromFlow(response);  
		
		console.log(JSON.stringify(currentFlowName));

		//console.log("get flow data: " & JSON.stringify(response));
		//console.log("get flow name: " & JSON.stringify(currentFlowName));

		const newName = "new name " + currentFlowName;
		response.data.name = newName;
		
		const patchFlow = {
        		method: 'PATCH',
        		uri: `http://flow-repository.openintegrationhub.com/flows`,
        		json: true,
				headers: {
                		"Authorization" : " Bearer " + tokenAdmin, 
            		},
        		body: response 		
		};

		console.log(patchFlow); 
		expect(response.statusCode).toEqual(200);
		done();
	});	
});
