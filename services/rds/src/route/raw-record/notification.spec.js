const supertest = require('supertest')
const iamMock = require('../../../test/iamMock')
const conf = require('../../conf')

let port
let request

describe('notification - router', () => {
  beforeAll(async () => {
    port = 3003
    request = supertest(`http://localhost:${port}${conf.apiBase}`)
    webhook = new Webhook(
      global.__MONGO_URI__.replace('_replace_me_', 'foo'),
      port
    )
    iamMock.setup()
    await webhook.start()
  })

  afterAll(async () => {
    await webhook.stop()
  })

  test('POST request', async () => {
    await request
      .post('/notification')
      .set(...global.userAuth1)
      .send({})
      .expect(200)

    expect(true).toBe(true)
  })
})
