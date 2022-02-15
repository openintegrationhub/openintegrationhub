const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { MongoClient } = require('mongodb');
const VirtualComponent = require('../src/models/VirtualComponent');
const ComponentVersion = require('../src/models/ComponentVersion');
const ComponentConfig = require('../src/models/ComponentConfig');

const virtualComponents = [
  {
    name: 'REST API',
    authorization: {
      authType: 'NO_AUTH',
    },
    compManagerId: '61a0acd29c3ce5001d78ca64',
    componentRepositoryId: '61a0acd2f9f5a0001d66bc7e',
  },
  {
    name: 'Slack',
    authorization: {
      authSetupLink: 'https://api.slack.com/authentication/oauth-v2',
      authType: 'OA2_AUTHORIZATION_CODE',
    },
    compManagerId: '612f74efbc07b6001d133d09',
    componentRepositoryId: '612f74f0c490d7001dae5eeb',
  },
  {
    name: 'sevDesk Contacts',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '612f7597bc07b6001d133d1e',
    componentRepositoryId: '612f7597c490d7001dae5eec',
  },
  {
    name: 'sevDesk Inventory',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '612f75e5bc07b6001d133d20',
    componentRepositoryId: '612f75e5c490d7001dae5eed',
  },
  {
    name: 'sevDesk Order',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '612f761dbc07b6001d133d22',
    componentRepositoryId: '612f761ec490d7001dae5eee',
  },
  {
    name: 'Node.js code',
    authorization: {
      authType: 'NO_AUTH',
    },
    compManagerId: '615db405a51f1d001db9c1ee',
    componentRepositoryId: '615db405149785001df46e43',
  },
  {
    name: 'Apacta',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '616973bebb1e63001ca50703',
    componentRepositoryId: '616973be347de3001dd913a3',
  },
  {
    name: 'Pipedrive',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '616d5ab4bb1e63001ca51392',
    componentRepositoryId: '616d5ab4347de3001dd913b6',
  },
  {
    name: 'Mailchimp',
    authorization: {
      authType: 'SIMPLE',
    },
    compManagerId: '616d699abb1e63001ca51796',
    componentRepositoryId: '616d699a347de3001dd913bf',
  },
  {
    name: 'Personio',
    authorization: {
      authType: 'SESSION_AUTH',
    },
    compManagerId: '616d6a1cbb1e63001ca517d0',
    componentRepositoryId: '616d6a1c347de3001dd913c0',
  },
  {
    name: 'Snazzy-Contacts',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '616d7400bb1e63001ca519ec',
    componentRepositoryId: '616d7400347de3001dd913c1',
  },
  {
    name: 'Wice-Crm',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '616d753abb1e63001ca51a12',
    componentRepositoryId: '616d753a347de3001dd913c2',
  },
  {
    name: 'Google Contacts',
    authorization: {
      authType: 'OA2_AUTHORIZATION_CODE',
      authSetupLink:
        'https://developers.google.com/identity/protocols/oauth2?csw=1',
    },
    compManagerId: '616d8c8bbb1e63001ca51e3f',
    componentRepositoryId: '616d8c8b347de3001dd913c3',
  },
  {
    name: 'Placetel',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '61810b4fbb1e63001ca54176',
    componentRepositoryId: '61810b4f347de3001dd913c6',
  },
  {
    name: 'Sipgate',
    authorization: {
      authType: 'OA2_AUTHORIZATION_CODE',
      authSetupLink: 'https://developer.sipgate.io/rest-api/authentication/',
    },
    compManagerId: '61810f16bb1e63001ca541e4',
    componentRepositoryId: '61810f16347de3001dd913c7',
  },
  {
    name: 'Microsoft Office Graph',
    authorization: {
      authType: 'OA2_AUTHORIZATION_CODE',
      authSetupLink: 'https://developer.sipgate.io/rest-api/authentication/',
    },
    compManagerId: '618121f0bb1e63001ca5430d',
    componentRepositoryId: '618121f0347de3001dd913cb',
  },
  {
    name: 'Staffomatic',
    authorization: {
      authType: 'SIMPLE',
    },
    compManagerId: '6182455fe5ad4a001d635865',
    componentRepositoryId: '6182455fa1bb62001d501890',
  },
  {
    name: 'Meisterplan',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '61893c7d7b04b9001cc30e42',
    componentRepositoryId: '61893c7da1bb62001d501899',
  },
  {
    name: 'Sage people',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '61894c567b04b9001cc31125',
    componentRepositoryId: '61894c56a1bb62001d50189a',
  },
  {
    name: 'Stripe',
    authorization: {
      authType: 'API_KEY',
    },
    compManagerId: '618a504e7b04b9001cc31882',
    componentRepositoryId: '618a504ea1bb62001d5018a0',
  },
  {
    name: 'Jira',
    authorization: {
      authType: 'OA2_AUTHORIZATION_CODE',
      authSetupLink:
        'https://developer.atlassian.com/server/jira/platform/oauth/',
    },
    compManagerId: '618a7f127b04b9001cc31d7c',
    componentRepositoryId: '618a7f12a1bb62001d5018a8',
  },
  {
    name: 'Asana',
    authorization: {
      authType: 'OA2_AUTHORIZATION_CODE',
      authSetupLink: 'https://developers.asana.com/docs/oauth',
    },
    compManagerId: '61926f5eba958a001c500c71',
    componentRepositoryId: '61926f5ef9f5a0001d66bc7b',
  },
  {
    name: 'Code component',
    authorization: {
      authType: 'NO_AUTH',
    },
    compManagerId: '61ee8879e7c057001c2b29da',
    componentRepositoryId: '61ee8879ff23960012b84bd6',
  },
];

