const { Client } = require('@elastic/elasticsearch')
const util = require('util')

const client = new Client({ node: 'http://localhost:9200' })

const index = 'oih-data-hub'

const contactMapping = {
  tenant: { type: 'text' },
  dataHubId: { type: 'text' },
  name: { type: 'text' },
  surname: { type: 'text' },
  email: { type: 'text' },
}

;(async () => {
  try {
    let result = await client.indices.exists({
      index,
    })

    if (result.body) {
      await client.indices.delete({
        index,
      })
      console.log('Data dropped')
    }

    result = await client.indices.create({
      index,
      body: {},
    })

    result = await client.indices.putMapping({
      index,
      type: 'contact',
      includeTypeName: true,
      body: {
        properties: {
          ...contactMapping,
        },
      },
    })

    await client.index({
      index,
      body: {
        tenant: '1',
        dataHubId: '123',
        name: 'Peter',
        surname: 'Müller',
        email: 'peter_mueller@foo.bar',
      },
    })

    await client.index({
      index,
      body: {
        tenant: '2',
        dataHubId: '123',
        name: 'Peter',
        surname: 'Müller',
        email: 'peter_mueller@foo.bar',
      },
    })

    await client.index({
      index,
      body: {
        tenant: '1',
        dataHubId: '125',
        name: 'Peter',
        surname: 'Meier',
        email: 'peter_meier@foo.bar',
      },
    })

    await client.index({
      index,
      body: {
        tenant: '1',
        dataHubId: '124',
        name: 'Claudia',
        surname: 'Teller',
        email: 'cteller@example.com',
      },
    })

    await client.indices.refresh({ index })
    result = await client.indices.exists({
      index,
    })

    const { body } = await client.search({
      index,
      body: {
        query: {
          bool: {
            must: [
              {
                match: {
                  tenant: {
                    query: '1',
                  },
                },
              },
              {
                dis_max: {
                  queries: [
                    {
                      multi_match: {
                        query: 'Peter C.',
                        fields: ['name'],
                        fuzziness: 1,
                      },
                    },
                    {
                      multi_match: {
                        query: 'Mueller',
                        fields: ['surname'],
                        fuzziness: 1,
                      },
                    },
                    {
                      multi_match: {
                        query: 'peter_mueller@gmx.de',
                        fields: ['email'],
                        boost: 2,
                        fuzziness: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    })

    console.log(util.inspect(body.hits, false, null, true))
  } catch (err) {
    console.log(err)
  }
})()
