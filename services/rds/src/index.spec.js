const supertest = require('supertest')
const config = require('./config')
const iamMock = require('../test/mock/iam')
const EventBusMock = require('../test/mock/EventBus')
const TransportMock = require('../test/mock/Transport')
const { EVENT } = require('./constant')
const Server = require('./server')

const { userToken2 } = require('../test/tokens')

let port
let server
let request

describe('RDS', () => {
  beforeAll(async () => {
    port = 3003
    request = supertest(`http://localhost:${port}${config.apiBase}`)
    server = new Server(
      global.__MONGO_URI__.replace('_replace_me_', 'rds'),
      port,
      EventBusMock,
      TransportMock
    )
    iamMock.setup()
    await server.start()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Events', () => {
    test('Event format', async () => {
      let event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          foo: 'bar',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).not.toHaveBeenCalled()
      expect(event.nack).toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'bar',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).not.toHaveBeenCalled()
      expect(event.nack).toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'bar',
          payload: 'blub1',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).toHaveBeenCalled()
      expect(event.nack).not.toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'bar1',
          payload: 'blub2',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).toHaveBeenCalled()
      expect(event.nack).not.toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'bar1',
          payload: 'blub2',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).not.toHaveBeenCalled()
      expect(event.nack).toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'jsonString',
          payload: {
            foo: 'bar',
          },
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).toHaveBeenCalled()
      expect(event.nack).not.toHaveBeenCalled()

      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'number',
          payload: 1293819238,
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)
      expect(event.ack).toHaveBeenCalled()
      expect(event.nack).not.toHaveBeenCalled()
    })
  })

  describe('API', () => {
    test('GET /raw-record', async () => {
      // test with anonymous record
      let event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'no-owner',
          payload: 'blub2',
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)

      await request
        .get('/raw-record/no-owner')
        .set(...global.userAuth1)
        .expect(403)

      await request
        .get('/raw-record/no-owner')
        .set(...global.userAuth2)
        .expect(200)

      await request
        .get('/raw-record/no-owner')
        .set(...global.adminAuth1)
        .expect(200)

      // test with userId record
      event = {
        ack: jest.fn(),
        nack: jest.fn(),
        payload: {
          rawRecordId: 'with-owner',
          payload: 'blub2',
          userId: userToken2.value.sub,
        },
      }

      await server.eventBus.trigger(EVENT.RAW_RECORD_CREATED, event)

      await request
        .get('/raw-record/with-owner')
        .set(...global.userAuth1)
        .expect(403)

      await request
        .get('/raw-record/with-owner')
        .set(...global.userAuth2)
        .expect(200)

      await request
        .get('/raw-record/with-owner')
        .set(...global.adminAuth1)
        .expect(404)
    })
  })
})
