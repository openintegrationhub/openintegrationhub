const { expect } = require('chai');
const nock = require('nock');
const mongoose = require('mongoose');
const Component = require('../../src/models/Component')
const { fetchMeta } = require('../../src/utils/fetchMeta')
const { fetchMetaSchemas } = require('../../src/utils/fetchMetaSchemas')

describe('fetchMetaSchemas', () => {
  let componentId;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
    await mongoose.connect(mongoUri, { });

    const component = await Component.create({
      name: 'TestComponent',
      repository: 'https://github.com/openintegrationhub/snazzycontacts-adapter',
      distribution: {
        image: 'openintegrationhub/snazzy-adapter:latest'
      }
    })

    componentId = component._id


    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/component.json')
    .reply(200, {
      triggers:{
          getPersonsPolling:{
             'title':'Fetch new and updated persons(getPersons - Polling)',
             'description':'Get Snazzy Contacts persons which have recently been modified or created',
             'type':'polling',
             'main':'./lib/triggers/getPersonsPolling.js',
             'metadata':{
                'in':'./lib/schemas/getPersons.in.json',
                'out':'./lib/schemas/getPersons.out.json'
             }
          }
      },
       actions:{
          upsertPerson:{
             'title':'Upsert a person in Snazzy Contacts',
             'main':'./lib/actions/upsertPerson.js',
             'metadata':{
                'in':'./lib/schemas/upsertPerson.in.json',
                'out':'./lib/schemas/upsertPerson.out.json'
             }
          }
      }
    });

    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/Readme.md')
    .reply(200, 'Hello world')


    // Fetch component json
    await fetchMeta('https://github.com/openintegrationhub/snazzycontacts-adapter', componentId);
  })

  afterEach(async () => {
      await Component.deleteMany();
      await mongoose.connection.close();
  });

  it('should fetch the schemas specified in the components triggers and actions', async () => {
    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/lib/schemas/getPersons.in.json')
    .reply(200, {
      getPersonsIn: 'done',
    });

    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/lib/schemas/getPersons.out.json')
    .reply(200, {
      getPersonsOut: 'done',
    });

    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/lib/schemas/upsertPerson.in.json')
    .reply(200, {
      upsertPersonIn: 'done',
    });

    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/lib/schemas/upsertPerson.out.json')
    .reply(200, {
      upsertPersonOut: 'done',
    });

    await fetchMetaSchemas('https://github.com/openintegrationhub/snazzycontacts-adapter', componentId);

    const updatedComponent = await Component.findOne({ _id: componentId });

    expect(updatedComponent.actions.upsertPerson.metadata.in).to.have.property('upsertPersonIn');
    expect(updatedComponent.actions.upsertPerson.metadata.out).to.have.property('upsertPersonOut');

    expect(updatedComponent.actions.upsertPerson.metadata.in.upsertPersonIn).to.equal('done');
    expect(updatedComponent.actions.upsertPerson.metadata.out.upsertPersonOut).to.equal('done');

    expect(updatedComponent.triggers.getPersonsPolling.metadata.in).to.have.property('getPersonsIn');
    expect(updatedComponent.triggers.getPersonsPolling.metadata.out).to.have.property('getPersonsOut');

    expect(updatedComponent.triggers.getPersonsPolling.metadata.in.getPersonsIn).to.equal('done');
    expect(updatedComponent.triggers.getPersonsPolling.metadata.out.getPersonsOut).to.equal('done');
  })
})
