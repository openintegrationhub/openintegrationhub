# sailor-nodejs

The official elastic.io library for bootstrapping and executing for Node.js connectors.

Minimal .env vars required:

TASK={"id":"5559edd38968ec0736000003","data":{"step_1":{"uri":"546456456456456"}},"recipe":{"nodes":[{"id":"step_1","function":"passthrough"}]}} <br/>
STEP_ID=step_1<br/>
<br/>
AMQP_URI=amqp://guest:guest@localhost:5672<br/>
<br/>
LISTEN_MESSAGES_ON=5559edd38968ec0736000003:step_1:1432205514864:messages<br/>
PUBLISH_MESSAGES_TO=userexchange:5527f0ea43238e5d5f000001<br/>
DATA_ROUTING_KEY=5559edd38968ec0736000003:step_1:1432205514864:message<br/>
ERROR_ROUTING_KEY=5559edd38968ec0736000003:step_1:1432205514864:error<br/>
REBOUND_ROUTING_KEY=5559edd38968ec0736000003:step_1:1432205514864:rebound<br/>
<br/>

Optional .env vars and their default values:

COMPONENT_PATH=../ <br/>
REBOUND_INITIAL_EXPIRATION=15000 <br/>
REBOUND_LIMIT=2 <br/>