const componentManagerConnection = process.env.COMPONENTS_MANAGER;
const componentManagerDatabase = 'component-manager';
const mongoClient = new MongoClient(componentManagerConnection);

const getActiveFunctions = (functions, disabledFunctions) => {
  functions.forEach((iterator) => {
    iterator.active = !disabledFunctions.includes(iterator.name);
  });
  return functions;
};

const main = async () => {
  try {
    const mongooseOptions = {
      socketTimeoutMS: 60000,
      useCreateIndex: true,
      useNewUrlParser: true,
    };
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

    const mongoCli = await mongoClient.connect();

    const database = mongoCli.db(componentManagerDatabase);
    const virtualComponentCollection = database.collection('virtualcomponents');
    const componentConfigsCollection = database.collection('componentconfigs');

    const virtualComponentIds = virtualComponents.map(
      ({ compManagerId }) => new ObjectId(compManagerId)
    );

    const virtualComponentsDb = await virtualComponentCollection
      .find({
        _id: {
          $in: virtualComponentIds,
        },
      })
      .toArray();

    const virtualComponentConfigurations = await componentConfigsCollection
      .find({
        componentId: {
          $in: virtualComponentIds,
        },
      })
      .toArray();

    if (virtualComponents.length !== virtualComponentsDb.length) {
      throw new Error('Error getting messages');
    }

    for (const vComponent of virtualComponentsDb) {
      const memoryComponent = virtualComponents.find(({ compManagerId }) =>
        vComponent._id.equals(new ObjectId(compManagerId))
      );
      const vComponentFormatted = new VirtualComponent({
        name: memoryComponent.name,
        tenant: vComponent.tenant,
        owners: vComponent.owners,
        access: 'public',
      });

      const savedComponent = await vComponentFormatted.save();

      const componentVersionFormatted = new ComponentVersion({
        name: memoryComponent.name,
        virtualComponentId: savedComponent._id,
        componentId: memoryComponent.componentRepositoryId,
        description: vComponent.description,
        authorization: memoryComponent.authorization,
        triggers: vComponent.triggers,
        actions: getActiveFunctions(
          vComponent.actions,
          vComponent.disabledActions
        ),
        logo: vComponent.logo,
      });

      const savedComponentVersionFormatted = await componentVersionFormatted.save();

      await VirtualComponent.findOneAndUpdate(
        {
          _id: savedComponent._id,
        },
        {
          defaultVersionId: savedComponentVersionFormatted._id,
          versions: [
            {
              id: savedComponentVersionFormatted._id,
              componentVersion: '1.0.0',
            },
          ],
        }
      );

      const configurations = virtualComponentConfigurations.filter(
        ({ componentId }) =>
          componentId.toString() === memoryComponent.compManagerId.toString()
      );

      for (const config of configurations) {
        const newConfig = {
          ...config,
          componentVersionId: savedComponentVersionFormatted._id,
          tenant: config.tenantId,
        };
        const configModel = new ComponentConfig(newConfig);
        await configModel.save();
      }
    }

    console.log('FINISh');

    process.exit(0);
  } catch (err) {
    console.log('ERROR', err);
  }
};

main();
