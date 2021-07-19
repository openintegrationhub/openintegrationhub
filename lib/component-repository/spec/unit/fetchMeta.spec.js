const { expect } = require('chai');
const nock = require('nock');
const mongoose = require('mongoose');
const Component = require('../../src/models/Component')
const { fetchMeta } = require('../../src/utils/fetchMeta')

describe ('fetchMeta', () => {
  let componentId;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
    await mongoose.connect(mongoUri, { useNewUrlParser: true });

    const comp = await Component.create({
      name: 'TestComponent',
      repository: 'https://github.com/openintegrationhub/snazzycontacts-adapter',
      distribution: {
        image: 'openintegrationhub/snazzy-adapter:latest'
      }
    })

    componentId = comp._id
  })

  afterEach(async () => {
      await Component.deleteMany();
      await mongoose.connection.close();
  });

  it('should fetch the component.json and populate actions/triggers', async () => {
    nock('https://raw.githubusercontent.com')
    .get('/openintegrationhub/snazzycontacts-adapter/master/component.json')
    .reply(200, {
      actions: {
        upsertObject: true
      },
      triggers: {
        getObjects: true
      }
    })

    await fetchMeta('https://github.com/openintegrationhub/snazzycontacts-adapter', componentId);

    const updatedComp = await Component.findOne({ _id: componentId });

    expect(updatedComp.actions).to.have.property('upsertObject');
    expect(updatedComp.triggers).to.have.property('getObjects');
  })
})
