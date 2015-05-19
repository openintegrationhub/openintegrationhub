# sailor-nodejs

The official elastic.io library for bootstrapping and executing for Node.js connectors.

Minimal .env vars required:

  MONGO_URI=mongodb://localhost/elasticdb <br/>
  AMQP_URI=amqp://guest:guest@localhost:5672 <br/>
  TASK_ID=task123 <br/>
  STEP_ID=step_2 <br/>
  TASK={.. task JSON here..} <br/>

Optional .env vars and their default values:

  COMPONENT_PATH=../ <br/>
  INCOMING_MESSAGES_QUEUE={TASK_ID}.{STEP_ID}.incoming <br/>
  OUTGOING_MESSAGES_QUEUE={TASK_ID}.{STEP_ID}.outgoing <br/>
  ERRORS_QUEUE={TASK_ID}.{STEP_ID}.errors <br/>
  REBOUNDS_QUEUE={TASK_ID}.{STEP_ID}.rebounds <br/>
  TASKSTAT_QUEUE={TASK_ID}.{STEP_ID}.rebounds <br/>
  REBOUND_INITIAL_EXPIRATION=15000 <br/>
  REBOUND_LIMIT=2 <br/>
  
  
(temporary solution)
we get step data (step details) from .env var STEP_INFO (json-encoded step information, we need "function" only)
we should get account data from a message (?) but now just mock

Information required now: <br/>
<br/>
execId: undefined, // @TODO where will we get it? <br/>
taskId: headers.taskId, // from message header <br/>
user: undefined,// @TODO where will we get it? <br/>
app: undefined, <br/>
partner: undefined, <br/>
stepId: headers.stepId, // from message header <br/>
compId: step.compId, // from step info <br/>
'function': step.function, // from step info logFile: String, <br/>
syncAppId: undefined<br/>



