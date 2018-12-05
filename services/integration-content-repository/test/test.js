process.env.NODE_ENV = 'test';
process.env.NODE_CONFIG_DIR = './app/config';

var chai = require('chai');
var chaiHttp = require('chai-http');
var expect = chai.expect;

const jwt = require('jsonwebtoken');

// Sets the environment variables for the iam middleware. This has to happen before server.js is required
process.env.IAM_UPDATE_USERDATA = false;
process.env.IAM_JWT_ISSUER = 'Test_Issuer';
process.env.IAM_JWT_AUDIENCE = 'Test_Audience';
process.env.IAM_JWT_HMAC_SECRET = 'Test_Secret';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const log = require('../app/config/logger'); // eslint-disable-line
require('../app/index');

const host_url = 'http://localhost';
const port = process.env.PORT || 3001;

const request = require('supertest')(host_url+':'+port);

const adminId = 'TestAdmin';
const guestId = 'TestGuest';

const now = Math.round(new Date().getTime() / 1000);

// Creates two user objects that will be used as payloads for the authorisation tokens
const adminUser = {
  "sub": adminId,
  "username": "admin@example.com",
  "role": "ADMIN",
  "memberships": [
    {
      "role": "TENANT_ADMIN",
      "tenant": "testTenant1"
    },
    {
      "role": "TENANT_ADMIN",
      "tenant": "testTenant2"
    }
  ],
  "iat": now,
  "exp": now+1000,
  "aud": "Test_Audience",
  "iss": "Test_Issuer"
};

const guestUser = {
  "sub": guestId,
  "username": "admin@example.com",
  "role": "GUEST",
  "memberships": [
    {
      "role": "TENANT_Guest",
      "tenant": "testTenant1"
    }
  ],
  "iat": now,
  "exp": now+1000,
  "aud": "Test_Audience",
  "iss": "Test_Issuer"
}

// Converts the payloads into json web tokens
const adminToken = jwt.sign(adminUser, 'Test_Secret');
const guestToken = jwt.sign(guestUser, 'Test_Secret');


chai.use(chaiHttp);



describe('/api-docs/ - Documentation', function() {
  it('should display the swagger-generated HTML page', function(done) {
      request
            .get('/api-docs/')
            .then(function (res) {
              expect(res.text).to.not.be.empty;
              expect(res.text).to.contain('HTML for static distribution bundle build');

            })
            .catch(function (err) {
               throw err;
            })
            .then(done, done);
  });
});


describe('/api/ - Login Security', function() {
  it('should not be able to get flows without login', function(done) {
      request
            .get('/api/flow/')
            .then(function (res) {
              expect(res).to.have.status(401);
              expect(res.text).to.not.be.empty;
              expect(res.text).to.contain('Missing authorization header.');

            })
            .catch(function (err) {
               throw err;
            })
            .then(done, done);
  });

  it('should not be able to get specific flows without login', function(done) {
      request
                  .get('/api/flow/TestOIHID')
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');

                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to add flows without login', function(done) {
      request
                  .post('/api/flow/')
                  .set('accept', 'application/json')
                  .set('Content-Type', 'application/json')
                  .send({
                    "type": "flow",
                    "oihid": "TestOIHID",
                    "name": "WiceToSnazzy",
                    "status": "active",
                    "current_status": "active",
                    "default_mapper_type": "jsonata",
                    "description": "A description"
                  })
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to get specific nodes without login', function(done) {
      request
                  .get('/api/flow/node/TestOIHID/n1')
                  .set('accept', 'application/json')
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');

                  })
                  .catch(function (err) {
                    throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to add nodes without login', function(done) {
      request
                  .post('/api/flow/node/TestOIHID/n1')
                  .set('accept', 'application/json')
                  .set('Content-Type', 'application/x-www-form-urlencoded')
                  .send({command:'cmd1','name':'node 1','description':'desc1','fields_interval':'minute'})
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to add edges without login', function(done) {
      request
                  .post('/api/flow/edge/TestOIHID/e1')
                  .set('accept', 'application/json')
                  .set('Content-Type', 'application/x-www-form-urlencoded')
                  .send({'mapper_type':'nixmapper','condition':'conditional','mapper_to':'b','mapper_subject':'subj','mapper_textbody':'txt','source':'a','target':'b'})
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to delete flows without login', function(done) {
      request
                  .delete('/api/flow/TestOIHID')
                  .set('accept', 'application/json')
                  .set('Content-Type', 'application/json')
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to delete nodes without login', function(done) {
      request
                  .delete('/api/flow/node/TestOIHID/n1')
                  .set('accept', 'application/json')
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });

  it('should not be able to delete edge without login', function(done) {
      request
                  .delete('/api/flow/edge/TestOIHID/e1')
                  .set('accept', 'application/json')
                  .then(function (res) {
                    expect(res).to.have.status(401);
                    expect(res.text).to.not.be.empty;
                    expect(res.text).to.contain('Missing authorization header.');
                  })
                  .catch(function (err) {
                     throw err;
                  })
                  .then(done, done);
  });
});

