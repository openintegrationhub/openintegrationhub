const supertest = require('supertest')
const iamMock = require('../test/mock/iam')
const EventBusMock = require('../test/mock/EventBus')
const TransportMock = require('../test/mock/Transport')
const config = require('./config')
const { EVENT } = require('./constant')
const Server = require('./server')

let port
let request
let server

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
    })
  })

  describe('API', () => {
    test('GET request', async () => {
      expect(true).toBe(true)
    })
  })
})
