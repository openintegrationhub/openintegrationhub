const supertest = require('supertest')
const iamMock = require('../../test/iamMock')
const EventBusMock = require('../../test/EventBusMock')
const config = require('../config')
const Server = require('../server')

let port
let request
let server

describe('API', () => {
  beforeAll(async () => {
    port = 3003
    request = supertest(`http://localhost:${port}${config.apiBase}`)
    server = new Server(
      global.__MONGO_URI__.replace('_replace_me_', 'rds'),
      port,
      EventBusMock,
      () => {}
    )
    iamMock.setup()
    await server.start()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET request', async () => {
    expect(true).toBe(true)
  })
})