describe('/api/ - Flow Operations', function() {


  it('should add a flow', function(done) {
      request
                  .post('/api/flow/')
                  .set('Authorization', 'Bearer '+adminToken)
                  .set('accept', 'application/json')
                  .set('Content-Type', 'application/json')
                  .send({
                    "type": "flow",
                    "oihid": "TestOIHID",
                    "name": "WiceToSnazzy",
                    "status": "active",
                    "current_status": "active",
                    "default_mapper_type": "jsonata",
                    "description": "A description"
                  })
                  .then(function (res) {

                    expect(res).to.have.status(200);
                    expect(res.text).to.not.be.empty;
                    let j= JSON.parse(res.text);
                    expect(j).to.exist;

                    expect(j).to.have.property('attributes');
                    expect(j).to.have.nested.property('attributes.name');
                    expect(Object.keys(j).length).to.equal(8);

                    expect(j).to.have.property('graph');
                    expect(j).to.have.property('type');
                    expect(j).to.have.property('oihid');
                    expect(j).to.have.property('relationships');
                    expect(j).to.have.property('__v');

                  })
                  .catch(function (err) {
                    throw err;
                  })
                  .then(done, done);
        });

        it('should not be able to add the same flow again', function(done) {
            request
                        .post('/api/flow/')
                        .set('Authorization', 'Bearer '+adminToken)
                        .set('accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                          "type": "flow",
                          "oihid": "TestOIHID",
                          "name": "WiceToSnazzy",
                          "status": "active",
                          "current_status": "active",
                          "default_mapper_type": "jsonata",
                          "description": "A description"
                        })
                        .then(function (res) {

                          expect(res).to.have.status(409);
                          expect(res.text).to.not.be.empty;

                        })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
              });

  it('should get the new flow', function(done) {
      request
                .get('/api/flow/TestOIHID')
                .set('Authorization', 'Bearer '+adminToken)
                .then(function (res) {

                  expect(res).to.have.status(200);
                  expect(res.text).to.not.be.empty;
                  let j= JSON.parse(res.text);
                  expect(j).to.exist;

                  expect(j).to.have.property('attributes');
                  expect(j).to.have.nested.property('attributes.name');
                  expect(j.attributes.name).to.equal('WiceToSnazzy');

                  expect(Object.keys(j.attributes).length).to.equal(8);

                  expect(j).to.have.property('graph');
                  expect(j).to.have.property('type');
                  expect(j).to.have.property('oihid');
                  expect(j).to.have.property('relationships');
                  expect(j).to.have.property('__v');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should not show the flow to another users getAll', function(done) {
      request
                .get('/api/flow/')
                .set('Authorization', 'Bearer '+guestToken)
                .then(function (res) {

                  expect(res).to.have.status(404);
                  expect(res.text).to.not.be.empty;

                  expect(res.text).to.equal('No flows found');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);

  });

  it('should not show the flow to another users get', function(done) {
      request
                .get('/api/flow/TestOIHID')
                .set('Authorization', 'Bearer '+guestToken)

                .then(function (res) {

                  expect(res).to.have.status(404);
                  expect(res.text).to.not.be.empty;

                  expect(res.text).to.equal('No flows found');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should return 404 when getting a non-existent flow', function(done) {
      request
                .get('/api/flow/nothing')
                .set('Authorization', 'Bearer '+adminToken)
                .then(function (res) {

                  expect(res).to.have.status(404);
                  expect(res.text).to.not.be.empty;

                  expect(res.text).to.equal('No flows found');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should add a second flow', function(done) {
      request
                .post('/api/flow/')
                .set('Authorization', 'Bearer '+adminToken)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                  "type": "flow",
                  "oihid": "TestOIHID2",
                  "name": "SnazzyZoWice",
                  "status": "active",
                  "current_status": "active",
                  "default_mapper_type": "jsonata",
                  "description": "A description"
                })
                .then(function (res) {

                  expect(res).to.have.status(200);
                  expect(res.text).to.not.be.empty;
                  let j= JSON.parse(res.text);
                  expect(j).to.exist;

                  expect(j).to.have.property('attributes');
                  expect(j).to.have.nested.property('attributes.name');
                  expect(Object.keys(j).length).to.equal(8);

                  expect(j).to.have.property('graph');
                  expect(j).to.have.property('type');
                  expect(j).to.have.property('oihid');
                  expect(j).to.have.property('relationships');
                  expect(j).to.have.property('__v');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should get all flows', function(done) {
      request
                .get('/api/flow/')
                .set('Authorization', 'Bearer '+adminToken)

                .then(function (res) {

                  expect(res).to.have.status(200);
                  expect(res.text).to.not.be.empty;
                  let j= JSON.parse(res.text);
                  expect(j).to.exist;

                  expect(j).length.to.be.gte(1);

                  expect(j[0]).to.have.property('attributes');
                  expect(j[0]).to.have.nested.property('attributes.name');
                  expect(Object.keys(j[0].attributes).length).to.equal(8);

                  expect(j[0]).to.have.property('graph');
                  expect(j[0]).to.have.property('type');
                  expect(j[0]).to.have.property('oihid');
                  expect(j[0]).to.have.property('relationships');
                  expect(j[0]).to.have.property('__v');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should update flow', function(done) {
      request
                .put('/api/flow/')
                .set('Authorization', 'Bearer '+adminToken)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                  "type": "flow",
                  "oihid": "TestOIHID",
                  "name": "NewName",
                  "status": "active",
                  "current_status": "active",
                  "default_mapper_type": "jsonata",
                  "description": "A description"
                })
                .then(function (res) {

                  expect(res).to.have.status(200);
                  expect(res.text).to.not.be.empty;
                  let j= JSON.parse(res.text);
                  expect(j).to.exist;

                  expect(j).to.have.property('attributes');
                  expect(j).to.have.nested.property('attributes.name');

                  expect(j.attributes.name).to.equal('NewName');

                  expect(Object.keys(j).length).to.equal(8);

                  expect(j).to.have.property('graph');
                  expect(j).to.have.property('type');
                  expect(j).to.have.property('oihid');
                  expect(j).to.have.property('relationships');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should updates the other flow via form data', function(done) {
      request
                .post('/api/flow/TestOIHID2')
                .set('Authorization', 'Bearer '+adminToken)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                  'name': 'SnazzyZoWice',
                  'status': 'active',
                  'current_status': 'active',
                })
                .then(function (res) {

                  expect(res).to.have.status(200);
                  expect(res.text).to.not.be.empty;
                  let j= JSON.parse(res.text);
                  expect(j).to.exist;

                  expect(j).to.have.property('attributes');
                  expect(j).to.have.nested.property('attributes.name');

                  expect(j.attributes.name).to.equal('SnazzyZoWice');

                  expect(Object.keys(j).length).to.equal(8);

                  expect(j).to.have.property('graph');
                  expect(j).to.have.property('type');
                  expect(j).to.have.property('oihid');
                  expect(j).to.have.property('relationships');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  it('should not be able to update a non-existent flow', function(done) {
      request
                .put('/api/flow/')
                .set('Authorization', 'Bearer '+adminToken)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                  "type": "flow",
                  "oihid": "nothing",
                  "name": "NewName",
                  "status": "active",
                  "current_status": "active",
                  "default_mapper_type": "jsonata",
                  "description": "A description"
                })
                .then(function (res) {

                  expect(res).to.have.status(404);
                  expect(res.text).to.not.be.empty;
                  expect(res.text).to.contain('Flow not found');

                })
                .catch(function (err) {
                  throw err;
                })
                .then(done, done);
  });

  describe('/api/user/{relationid} - User-relationship specific flow operations', function() {

      it('should get flows of admin user when queried by admin user', function(done) {
            request
                        .get('/api/flow/user/'+adminId)
                        .set('Authorization', 'Bearer '+adminToken)
                        .set('accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .then(function (res) {

                          expect(res).to.have.status(200);
                          expect(res.text).to.not.be.empty;
                          let j= JSON.parse(res.text);
                          expect(j).to.exist;
                          expect(j).length.to.be.gt(0);

                          expect(j[0]).to.have.property('attributes');
                          expect(j[0]).to.have.nested.property('attributes.name');
                          expect(Object.keys(j[0].attributes).length).to.equal(8);

                          expect(j[0]).to.have.property('graph');
                          expect(j[0]).to.have.property('type');
                          expect(j[0]).to.have.property('oihid');
                          expect(j[0]).to.have.property('relationships');
                          expect(j[0]).to.have.property('__v');

                        })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
      });

      it('should not get flows of the admin user when queried by another user', function(done) {
            request
                        .get('/api/flow/user/'+adminId)
                        .set('Authorization', 'Bearer '+guestToken)
                        .set('accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .then(function (res) {
                          expect(res).to.have.status(401);
                          expect(res.text).to.not.be.empty;
                          expect(res.text).to.contain('Unauthorised: Cannot Get flows from users other than yourself');

                        })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
      });

      it('should return 404 when user without flows queries themselves', function(done) {
            request
                        .get('/api/flow/user/'+guestId)
                        .set('Authorization', 'Bearer '+guestToken)
                        .set('accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .then(function (res) {
                          expect(res).to.have.status(404);
                          expect(res.text).to.not.be.empty;
                        })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
      });


      });

      describe('/api/flow/tenant/{relationid} - Tenancy-relationship specific flow operations', function() {
          it('should not allow users to query tenants they are not members of', function(done) {
                request
                            .get('/api/flow/tenant/TenantThatCannotPossiblyExist')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(401);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should return no flows of the first test tenant', function(done) {
                request
                            .get('/api/flow/tenant/testTenant1')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(404);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should not allow a user to add flows  that the user is not a privileged member of', function(done) {
                request
                            .post('/api/flow/tenant/TestOIHID/TenantThatCannotPossiblyExist')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(401);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should add a flow to a tenant', function(done) {
                request
                            .post('/api/flow/tenant/TestOIHID/testTenant1')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(200);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should not allow adding the same flow to the same tenant again', function(done) {
                request
                            .post('/api/flow/tenant/TestOIHID/testTenant1')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(409);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should not allow a user remove flows from a tenant that the user is not a privileged member of', function(done) {
                request
                            .delete('/api/flow/tenant/TestOIHID/TenantThatCannotPossiblyExist')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(401);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should remove the flow from a tenant', function(done) {
                request
                            .delete('/api/flow/tenant/TestOIHID/testTenant1')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(200);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });

          it('should not allow removing the flow from the same tenant again', function(done) {
                request
                            .delete('/api/flow/tenant/TestOIHID/testTenant1')
                            .set('Authorization', 'Bearer '+adminToken)
                            .set('accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .then(function (res) {

                              expect(res).to.have.status(409);
                              expect(res.text).to.not.be.empty;

                            })
                            .catch(function (err) {
                              throw err;
                            })
                            .then(done, done);
          });


        });


  describe('/api/flow/node/ - Node operations', function() {

      it('should add a node', function(done) {
          request
                              .post('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                              .set('Content-Type', 'application/x-www-form-urlencoded')
                              .send({'command':'cmd1','name':'node 1','description':'desc1','fields_interval':'minute'})
                              .then(function (res) {

                                expect(res).to.have.status(200);
                                expect(res.text).to.not.be.empty;
                                let j= JSON.parse(res.text);
                                expect(j).to.exist;

                                expect(j).to.have.property('id');
                                expect(j.id).to.equal('n1');

                                expect(j).to.have.property('command');
                                expect(j).to.have.property('name');
                                expect(j).to.have.property('description');

                                expect(j).to.have.property('fields');
                                expect(j).to.have.nested.property('fields[0].interval');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
                });

      it('should get the new node', function(done) {
          request
                              .get('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                              .then(function (res) {

                                expect(res).to.have.status(200);
                                expect(res.text).to.not.be.empty;
                                let j= JSON.parse(res.text);
                                expect(j).to.exist;

                                expect(j).to.have.property('id');
                                expect(j.id).to.equal('n1');

                                expect(j).to.have.property('command');
                                expect(j).to.have.property('name');
                                expect(j).to.have.property('description');

                                expect(j).to.have.property('fields');
                                expect(j).to.have.nested.property('fields[0].interval');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
                  });

      it('should not return the node to another user', function(done) {
          request
                              .get('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+guestToken)
                              .set('accept', 'application/json')
                              .then(function (res) {
                                expect(res).to.have.status(404);
                                expect(res.text).to.not.be.empty;
                                expect(res.text).to.contain('Node not found');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
      });

      it('should return 404 when attempting to get a non-existent node', function(done) {
          request
                              .get('/api/flow/node/TestOIHID/nothing')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                              .then(function (res) {
                                expect(res).to.have.status(404);
                                expect(res.text).to.contain('Node not found');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
      });

      it('should update the node', function(done) {
          request
                              .put('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                                .set('Content-Type', 'application/x-www-form-urlencoded')
                              .send({'command':'new command','name':'node 1 U','description':'this node got updated','fields_interval':'minute'})
                              .then(function (res) {

                                expect(res).to.have.status(200);
                                expect(res.text).to.not.be.empty;
                                let j= JSON.parse(res.text);
                                expect(j).to.exist;

                                expect(j).to.have.property('id');
                                expect(j.id).to.equal('n1');

                                expect(j).to.have.property('command');
                                expect(j.command).to.equal('new command');

                                expect(j).to.have.property('name');
                                expect(j.name).to.equal('node 1 U');

                                expect(j).to.have.property('description');
                                expect(j.description).to.equal('this node got updated');

                                expect(j).to.have.property('fields');
                                expect(j).to.have.nested.property('fields[0].interval');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
      });

      it('should not allow the user to update the node', function(done) {
          request
                      .get('/api/flow/node/TestOIHID/n1')
                      .set('Authorization', 'Bearer '+guestToken)
                      .set('accept', 'application/json')
                      .send({'command':'newcommand','name':'node 1 U','description':'this node got updated','fields_interval':'minute'})
                      .then(function (res) {
                        expect(res).to.have.status(404);
                        expect(res.text).to.not.be.empty;
                        expect(res.text).to.contain('Node not found');

                      })
                      .catch(function (err) {
                        throw err;
                      })
                      .then(done, done);
      });

      it('should get the updated node', function(done) {
          request
                              .get('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                              .then(function (res) {

                                expect(res).to.have.status(200);
                                expect(res.text).to.not.be.empty;
                                let j= JSON.parse(res.text);
                                expect(j).to.exist;

                                expect(j).to.have.property('id');
                                expect(j.id).to.equal('n1');

                                expect(j).to.have.property('command');
                                expect(j.command).to.equal('new command');

                                expect(j).to.have.property('name');
                                expect(j.name).to.equal('node 1 U');

                                expect(j).to.have.property('description');
                                expect(j.description).to.equal('this node got updated');

                                expect(j).to.have.property('fields');
                                expect(j).to.have.nested.property('fields[0].interval');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
      });

      it('should return 404 when attempting to update a non-existent node', function(done) {
          request
                    .get('/api/flow/node/TestOIHID/nothing')
                    .set('Authorization', 'Bearer '+adminToken)
                    .set('accept', 'application/json')
                    .send({'command':'newcommand','name':'node 1 U','description':'this node got updated','fields_interval':'minute'})
                    .then(function (res) {

                      expect(res).to.have.status(404);
                      expect(res.text).to.not.be.empty;
                      expect(res.text).to.contain('Node not found');

                    })
                    .catch(function (err) {
                      throw err;
                    })
                    .then(done, done);
      });

      it('should delete the node', function(done) {
          request
                              .delete('/api/flow/node/TestOIHID/n1')
                              .set('Authorization', 'Bearer '+adminToken)
                              .set('accept', 'application/json')
                              .then(function (res) {

                                      expect(res).to.have.status(200);
                                      expect(res.text).to.not.be.empty;
                                      let j= JSON.parse(res.text);
                                      expect(j).to.exist;

                                      expect(j).to.have.property('id');
                                      expect(j.id).to.equal('n1');

                                      expect(j).to.have.property('command');
                                      expect(j).to.have.property('name');
                                      expect(j).to.have.property('description');

                                      expect(j).to.have.property('fields');
                                      expect(j).to.have.nested.property('fields[0].interval');

                              })
                              .catch(function (err) {
                                throw err;
                              })
                              .then(done, done);
            });
      });

      describe('/api/flow/edge/ - Edge Operations', function() {
          it('should add an edge', function(done) {
              request
                          .post('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .set('Content-Type', 'application/x-www-form-urlencoded')
                          .send({'mapper_type':'nixmapper','condition':'conditional','mapper_to':'b','mapper_subject':'subj','mapper_textbody':'txt','source':'a','target':'b'})
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('id');
                            expect(j.id).to.equal('e1');

                            expect(j).to.have.nested.property('config.mapper_type');
                            expect(j).to.have.nested.property('config.condition');

                            expect(j).to.have.nested.property('config.mapper.to');
                            expect(j).to.have.nested.property('config.mapper.subject');
                            expect(j).to.have.nested.property('config.mapper.textbody');

                            expect(j).to.have.nested.property('config.source');
                            expect(j).to.have.nested.property('config.target');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
            });

          it('should get the new edge', function(done) {
              request
                          .get('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('id');
                            expect(j.id).to.equal('e1');

                            expect(j).to.have.nested.property('config.mapper_type');
                            expect(j).to.have.nested.property('config.condition');

                            expect(j).to.have.nested.property('config.mapper.to');
                            expect(j).to.have.nested.property('config.mapper.subject');
                            expect(j).to.have.nested.property('config.mapper.textbody');

                            expect(j).to.have.nested.property('config.source');
                            expect(j).to.have.nested.property('config.target');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
          });

          it('should not allow the other user to get the edge', function(done) {
              request
                                  .get('/api/flow/edge/TestOIHID/e1')
                                  .set('Authorization', 'Bearer '+guestToken)
                                  .set('accept', 'application/json')
                                  .then(function (res) {
                                    expect(res).to.have.status(404);
                                    expect(res.text).to.not.be.empty;
                                    expect(res.text).to.contain('Edge not found');

                                  })
                                  .catch(function (err) {
                                    throw err;
                                  })
                                  .then(done, done);
          });

          it('should return 404 when attempting to get a non-existent edge', function(done) {
              request
                          .get('/api/flow/edge/TestOIHID/nothing')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .then(function (res) {
                            expect(res).to.have.status(404);
                            expect(res.text).to.contain('Edge not found');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
          });

          it('should update the edge', function(done) {
              request
                          .put('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .set('accept', 'application/json')
                          .set('Content-Type', 'application/x-www-form-urlencoded')
                          .send({'mapper_type':'nixmapper','condition':'unconditional','mapper_to':'b','mapper_subject':'subj','mapper_textbody':'txt updated!','source':'a','target':'b'})
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('id');
                            expect(j.id).to.equal('e1');

                            expect(j).to.have.nested.property('config.mapper_type');
                            expect(j).to.have.nested.property('config.condition');
                            expect(j.config.condition).to.equal('unconditional');

                            expect(j).to.have.nested.property('config.mapper.to');
                            expect(j).to.have.nested.property('config.mapper.subject');

                            expect(j).to.have.nested.property('config.mapper.textbody');
                            expect(j.config.mapper.textbody).to.equal('txt updated!');

                            expect(j).to.have.nested.property('config.source');
                            expect(j).to.have.nested.property('config.target');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
          });

          it('should not allow the other user to update the edge', function(done) {
              request
                          .put('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+guestToken)
                          .set('accept', 'application/json')
                          .set('accept', 'application/json')
                          .set('Content-Type', 'application/x-www-form-urlencoded')
                          .send({'mapper_type':'nixmapper','condition':'unconditional','mapper_to':'b','mapper_subject':'subj','mapper_textbody':'txt updated!','source':'a','target':'b'})
                          .then(function (res) {

                            expect(res).to.have.status(404);
                            expect(res.text).to.not.be.empty;
                            expect(res.text).to.contain('Edge not found');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
          });

          it('should get the updated edge', function(done) {
              request
                          .get('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('id');
                            expect(j.id).to.equal('e1');

                            expect(j).to.have.nested.property('config.mapper_type');
                            expect(j).to.have.nested.property('config.condition');
                            expect(j.config.condition).to.equal('unconditional');

                            expect(j).to.have.nested.property('config.mapper.to');
                            expect(j).to.have.nested.property('config.mapper.subject');

                            expect(j).to.have.nested.property('config.mapper.textbody');
                            expect(j.config.mapper.textbody).to.equal('txt updated!');

                            expect(j).to.have.nested.property('config.source');
                            expect(j).to.have.nested.property('config.target');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
          });

          it('should return 404 when attempting to update a non-existent edge', function(done) {
              request
                        .get('/api/flow/edge/TestOIHID/nothing')
                        .set('Authorization', 'Bearer '+adminToken)
                        .set('accept', 'application/json')
                        .send({'command':'newcommand','name':'node 1 U','description':'this node got updated','fields_interval':'minute'})
                        .then(function (res) {
                          expect(res).to.have.status(404);
                          expect(res.text).to.not.be.empty;
                          expect(res.text).to.contain('Edge not found');

                        })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
          });

          it('should delete the edge', function(done) {
              request
                          .delete('/api/flow/edge/TestOIHID/e1')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('id');
                            expect(j.id).to.equal('e1');

                            expect(j).to.have.nested.property('config.mapper_type');
                            expect(j).to.have.nested.property('config.condition');
                            expect(j.config.condition).to.equal('unconditional');

                            expect(j).to.have.nested.property('config.mapper.to');
                            expect(j).to.have.nested.property('config.mapper.subject');

                            expect(j).to.have.nested.property('config.mapper.textbody');
                            expect(j.config.mapper.textbody).to.equal('txt updated!');

                            expect(j).to.have.nested.property('config.source');
                            expect(j).to.have.nested.property('config.target');

                          })
                        .catch(function (err) {
                          throw err;
                        })
                        .then(done, done);
          });
      });

});


describe('/api/ - Cleanup', function() {

    it('should delete the first flow', function(done) {
              request
                          .delete('/api/flow/TestOIHID')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .set('Content-Type', 'application/json')
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('attributes');
                            expect(j).to.have.nested.property('attributes.name');

                            expect(j.attributes.name).to.equal('NewName');

                            expect(Object.keys(j).length).to.equal(8);

                            expect(j).to.have.property('graph');
                            expect(j).to.have.property('type');
                            expect(j).to.have.property('oihid');
                            expect(j.oihid).to.equal('TestOIHID');

                            expect(j).to.have.property('relationships');
                            expect(j).to.have.property('__v');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
    });

    it('should delete the second flow', function(done) {
              request
                          .delete('/api/flow/TestOIHID2')
                          .set('Authorization', 'Bearer '+adminToken)
                          .set('accept', 'application/json')
                          .set('Content-Type', 'application/json')
                          .then(function (res) {

                            expect(res).to.have.status(200);
                            expect(res.text).to.not.be.empty;
                            let j= JSON.parse(res.text);
                            expect(j).to.exist;

                            expect(j).to.have.property('attributes');
                            expect(j).to.have.nested.property('attributes.name');

                            expect(j.attributes.name).to.equal('SnazzyZoWice');

                            expect(Object.keys(j).length).to.equal(8);

                            expect(j).to.have.property('graph');
                            expect(j).to.have.property('type');
                            expect(j).to.have.property('oihid');
                            expect(j.oihid).to.equal('TestOIHID2');

                            expect(j).to.have.property('relationships');
                            expect(j).to.have.property('__v');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
    });

    it('should return 404 when attempting to get the just deleted flow', function(done) {
              request
                          .get('/api/flow/TestOIHID')
                          .set('Authorization', 'Bearer '+adminToken)
                          .then(function (res) {
                            expect(res).to.have.status(404);
                            expect(res.text).to.not.be.empty;
                            expect(res.text).to.equal('No flows found');

                          })
                          .catch(function (err) {
                            throw err;
                          })
                          .then(done, done);
    });

});
