/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */

const chai = require('chai');
const chaiHttp = require('chai-http');

const expect = chai.expect;

const jwt = require('jsonwebtoken');

// Sets the environment variables for the iam middleware.
// This has to happen before server.js is required
process.env.IAM_UPDATE_USERDATA = false;
process.env.IAM_JWT_ISSUER = 'Test_Issuer';
process.env.IAM_JWT_AUDIENCE = 'Test_Audience';
process.env.IAM_JWT_HMAC_SECRET = 'Test_Secret';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;

const request = require('supertest')(`${hostUrl}:${port}`);

const log = require('../app/config/logger'); // eslint-disable-line
require('../app/index');


const adminId = 'TestAdmin';
const guestId = 'TestGuest';

const now = Math.round(new Date().getTime() / 1000);

// Creates two user objects that will be used as payloads for the authorisation tokens
const adminUser = {
  sub: adminId,
  username: 'admin@example.com',
  role: 'ADMIN',
  memberships: [
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant1',
    },
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant2',
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

const guestUser = {
  sub: guestId,
  username: 'admin@example.com',
  role: 'GUEST',
  memberships: [
    {
      role: 'TENANT_Guest',
      tenant: 'testTenant1',
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

// Converts the payloads into json web tokens
const adminToken = jwt.sign(adminUser, 'Test_Secret');
const guestToken = jwt.sign(guestUser, 'Test_Secret');
let flowId1;
let flowId2;


chai.use(chaiHttp);


describe('/api-docs/ - Documentation', () => {
  it('should display the swagger-generated HTML page', (done) => {
    request
      .get('/api-docs/')
      .then((res) => {
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('HTML for static distribution bundle build');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });
});


describe('/api/ - Login Security', () => {
  it('should not be able to get flows without login', (done) => {
    request
      .get('/api/flows/')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to get specific flows without login', (done) => {
    request
      .get('/api/flows/TestOIHID')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to add flows without login', (done) => {
    request
      .post('/api/flows/')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: 'TestOIHID',
        name: 'WiceToSnazzy',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      })
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to get specific nodes without login', (done) => {
    request
      .get('/api/flows/node/TestOIHID/n1')
      .set('accept', 'application/json')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to add nodes without login', (done) => {
    request
      .post('/api/flows/node/TestOIHID/n1')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        command: 'cmd1', name: 'node 1', description: 'desc1', fields_interval: 'minute',
      })
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to add edges without login', (done) => {
    request
      .post('/api/flows/edge/TestOIHID/e1')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        mapper_type: 'nixmapper', condition: 'conditional', mapper_to: 'b', mapper_subject: 'subj', mapper_textbody: 'txt', source: 'a', target: 'b',
      })
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to delete flows without login', (done) => {
    request
      .delete('/api/flows/TestOIHID')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to delete nodes without login', (done) => {
    request
      .delete('/api/flows/node/TestOIHID/n1')
      .set('accept', 'application/json')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not be able to delete edge without login', (done) => {
    request
      .delete('/api/flows/edge/TestOIHID/e1')
      .set('accept', 'application/json')
      .then((res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Missing authorization header.');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });
});

describe('/api/ - Flow Operations', () => {
  it('should add a flow', (done) => {
    request
      .post('/api/flows/')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'WiceToSnazzy',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      })
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;

        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
        flowId1 = j.oihid;
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });


  it('should get the new flow', (done) => {
    request
      .get(`/api/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;

        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not show the flow to another users getAll', (done) => {
    request
      .get('/api/flows/')
      .set('Authorization', `Bearer ${guestToken}`)
      .then((res) => {
        expect(res).to.have.status(404);
        expect(res.text).to.not.be.empty;

        expect(res.text).to.equal('No flows found');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should not show the flow to another users get', (done) => {
    request
      .get('/api/flows/TestOIHID')
      .set('Authorization', `Bearer ${guestToken}`)

      .then((res) => {
        expect(res).to.have.status(404);
        expect(res.text).to.not.be.empty;

        expect(res.text).to.equal('No flows found');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should return 404 when getting a non-existent flow', (done) => {
    request
      .get('/api/flows/nothing')
      .set('Authorization', `Bearer ${adminToken}`)
      .then((res) => {
        expect(res).to.have.status(404);
        expect(res.text).to.not.be.empty;

        expect(res.text).to.equal('No flows found');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should add a second flow', (done) => {
    request
      .post('/api/flows/')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'SnazzyZoWice',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      })
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;

        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
        flowId2 = j.oihid;
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should get all flows', (done) => {
    request
      .get('/api/flows/')
      .set('Authorization', `Bearer ${adminToken}`)

      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;

        expect(j.data).length.to.be.gte(1);

        expect(j.data[0]).to.have.property('graph');
        expect(j.data[0]).to.have.property('type');
        expect(j.data[0]).to.have.property('oihid');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should update flow', (done) => {
    request
      .put('/api/flows/')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: flowId1,
        name: 'NewName',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      })
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;


        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });


  it('should not be able to update a non-existent flow', (done) => {
    request
      .put('/api/flows/')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: 'nothing',
        name: 'NewName',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      })
      .then((res) => {
        expect(res).to.have.status(404);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.contain('Flow not found');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  // describe('/api/user/{relationid} - User-relationship specific flow operations', () => {
  //   it('should get flows of admin user when queried by admin user', (done) => {
  //     request
  //       .get(`/api/flows/user/${adminId}`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .set('accept', 'application/json')
  //       .set('Content-Type', 'application/json')
  //       .then((res) => {
  //         expect(res).to.have.status(200);
  //         expect(res.text).to.not.be.empty;
  //         const j = JSON.parse(res.text);
  //         expect(j).to.exist;
  //         expect(j).length.to.be.gt(0);
  //
  //         expect(j[0]).to.have.property('graph');
  //         expect(j[0]).to.have.property('type');
  //         expect(j[0]).to.have.property('oihid');
  //       })
  //       .catch((err) => {
  //         throw err;
  //       })
  //       .then(done, done);
  //   });
  //
  //   it('should not get flows of the admin user when queried by another user', (done) => {
  //     request
  //       .get(`/api/flows/user/${adminId}`)
  //       .set('Authorization', `Bearer ${guestToken}`)
  //       .set('accept', 'application/json')
  //       .set('Content-Type', 'application/json')
  //       .then((res) => {
  //         expect(res).to.have.status(401);
  //         expect(res.text).to.not.be.empty;
  //         expect(res.text).to.contain('Unauthorised: Cannot Get flows from users other than yourself');
  //       })
  //       .catch((err) => {
  //         throw err;
  //       })
  //       .then(done, done);
  //   });
  //
  //   it('should return 404 when user without flows queries themselves', (done) => {
  //     request
  //       .get(`/api/flows/user/${guestId}`)
  //       .set('Authorization', `Bearer ${guestToken}`)
  //       .set('accept', 'application/json')
  //       .set('Content-Type', 'application/json')
  //       .then((res) => {
  //         expect(res).to.have.status(404);
  //         expect(res.text).to.not.be.empty;
  //       })
  //       .catch((err) => {
  //         throw err;
  //       })
  //       .then(done, done);
  //   });
  // });

//   describe('/api/flows/tenant/{relationid} - Tenancy-relationship specific flow operations', () => {
//     it('should not allow users to query tenants they are not members of', (done) => {
//       request
//         .get('/api/flows/tenant/TenantThatCannotPossiblyExist')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(401);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should return no flows of the first test tenant', (done) => {
//       request
//         .get('/api/flows/tenant/testTenant1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow a user to add flows  that the user is not a privileged member of', (done) => {
//       request
//         .post('/api/flows/tenant/TestOIHID/TenantThatCannotPossiblyExist')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(401);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should add a flow to a tenant', (done) => {
//       request
//         .post('/api/flows/tenant/TestOIHID/testTenant1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow adding the same flow to the same tenant again', (done) => {
//       request
//         .post('/api/flows/tenant/TestOIHID/testTenant1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(409);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow a user remove flows from a tenant that the user is not a privileged member of', (done) => {
//       request
//         .delete('/api/flows/tenant/TestOIHID/TenantThatCannotPossiblyExist')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(401);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should remove the flow from a tenant', (done) => {
//       request
//         .delete('/api/flows/tenant/TestOIHID/testTenant1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow removing the flow from the same tenant again', (done) => {
//       request
//         .delete('/api/flows/tenant/TestOIHID/testTenant1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(409);
//           expect(res.text).to.not.be.empty;
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//   });
//
//
//   describe('/api/flows/node/ - Node operations', () => {
//     it('should add a node', (done) => {
//       request
//         .post('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//         .send({
//           command: 'cmd1', name: 'node 1', description: 'desc1', fields_interval: 'minute',
//         })
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('n1');
//
//           expect(j).to.have.property('command');
//           expect(j).to.have.property('name');
//           expect(j).to.have.property('description');
//
//           expect(j).to.have.property('fields');
//           expect(j).to.have.nested.property('fields[0].interval');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should get the new node', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('n1');
//
//           expect(j).to.have.property('command');
//           expect(j).to.have.property('name');
//           expect(j).to.have.property('description');
//
//           expect(j).to.have.property('fields');
//           expect(j).to.have.nested.property('fields[0].interval');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not return the node to another user', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${guestToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Node not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should return 404 when attempting to get a non-existent node', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/nothing')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.contain('Node not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should update the node', (done) => {
//       request
//         .put('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//         .send({
//           command: 'new command', name: 'node 1 U', description: 'this node got updated', fields_interval: 'minute',
//         })
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('n1');
//
//           expect(j).to.have.property('command');
//           expect(j.command).to.equal('new command');
//
//           expect(j).to.have.property('name');
//           expect(j.name).to.equal('node 1 U');
//
//           expect(j).to.have.property('description');
//           expect(j.description).to.equal('this node got updated');
//
//           expect(j).to.have.property('fields');
//           expect(j).to.have.nested.property('fields[0].interval');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow the user to update the node', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${guestToken}`)
//         .set('accept', 'application/json')
//         .send({
//           command: 'newcommand', name: 'node 1 U', description: 'this node got updated', fields_interval: 'minute',
//         })
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Node not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should get the updated node', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('n1');
//
//           expect(j).to.have.property('command');
//           expect(j.command).to.equal('new command');
//
//           expect(j).to.have.property('name');
//           expect(j.name).to.equal('node 1 U');
//
//           expect(j).to.have.property('description');
//           expect(j.description).to.equal('this node got updated');
//
//           expect(j).to.have.property('fields');
//           expect(j).to.have.nested.property('fields[0].interval');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should return 404 when attempting to update a non-existent node', (done) => {
//       request
//         .get('/api/flows/node/TestOIHID/nothing')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .send({
//           command: 'newcommand', name: 'node 1 U', description: 'this node got updated', fields_interval: 'minute',
//         })
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Node not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should delete the node', (done) => {
//       request
//         .delete('/api/flows/node/TestOIHID/n1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('n1');
//
//           expect(j).to.have.property('command');
//           expect(j).to.have.property('name');
//           expect(j).to.have.property('description');
//
//           expect(j).to.have.property('fields');
//           expect(j).to.have.nested.property('fields[0].interval');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//   });
//
//   describe('/api/flows/edge/ - Edge Operations', () => {
//     it('should add an edge', (done) => {
//       request
//         .post('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//         .send({
//           mapper_type: 'nixmapper', condition: 'conditional', mapper_to: 'b', mapper_subject: 'subj', mapper_textbody: 'txt', source: 'a', target: 'b',
//         })
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('e1');
//
//           expect(j).to.have.nested.property('config.mapper_type');
//           expect(j).to.have.nested.property('config.condition');
//
//           expect(j).to.have.nested.property('config.mapper.to');
//           expect(j).to.have.nested.property('config.mapper.subject');
//           expect(j).to.have.nested.property('config.mapper.textbody');
//
//           expect(j).to.have.nested.property('config.source');
//           expect(j).to.have.nested.property('config.target');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should get the new edge', (done) => {
//       request
//         .get('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('e1');
//
//           expect(j).to.have.nested.property('config.mapper_type');
//           expect(j).to.have.nested.property('config.condition');
//
//           expect(j).to.have.nested.property('config.mapper.to');
//           expect(j).to.have.nested.property('config.mapper.subject');
//           expect(j).to.have.nested.property('config.mapper.textbody');
//
//           expect(j).to.have.nested.property('config.source');
//           expect(j).to.have.nested.property('config.target');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow the other user to get the edge', (done) => {
//       request
//         .get('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${guestToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Edge not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should return 404 when attempting to get a non-existent edge', (done) => {
//       request
//         .get('/api/flows/edge/TestOIHID/nothing')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.contain('Edge not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should update the edge', (done) => {
//       request
//         .put('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//         .send({
//           mapper_type: 'nixmapper', condition: 'unconditional', mapper_to: 'b', mapper_subject: 'subj', mapper_textbody: 'txt updated!', source: 'a', target: 'b',
//         })
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('e1');
//
//           expect(j).to.have.nested.property('config.mapper_type');
//           expect(j).to.have.nested.property('config.condition');
//           expect(j.config.condition).to.equal('unconditional');
//
//           expect(j).to.have.nested.property('config.mapper.to');
//           expect(j).to.have.nested.property('config.mapper.subject');
//
//           expect(j).to.have.nested.property('config.mapper.textbody');
//           expect(j.config.mapper.textbody).to.equal('txt updated!');
//
//           expect(j).to.have.nested.property('config.source');
//           expect(j).to.have.nested.property('config.target');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should not allow the other user to update the edge', (done) => {
//       request
//         .put('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${guestToken}`)
//         .set('accept', 'application/json')
//         .set('accept', 'application/json')
//         .set('Content-Type', 'application/x-www-form-urlencoded')
//         .send({
//           mapper_type: 'nixmapper', condition: 'unconditional', mapper_to: 'b', mapper_subject: 'subj', mapper_textbody: 'txt updated!', source: 'a', target: 'b',
//         })
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Edge not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should get the updated edge', (done) => {
//       request
//         .get('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('e1');
//
//           expect(j).to.have.nested.property('config.mapper_type');
//           expect(j).to.have.nested.property('config.condition');
//           expect(j.config.condition).to.equal('unconditional');
//
//           expect(j).to.have.nested.property('config.mapper.to');
//           expect(j).to.have.nested.property('config.mapper.subject');
//
//           expect(j).to.have.nested.property('config.mapper.textbody');
//           expect(j.config.mapper.textbody).to.equal('txt updated!');
//
//           expect(j).to.have.nested.property('config.source');
//           expect(j).to.have.nested.property('config.target');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should return 404 when attempting to update a non-existent edge', (done) => {
//       request
//         .get('/api/flows/edge/TestOIHID/nothing')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .send({
//           command: 'newcommand', name: 'node 1 U', description: 'this node got updated', fields_interval: 'minute',
//         })
//         .then((res) => {
//           expect(res).to.have.status(404);
//           expect(res.text).to.not.be.empty;
//           expect(res.text).to.contain('Edge not found');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//
//     it('should delete the edge', (done) => {
//       request
//         .delete('/api/flows/edge/TestOIHID/e1')
//         .set('Authorization', `Bearer ${adminToken}`)
//         .set('accept', 'application/json')
//         .then((res) => {
//           expect(res).to.have.status(200);
//           expect(res.text).to.not.be.empty;
//           const j = JSON.parse(res.text);
//           expect(j).to.exist;
//
//           expect(j).to.have.property('id');
//           expect(j.id).to.equal('e1');
//
//           expect(j).to.have.nested.property('config.mapper_type');
//           expect(j).to.have.nested.property('config.condition');
//           expect(j.config.condition).to.equal('unconditional');
//
//           expect(j).to.have.nested.property('config.mapper.to');
//           expect(j).to.have.nested.property('config.mapper.subject');
//
//           expect(j).to.have.nested.property('config.mapper.textbody');
//           expect(j.config.mapper.textbody).to.equal('txt updated!');
//
//           expect(j).to.have.nested.property('config.source');
//           expect(j).to.have.nested.property('config.target');
//         })
//         .catch((err) => {
//           throw err;
//         })
//         .then(done, done);
//     });
//   });
});


describe('/api/ - Cleanup', () => {
  it('should delete the first flow', (done) => {
    request
      .delete(`/api/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;
        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should delete the second flow', (done) => {
    request
      .delete(`/api/flows/${flowId2}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.not.be.empty;
        const j = JSON.parse(res.text);
        expect(j).to.exist;

        expect(j).to.have.property('graph');
        expect(j).to.have.property('type');
        expect(j).to.have.property('oihid');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });

  it('should return 404 when attempting to get the just deleted flow', (done) => {
    request
      .get(`/api/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .then((res) => {
        expect(res).to.have.status(404);
        expect(res.text).to.not.be.empty;
        expect(res.text).to.equal('No flows found');
      })
      .catch((err) => {
        throw err;
      })
      .then(done, done);
  });
});
