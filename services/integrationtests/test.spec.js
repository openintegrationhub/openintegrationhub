process.env.AUTH_TYPE = 'basic';
const request = require('request-promise').defaults({ simple: false, resolveWithFullResponse: true });
const username = process.env.username;
const password = process.env.password;
let conf = null;

let tokenUser = null; 
let tokenAdmin = null;
let flowID = null;
let flowName = null;

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
	
    //-----------------------------------------FLOW-REPO------------------------------------------	
   	test('--- GET All FLOWS ---', async (done) => { 
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
        	"name": "Added test flow",
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
		const response = await request(addFlow);
	     
		const getFlowId = async res => {
			try {
				id = await Promise.resolve(res.body.data.id);
			}
			catch (error) {
				console.log(error);
			}
			return id; 
		};
		flowID = await getFlowId(response);

		const getFlowName = async res2 => {
			try {
				name = await Promise.resolve(res2.body.data.name);
			}
			catch (error) {
				console.log(error);
			}
			return name; 
		};
		flowName = await getFlowName(response); 

		console.log(flowID);
		console.log(flowName);
		//console.log(flowName);
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
		process.env.IAM_AUTH_TYPE = 'basic';
		const getFlowData = {
			method: 'GET',
			uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}`,
			json: true,
			headers: {
				"Authorization" : " Bearer " + tokenAdmin, 
			}
		};
		var response = await request(getFlowData);

		const newName = "new given name " + flowName;

		response.body.data.name = newName;

		//console.log(response);

		const patchFlow = {
        		method: 'PATCH',
        		uri: `http://flow-repository.openintegrationhub.com/flows`,
        		json: true,
				headers: {
                		"Authorization" : " Bearer " + tokenAdmin, 
            	},
        		body: response 		
		};
		
		console.log(JSON.stringify(patchFlow.body)); 
		expect(response.statusCode).toEqual(200);
		done();
	});

	test('--- START FLOW BY ID ---', async (done) => { 
		const startFlowById = {
				method: 'GET',
					uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}/start`,
					json:	true,
					headers: {
						"Authorization" : " Bearer " + tokenAdmin, 
					}
		};
		const response = await request(startFlowById);
		console.log(JSON.stringify(response.body));
		expect(response.statusCode).toEqual(200);
		done();
	});

	test('--- STOP FLOW BY ID ---', async (done) => { 
		const stopFlowById = {
				method: 'GET',
					uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}/stop`,
					json:	true,
					headers: {
						"Authorization" : " Bearer " + tokenAdmin, 
					}
		};
		const response = await request(stopFlowById);
		console.log(JSON.stringify(response.body));
		expect(response.statusCode).toEqual(200);
		done();
	});

	test('--- DELETE FLOW BY ID ---', async (done) => { 
		const deleteFlowById = {
				method: 'DELETE',
					uri: `http://flow-repository.openintegrationhub.com/flows/${flowID}`,
					json:	true,
					headers: {
						"Authorization" : " Bearer " + tokenAdmin, 
					}
			};
		const response = await request(deleteFlowById);
		console.log(JSON.stringify(response.body));
		expect(response.statusCode).toEqual(200);
		done();
	});
	
	//-----------------------------------------AUDITLOG-------------------------------------------
	
	// This will only return logs that pertain to the current user's tenant -> zuweisbar über Token?
	test('--- GET ALL LOGS ---', async (done) => {
		const getAllLogs = {
			method: 'GET',
				uri: `http://auditlog.openintegrationhub.com/logs`,
				json:	true,
				headers: {
					"Authorization" : " Bearer " + tokenAdmin, 
				}
		};
	const response = await request(getAllLogs);
	//console.log(response.body);
	expect(response.statusCode).toEqual(200);
	done();
	});

	test('--- ADD LOG ---', async (done) => { 
		process.env.IAM_AUTH_TYPE = 'basic';
		const createdFlow = {
        	"service": "MyService",
  			"timeStamp": "1234567",
  			"nameSpace": "outerSpace",
  			"payload": {
    			"tenant": "1",
    			"source": "SomeSource",
    			"object": "SomeObject",
    			"action": "foo",
    			"subject": "Test Subject",
    			"details": "A human-readable detailed description"
  			}
		};    
        const addLog = {
        	method: 'POST',
        	uri: `http://auditlog.openintegrationhub.com/logs`,
        	json: true,
			headers: {
                	"Authorization" : " Bearer " + tokenAdmin, 
            },
        	body: createdFlow		
		};
		const response = await request(addLog);

		expect(response.statusCode).toEqual(200);
    	done();
	});
});
