# sailor-nodejs

The official elastic.io library for bootstrapping and executing for Node.js connectors.

Minimal .env vars required:

  MONGO_URI=mongodb://localhost/elasticdb

  AMQP_URI=amqp://guest:guest@localhost:5672

  TASK_ID=task123

  STEP_ID=step_2

Default values of .env vars:

  COMPONENT_PATH=../

  INCOMING_MESSAGES_QUEUE={TASK_ID}.{STEP_ID}.incoming

  OUTGOING_MESSAGES_QUEUE={TASK_ID}.{STEP_ID}.outgoing

  ERRORS_QUEUE={TASK_ID}.{STEP_ID}.errors

  REBOUNDS_QUEUE={TASK_ID}.{STEP_ID}.rebounds

Optional settings:

  REBOUND_INITIAL_EXPIRATION=15000

  REBOUND_LIMIT=2

(temporary solution)
we get step data (step details) from .env var STEP_INFO (json-encoded step information, we need "function" only)
we should get account data from a message (?) but now just mock



