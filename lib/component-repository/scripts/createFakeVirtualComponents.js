// eslint-disable-next-line node/no-unpublished-require
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const VirtualComponent = require('../src/models/VirtualComponent');
const Component = require('../src/models/Component');
const ComponentVersion = require('../src/models/ComponentVersion');
const { buildFunctionList } = require('../src/utils/parserFunctions');

(async () => {
  try {
    const mongooseOptions = {
      socketTimeoutMS: 60000,
      useCreateIndex: true,
      useNewUrlParser: true,
    };
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);

    for (let index = 0; index <= 500; index++) {
      const virtualComponetName = faker.name.lastName();
      const virtualComponent = new VirtualComponent({
        name: virtualComponetName,
        access: 'public',
      });

      const savedVComponent = await virtualComponent.save();

      const randomFunctions = Math.floor(Math.random() * 50 + 400);

      const component = new Component({
        distribution: {
          type: 'docker',
          image: 'openintegrationhub/slack-component:latest',
        },
        access: 'public',
        isGlobal: true,
        active: true,
        name: `${virtualComponetName} ${index}`,
        description: `${virtualComponetName} ${index}`,
        logo: faker.image.imageUrl(),
        authoration: {
          authType: 'API_KEY',
        },
        triggers: Array.from(Array(randomFunctions)).reduce((prev) => {
          return {
            ...prev,
            [faker.hacker.noun()]: {
              main: faker.internet.url(),
              title: faker.name.firstName(),
              description: faker.commerce.productDescription(),
              fields: {
                verbose: {
                  viewClass: 'CheckBoxView',
                  label: faker.random.word(),
                },
              },
              metadata: {
                in: faker.internet.url(),
                out: {
                  type: 'object',
                  items: {
                    title: faker.name.firstName(),
                    description: faker.commerce.productDescription(),
                    required: ['category'],
                    properties: Array.from(Array(20)).reduce((prev) => {
                      return {
                        ...prev,
                        [faker.hacker.noun()]: {
                          description: faker.commerce.productDescription(),
                          type: 'string',
                          default: null,
                          nullable: true,
                        },
                      };
                    }, {}),
                  },
                },
              },
            },
          };
        }, {}),
        actions: Array.from(Array(randomFunctions)).reduce((prev) => {
          return {
            ...prev,
            [faker.hacker.noun()]: {
              main: faker.internet.url(),
              title: faker.name.firstName(),
              description: faker.commerce.productDescription(),
              fields: {
                verbose: {
                  viewClass: 'CheckBoxView',
                  label: faker.random.word(),
                },
              },
              metadata: {
                in: faker.internet.url(),
                out: {
                  type: 'object',
                  items: {
                    title: faker.name.firstName(),
                    description: faker.commerce.productDescription(),
                    required: ['category'],
                    properties: Array.from(Array(20)).reduce((prev) => {
                      return {
                        ...prev,
                        [faker.hacker.noun()]: {
                          description: faker.commerce.productDescription(),
                          type: 'string',
                          default: null,
                          nullable: true,
                        },
                      };
                    }, {}),
                  },
                },
              },
            },
          };
        }, {}),
      });

      const savedComponent = await component.save();

      const componentVersion = new ComponentVersion({
        name: savedComponent.name,
        description: savedComponent.description,
        componentId: savedComponent._id,
        authorization: {
          authType: 'API_KEY',
          authSetupLink: faker.internet.url(),
        },
        virtualComponentId: savedVComponent._id,
        actions: buildFunctionList(savedComponent.actions),
        triggers: buildFunctionList(savedComponent.triggers),
      });

      const savedComponentVersion = await componentVersion.save();

      await VirtualComponent.findOneAndUpdate(
        {
          _id: savedVComponent._id,
        },
        {
          defaultVersionId: savedComponentVersion._id,
          versions: [
            {
              id: savedComponentVersion._id,
              version: savedComponentVersion.name,
            },
          ],
        }
      );
    }
    console.log('Added all virtual components');
    process.exit(0);
  } catch (e) {
    console.error("Critical error, going to die", e, e && e.stack); //eslint-disable-line
    process.exit(1); //eslint-disable-line no-process-exit
  }
})();
