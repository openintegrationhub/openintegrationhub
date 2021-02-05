<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Open Integration Hub (OIH)" width="400"/>
</p>

Open source framework for easy data synchronization between business applications.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

## OIH Ferryman

This library is based on the [elasticio nodejs sailor](https://github.com/elasticio/sailor-nodejs). It offers the same baseline functionalities, but is being expanded further with capabilities specific to the Open Integration Hub framework.

## Functionality

The Ferryman functions as a wrapper for all Open Integration Hub connectors. It facilitates the communication between connector and OIH, passing necessary data to and from all connectors in a flow.

Every time a flow node is activated, the Component Orchestrator sends an event to the Ferryman instance running the relevant connector. The Ferryman then calls the appropriate trigger or action from its connector and executes it with the data it received. Once the execution has finished, the Ferryman then returns the connector's output back to the Orchestrator, which will then pass it along to the next step in the flow.

## Usage

### Installation

To use the Ferryman in your connector, install it as an npm module as normal. Then as part of your start script, directly call the file `runGlobal.js` from your node modules folder. For example, in your package.json, point to it in your package.json like this:

```json
"scripts": {
  "start": "node ./node_modules/@openintegrationhub/ferryman/runGlobal.js"
}
```

Then, in your Dockerfile, set
`ENTRYPOINT ["npm", "start"]`

### Functions

To communicate with the Ferryman, each of your connector's Actions or Triggers should expose a function with this signature:

#### processAction

`processAction(msg, cfg, snapshot)`

This function will be called by the Ferryman with the listed arguments:

- msg: Object. Contains any data passed on from the preceding flow node. Always contains a key `data` with the actual data set, may optionally contain keys `metadata` and `attachments`
- cfg: Object. Contains configuration data and authentication secrets as defined in the Flow definition. Primarily used to pass on data such as API Keys necessary for authentication with the target application.
- snapshot: Object. Allows your component to save a state between function calls. Contains whichever data you last emitted as a snapshot.

The processAction is called automatically in a regular interval determined by the flow definition (e.g. once every hour).

#### Emitter

Additionally, the Ferryman injects another function into your processAction, used to communicate back to the Ferryman:

`self.emit(action, data)`

Call this function whenever you need to return data to the Open Integration Hub, with these arguments:

- action: String. Determines what action the Ferryman should take. Can be one of:
    - `data`: Passes on the data of the second argument to the next flow node in line, which will receive it as the `msg` argument of its own processAction
    - `end`: Notifies the Ferryman that the component has finished its processAction, without passing on any data. Generally used for the last node in a flow.
    - `snapshot`: Stores a snapshot in the OIH, which will be passed into your connector as the `snapshot` argument in all future processActions. Use this if you need to maintain a state between successive processActions. Emitting several snapshots overwrites earlier ones, only the latest will be saved.
    - `error`: Allows to pass an error back to the Ferryman for centralised error display. Pass on the error object as the second argument

- data: Object. Contains what data you need to pass along. The expected format differs slightly depending on the action:
    - For a `data` emit, format the message in the same way you receive it in your process action. This means you should pass it as an object, with a `data` key containing the content, and optionally a `metadata` key containing relevant metadata
    - For a `snapshot` emit, you can pass on an arbitrary object containing whichever keys you require.
    - For an `error` emit, simply pass on the error object

#### Transformer interface

Finally, Ferryman offers a simple transformation interface. Using it allows your component to be configured to use custom flow-dependent transformations, as well as any transformations you provide as part of your connector.

To use it, simply require it via `const { transform } = require('@openintegrationhub/ferryman')`

Then, inside your processAction, call the `transform` function once for each data object you emit, with this signature:

`transform(object, cfg, defaultMapping)`

- object: Object. The data object that you want to transform before passing it on.
- cfg: Object. The `cfg` object that you received in your processAction function. This allows users of your component to configure its transformation. In particular, two attributes of cfg are checked:
    - skipTransformation: If set to `true`, the transformation will be skipped entirely, and the object will be returned unchanged
    - customMapping: Allows users to inject a custom jsonata mapping. If set, will use this custom mapping instead of any defaultMapping
- defaultMapping: Function. If you provide any default transformations as part of your connectors, simply pass the relevant one here as a function. `transform` will then execute that function with `object` and `cfg` as parameters.

`transform` will return an object transformed according to either the custom or default mapping passed to it. If neither a custom nor default mapping is provided, then it simply returns the original `object` unchanged.

##### Transformer interface for flow steps

In the `nodeSettings` object of a flow step the flag `applyTransform` can be set to `false, before, after` or `both`.

When set to `before` the received data will be transformed `before` it is passed to the component.

If set to `after` the output of the component will be transformed before being passed to the next step.

With `both` each of the aforementioned steps will be executed.

The executed transform depends on the field `transformFunction` in the nodeSettings. Which can contain any valid jsonata expression as a string.

If the field `secondTransformFunction` is provided it will be used by the `after`-transformation. If not then it will use the content of `transformFunction`.

*This features is currently experimental.*

### Further Information

For additional information concerning the development of connectors, please refer to the [Connector Guide](https://openintegrationhub.github.io//docs/Connectors/ConnectorBasics.html)
